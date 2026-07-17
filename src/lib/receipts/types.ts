import type { Tables } from "@/integrations/supabase/types";
import type { Company, Customer } from "@/lib/invoices/types";

export type Receipt = Tables<"receipts">;
export type ReceiptItem = Tables<"receipt_items">;

export type ReceiptStatus = "draft" | "issued" | "void";
export type PaymentMethod =
  | "cash"
  | "bank_transfer"
  | "card"
  | "mpesa"
  | "cheque"
  | "paypal"
  | "stripe"
  | "other";

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: "Cash",
  bank_transfer: "Bank transfer",
  card: "Card",
  mpesa: "M-Pesa",
  cheque: "Cheque",
  paypal: "PayPal",
  stripe: "Stripe",
  other: "Other",
};

export type ReceiptItemInput = {
  id?: string;
  position: number;
  description: string;
  quantity: number;
  unit_price: number;
  discount_value: number;
  discount_is_percent: boolean;
  vat_percent: number;
};

export type ReceiptWithRelations = Receipt & {
  customer: Customer | null;
  company: Company | null;
  source_invoice: { id: string; invoice_number: string } | null;
  items: ReceiptItem[];
};
