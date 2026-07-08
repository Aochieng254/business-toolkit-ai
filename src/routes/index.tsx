import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  FileText,
  Calculator,
  Bot,
  Shield,
  Zap,
  Users,
  Check,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Brand } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/")({
  component: Landing,
});

const features = [
  {
    icon: FileText,
    title: "AI Document Generators",
    desc: "Invoices, quotations, receipts, payslips, CVs and cover letters — drafted in seconds.",
  },
  {
    icon: Calculator,
    title: "Business Calculators",
    desc: "Tax, loan, profit-margin and payroll calculators tailored for modern operators.",
  },
  {
    icon: Bot,
    title: "AI Assistant",
    desc: "A contextual assistant that understands your business and helps you decide faster.",
  },
  {
    icon: Shield,
    title: "Enterprise-grade Security",
    desc: "Row-level security, encrypted storage, and fine-grained roles on every module.",
  },
  {
    icon: Zap,
    title: "Built for Speed",
    desc: "Edge-rendered, serverless architecture designed to scale from solo to team.",
  },
  {
    icon: Users,
    title: "Team-ready",
    desc: "Workspaces, roles and audit trails coming with subscription tiers.",
  },
];

const plans = [
  {
    name: "Starter",
    price: "Free",
    desc: "Explore the toolkit and try AI generators.",
    features: ["3 documents / month", "Basic calculators", "Community support"],
  },
  {
    name: "Pro",
    price: "$19",
    desc: "For solo founders and freelancers.",
    features: ["Unlimited documents", "All calculators", "AI Assistant", "Priority support"],
    highlight: true,
  },
  {
    name: "Business",
    price: "$49",
    desc: "For growing teams and agencies.",
    features: ["Everything in Pro", "Team workspaces", "Admin controls", "Custom branding"],
  },
];

function Landing() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <Brand />
          <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
            <a href="#features" className="hover:text-foreground">Features</a>
            <a href="#pricing" className="hover:text-foreground">Pricing</a>
            <a href="#faq" className="hover:text-foreground">FAQ</a>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {user ? (
              <Button asChild size="sm">
                <Link to="/dashboard">Dashboard</Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm">
                  <Link to="/auth">Sign in</Link>
                </Button>
                <Button asChild size="sm">
                  <Link to="/auth" search={{ mode: "signup" }}>Get started</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero opacity-70" aria-hidden />
        <div className="relative mx-auto max-w-7xl px-4 py-24 text-center md:py-32">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-xs text-muted-foreground shadow-sm">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Introducing Business Toolkit AI
          </div>
          <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-bold tracking-tight text-foreground md:text-6xl">
            The AI-powered workspace for{" "}
            <span className="bg-gradient-primary bg-clip-text text-transparent">
              modern businesses
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Generate documents, run business calculations, and get AI answers — all in one
            beautifully designed workspace built to scale with you.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg" className="shadow-elegant">
              <Link to="/auth" search={{ mode: "signup" }}>
                Start free <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href="#features">See what's inside</a>
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-7xl px-4 py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
            Everything your business runs on
          </h2>
          <p className="mt-4 text-muted-foreground">
            A modular toolkit that grows with you. Ship documents, do the math, and let AI
            do the heavy lifting.
          </p>
        </div>
        <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="group rounded-xl border border-border bg-card p-6 transition-shadow hover:shadow-elegant"
            >
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-t border-border bg-muted/30 py-24">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
              Simple, transparent pricing
            </h2>
            <p className="mt-4 text-muted-foreground">
              Start free. Upgrade when you're ready. Cancel anytime.
            </p>
          </div>
          <div className="mt-16 grid gap-6 md:grid-cols-3">
            {plans.map((p) => (
              <div
                key={p.name}
                className={`rounded-2xl border bg-card p-8 ${
                  p.highlight
                    ? "border-primary shadow-elegant ring-1 ring-primary/20"
                    : "border-border"
                }`}
              >
                <h3 className="text-lg font-semibold">{p.name}</h3>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-bold">{p.price}</span>
                  {p.price !== "Free" && (
                    <span className="text-sm text-muted-foreground">/month</span>
                  )}
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{p.desc}</p>
                <ul className="mt-6 space-y-3 text-sm">
                  {p.features.map((feat) => (
                    <li key={feat} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 flex-none text-primary" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  asChild
                  className="mt-8 w-full"
                  variant={p.highlight ? "default" : "outline"}
                >
                  <Link to="/auth" search={{ mode: "signup" }}>Get started</Link>
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ / CTA */}
      <section id="faq" className="mx-auto max-w-4xl px-4 py-24 text-center">
        <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
          Ready to run your business smarter?
        </h2>
        <p className="mt-4 text-muted-foreground">
          Join the founders using Business Toolkit AI to move faster every day.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Button asChild size="lg" className="shadow-elegant">
            <Link to="/auth" search={{ mode: "signup" }}>Create your account</Link>
          </Button>
        </div>
      </section>

      <footer className="border-t border-border py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 text-sm text-muted-foreground md:flex-row">
          <Brand />
          <p>© {new Date().getFullYear()} Business Toolkit AI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
