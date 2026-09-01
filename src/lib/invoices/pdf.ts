/**
 * Client-side PDF generator using jsPDF.
 * Produces an A4 invoice with company branding, customer info, items table, and totals.
 * Layout is fully dynamic: text is wrapped and block heights are measured so
 * long addresses, names, descriptions, or notes never overlap.
 */
import jsPDF from "jspdf";
import type { InvoiceWithRelations } from "./types";
import { calcLine, formatMoney } from "./calc";

async function fetchImageDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function generateInvoicePDF(invoice: InvoiceWithRelations, logoUrl?: string | null) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 40;
  const contentW = pageW - margin * 2;
  const halfW = contentW / 2 - 20; // width for each info column
  const currency = invoice.currency;

  /** Add a new page if `h` points of vertical space are not available. */
  const ensureSpace = (y: number, h: number): number => {
    if (y + h > pageH - margin) {
      doc.addPage();
      return margin;
    }
    return y;
  };

  /** Draw wrapped text; returns the y position after the block. */
  const drawWrapped = (
    text: string,
    x: number,
    y: number,
    maxW: number,
    lineH: number,
    align: "left" | "right" = "left",
  ): number => {
    const lines = doc.splitTextToSize(text, maxW) as string[];
    for (const line of lines) {
      doc.text(line, align === "right" ? x + maxW : x, y, { align });
      y += lineH;
    }
    return y;
  };

  // ---------- Header ----------
  let y = margin;
  let headerBottom = y;
  if (logoUrl) {
    const dataUrl = await fetchImageDataUrl(logoUrl);
    if (dataUrl) {
      try {
        doc.addImage(dataUrl, "PNG", margin, y, 80, 80, undefined, "FAST");
        headerBottom = y + 80;
      } catch {
        /* ignore invalid image */
      }
    }
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("INVOICE", pageW - margin, y + 18, { align: "right" });
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  let hy = y + 36;
  hy = drawWrapped(`#${invoice.invoice_number}`, pageW - margin - halfW, hy, halfW, 14, "right");
  hy = drawWrapped(`Date: ${invoice.invoice_date}`, pageW - margin - halfW, hy, halfW, 14, "right");
  if (invoice.due_date)
    hy = drawWrapped(`Due: ${invoice.due_date}`, pageW - margin - halfW, hy, halfW, 14, "right");
  headerBottom = Math.max(headerBottom, hy);

  // ---------- Company / Customer blocks ----------
  let blockY = headerBottom + 24;
  const company = invoice.company;
  const customer = invoice.customer;

  let leftBottom = blockY;
  if (company) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    leftBottom = drawWrapped(company.name, margin, leftBottom, halfW, 15) + 2;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    for (const line of [
      company.address,
      company.phone,
      company.email,
      company.website,
      company.tax_number ? `Tax: ${company.tax_number}` : null,
    ]) {
      if (line) leftBottom = drawWrapped(String(line), margin, leftBottom, halfW, 12);
    }
  }

  let rightBottom = blockY;
  if (customer) {
    const rx = pageW - margin - halfW;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    rightBottom = drawWrapped("Bill To", rx, rightBottom, halfW, 13, "right");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    for (const line of [
      customer.name,
      customer.address,
      customer.phone,
      customer.email,
      customer.tax_number ? `Tax: ${customer.tax_number}` : null,
    ]) {
      if (line) rightBottom = drawWrapped(String(line), rx, rightBottom, halfW, 12, "right");
    }
  }

  y = Math.max(leftBottom, rightBottom) + 20;

  // ---------- Items table ----------
  const cols = [
    { key: "description", label: "Description", w: 240, align: "left" as const },
    { key: "qty", label: "Qty", w: 40, align: "right" as const },
    { key: "price", label: "Price", w: 65, align: "right" as const },
    { key: "disc", label: "Disc", w: 55, align: "right" as const },
    { key: "vat", label: "VAT %", w: 45, align: "right" as const },
    { key: "total", label: "Total", w: 70, align: "right" as const },
  ];
  const tableX = margin;

  const drawTableHeader = (yy: number): number => {
    doc.setFillColor(245, 246, 250);
    doc.rect(tableX, yy, contentW, 20, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    let cx = tableX + 6;
    for (const c of cols) {
      const tx = c.align === "right" ? cx + c.w - 6 : cx;
      doc.text(c.label, tx, yy + 13, { align: c.align });
      cx += c.w;
    }
    return yy + 20;
  };

  y = ensureSpace(y, 40);
  y = drawTableHeader(y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  for (const it of invoice.items) {
    const line = calcLine({
      position: it.position,
      description: it.description,
      quantity: Number(it.quantity),
      unit_price: Number(it.unit_price),
      discount_value: Number(it.discount_value),
      discount_is_percent: it.discount_is_percent,
      vat_percent: Number(it.vat_percent),
    });
    const discLabel = it.discount_is_percent
      ? `${Number(it.discount_value)}%`
      : formatMoney(Number(it.discount_value), currency);
    const descLines = doc.splitTextToSize(it.description || "-", cols[0].w - 12) as string[];
    const rowH = Math.max(20, descLines.length * 12 + 8);

    if (y + rowH > pageH - 160) {
      doc.addPage();
      y = drawTableHeader(margin);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
    }

    const rowVals = [
      descLines,
      [String(Number(it.quantity))],
      [formatMoney(Number(it.unit_price), currency)],
      [discLabel],
      [`${Number(it.vat_percent)}%`],
      [formatMoney(line.total, currency)],
    ];
    let cx = tableX + 6;
    cols.forEach((c, idx) => {
      const tx = c.align === "right" ? cx + c.w - 6 : cx;
      for (const val of rowVals[idx]) {
        doc.text(val, tx, y + 13, { align: c.align });
        y += c.key === "description" ? 12 : 0;
      }
      cx += c.w;
    });
    y += rowH - (descLines.length - 1) * 12; // normalize: desc loop already advanced y
    y = Math.max(y, 0); // safety
    // recompute cleanly: the loop above advanced y by (descLines-1)*12 extra
    doc.setDrawColor(230);
    doc.line(tableX, y, pageW - margin, y);
  }

  // ---------- Totals ----------
  y = ensureSpace(y + 10, 90);
  const totalsX = pageW - margin - 200;
  const drawTotal = (label: string, value: string, bold = false) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(bold ? 11 : 9);
    doc.text(label, totalsX, y + 12);
    doc.text(value, pageW - margin, y + 12, { align: "right" });
    y += bold ? 20 : 16;
  };
  drawTotal("Subtotal", formatMoney(Number(invoice.subtotal), currency));
  drawTotal("Discount", `- ${formatMoney(Number(invoice.discount_total), currency)}`);
  drawTotal("VAT", formatMoney(Number(invoice.vat_total), currency));
  doc.setDrawColor(180);
  doc.line(totalsX, y + 2, pageW - margin, y + 2);
  y += 4;
  drawTotal("Grand Total", formatMoney(Number(invoice.grand_total), currency), true);

  // ---------- Notes & Terms ----------
  const drawSection = (title: string, body: string) => {
    const lines = doc.splitTextToSize(body, contentW) as string[];
    const needed = 10 + 14 + lines.length * 12;
    y = ensureSpace(y + 10, needed);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(title, margin, y);
    y += 14;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(lines, margin, y);
    y += lines.length * 12;
  };
  if (invoice.notes) drawSection("Notes", invoice.notes);
  if (invoice.terms) drawSection("Terms & Conditions", invoice.terms);

  doc.save(`${invoice.invoice_number}.pdf`);
}
