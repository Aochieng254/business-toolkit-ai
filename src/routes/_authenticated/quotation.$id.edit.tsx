import { createFileRoute, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { QuotationForm } from "@/components/quotation/quotation-form";
import { getQuotation } from "@/lib/quotations/api";

export const Route = createFileRoute("/_authenticated/quotation/$id/edit")({
  component: EditQuotationPage,
});

function EditQuotationPage() {
  const { id } = useParams({ from: "/_authenticated/quotation/$id/edit" });
  const { data, isLoading } = useQuery({
    queryKey: ["quotation", id],
    queryFn: () => getQuotation(id),
  });

  if (isLoading) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  if (!data) return <div className="p-6 text-sm text-muted-foreground">Quotation not found.</div>;
  return <QuotationForm mode="edit" initial={data} />;
}
