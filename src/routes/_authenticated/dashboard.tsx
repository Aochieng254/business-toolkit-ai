import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  FileText,
  FileSpreadsheet,
  Receipt,
  Wallet,
  UserSquare2,
  Mail,
  Sparkles,
  Calculator,
  Bot,
  ArrowRight,
  FolderOpen,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { listQuotations } from "@/lib/quotations/api";
import { listReceipts } from "@/lib/receipts/api";
import { formatMoney } from "@/lib/invoices/calc";
import { FileService } from "@/lib/files/service";
import { PreviewService } from "@/lib/files/preview";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

const quickActions = [
  { title: "Invoice", desc: "Generate a branded invoice", url: "/invoice", icon: FileText },
  { title: "Quotation", desc: "Send a quote in seconds", url: "/quotation", icon: FileSpreadsheet },
  { title: "Receipt", desc: "Issue a receipt", url: "/receipt", icon: Receipt },
  { title: "Payslip", desc: "Create payslips", url: "/payslip", icon: Wallet },
  { title: "CV Builder", desc: "Craft a modern CV", url: "/cv-builder", icon: UserSquare2 },
  { title: "Cover Letter", desc: "AI-drafted cover letter", url: "/cover-letter", icon: Mail },
  { title: "Business Name", desc: "Brainstorm names", url: "/business-name-generator", icon: Sparkles },
  { title: "Calculators", desc: "Tax, loan, margin & more", url: "/calculators", icon: Calculator },
  { title: "AI Assistant", desc: "Ask anything business", url: "/ai-assistant", icon: Bot },
] as const;

function Dashboard() {
  const { user } = useAuth();
  const name = user?.user_metadata?.full_name ?? user?.email?.split("@")[0] ?? "there";

  const { data: quotations = [] } = useQuery({
    queryKey: ["quotations", { search: "", status: "all", from: "", to: "" }],
    queryFn: () => listQuotations(),
  });
  const { data: receipts = [] } = useQuery({
    queryKey: ["receipts", { search: "", status: "all", method: "all", from: "", to: "" }],
    queryFn: () => listReceipts(),
  });
  const { data: recentFiles = [] } = useQuery({
    queryKey: ["recent-files"],
    queryFn: () => FileService.recent(6),
  });
  const { data: storageUsed = 0 } = useQuery({
    queryKey: ["storage-usage"],
    queryFn: () => FileService.storageUsage(),
  });
  const favCount = recentFiles.filter((f) => f.is_favorite).length;


  const qTotal = quotations.length;
  const qAccepted = quotations.filter((q) => q.status === "accepted").length;
  const qPending = quotations.filter((q) => q.status === "draft" || q.status === "sent").length;
  const qConverted = quotations.filter((q) => q.converted_invoice_id).length;
  const qRate = qTotal > 0 ? Math.round((qConverted / qTotal) * 100) : 0;

  const rTotal = receipts.length;
  const rIssued = receipts.filter((r) => r.status === "issued").length;
  const rReceived = receipts
    .filter((r) => r.status === "issued")
    .reduce((a, r) => a + Number(r.amount_received), 0);
  const rCurrency = receipts[0]?.currency ?? "USD";

  return (
    <div className="mx-auto max-w-6xl">
      <div className="rounded-2xl border border-border bg-gradient-primary p-8 text-primary-foreground shadow-elegant">
        <p className="text-sm opacity-80">Welcome back</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Hey {name} 👋</h1>
        <p className="mt-2 max-w-xl text-sm opacity-90">
          Your workspace is ready. Modules will light up as we ship each phase.
        </p>
      </div>

      <h2 className="mt-10 text-lg font-semibold">Quotations</h2>
      <p className="text-sm text-muted-foreground">Snapshot of your quote pipeline.</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MiniStat label="Total quotations" value={String(qTotal)} />
        <MiniStat label="Accepted" value={String(qAccepted)} tone="emerald" />
        <MiniStat label="Pending" value={String(qPending)} tone="amber" />
        <MiniStat label="Conversion rate" value={`${qRate}%`} />
      </div>

      <h2 className="mt-10 text-lg font-semibold">Receipts</h2>
      <p className="text-sm text-muted-foreground">Payments recorded to date.</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <MiniStat label="Total receipts" value={String(rTotal)} />
        <MiniStat label="Issued" value={String(rIssued)} tone="emerald" />
        <MiniStat label="Amount received" value={formatMoney(rReceived, rCurrency)} tone="emerald" />
      </div>

      <h2 className="mt-10 text-lg font-semibold">Files</h2>
      <p className="text-sm text-muted-foreground">Your shared document workspace.</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MiniStat label="Storage used" value={PreviewService.humanSize(storageUsed)} />
        <MiniStat label="Recent files" value={String(recentFiles.length)} />
        <MiniStat label="Favorites" value={String(favCount)} tone="amber" />
        <Link to="/files" className="rounded-xl border border-border bg-card p-4 hover:border-primary/50">
          <div className="flex items-center gap-2 text-sm font-medium">
            <FolderOpen className="h-4 w-4 text-primary" /> Open Files
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Upload, organize, share</p>
        </Link>
      </div>
      {recentFiles.length > 0 && (
        <div className="mt-4 divide-y divide-border rounded-xl border border-border bg-card">
          {recentFiles.map((f) => (
            <Link key={f.id} to="/files" className="flex items-center justify-between px-4 py-2 text-sm hover:bg-muted/40">
              <span className="truncate">{f.name}</span>
              <span className="text-xs text-muted-foreground">{PreviewService.humanSize(f.size_bytes)}</span>
            </Link>
          ))}
        </div>
      )}


      <h2 className="mt-10 text-lg font-semibold">Quick actions</h2>
      <p className="text-sm text-muted-foreground">Jump into any module.</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {quickActions.map((a) => (
          <Link
            key={a.url}
            to={a.url}
            className="group flex items-start gap-4 rounded-xl border border-border bg-card p-5 transition-all hover:border-primary/50 hover:shadow-elegant"
          >
            <div className="flex h-10 w-10 flex-none items-center justify-center rounded-lg bg-accent text-accent-foreground">
              <a.icon className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">{a.title}</h3>
                <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">{a.desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function MiniStat({
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
