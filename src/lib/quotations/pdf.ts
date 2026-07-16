/**
 * Client-side PDF generator for quotations using jsPDF.
 * Mirrors the invoice PDF layout with quotation-specific fields.
 */
import jsPDF from "jspdf";
import { calcLine, formatMoney } from "@/lib/invoices/calc";
import type { QuotationWithRelations } from "./types";

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

export async function generateQuotationPDF(
  quotation: QuotationWithRelations,
  logoUrl?: string | null,
) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 40;
  const currency = quotation.currency;

  let y = margin;
  if (logoUrl) {
    const dataUrl = await fetchImageDataUrl(logoUrl);
    if (dataUrl) {
      try {
        doc.addImage(dataUrl, "PNG", margin, y, 80, 80, undefined, "FAST");
      } catch {
        /* ignore */
      }
    }
  }

  const company = quotation.company;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("QUOTATION", pageW - margin, y + 10, { align: "right" });
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`#${quotation.quotation_number}`, pageW - margin, y + 28, { align: "right" });
  doc.text(`Date: ${quotation.quotation_date}`, pageW - margin, y + 42, { align: "right" });
  if (quotation.valid_until)
    doc.text(`Valid until: ${quotation.valid_until}`, pageW - margin, y + 56, { align: "right" });
  if (quotation.reference_number)
    doc.text(`Ref: ${quotation.reference_number}`, pageW - margin, y + 70, { align: "right" });

  y += 110;

  if (company) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(company.name, margin, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    let cy = y + 14;
    for (const line of [
      company.address,
      company.phone,
      company.email,
      company.website,
      company.tax_number ? `Tax: ${company.tax_number}` : null,
    ]) {
      if (line) {
        doc.text(String(line), margin, cy);
        cy += 12;
      }
    }
  }

  const customer = quotation.customer;
  if (customer) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Prepared For", pageW - margin, y, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    let cy = y + 14;
    for (const line of [
      customer.name,
      customer.address,
      customer.phone,
      customer.email,
      customer.tax_number ? `Tax: ${customer.tax_number}` : null,
    ]) {
      if (line) {
        doc.text(String(line), pageW - margin, cy, { align: "right" });
        cy += 12;
      }
    }
  }

  y += 110;

  if (quotation.sales_rep) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`Sales rep: ${quotation.sales_rep}`, margin, y);
    y += 14;
  }

  const cols = [
    { key: "description", label: "Description", w: 240, align: "left" as const },
    { key: "qty", label: "Qty", w: 40, align: "right" as const },
    { key: "price", label: "Price", w: 65, align: "right" as const },
    { key: "disc", label: "Disc", w: 55, align: "right" as const },
    { key: "vat", label: "VAT %", w: 45, align: "right" as const },
    { key: "total", label: "Total", w: 70, align: "right" as const },
  ];
  const tableX = margin;
  const rowH = 20;

  doc.setFillColor(245, 246, 250);
  doc.rect(tableX, y, pageW - margin * 2, rowH, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  let cx = tableX + 6;
  for (const c of cols) {
    const tx = c.align === "right" ? cx + c.w - 6 : cx;
    doc.text(c.label, tx, y + 13, { align: c.align });
    cx += c.w;
  }
  y += rowH;

  doc.setFont("helvetica", "normal");
  for (const it of quotation.items) {
    if (y > pageH - 160) {
      doc.addPage();
      y = margin;
    }
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
    const rowVals = [
      it.description || "-",
      String(Number(it.quantity)),
      formatMoney(Number(it.unit_price), currency),
      discLabel,
      `${Number(it.vat_percent)}%`,
      formatMoney(line.total, currency),
    ];
    cx = tableX + 6;
    cols.forEach((c, idx) => {
      const tx = c.align === "right" ? cx + c.w - 6 : cx;
      const val = rowVals[idx];
      if (c.key === "description") {
        const wrapped = doc.splitTextToSize(val, c.w - 12);
        doc.text(wrapped, tx, y + 13, { align: c.align });
      } else {
        doc.text(val, tx, y + 13, { align: c.align });
      }
      cx += c.w;
    });
    doc.setDrawColor(230);
    doc.line(tableX, y + rowH, pageW - margin, y + rowH);
    y += rowH;
  }

  y += 10;
  const totalsX = pageW - margin - 200;
  const drawTotal = (label: string, value: string, bold = false) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(bold ? 11 : 9);
    doc.text(label, totalsX, y + 12);
    doc.text(value, pageW - margin, y + 12, { align: "right" });
    y += bold ? 20 : 16;
  };
  drawTotal("Subtotal", formatMoney(Number(quotation.subtotal), currency));
  drawTotal("Discount", `- ${formatMoney(Number(quotation.discount_total), currency)}`);
  drawTotal("VAT", formatMoney(Number(quotation.vat_total), currency));
  doc.setDrawColor(180);
  doc.line(totalsX, y + 2, pageW - margin, y + 2);
  y += 4;
  drawTotal("Grand Total", formatMoney(Number(quotation.grand_total), currency), true);

  if (quotation.notes) {
    y += 10;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Notes", margin, y);
    y += 14;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    const w = doc.splitTextToSize(quotation.notes, pageW - margin * 2);
    doc.text(w, margin, y);
    y += w.length * 12;
  }
  if (quotation.terms) {
    y += 10;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Terms & Conditions", margin, y);
    y += 14;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    const w = doc.splitTextToSize(quotation.terms, pageW - margin * 2);
    doc.text(w, margin, y);
  }

  doc.save(`${quotation.quotation_number}.pdf`);
}
