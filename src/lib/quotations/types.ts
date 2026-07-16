import type { Tables } from "@/integrations/supabase/types";
import type { Company, Customer } from "@/lib/invoices/types";

export type Quotation = Tables<"quotations">;
export type QuotationItem = Tables<"quotation_items">;

export type QuotationStatus = "draft" | "sent" | "accepted" | "rejected" | "expired";

export type QuotationItemInput = {
  id?: string;
  position: number;
  description: string;
  quantity: number;
  unit_price: number;
  discount_value: number;
  discount_is_percent: boolean;
  vat_percent: number;
};

export type QuotationWithRelations = Quotation & {
  customer: Customer | null;
  company: Company | null;
  items: QuotationItem[];
};
