import type { Tables } from "@/integrations/supabase/types";

export type Company = Tables<"companies">;
export type Customer = Tables<"customers">;
export type Invoice = Tables<"invoices">;
export type InvoiceItem = Tables<"invoice_items">;

export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue" | "cancelled";

export type InvoiceItemInput = {
  id?: string;
  position: number;
  description: string;
  quantity: number;
  unit_price: number;
  discount_value: number;
  discount_is_percent: boolean;
  vat_percent: number;
};

export type InvoiceWithRelations = Invoice & {
  customer: Customer | null;
  company: Company | null;
  items: InvoiceItem[];
};
