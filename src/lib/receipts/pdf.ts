/**
 * Client-side PDF generator for receipts using jsPDF.
 * Mirrors the invoice/quotation PDF layout with receipt-specific fields
 * (payment method, reference, amount received, PAID stamp).
 * Layout is fully dynamic: text is wrapped and block heights are measured so
 * long addresses, names, descriptions, or notes never overlap.
 */
import jsPDF from "jspdf";
import { calcLine, formatMoney } from "@/lib/invoices/calc";
import { PAYMENT_METHOD_LABELS, type PaymentMethod, type ReceiptWithRelations } from "./types";

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

export async function generateReceiptPDF(receipt: ReceiptWithRelations, logoUrl?: string | null) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 40;
  const contentW = pageW - margin * 2;
  const halfW = contentW / 2 - 20;
  const currency = receipt.currency;

  const ensureSpace = (y: number, h: number): number => {
    if (y + h > pageH - margin) {
      doc.addPage();
      return margin;
    }
    return y;
  };

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
        /* ignore */
      }
    }
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("RECEIPT", pageW - margin, y + 18, { align: "right" });
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  let hy = y + 36;
  hy = drawWrapped(`#${receipt.receipt_number}`, pageW - margin - halfW, hy, halfW, 14, "right");
  hy = drawWrapped(`Date: ${receipt.receipt_date}`, pageW - margin - halfW, hy, halfW, 14, "right");
  if (receipt.source_invoice?.invoice_number)
    hy = drawWrapped(`For: ${receipt.source_invoice.invoice_number}`, pageW - margin - halfW, hy, halfW, 14, "right");
  headerBottom = Math.max(headerBottom, hy);

  // ---------- Company / Customer blocks ----------
  let blockY = headerBottom + 24;
  const company = receipt.company;
  const customer = receipt.customer;

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
    rightBottom = drawWrapped("Received From", rx, rightBottom, halfW, 13, "right");
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

  // ---------- Payment method / reference ----------
  y = ensureSpace(y, 50);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Payment", margin, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(
    `Method: ${PAYMENT_METHOD_LABELS[receipt.payment_method as PaymentMethod] ?? receipt.payment_method}`,
    margin,
    y + 14,
  );
  if (receipt.payment_reference) doc.text(`Reference: ${receipt.payment_reference}`, margin, y + 28);
  y += 46;

  // ---------- Items table (skip if no items) ----------
  if (receipt.items.length > 0) {
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
    for (const it of receipt.items) {
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

      if (y + rowH > pageH - 200) {
        doc.addPage();
        y = drawTableHeader(margin);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
      }

      const rowVals: string[][] = [
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
        rowVals[idx].forEach((val, li) => {
          doc.text(val, tx, y + 13 + li * 12, { align: c.align });
        });
        cx += c.w;
      });
      doc.setDrawColor(230);
      doc.line(tableX, y + rowH, pageW - margin, y + rowH);
      y += rowH;
    }
  }

  // ---------- Totals ----------
  y = ensureSpace(y + 10, 100);
  const totalsX = pageW - margin - 200;
  const drawTotal = (label: string, value: string, bold = false) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(bold ? 11 : 9);
    doc.text(label, totalsX, y + 12);
    doc.text(value, pageW - margin, y + 12, { align: "right" });
    y += bold ? 20 : 16;
  };
  if (Number(receipt.subtotal) > 0) {
    drawTotal("Subtotal", formatMoney(Number(receipt.subtotal), currency));
    drawTotal("Discount", `- ${formatMoney(Number(receipt.discount_total), currency)}`);
    drawTotal("VAT", formatMoney(Number(receipt.vat_total), currency));
    doc.setDrawColor(180);
    doc.line(totalsX, y + 2, pageW - margin, y + 2);
    y += 4;
  }
  drawTotal("Amount received", formatMoney(Number(receipt.amount_received), currency), true);

  // ---------- Status stamp ----------
  const stamp = receipt.status === "issued" ? "PAID" : receipt.status === "void" ? "VOID" : null;
  if (stamp) {
    y = ensureSpace(y, 60);
    const [r, g, b] = stamp === "PAID" ? [16, 185, 129] : [220, 38, 38];
    doc.setDrawColor(r, g, b);
    doc.setTextColor(r, g, b);
    doc.setLineWidth(2);
    doc.roundedRect(margin, y + 10, 100, 40, 6, 6);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text(stamp, margin + 50, y + 36, { align: "center" });
    doc.setTextColor(0);
    doc.setLineWidth(0.4);
    y += 60;
  }

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
  if (receipt.notes) drawSection("Notes", receipt.notes);
  if (receipt.terms) drawSection("Terms", receipt.terms);

  doc.save(`${receipt.receipt_number}.pdf`);
}
