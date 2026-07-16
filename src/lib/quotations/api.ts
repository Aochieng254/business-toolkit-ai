/**
 * Client-side data access for the Quotation module.
 * Modeled after src/lib/invoices/api.ts — RLS scopes to the current user.
 */
import { supabase } from "@/integrations/supabase/client";
import { calcLine, calcTotals } from "@/lib/invoices/calc";
import { saveInvoice } from "@/lib/invoices/api";
import type { Invoice } from "@/lib/invoices/types";
import type {
  Quotation,
  QuotationItem,
  QuotationItemInput,
  QuotationWithRelations,
} from "./types";

export type QuotationListRow = Quotation & {
  customer: { id: string; name: string } | null;
};

export async function listQuotations(filters: {
  search?: string;
  status?: string;
  customerId?: string;
  from?: string;
  to?: string;
} = {}): Promise<QuotationListRow[]> {
  let q = supabase
    .from("quotations")
    .select("*, customer:customers(id,name)")
    .order("quotation_date", { ascending: false });

  if (filters.status && filters.status !== "all") q = q.eq("status", filters.status as never);
  if (filters.customerId) q = q.eq("customer_id", filters.customerId);
  if (filters.from) q = q.gte("quotation_date", filters.from);
  if (filters.to) q = q.lte("quotation_date", filters.to);
  if (filters.search && filters.search.trim()) {
    q = q.ilike("quotation_number", `%${filters.search.trim()}%`);
  }
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as unknown as QuotationListRow[];
}

export async function getQuotation(id: string): Promise<QuotationWithRelations | null> {
  const { data, error } = await supabase
    .from("quotations")
    .select("*, customer:customers(*), company:companies(*), items:quotation_items(*)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const row = data as unknown as QuotationWithRelations;
  row.items = [...(row.items ?? [])].sort((a, b) => a.position - b.position);
  return row;
}

export async function nextQuotationNumber(userId: string): Promise<string> {
  const { data, error } = await supabase.rpc("next_quotation_number", { _user_id: userId });
  if (error) throw error;
  return (data as string) ?? "QUO-000001";
}

export type SaveQuotationPayload = {
  id?: string;
  quotation_number: string;
  quotation_date: string;
  valid_until: string | null;
  reference_number: string | null;
  sales_rep: string | null;
  customer_id: string | null;
  company_id: string | null;
  currency: string;
  status: Quotation["status"];
  notes: string | null;
  terms: string | null;
  items: QuotationItemInput[];
};

export async function saveQuotation(
  userId: string,
  payload: SaveQuotationPayload,
): Promise<Quotation> {
  const totals = calcTotals(payload.items);

  const header = {
    user_id: userId,
    quotation_number: payload.quotation_number,
    quotation_date: payload.quotation_date,
    valid_until: payload.valid_until,
    reference_number: payload.reference_number,
    sales_rep: payload.sales_rep,
    customer_id: payload.customer_id,
    company_id: payload.company_id,
    currency: payload.currency,
    status: payload.status,
    notes: payload.notes,
    terms: payload.terms,
    subtotal: totals.subtotal,
    discount_total: totals.discount_total,
    vat_total: totals.vat_total,
    grand_total: totals.grand_total,
  };

  let quotation: Quotation;
  if (payload.id) {
    const { data, error } = await supabase
      .from("quotations")
      .update(header)
      .eq("id", payload.id)
      .select("*")
      .single();
    if (error) throw error;
    quotation = data;
    const { error: delErr } = await supabase
      .from("quotation_items")
      .delete()
      .eq("quotation_id", quotation.id);
    if (delErr) throw delErr;
  } else {
    const { data, error } = await supabase.from("quotations").insert(header).select("*").single();
    if (error) throw error;
    quotation = data;
  }

  if (payload.items.length > 0) {
    const rows = payload.items.map((it, idx) => {
      const line = calcLine(it);
      return {
        quotation_id: quotation.id,
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
    const { error: insErr } = await supabase.from("quotation_items").insert(rows);
    if (insErr) throw insErr;
  }

  return quotation;
}

export async function deleteQuotation(id: string): Promise<void> {
  const { error } = await supabase.from("quotations").delete().eq("id", id);
  if (error) throw error;
}

export async function duplicateQuotation(userId: string, id: string): Promise<Quotation> {
  const src = await getQuotation(id);
  if (!src) throw new Error("Quotation not found");
  const number = await nextQuotationNumber(userId);
  return saveQuotation(userId, {
    quotation_number: number,
    quotation_date: new Date().toISOString().slice(0, 10),
    valid_until: src.valid_until,
    reference_number: src.reference_number,
    sales_rep: src.sales_rep,
    customer_id: src.customer_id,
    company_id: src.company_id,
    currency: src.currency,
    status: "draft",
    notes: src.notes,
    terms: src.terms,
    items: src.items.map((it: QuotationItem, i: number) => ({
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

export async function updateQuotationStatus(
  id: string,
  status: Quotation["status"],
): Promise<void> {
  const { error } = await supabase.from("quotations").update({ status }).eq("id", id);
  if (error) throw error;
}

/**
 * Convert a quotation to an invoice.
 * Creates a new draft invoice with all quotation details and items,
 * links the invoice back via `source_quotation_id`, and marks the
 * quotation as accepted with `converted_invoice_id` set.
 */
export async function convertQuotationToInvoice(
  userId: string,
  quotationId: string,
): Promise<Invoice> {
  const src = await getQuotation(quotationId);
  if (!src) throw new Error("Quotation not found");
  if (src.converted_invoice_id) {
    throw new Error("Quotation already converted");
  }

  const invoice = await saveInvoice(userId, {
    invoice_number: "", // placeholder — replaced below via next_invoice_number
    invoice_date: new Date().toISOString().slice(0, 10),
    due_date: null,
    customer_id: src.customer_id,
    company_id: src.company_id,
    currency: src.currency,
    status: "draft",
    notes: src.notes,
    terms: src.terms,
    items: src.items.map((it, i) => ({
      position: i,
      description: it.description,
      quantity: Number(it.quantity),
      unit_price: Number(it.unit_price),
      discount_value: Number(it.discount_value),
      discount_is_percent: it.discount_is_percent,
      vat_percent: Number(it.vat_percent),
    })),
    // saveInvoice requires invoice_number — get one now
    ...(await (async () => {
      const { data, error } = await supabase.rpc("next_invoice_number", { _user_id: userId });
      if (error) throw error;
      return { invoice_number: (data as string) ?? "INV-000001" };
    })()),
  });

  // Link both directions
  await supabase.from("invoices").update({ source_quotation_id: quotationId }).eq("id", invoice.id);
  await supabase
    .from("quotations")
    .update({ converted_invoice_id: invoice.id, status: "accepted" })
    .eq("id", quotationId);

  return invoice;
}
