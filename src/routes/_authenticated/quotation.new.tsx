import { createFileRoute } from "@tanstack/react-router";
import { QuotationForm } from "@/components/quotation/quotation-form";

export const Route = createFileRoute("/_authenticated/quotation/new")({
  component: () => <QuotationForm mode="create" />,
});
