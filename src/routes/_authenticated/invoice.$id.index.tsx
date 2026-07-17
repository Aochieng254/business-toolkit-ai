import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Copy, Download, Pencil, Receipt as ReceiptIcon, Trash2 } from "lucide-react";
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
  deleteInvoice,
  duplicateInvoice,
  getInvoice,
  getSignedLogoUrl,
  updateInvoiceStatus,
} from "@/lib/invoices/api";
import { calcLine, formatMoney } from "@/lib/invoices/calc";
import { generateInvoicePDF } from "@/lib/invoices/pdf";
import { useAuth } from "@/lib/auth";
import type { Invoice } from "@/lib/invoices/types";

export const Route = createFileRoute("/_authenticated/invoice/$id/")({
  component: ViewInvoicePage,
});

function ViewInvoicePage() {
  const { id } = useParams({ from: "/_authenticated/invoice/$id/" });
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: invoice, isLoading } = useQuery({
    queryKey: ["invoice", id],
    queryFn: () => getInvoice(id),
  });

  const statusMut = useMutation({
    mutationFn: (status: Invoice["status"]) => updateInvoiceStatus(id, status),
    onSuccess: () => {
      toast.success("Status updated");
      qc.invalidateQueries({ queryKey: ["invoice", id] });
      qc.invalidateQueries({ queryKey: ["invoices"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const dupMut = useMutation({
    mutationFn: () => duplicateInvoice(user!.id, id),
    onSuccess: (inv) => {
      toast.success(`Duplicated as ${inv.invoice_number}`);
      navigate({ to: "/invoice/$id/edit", params: { id: inv.id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delMut = useMutation({
    mutationFn: () => deleteInvoice(id),
    onSuccess: () => {
      toast.success("Invoice deleted");
      qc.invalidateQueries({ queryKey: ["invoices"] });
      navigate({ to: "/invoice" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) {
    return <div className="mx-auto max-w-4xl p-6 text-sm text-muted-foreground">Loading…</div>;
  }
  if (!invoice) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <p className="text-sm text-muted-foreground">Invoice not found.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate({ to: "/invoice" })}>
          Back to invoices
        </Button>
      </div>
    );
  }

  const c = invoice.currency;

  const downloadPdf = async () => {
    try {
      const logoUrl = invoice.company?.logo_url ? await getSignedLogoUrl(invoice.company.logo_url) : null;
      await generateInvoicePDF(invoice, logoUrl);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/invoice" })}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Back
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={invoice.status} onValueChange={(v) => statusMut.mutate(v as Invoice["status"])}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={downloadPdf}>
            <Download className="mr-2 h-4 w-4" /> PDF
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              navigate({ to: "/receipt/new", search: { from_invoice: id } })
            }
          >
            <ReceiptIcon className="mr-2 h-4 w-4" /> Record payment
          </Button>
          <Button variant="outline" onClick={() => dupMut.mutate()}>
            <Copy className="mr-2 h-4 w-4" /> Duplicate
          </Button>
          <Button onClick={() => navigate({ to: "/invoice/$id/edit", params: { id } })}>
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
                <AlertDialogTitle>Delete this invoice?</AlertDialogTitle>
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

      {/* Printable-style card */}
      <div className="rounded-xl border border-border bg-card p-8 shadow-elegant">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            {invoice.company?.name && <h2 className="text-xl font-bold">{invoice.company.name}</h2>}
            <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
              {invoice.company?.address && <p>{invoice.company.address}</p>}
              {invoice.company?.phone && <p>{invoice.company.phone}</p>}
              {invoice.company?.email && <p>{invoice.company.email}</p>}
              {invoice.company?.website && <p>{invoice.company.website}</p>}
              {invoice.company?.tax_number && <p>Tax: {invoice.company.tax_number}</p>}
            </div>
          </div>
          <div className="text-right">
            <h1 className="text-2xl font-bold tracking-tight">INVOICE</h1>
            <p className="mt-1 text-sm font-medium">{invoice.invoice_number}</p>
            <Badge variant="secondary" className="mt-2">{invoice.status}</Badge>
            <div className="mt-3 text-xs text-muted-foreground">
              <p>Date: {invoice.invoice_date}</p>
              {invoice.due_date && <p>Due: {invoice.due_date}</p>}
            </div>
          </div>
        </div>

        {invoice.customer && (
          <div className="mt-8">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Bill To</p>
            <p className="mt-1 font-semibold">{invoice.customer.name}</p>
            <div className="text-xs text-muted-foreground">
              {invoice.customer.address && <p>{invoice.customer.address}</p>}
              {invoice.customer.phone && <p>{invoice.customer.phone}</p>}
              {invoice.customer.email && <p>{invoice.customer.email}</p>}
              {invoice.customer.tax_number && <p>Tax: {invoice.customer.tax_number}</p>}
            </div>
          </div>
        )}

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
              {invoice.items.map((it) => {
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
                    <TableCell className="max-w-md whitespace-pre-wrap">{it.description || "—"}</TableCell>
                    <TableCell className="text-right">{Number(it.quantity)}</TableCell>
                    <TableCell className="text-right">{formatMoney(Number(it.unit_price), c)}</TableCell>
                    <TableCell className="text-right">
                      {it.discount_is_percent
                        ? `${Number(it.discount_value)}%`
                        : formatMoney(Number(it.discount_value), c)}
                    </TableCell>
                    <TableCell className="text-right">{Number(it.vat_percent)}%</TableCell>
                    <TableCell className="text-right font-medium">{formatMoney(line.total, c)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        <div className="mt-6 flex justify-end">
          <div className="w-full max-w-xs space-y-1 text-sm">
            <TotalRow label="Subtotal" value={formatMoney(Number(invoice.subtotal), c)} />
            <TotalRow label="Discount" value={`- ${formatMoney(Number(invoice.discount_total), c)}`} />
            <TotalRow label="VAT" value={formatMoney(Number(invoice.vat_total), c)} />
            <div className="mt-2 border-t border-border pt-2">
              <TotalRow label="Grand total" value={formatMoney(Number(invoice.grand_total), c)} bold />
            </div>
          </div>
        </div>

        {(invoice.notes || invoice.terms) && (
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            {invoice.notes && (
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Notes</p>
                <p className="mt-1 whitespace-pre-wrap text-sm">{invoice.notes}</p>
              </div>
            )}
            {invoice.terms && (
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Terms</p>
                <p className="mt-1 whitespace-pre-wrap text-sm">{invoice.terms}</p>
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
