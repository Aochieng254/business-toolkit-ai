import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Copy, Download, Pencil, Printer, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  deleteReceipt,
  duplicateReceipt,
  getReceipt,
  updateReceiptStatus,
} from "@/lib/receipts/api";
import { getSignedLogoUrl } from "@/lib/invoices/api";
import { calcLine, formatMoney } from "@/lib/invoices/calc";
import { generateReceiptPDF } from "@/lib/receipts/pdf";
import { useAuth } from "@/lib/auth";
import type { Receipt } from "@/lib/receipts/types";
import { PAYMENT_METHOD_LABELS, type PaymentMethod } from "@/lib/receipts/types";

export const Route = createFileRoute("/_authenticated/receipt/$id/")({
  component: ViewReceiptPage,
});

function ViewReceiptPage() {
  const { id } = useParams({ from: "/_authenticated/receipt/$id/" });
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: receipt, isLoading } = useQuery({
    queryKey: ["receipt", id],
    queryFn: () => getReceipt(id),
  });

  const statusMut = useMutation({
    mutationFn: (status: Receipt["status"]) => updateReceiptStatus(id, status),
    onSuccess: () => {
      toast.success("Status updated");
      qc.invalidateQueries({ queryKey: ["receipt", id] });
      qc.invalidateQueries({ queryKey: ["receipts"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const dupMut = useMutation({
    mutationFn: () => duplicateReceipt(user!.id, id),
    onSuccess: (rec) => {
      toast.success(`Duplicated as ${rec.receipt_number}`);
      navigate({ to: "/receipt/$id/edit", params: { id: rec.id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delMut = useMutation({
    mutationFn: () => deleteReceipt(id),
    onSuccess: () => {
      toast.success("Receipt deleted");
      qc.invalidateQueries({ queryKey: ["receipts"] });
      navigate({ to: "/receipt" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) {
    return <div className="mx-auto max-w-4xl p-6 text-sm text-muted-foreground">Loading…</div>;
  }
  if (!receipt) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <p className="text-sm text-muted-foreground">Receipt not found.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate({ to: "/receipt" })}>
          Back to receipts
        </Button>
      </div>
    );
  }

  const c = receipt.currency;

  const downloadPdf = async () => {
    try {
      const logoUrl = receipt.company?.logo_url ? await getSignedLogoUrl(receipt.company.logo_url) : null;
      await generateReceiptPDF(receipt, logoUrl);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 print:hidden">
        <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/receipt" })}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Back
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={receipt.status}
            onValueChange={(v) => statusMut.mutate(v as Receipt["status"])}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="issued">Issued</SelectItem>
              <SelectItem value="void">Void</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" /> Print
          </Button>
          <Button variant="outline" onClick={downloadPdf}>
            <Download className="mr-2 h-4 w-4" /> PDF
          </Button>
          <Button variant="outline" onClick={() => dupMut.mutate()}>
            <Copy className="mr-2 h-4 w-4" /> Duplicate
          </Button>
          <Button onClick={() => navigate({ to: "/receipt/$id/edit", params: { id } })}>
            <Pencil className="mr-2 h-4 w-4" /> Edit
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this receipt?</AlertDialogTitle>
                <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => delMut.mutate()}>Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-8 shadow-elegant print:border-0 print:shadow-none">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            {receipt.company?.name && <h2 className="text-xl font-bold">{receipt.company.name}</h2>}
            <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
              {receipt.company?.address && <p>{receipt.company.address}</p>}
              {receipt.company?.phone && <p>{receipt.company.phone}</p>}
              {receipt.company?.email && <p>{receipt.company.email}</p>}
              {receipt.company?.website && <p>{receipt.company.website}</p>}
              {receipt.company?.tax_number && <p>Tax: {receipt.company.tax_number}</p>}
            </div>
          </div>
          <div className="text-right">
            <h1 className="text-2xl font-bold tracking-tight">RECEIPT</h1>
            <p className="mt-1 text-sm font-medium">{receipt.receipt_number}</p>
            <Badge variant="secondary" className="mt-2">
              {receipt.status}
            </Badge>
            <div className="mt-3 text-xs text-muted-foreground">
              <p>Date: {receipt.receipt_date}</p>
              {receipt.source_invoice && (
                <p>
                  For:{" "}
                  <Link
                    to="/invoice/$id"
                    params={{ id: receipt.source_invoice.id }}
                    className="text-primary underline"
                  >
                    {receipt.source_invoice.invoice_number}
                  </Link>
                </p>
              )}
            </div>
          </div>
        </div>

        {receipt.customer && (
          <div className="mt-8">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Received From</p>
            <p className="mt-1 font-semibold">{receipt.customer.name}</p>
            <div className="text-xs text-muted-foreground">
              {receipt.customer.address && <p>{receipt.customer.address}</p>}
              {receipt.customer.phone && <p>{receipt.customer.phone}</p>}
              {receipt.customer.email && <p>{receipt.customer.email}</p>}
              {receipt.customer.tax_number && <p>Tax: {receipt.customer.tax_number}</p>}
            </div>
          </div>
        )}

        <div className="mt-6 grid gap-4 rounded-lg border border-border bg-muted/30 p-4 sm:grid-cols-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Method</p>
            <p className="mt-1 text-sm font-medium">
              {PAYMENT_METHOD_LABELS[receipt.payment_method as PaymentMethod] ?? receipt.payment_method}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Reference</p>
            <p className="mt-1 text-sm">{receipt.payment_reference ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Amount received</p>
            <p className="mt-1 text-sm font-semibold">
              {formatMoney(Number(receipt.amount_received), c)}
            </p>
          </div>
        </div>

        {receipt.items.length > 0 && (
          <div className="mt-8 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Disc</TableHead>
                  <TableHead className="text-right">VAT %</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {receipt.items.map((it) => {
                  const line = calcLine({
                    position: it.position,
                    description: it.description,
                    quantity: Number(it.quantity),
                    unit_price: Number(it.unit_price),
                    discount_value: Number(it.discount_value),
                    discount_is_percent: it.discount_is_percent,
                    vat_percent: Number(it.vat_percent),
                  });
                  return (
                    <TableRow key={it.id}>
                      <TableCell className="max-w-md whitespace-pre-wrap">
                        {it.description || "—"}
                      </TableCell>
                      <TableCell className="text-right">{Number(it.quantity)}</TableCell>
                      <TableCell className="text-right">
                        {formatMoney(Number(it.unit_price), c)}
                      </TableCell>
                      <TableCell className="text-right">
                        {it.discount_is_percent
                          ? `${Number(it.discount_value)}%`
                          : formatMoney(Number(it.discount_value), c)}
                      </TableCell>
                      <TableCell className="text-right">{Number(it.vat_percent)}%</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatMoney(line.total, c)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <div className="w-full max-w-xs space-y-1 text-sm">
            {Number(receipt.subtotal) > 0 && (
              <>
                <TotalRow label="Subtotal" value={formatMoney(Number(receipt.subtotal), c)} />
                <TotalRow
                  label="Discount"
                  value={`- ${formatMoney(Number(receipt.discount_total), c)}`}
                />
                <TotalRow label="VAT" value={formatMoney(Number(receipt.vat_total), c)} />
              </>
            )}
            <div className="mt-2 border-t border-border pt-2">
              <TotalRow
                label="Amount received"
                value={formatMoney(Number(receipt.amount_received), c)}
                bold
              />
            </div>
          </div>
        </div>

        {receipt.status === "issued" && (
          <div className="mt-6 inline-flex items-center rounded-lg border-2 border-emerald-500/70 bg-emerald-500/10 px-4 py-2 text-lg font-bold tracking-widest text-emerald-600 dark:text-emerald-400">
            PAID
          </div>
        )}
        {receipt.status === "void" && (
          <div className="mt-6 inline-flex items-center rounded-lg border-2 border-destructive/70 bg-destructive/10 px-4 py-2 text-lg font-bold tracking-widest text-destructive">
            VOID
          </div>
        )}

        {(receipt.notes || receipt.terms) && (
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            {receipt.notes && (
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Notes</p>
                <p className="mt-1 whitespace-pre-wrap text-sm">{receipt.notes}</p>
              </div>
            )}
            {receipt.terms && (
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Terms</p>
                <p className="mt-1 whitespace-pre-wrap text-sm">{receipt.terms}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function TotalRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? "text-base font-bold" : "text-muted-foreground"}`}>
      <span>{label}</span>
      <span className={bold ? "text-foreground" : ""}>{value}</span>
    </div>
  );
}
