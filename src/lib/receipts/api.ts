/**
 * Client-side data access for the Receipt module.
 * RLS scopes every read/write to the signed-in user automatically.
 */
import { supabase } from "@/integrations/supabase/client";
import { calcLine, calcTotals } from "@/lib/invoices/calc";
import type {
  PaymentMethod,
  Receipt,
  ReceiptItem,
  ReceiptItemInput,
  ReceiptStatus,
  ReceiptWithRelations,
} from "./types";
import type { Customer } from "@/lib/invoices/types";

export type ReceiptListRow = Receipt & {
  customer: Pick<Customer, "id" | "name"> | null;
  source_invoice: { id: string; invoice_number: string } | null;
};

export async function listReceipts(
  filters: {
    search?: string;
    status?: string;
    customerId?: string;
    method?: string;
    from?: string;
    to?: string;
  } = {},
): Promise<ReceiptListRow[]> {
  let q = supabase
    .from("receipts")
    .select("*, customer:customers(id,name), source_invoice:invoices(id,invoice_number)")
    .order("receipt_date", { ascending: false });

  if (filters.status && filters.status !== "all") q = q.eq("status", filters.status as ReceiptStatus);
  if (filters.method && filters.method !== "all") q = q.eq("payment_method", filters.method as PaymentMethod);
  if (filters.customerId) q = q.eq("customer_id", filters.customerId);
  if (filters.from) q = q.gte("receipt_date", filters.from);
  if (filters.to) q = q.lte("receipt_date", filters.to);
  if (filters.search && filters.search.trim()) {
    q = q.ilike("receipt_number", `%${filters.search.trim()}%`);
  }
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as unknown as ReceiptListRow[];
}

export async function getReceipt(id: string): Promise<ReceiptWithRelations | null> {
  const { data, error } = await supabase
    .from("receipts")
    .select(
      "*, customer:customers(*), company:companies(*), source_invoice:invoices(id,invoice_number), items:receipt_items(*)",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const row = data as unknown as ReceiptWithRelations;
  row.items = [...(row.items ?? [])].sort((a, b) => a.position - b.position);
  return row;
}

export async function nextReceiptNumber(userId: string): Promise<string> {
  const { data, error } = await supabase.rpc("next_receipt_number", { _user_id: userId });
  if (error) throw error;
  return (data as string) ?? "RCP-000001";
}

export type SaveReceiptPayload = {
  id?: string;
  receipt_number: string;
  receipt_date: string;
  customer_id: string | null;
  company_id: string | null;
  source_invoice_id: string | null;
  payment_method: PaymentMethod;
  payment_reference: string | null;
  currency: string;
  status: ReceiptStatus;
  amount_received: number;
  notes: string | null;
  terms: string | null;
  items: ReceiptItemInput[];
};

export async function saveReceipt(userId: string, payload: SaveReceiptPayload): Promise<Receipt> {
  const totals = calcTotals(payload.items);

  const header = {
    user_id: userId,
    receipt_number: payload.receipt_number,
    receipt_date: payload.receipt_date,
    customer_id: payload.customer_id,
    company_id: payload.company_id,
    source_invoice_id: payload.source_invoice_id,
    payment_method: payload.payment_method,
    payment_reference: payload.payment_reference,
    currency: payload.currency,
    status: payload.status,
    subtotal: totals.subtotal,
    discount_total: totals.discount_total,
    vat_total: totals.vat_total,
    grand_total: totals.grand_total,
    amount_received: payload.amount_received || totals.grand_total,
    notes: payload.notes,
    terms: payload.terms,
  };

  let receipt: Receipt;
  if (payload.id) {
    const { data, error } = await supabase
      .from("receipts")
      .update(header)
      .eq("id", payload.id)
      .select("*")
      .single();
    if (error) throw error;
    receipt = data;
    const { error: delErr } = await supabase.from("receipt_items").delete().eq("receipt_id", receipt.id);
    if (delErr) throw delErr;
  } else {
    const { data, error } = await supabase.from("receipts").insert(header).select("*").single();
    if (error) throw error;
    receipt = data;
  }

  if (payload.items.length > 0) {
    const rows = payload.items.map((it, idx) => {
      const line = calcLine(it);
      return {
        receipt_id: receipt.id,
        user_id: userId,
        position: idx,
        description: it.description,
        quantity: it.quantity,
        unit_price: it.unit_price,
        discount_value: it.discount_value,
        discount_is_percent: it.discount_is_percent,
        vat_percent: it.vat_percent,
        line_total: line.total,
      };
    });
    const { error: insErr } = await supabase.from("receipt_items").insert(rows);
    if (insErr) throw insErr;
  }

  // If linked to an invoice and status = issued, mark that invoice as paid.
  if (payload.source_invoice_id && payload.status === "issued") {
    await supabase.from("invoices").update({ status: "paid" }).eq("id", payload.source_invoice_id);
  }

  return receipt;
}

export async function deleteReceipt(id: string): Promise<void> {
  const { error } = await supabase.from("receipts").delete().eq("id", id);
  if (error) throw error;
}

export async function duplicateReceipt(userId: string, id: string): Promise<Receipt> {
  const src = await getReceipt(id);
  if (!src) throw new Error("Receipt not found");
  const number = await nextReceiptNumber(userId);
  return saveReceipt(userId, {
    receipt_number: number,
    receipt_date: new Date().toISOString().slice(0, 10),
    customer_id: src.customer_id,
    company_id: src.company_id,
    source_invoice_id: null,
    payment_method: src.payment_method as PaymentMethod,
    payment_reference: null,
    currency: src.currency,
    status: "draft",
    amount_received: Number(src.amount_received),
    notes: src.notes,
    terms: src.terms,
    items: src.items.map((it: ReceiptItem, i: number) => ({
      position: i,
      description: it.description,
      quantity: Number(it.quantity),
      unit_price: Number(it.unit_price),
      discount_value: Number(it.discount_value),
      discount_is_percent: it.discount_is_percent,
      vat_percent: Number(it.vat_percent),
    })),
  });
}

export async function updateReceiptStatus(id: string, status: ReceiptStatus): Promise<void> {
  const { error } = await supabase.from("receipts").update({ status }).eq("id", id);
  if (error) throw error;
}

/** Build a receipt payload prefilled from an invoice (used by the "Record payment" action). */
export async function buildReceiptFromInvoice(
  userId: string,
  invoiceId: string,
): Promise<SaveReceiptPayload | null> {
  const { data, error } = await supabase
    .from("invoices")
    .select("*, items:invoice_items(*)")
    .eq("id", invoiceId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  type InvoiceItemRow = {
    position: number;
    description: string;
    quantity: number;
    unit_price: number;
    discount_value: number;
    discount_is_percent: boolean;
    vat_percent: number;
  };
  const invItems = ((data as unknown as { items: InvoiceItemRow[] }).items ?? []).sort(
    (a, b) => a.position - b.position,
  );

  const number = await nextReceiptNumber(userId);
  return {
    receipt_number: number,
    receipt_date: new Date().toISOString().slice(0, 10),
    customer_id: (data as { customer_id: string | null }).customer_id,
    company_id: (data as { company_id: string | null }).company_id,
    source_invoice_id: invoiceId,
    payment_method: "cash",
    payment_reference: null,
    currency: (data as { currency: string }).currency,
    status: "issued",
    amount_received: Number((data as { grand_total: number }).grand_total),
    notes: null,
    terms: null,
    items: invItems.map((it, i) => ({
      position: i,
      description: it.description,
      quantity: Number(it.quantity),
      unit_price: Number(it.unit_price),
      discount_value: Number(it.discount_value),
      discount_is_percent: it.discount_is_percent,
      vat_percent: Number(it.vat_percent),
    })),
  };
}
