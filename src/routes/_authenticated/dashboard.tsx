import { createFileRoute, Link } from "@tanstack/react-router";
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
} from "lucide-react";
import { useAuth } from "@/lib/auth";

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

  return (
    <div className="mx-auto max-w-6xl">
      <div className="rounded-2xl border border-border bg-gradient-primary p-8 text-primary-foreground shadow-elegant">
        <p className="text-sm opacity-80">Welcome back</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Hey {name} 👋</h1>
        <p className="mt-2 max-w-xl text-sm opacity-90">
          Your workspace is ready. Modules will light up as we ship each phase.
        </p>
      </div>

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
