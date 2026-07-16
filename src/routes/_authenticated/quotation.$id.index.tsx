import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRightLeft,
  Copy,
  Download,
  Pencil,
  Printer,
  Trash2,
} from "lucide-react";
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
  convertQuotationToInvoice,
  deleteQuotation,
  duplicateQuotation,
  getQuotation,
  updateQuotationStatus,
} from "@/lib/quotations/api";
import { getSignedLogoUrl } from "@/lib/invoices/api";
import { calcLine, formatMoney } from "@/lib/invoices/calc";
import { generateQuotationPDF } from "@/lib/quotations/pdf";
import { useAuth } from "@/lib/auth";
import type { Quotation } from "@/lib/quotations/types";

export const Route = createFileRoute("/_authenticated/quotation/$id/")({
  component: ViewQuotationPage,
});

function ViewQuotationPage() {
  const { id } = useParams({ from: "/_authenticated/quotation/$id/" });
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: quotation, isLoading } = useQuery({
    queryKey: ["quotation", id],
    queryFn: () => getQuotation(id),
  });

  const statusMut = useMutation({
    mutationFn: (status: Quotation["status"]) => updateQuotationStatus(id, status),
    onSuccess: () => {
      toast.success("Status updated");
      qc.invalidateQueries({ queryKey: ["quotation", id] });
      qc.invalidateQueries({ queryKey: ["quotations"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const dupMut = useMutation({
    mutationFn: () => duplicateQuotation(user!.id, id),
    onSuccess: (q) => {
      toast.success(`Duplicated as ${q.quotation_number}`);
      navigate({ to: "/quotation/$id/edit", params: { id: q.id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delMut = useMutation({
    mutationFn: () => deleteQuotation(id),
    onSuccess: () => {
      toast.success("Quotation deleted");
      qc.invalidateQueries({ queryKey: ["quotations"] });
      navigate({ to: "/quotation" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const convertMut = useMutation({
    mutationFn: () => convertQuotationToInvoice(user!.id, id),
    onSuccess: (invoice) => {
      toast.success(`Converted to invoice ${invoice.invoice_number}`);
      qc.invalidateQueries({ queryKey: ["quotation", id] });
      qc.invalidateQueries({ queryKey: ["quotations"] });
      qc.invalidateQueries({ queryKey: ["invoices"] });
      navigate({ to: "/invoice/$id", params: { id: invoice.id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) {
    return <div className="mx-auto max-w-4xl p-6 text-sm text-muted-foreground">Loading…</div>;
  }
  if (!quotation) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <p className="text-sm text-muted-foreground">Quotation not found.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate({ to: "/quotation" })}>
          Back to quotations
        </Button>
      </div>
    );
  }

  const c = quotation.currency;

  const downloadPdf = async () => {
    try {
      const logoUrl = quotation.company?.logo_url
        ? await getSignedLogoUrl(quotation.company.logo_url)
        : null;
      await generateQuotationPDF(quotation, logoUrl);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 print:hidden">
        <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/quotation" })}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Back
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={quotation.status}
            onValueChange={(v) => statusMut.mutate(v as Quotation["status"])}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="accepted">Accepted</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
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
          <Button
            variant="outline"
            disabled={!!quotation.converted_invoice_id || convertMut.isPending}
            onClick={() => convertMut.mutate()}
          >
            <ArrowRightLeft className="mr-2 h-4 w-4" />
            {quotation.converted_invoice_id ? "Converted" : "Convert to invoice"}
          </Button>
          <Button onClick={() => navigate({ to: "/quotation/$id/edit", params: { id } })}>
            <Pencil className="mr-2 h-4 w-4" /> Edit
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this quotation?</AlertDialogTitle>
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

      {quotation.converted_invoice_id && (
        <div className="mb-4 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-400 print:hidden">
          Converted to an invoice.{" "}
          <Link
            to="/invoice/$id"
            params={{ id: quotation.converted_invoice_id }}
            className="underline"
          >
            View invoice
          </Link>
        </div>
      )}

      <div className="rounded-xl border border-border bg-card p-8 shadow-elegant print:border-0 print:shadow-none">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            {quotation.company?.name && (
              <h2 className="text-xl font-bold">{quotation.company.name}</h2>
            )}
            <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
              {quotation.company?.address && <p>{quotation.company.address}</p>}
              {quotation.company?.phone && <p>{quotation.company.phone}</p>}
              {quotation.company?.email && <p>{quotation.company.email}</p>}
              {quotation.company?.website && <p>{quotation.company.website}</p>}
              {quotation.company?.tax_number && <p>Tax: {quotation.company.tax_number}</p>}
            </div>
          </div>
          <div className="text-right">
            <h1 className="text-2xl font-bold tracking-tight">QUOTATION</h1>
            <p className="mt-1 text-sm font-medium">{quotation.quotation_number}</p>
            <Badge variant="secondary" className="mt-2">
              {quotation.status}
            </Badge>
            <div className="mt-3 text-xs text-muted-foreground">
              <p>Date: {quotation.quotation_date}</p>
              {quotation.valid_until && <p>Valid until: {quotation.valid_until}</p>}
              {quotation.reference_number && <p>Ref: {quotation.reference_number}</p>}
            </div>
          </div>
        </div>

        {quotation.customer && (
          <div className="mt-8">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Prepared For</p>
            <p className="mt-1 font-semibold">{quotation.customer.name}</p>
            <div className="text-xs text-muted-foreground">
              {quotation.customer.address && <p>{quotation.customer.address}</p>}
              {quotation.customer.phone && <p>{quotation.customer.phone}</p>}
              {quotation.customer.email && <p>{quotation.customer.email}</p>}
              {quotation.customer.tax_number && <p>Tax: {quotation.customer.tax_number}</p>}
            </div>
          </div>
        )}

        {quotation.sales_rep && (
          <p className="mt-4 text-xs text-muted-foreground">
            Sales representative:{" "}
            <span className="font-medium text-foreground">{quotation.sales_rep}</span>
          </p>
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
              {quotation.items.map((it) => {
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

        <div className="mt-6 flex justify-end">
          <div className="w-full max-w-xs space-y-1 text-sm">
            <TotalRow label="Subtotal" value={formatMoney(Number(quotation.subtotal), c)} />
            <TotalRow
              label="Discount"
              value={`- ${formatMoney(Number(quotation.discount_total), c)}`}
            />
            <TotalRow label="VAT" value={formatMoney(Number(quotation.vat_total), c)} />
            <div className="mt-2 border-t border-border pt-2">
              <TotalRow
                label="Grand total"
                value={formatMoney(Number(quotation.grand_total), c)}
                bold
              />
            </div>
          </div>
        </div>

        {(quotation.notes || quotation.terms) && (
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            {quotation.notes && (
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Notes</p>
                <p className="mt-1 whitespace-pre-wrap text-sm">{quotation.notes}</p>
              </div>
            )}
            {quotation.terms && (
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Terms</p>
                <p className="mt-1 whitespace-pre-wrap text-sm">{quotation.terms}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function TotalRow({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div
      className={`flex justify-between ${bold ? "text-base font-bold" : "text-muted-foreground"}`}
    >
      <span>{label}</span>
      <span className={bold ? "text-foreground" : ""}>{value}</span>
    </div>
  );
}
