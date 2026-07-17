import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Search,
  MoreHorizontal,
  Receipt as ReceiptIcon,
  Trash2,
  Copy,
  Eye,
  Pencil,
  Download,
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
  deleteReceipt,
  duplicateReceipt,
  getReceipt,
  listReceipts,
  type ReceiptListRow,
} from "@/lib/receipts/api";
import { PAYMENT_METHOD_LABELS } from "@/lib/receipts/types";
import { formatMoney } from "@/lib/invoices/calc";
import { useAuth } from "@/lib/auth";
import { generateReceiptPDF } from "@/lib/receipts/pdf";
import { getSignedLogoUrl } from "@/lib/invoices/api";

export const Route = createFileRoute("/_authenticated/receipt/")({
  component: ReceiptListPage,
});

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  issued: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  void: "bg-destructive/15 text-destructive line-through",
};

const PAGE_SIZE = 15;

function ReceiptListPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [method, setMethod] = useState<string>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [toDelete, setToDelete] = useState<ReceiptListRow | null>(null);

  const { data: receipts = [], isLoading } = useQuery({
    queryKey: ["receipts", { search, status, method, from, to }],
    queryFn: () =>
      listReceipts({
        search,
        status,
        method,
        from: from || undefined,
        to: to || undefined,
      }),
  });

  const totals = useMemo(() => {
    const issued = receipts.filter((r) => r.status === "issued");
    const total = issued.reduce((a, r) => a + Number(r.amount_received), 0);
    return { total, count: receipts.length, issuedCount: issued.length };
  }, [receipts]);

  const totalPages = Math.max(1, Math.ceil(receipts.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = receipts.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const delMut = useMutation({
    mutationFn: (id: string) => deleteReceipt(id),
    onSuccess: () => {
      toast.success("Receipt deleted");
      qc.invalidateQueries({ queryKey: ["receipts"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const dupMut = useMutation({
    mutationFn: (id: string) => duplicateReceipt(user!.id, id),
    onSuccess: (rec) => {
      toast.success(`Duplicated as ${rec.receipt_number}`);
      qc.invalidateQueries({ queryKey: ["receipts"] });
      navigate({ to: "/receipt/$id/edit", params: { id: rec.id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleDownload = async (id: string) => {
    try {
      const full = await getReceipt(id);
      if (!full) return;
      const logoUrl = full.company?.logo_url ? await getSignedLogoUrl(full.company.logo_url) : null;
      await generateReceiptPDF(full, logoUrl);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Receipts</h1>
          <p className="text-sm text-muted-foreground">Record payments and issue receipts.</p>
        </div>
        <Button asChild>
          <Link to="/receipt/new">
            <Plus className="mr-2 h-4 w-4" /> New receipt
          </Link>
        </Button>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <StatCard label="Total receipts" value={String(totals.count)} />
        <StatCard label="Issued" value={String(totals.issuedCount)} tone="emerald" />
        <StatCard label="Received" value={formatMoney(totals.total, "USD")} tone="emerald" />
      </div>

      <div className="mt-6 rounded-xl border border-border bg-card">
        <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by receipt number"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9"
            />
          </div>
          <Select
            value={status}
            onValueChange={(v) => {
              setStatus(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="issued">Issued</SelectItem>
              <SelectItem value="void">Void</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={method}
            onValueChange={(v) => {
              setMethod(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All methods</SelectItem>
              {Object.entries(PAYMENT_METHOD_LABELS).map(([k, label]) => (
                <SelectItem key={k} value={k}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="w-[150px]"
          />
          <Input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="w-[150px]"
          />
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Number</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Amount</TableHead>
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
              ) : receipts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-14 text-center">
                    <ReceiptIcon className="mx-auto h-8 w-8 text-muted-foreground" />
                    <p className="mt-3 text-sm font-medium">No receipts yet</p>
                    <p className="text-xs text-muted-foreground">
                      Record your first payment to get started.
                    </p>
                    <Button asChild size="sm" className="mt-4">
                      <Link to="/receipt/new">
                        <Plus className="mr-1 h-4 w-4" /> New receipt
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ) : (
                paged.map((rec) => (
                  <TableRow
                    key={rec.id}
                    className="cursor-pointer"
                    onClick={() => navigate({ to: "/receipt/$id", params: { id: rec.id } })}
                  >
                    <TableCell className="font-medium">{rec.receipt_number}</TableCell>
                    <TableCell>
                      {rec.customer?.name ?? <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>{rec.receipt_date}</TableCell>
                    <TableCell className="text-xs">
                      {PAYMENT_METHOD_LABELS[rec.payment_method as keyof typeof PAYMENT_METHOD_LABELS] ??
                        rec.payment_method}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={STATUS_STYLES[rec.status] ?? ""}>
                        {rec.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatMoney(Number(rec.amount_received), rec.currency)}
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
                            onSelect={() => navigate({ to: "/receipt/$id", params: { id: rec.id } })}
                          >
                            <Eye className="mr-2 h-4 w-4" /> View
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={() =>
                              navigate({ to: "/receipt/$id/edit", params: { id: rec.id } })
                            }
                          >
                            <Pencil className="mr-2 h-4 w-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => handleDownload(rec.id)}>
                            <Download className="mr-2 h-4 w-4" /> Download PDF
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => dupMut.mutate(rec.id)}>
                            <Copy className="mr-2 h-4 w-4" /> Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onSelect={() => setToDelete(rec)}
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

        {receipts.length > PAGE_SIZE && (
          <div className="flex items-center justify-between border-t border-border p-3 text-xs text-muted-foreground">
            <span>
              Page {currentPage} of {totalPages} · {receipts.length} receipts
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete receipt {toDelete?.receipt_number}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the receipt. This action cannot be undone.
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
