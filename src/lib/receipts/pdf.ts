/**
 * Client-side PDF generator for receipts using jsPDF.
 * Mirrors the invoice/quotation PDF layout with receipt-specific fields
 * (payment method, reference, amount received, PAID stamp).
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
  const currency = receipt.currency;

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

  const company = receipt.company;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("RECEIPT", pageW - margin, y + 10, { align: "right" });
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`#${receipt.receipt_number}`, pageW - margin, y + 28, { align: "right" });
  doc.text(`Date: ${receipt.receipt_date}`, pageW - margin, y + 42, { align: "right" });
  if (receipt.source_invoice?.invoice_number)
    doc.text(`For: ${receipt.source_invoice.invoice_number}`, pageW - margin, y + 56, { align: "right" });

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

  const customer = receipt.customer;
  if (customer) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Received From", pageW - margin, y, { align: "right" });
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

  // Payment method / reference block
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Payment", margin, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Method: ${PAYMENT_METHOD_LABELS[receipt.payment_method as PaymentMethod] ?? receipt.payment_method}`, margin, y + 14);
  if (receipt.payment_reference) doc.text(`Reference: ${receipt.payment_reference}`, margin, y + 28);
  y += 46;

  // Items table (skip if no items)
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
    for (const it of receipt.items) {
      if (y > pageH - 200) {
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
  if (Number(receipt.subtotal) > 0) {
    drawTotal("Subtotal", formatMoney(Number(receipt.subtotal), currency));
    drawTotal("Discount", `- ${formatMoney(Number(receipt.discount_total), currency)}`);
    drawTotal("VAT", formatMoney(Number(receipt.vat_total), currency));
    doc.setDrawColor(180);
    doc.line(totalsX, y + 2, pageW - margin, y + 2);
    y += 4;
  }
  drawTotal("Amount received", formatMoney(Number(receipt.amount_received), currency), true);

  // PAID stamp when issued
  if (receipt.status === "issued") {
    doc.setDrawColor(16, 185, 129);
    doc.setTextColor(16, 185, 129);
    doc.setLineWidth(2);
    doc.roundedRect(margin, y + 10, 100, 40, 6, 6);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text("PAID", margin + 50, y + 36, { align: "center" });
    doc.setTextColor(0);
    doc.setLineWidth(0.4);
    y += 60;
  } else if (receipt.status === "void") {
    doc.setDrawColor(220, 38, 38);
    doc.setTextColor(220, 38, 38);
    doc.setLineWidth(2);
    doc.roundedRect(margin, y + 10, 100, 40, 6, 6);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text("VOID", margin + 50, y + 36, { align: "center" });
    doc.setTextColor(0);
    doc.setLineWidth(0.4);
    y += 60;
  }

  if (receipt.notes) {
    y += 10;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Notes", margin, y);
    y += 14;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    const w = doc.splitTextToSize(receipt.notes, pageW - margin * 2);
    doc.text(w, margin, y);
    y += w.length * 12;
  }
  if (receipt.terms) {
    y += 10;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Terms", margin, y);
    y += 14;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    const w = doc.splitTextToSize(receipt.terms, pageW - margin * 2);
    doc.text(w, margin, y);
  }

  doc.save(`${receipt.receipt_number}.pdf`);
}
