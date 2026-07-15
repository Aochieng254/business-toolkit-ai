import type { InvoiceItemInput } from "./types";

/** Round to 2 decimals (banker-safe enough for invoice UI totals). */
const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export type LineBreakdown = {
  gross: number;
  discount: number;
  net: number;
  vat: number;
  total: number;
};

/** Calculate a single line's amounts. */
export function calcLine(item: InvoiceItemInput): LineBreakdown {
  const qty = Number(item.quantity) || 0;
  const price = Number(item.unit_price) || 0;
  const gross = qty * price;
  const discount = item.discount_is_percent
    ? gross * ((Number(item.discount_value) || 0) / 100)
    : Number(item.discount_value) || 0;
  const net = Math.max(gross - discount, 0);
  const vat = net * ((Number(item.vat_percent) || 0) / 100);
  return { gross: r2(gross), discount: r2(discount), net: r2(net), vat: r2(vat), total: r2(net + vat) };
}

/** Aggregate totals across all items. */
export function calcTotals(items: InvoiceItemInput[]) {
  let subtotal = 0;
  let discount_total = 0;
  let vat_total = 0;
  let grand_total = 0;
  for (const it of items) {
    const l = calcLine(it);
    subtotal += l.gross;
    discount_total += l.discount;
    vat_total += l.vat;
    grand_total += l.total;
  }
  return {
    subtotal: r2(subtotal),
    discount_total: r2(discount_total),
    vat_total: r2(vat_total),
    grand_total: r2(grand_total),
  };
}

export function formatMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}
