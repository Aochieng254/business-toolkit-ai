/**
 * Client-side data access for the Invoice module.
 * All calls go through the browser Supabase client, so RLS scopes reads/writes
 * to the current user automatically.
 */
import { supabase } from "@/integrations/supabase/client";
import type { Company, Customer, Invoice, InvoiceItem, InvoiceItemInput, InvoiceWithRelations } from "./types";
import { calcLine, calcTotals } from "./calc";

// ─── Company ────────────────────────────────────────────────────────────────

export async function getCompany(): Promise<Company | null> {
  const { data, error } = await supabase
    .from("companies")
    .select("*")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function upsertCompany(
  userId: string,
  patch: Partial<Company> & { name: string },
  existingId?: string,
): Promise<Company> {
  if (existingId) {
    const { data, error } = await supabase
      .from("companies")
      .update(patch)
      .eq("id", existingId)
      .select("*")
      .single();
    if (error) throw error;
    return data;
  }
  const { data, error } = await supabase
    .from("companies")
    .insert({ ...patch, user_id: userId })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function uploadCompanyLogo(userId: string, file: File): Promise<string> {
  const ext = file.name.split(".").pop() ?? "png";
  const path = `${userId}/logo-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("company-logos").upload(path, file, {
    cacheControl: "3600",
    upsert: true,
    contentType: file.type,
  });
  if (error) throw error;
  return path;
}

export async function getSignedLogoUrl(path: string): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await supabase.storage.from("company-logos").createSignedUrl(path, 60 * 60);
  if (error) return null;
  return data.signedUrl;
}

// ─── Customers ──────────────────────────────────────────────────────────────

export async function listCustomers(search?: string): Promise<Customer[]> {
  let q = supabase.from("customers").select("*").order("name", { ascending: true });
  if (search && search.trim()) {
    q = q.ilike("name", `%${search.trim()}%`);
  }
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function createCustomer(userId: string, patch: Partial<Customer> & { name: string }): Promise<Customer> {
  const { data, error } = await supabase
    .from("customers")
    .insert({ ...patch, user_id: userId })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function updateCustomer(id: string, patch: Partial<Customer>): Promise<Customer> {
  const { data, error } = await supabase
    .from("customers")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function deleteCustomer(id: string): Promise<void> {
  const { error } = await supabase.from("customers").delete().eq("id", id);
  if (error) throw error;
}

// ─── Invoices ───────────────────────────────────────────────────────────────

export type InvoiceListRow = Invoice & { customer: Pick<Customer, "id" | "name"> | null };

export async function listInvoices(filters: {
  search?: string;
  status?: string;
  customerId?: string;
  from?: string;
  to?: string;
} = {}): Promise<InvoiceListRow[]> {
  let q = supabase
    .from("invoices")
    .select("*, customer:customers(id,name)")
    .order("invoice_date", { ascending: false });

  if (filters.status && filters.status !== "all") q = q.eq("status", filters.status as never);
  if (filters.customerId) q = q.eq("customer_id", filters.customerId);
  if (filters.from) q = q.gte("invoice_date", filters.from);
  if (filters.to) q = q.lte("invoice_date", filters.to);
  if (filters.search && filters.search.trim()) {
    q = q.ilike("invoice_number", `%${filters.search.trim()}%`);
  }
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as unknown as InvoiceListRow[];
}

export async function getInvoice(id: string): Promise<InvoiceWithRelations | null> {
  const { data, error } = await supabase
    .from("invoices")
    .select("*, customer:customers(*), company:companies(*), items:invoice_items(*)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  // Sort items by position for stability.
  const row = data as unknown as InvoiceWithRelations;
  row.items = [...(row.items ?? [])].sort((a, b) => a.position - b.position);
  return row;
}

export async function nextInvoiceNumber(userId: string): Promise<string> {
  const { data, error } = await supabase.rpc("next_invoice_number", { _user_id: userId });
  if (error) throw error;
  return (data as string) ?? "INV-000001";
}

export type SaveInvoicePayload = {
  id?: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string | null;
  customer_id: string | null;
  company_id: string | null;
  currency: string;
  status: Invoice["status"];
  notes: string | null;
  terms: string | null;
  items: InvoiceItemInput[];
};

export async function saveInvoice(userId: string, payload: SaveInvoicePayload): Promise<Invoice> {
  const totals = calcTotals(payload.items);

  const header = {
    user_id: userId,
    invoice_number: payload.invoice_number,
    invoice_date: payload.invoice_date,
    due_date: payload.due_date,
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

  let invoice: Invoice;
  if (payload.id) {
    const { data, error } = await supabase
      .from("invoices")
      .update(header)
      .eq("id", payload.id)
      .select("*")
      .single();
    if (error) throw error;
    invoice = data;
    // Replace all items (simple + safe).
    const { error: delErr } = await supabase.from("invoice_items").delete().eq("invoice_id", invoice.id);
    if (delErr) throw delErr;
  } else {
    const { data, error } = await supabase.from("invoices").insert(header).select("*").single();
    if (error) throw error;
    invoice = data;
  }

  if (payload.items.length > 0) {
    const rows = payload.items.map((it, idx) => {
      const line = calcLine(it);
      return {
        invoice_id: invoice.id,
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
    const { error: insErr } = await supabase.from("invoice_items").insert(rows);
    if (insErr) throw insErr;
  }

  return invoice;
}

export async function deleteInvoice(id: string): Promise<void> {
  const { error } = await supabase.from("invoices").delete().eq("id", id);
  if (error) throw error;
}

export async function duplicateInvoice(userId: string, id: string): Promise<Invoice> {
  const src = await getInvoice(id);
  if (!src) throw new Error("Invoice not found");
  const number = await nextInvoiceNumber(userId);
  return saveInvoice(userId, {
    invoice_number: number,
    invoice_date: new Date().toISOString().slice(0, 10),
    due_date: src.due_date,
    customer_id: src.customer_id,
    company_id: src.company_id,
    currency: src.currency,
    status: "draft",
    notes: src.notes,
    terms: src.terms,
    items: src.items.map((it: InvoiceItem, i: number) => ({
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

export async function updateInvoiceStatus(id: string, status: Invoice["status"]): Promise<void> {
  const { error } = await supabase.from("invoices").update({ status }).eq("id", id);
  if (error) throw error;
}
