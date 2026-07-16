import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Search,
  MoreHorizontal,
  FileSpreadsheet,
  Trash2,
  Copy,
  Eye,
  Pencil,
  Download,
  ArrowRightLeft,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  convertQuotationToInvoice,
  deleteQuotation,
  duplicateQuotation,
  getQuotation,
  listQuotations,
  type QuotationListRow,
} from "@/lib/quotations/api";
import { getSignedLogoUrl } from "@/lib/invoices/api";
import { formatMoney } from "@/lib/invoices/calc";
import { generateQuotationPDF } from "@/lib/quotations/pdf";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/quotation/")({
  component: QuotationListPage,
});

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  sent: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  accepted: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  rejected: "bg-destructive/15 text-destructive",
  expired: "bg-muted text-muted-foreground line-through",
};

function QuotationListPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [toDelete, setToDelete] = useState<QuotationListRow | null>(null);

  const { data: quotations = [], isLoading } = useQuery({
    queryKey: ["quotations", { search, status, from, to }],
    queryFn: () =>
      listQuotations({ search, status, from: from || undefined, to: to || undefined }),
  });

  const stats = useMemo(() => {
    const total = quotations.length;
    const accepted = quotations.filter((q) => q.status === "accepted").length;
    const pending = quotations.filter(
      (q) => q.status === "draft" || q.status === "sent",
    ).length;
    const converted = quotations.filter((q) => q.converted_invoice_id).length;
    const conversionRate = total > 0 ? Math.round((converted / total) * 100) : 0;
    return { total, accepted, pending, conversionRate };
  }, [quotations]);

  const delMut = useMutation({
    mutationFn: (id: string) => deleteQuotation(id),
    onSuccess: () => {
      toast.success("Quotation deleted");
      qc.invalidateQueries({ queryKey: ["quotations"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const dupMut = useMutation({
    mutationFn: (id: string) => duplicateQuotation(user!.id, id),
    onSuccess: (q) => {
      toast.success(`Duplicated as ${q.quotation_number}`);
      qc.invalidateQueries({ queryKey: ["quotations"] });
      navigate({ to: "/quotation/$id/edit", params: { id: q.id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const convertMut = useMutation({
    mutationFn: (id: string) => convertQuotationToInvoice(user!.id, id),
    onSuccess: (invoice) => {
      toast.success(`Converted to invoice ${invoice.invoice_number}`);
      qc.invalidateQueries({ queryKey: ["quotations"] });
      qc.invalidateQueries({ queryKey: ["invoices"] });
      navigate({ to: "/invoice/$id", params: { id: invoice.id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleDownload = async (id: string) => {
    try {
      const full = await getQuotation(id);
      if (!full) return;
      const logoUrl = full.company?.logo_url
        ? await getSignedLogoUrl(full.company.logo_url)
        : null;
      await generateQuotationPDF(full, logoUrl);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Quotations</h1>
          <p className="text-sm text-muted-foreground">
            Create, track, and convert quotations to invoices.
          </p>
        </div>
        <Button asChild>
          <Link to="/quotation/new">
            <Plus className="mr-2 h-4 w-4" /> New quotation
          </Link>
        </Button>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total quotations" value={String(stats.total)} />
        <StatCard label="Accepted" value={String(stats.accepted)} tone="emerald" />
        <StatCard label="Pending" value={String(stats.pending)} tone="amber" />
        <StatCard label="Conversion rate" value={`${stats.conversionRate}%`} />
      </div>

      <div className="mt-6 rounded-xl border border-border bg-card">
        <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by quotation number"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="accepted">Accepted</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
            </SelectContent>
          </Select>
          <Input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="w-[160px]"
          />
          <Input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="w-[160px]"
          />
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Number</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Valid until</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center text-sm text-muted-foreground">
                    Loading…
                  </TableCell>
                </TableRow>
              ) : quotations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-14 text-center">
                    <FileSpreadsheet className="mx-auto h-8 w-8 text-muted-foreground" />
                    <p className="mt-3 text-sm font-medium">No quotations yet</p>
                    <p className="text-xs text-muted-foreground">
                      Create your first quotation to get started.
                    </p>
                    <Button asChild size="sm" className="mt-4">
                      <Link to="/quotation/new">
                        <Plus className="mr-1 h-4 w-4" /> New quotation
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ) : (
                quotations.map((q) => (
                  <TableRow
                    key={q.id}
                    className="cursor-pointer"
                    onClick={() => navigate({ to: "/quotation/$id", params: { id: q.id } })}
                  >
                    <TableCell className="font-medium">{q.quotation_number}</TableCell>
                    <TableCell>
                      {q.customer?.name ?? <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>{q.quotation_date}</TableCell>
                    <TableCell>{q.valid_until ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={STATUS_STYLES[q.status] ?? ""}>
                        {q.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatMoney(Number(q.grand_total), q.currency)}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onSelect={() =>
                              navigate({ to: "/quotation/$id", params: { id: q.id } })
                            }
                          >
                            <Eye className="mr-2 h-4 w-4" /> View
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={() =>
                              navigate({ to: "/quotation/$id/edit", params: { id: q.id } })
                            }
                          >
                            <Pencil className="mr-2 h-4 w-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => handleDownload(q.id)}>
                            <Download className="mr-2 h-4 w-4" /> Download PDF
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => dupMut.mutate(q.id)}>
                            <Copy className="mr-2 h-4 w-4" /> Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={!!q.converted_invoice_id}
                            onSelect={() => convertMut.mutate(q.id)}
                          >
                            <ArrowRightLeft className="mr-2 h-4 w-4" />
                            {q.converted_invoice_id ? "Already converted" : "Convert to invoice"}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onSelect={() => setToDelete(q)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete quotation {toDelete?.quotation_number}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the quotation and its line items. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (toDelete) delMut.mutate(toDelete.id);
                setToDelete(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "emerald" | "amber";
}) {
  const toneClass =
    tone === "emerald"
      ? "text-emerald-600 dark:text-emerald-400"
      : tone === "amber"
        ? "text-amber-600 dark:text-amber-400"
        : "";
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${toneClass}`}>{value}</p>
    </div>
  );
}
