import { createFileRoute } from "@tanstack/react-router";
import { InvoiceForm } from "@/components/invoice/invoice-form";

export const Route = createFileRoute("/_authenticated/invoice/new")({
  component: () => <InvoiceForm mode="create" />,
});
