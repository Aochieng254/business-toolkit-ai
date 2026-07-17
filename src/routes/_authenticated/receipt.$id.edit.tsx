import { createFileRoute, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ReceiptForm } from "@/components/receipt/receipt-form";
import { getReceipt } from "@/lib/receipts/api";

export const Route = createFileRoute("/_authenticated/receipt/$id/edit")({
  component: EditReceiptPage,
});

function EditReceiptPage() {
  const { id } = useParams({ from: "/_authenticated/receipt/$id/edit" });
  const { data, isLoading } = useQuery({ queryKey: ["receipt", id], queryFn: () => getReceipt(id) });

  if (isLoading) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  if (!data) return <div className="p-6 text-sm text-muted-foreground">Receipt not found.</div>;
  return <ReceiptForm mode="edit" initial={data} />;
}
