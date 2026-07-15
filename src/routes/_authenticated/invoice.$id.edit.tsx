import { createFileRoute, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { InvoiceForm } from "@/components/invoice/invoice-form";
import { getInvoice } from "@/lib/invoices/api";

export const Route = createFileRoute("/_authenticated/invoice/$id/edit")({
  component: EditInvoicePage,
});

function EditInvoicePage() {
  const { id } = useParams({ from: "/_authenticated/invoice/$id/edit" });
  const { data, isLoading } = useQuery({ queryKey: ["invoice", id], queryFn: () => getInvoice(id) });

  if (isLoading) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  if (!data) return <div className="p-6 text-sm text-muted-foreground">Invoice not found.</div>;
  return <InvoiceForm mode="edit" initial={data} />;
}
