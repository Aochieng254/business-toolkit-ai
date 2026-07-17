import { createFileRoute } from "@tanstack/react-router";
import { ReceiptForm } from "@/components/receipt/receipt-form";

export const Route = createFileRoute("/_authenticated/receipt/new")({
  validateSearch: (s: Record<string, unknown>): { from_invoice?: string } => ({
    from_invoice: typeof s.from_invoice === "string" ? s.from_invoice : undefined,
  }),
  component: () => <ReceiptForm mode="create" />,
});
