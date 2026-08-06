import { useMemo, useState, type ReactNode } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Calculator, Percent, Landmark, TrendingUp, Scale, PiggyBank } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CURRENCIES } from "@/lib/invoices/currencies";
import { formatMoney } from "@/lib/invoices/calc";

export const Route = createFileRoute("/_authenticated/calculators")({
  head: () => ({
    meta: [
      { title: "Business Calculators | Business Toolkit AI" },
      {
        name: "description",
        content:
          "Loan repayments, VAT and tax, profit margin, markup, break-even and savings growth — instant business maths in one place.",
      },
      { property: "og:title", content: "Business Calculators | Business Toolkit AI" },
      {
        property: "og:description",
        content: "Run loan, tax, margin, break-even and savings numbers in seconds.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CalculatorsPage,
});

const num = (v: string) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

function Field({
  label,
  value,
  onChange,
  suffix,
  step = "any",
  min = "0",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  suffix?: string;
  step?: string;
  min?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="relative">
        <Input
          type="number"
          inputMode="decimal"
          step={step}
          min={min}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        {suffix ? (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
            {suffix}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function Result({ items }: { items: { label: string; value: string; hero?: boolean }[] }) {
  return (
    <div className="rounded-lg border bg-muted/40 p-4">
      <dl className="space-y-2">
        {items.map((i) => (
          <div key={i.label} className="flex items-baseline justify-between gap-4">
            <dt className={i.hero ? "font-medium" : "text-sm text-muted-foreground"}>{i.label}</dt>
            <dd className={i.hero ? "text-xl font-semibold tabular-nums" : "text-sm tabular-nums"}>
              {i.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function CalcCard({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: typeof Calculator;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Icon className="size-5 text-primary" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

function CalculatorsPage() {
  const [currency, setCurrency] = useState("USD");
  const money = (n: number) => formatMoney(Number.isFinite(n) ? n : 0, currency);
  const pct = (n: number) => `${(Number.isFinite(n) ? n : 0).toFixed(2)}%`;

  /* ---- Loan ---- */
  const [principal, setPrincipal] = useState("10000");
  const [rate, setRate] = useState("12");
  const [years, setYears] = useState("3");
  const loan = useMemo(() => {
    const p = num(principal);
    const r = num(rate) / 100 / 12;
    const n = Math.round(num(years) * 12);
    if (p <= 0 || n <= 0) return { monthly: 0, total: 0, interest: 0, n };
    const monthly = r === 0 ? p / n : (p * r) / (1 - Math.pow(1 + r, -n));
    const total = monthly * n;
    return { monthly, total, interest: total - p, n };
  }, [principal, rate, years]);

  /* ---- VAT / Tax ---- */
  const [taxBase, setTaxBase] = useState("1000");
  const [taxRate, setTaxRate] = useState("16");
  const [taxMode, setTaxMode] = useState<"exclusive" | "inclusive">("exclusive");
  const tax = useMemo(() => {
    const amt = num(taxBase);
    const r = num(taxRate) / 100;
    if (taxMode === "exclusive") {
      const t = amt * r;
      return { net: amt, tax: t, gross: amt + t };
    }
    const net = r === -1 ? 0 : amt / (1 + r);
    return { net, tax: amt - net, gross: amt };
  }, [taxBase, taxRate, taxMode]);

  /* ---- Margin & markup ---- */
  const [cost, setCost] = useState("60");
  const [price, setPrice] = useState("100");
  const margin = useMemo(() => {
    const c = num(cost);
    const p = num(price);
    const profit = p - c;
    return {
      profit,
      margin: p === 0 ? 0 : (profit / p) * 100,
      markup: c === 0 ? 0 : (profit / c) * 100,
    };
  }, [cost, price]);

  /* ---- Discount ---- */
  const [listPrice, setListPrice] = useState("250");
  const [discount, setDiscount] = useState("15");
  const disc = useMemo(() => {
    const l = num(listPrice);
    const d = num(discount) / 100;
    const saved = l * d;
    return { saved, final: l - saved };
  }, [listPrice, discount]);

  /* ---- Break-even ---- */
  const [fixed, setFixed] = useState("5000");
  const [unitPrice, setUnitPrice] = useState("50");
  const [unitCost, setUnitCost] = useState("30");
  const breakEven = useMemo(() => {
    const contribution = num(unitPrice) - num(unitCost);
    const units = contribution > 0 ? num(fixed) / contribution : 0;
    return { contribution, units, revenue: units * num(unitPrice) };
  }, [fixed, unitPrice, unitCost]);

  /* ---- Savings growth ---- */
  const [initial, setInitial] = useState("1000");
  const [monthlyDep, setMonthlyDep] = useState("200");
  const [growthRate, setGrowthRate] = useState("8");
  const [growthYears, setGrowthYears] = useState("5");
  const growth = useMemo(() => {
    const r = num(growthRate) / 100 / 12;
    const n = Math.round(num(growthYears) * 12);
    const p = num(initial);
    const d = num(monthlyDep);
    const future = r === 0 ? p + d * n : p * Math.pow(1 + r, n) + d * ((Math.pow(1 + r, n) - 1) / r);
    const contributed = p + d * n;
    return { future, contributed, earned: future - contributed };
  }, [initial, monthlyDep, growthRate, growthYears]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <Calculator className="size-6 text-primary" />
            Business Calculators
          </h1>
          <p className="text-sm text-muted-foreground">
            Tax, loans, margins, break-even and savings — updated as you type.
          </p>
        </div>
        <div className="w-40 space-y-1.5">
          <Label>Currency</Label>
          <Select value={currency} onValueChange={setCurrency}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              {CURRENCIES.map((c) => (
                <SelectItem key={c.code} value={c.code}>
                  {c.code} · {c.symbol}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Separator />

      <Tabs defaultValue="loan" className="space-y-4">
        <TabsList className="flex h-auto flex-wrap justify-start gap-1">
          <TabsTrigger value="loan">Loan</TabsTrigger>
          <TabsTrigger value="tax">VAT / Tax</TabsTrigger>
          <TabsTrigger value="margin">Margin</TabsTrigger>
          <TabsTrigger value="discount">Discount</TabsTrigger>
          <TabsTrigger value="breakeven">Break-even</TabsTrigger>
          <TabsTrigger value="savings">Savings</TabsTrigger>
        </TabsList>

        <TabsContent value="loan">
          <CalcCard
            icon={Landmark}
            title="Loan repayment"
            description="Monthly instalment, total repayable and interest cost."
          >
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Loan amount" value={principal} onChange={setPrincipal} />
              <Field label="Annual interest rate" value={rate} onChange={setRate} suffix="%" />
              <Field label="Term" value={years} onChange={setYears} suffix="years" />
            </div>
            <Result
              items={[
                { label: "Monthly payment", value: money(loan.monthly), hero: true },
                { label: "Number of payments", value: String(loan.n) },
                { label: "Total interest", value: money(loan.interest) },
                { label: "Total repayable", value: money(loan.total) },
              ]}
            />
          </CalcCard>
        </TabsContent>

        <TabsContent value="tax">
          <CalcCard
            icon={Percent}
            title="VAT / sales tax"
            description="Add tax to a net amount, or strip it out of a gross amount."
          >
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Amount" value={taxBase} onChange={setTaxBase} />
              <Field label="Tax rate" value={taxRate} onChange={setTaxRate} suffix="%" />
              <div className="space-y-1.5">
                <Label>Amount is</Label>
                <Select
                  value={taxMode}
                  onValueChange={(v) => setTaxMode(v as "exclusive" | "inclusive")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="exclusive">Tax exclusive (net)</SelectItem>
                    <SelectItem value="inclusive">Tax inclusive (gross)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Result
              items={[
                { label: "Tax", value: money(tax.tax), hero: true },
                { label: "Net amount", value: money(tax.net) },
                { label: "Gross amount", value: money(tax.gross) },
              ]}
            />
          </CalcCard>
        </TabsContent>

        <TabsContent value="margin">
          <CalcCard
            icon={TrendingUp}
            title="Profit margin & markup"
            description="See what a selling price really earns you."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Cost price" value={cost} onChange={setCost} />
              <Field label="Selling price" value={price} onChange={setPrice} />
            </div>
            <Result
              items={[
                { label: "Profit", value: money(margin.profit), hero: true },
                { label: "Margin", value: pct(margin.margin) },
                { label: "Markup", value: pct(margin.markup) },
              ]}
            />
          </CalcCard>
        </TabsContent>

        <TabsContent value="discount">
          <CalcCard
            icon={Scale}
            title="Discount"
            description="Work out the final price and the saving."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="List price" value={listPrice} onChange={setListPrice} />
              <Field label="Discount" value={discount} onChange={setDiscount} suffix="%" />
            </div>
            <Result
              items={[
                { label: "Final price", value: money(disc.final), hero: true },
                { label: "You save", value: money(disc.saved) },
              ]}
            />
          </CalcCard>
        </TabsContent>

        <TabsContent value="breakeven">
          <CalcCard
            icon={Scale}
            title="Break-even point"
            description="How many units you must sell to cover fixed costs."
          >
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Fixed costs" value={fixed} onChange={setFixed} />
              <Field label="Price per unit" value={unitPrice} onChange={setUnitPrice} />
              <Field label="Variable cost per unit" value={unitCost} onChange={setUnitCost} />
            </div>
            <Result
              items={[
                {
                  label: "Break-even units",
                  value:
                    breakEven.contribution > 0
                      ? Math.ceil(breakEven.units).toLocaleString()
                      : "Not reachable",
                  hero: true,
                },
                { label: "Contribution per unit", value: money(breakEven.contribution) },
                { label: "Break-even revenue", value: money(breakEven.revenue) },
              ]}
            />
          </CalcCard>
        </TabsContent>

        <TabsContent value="savings">
          <CalcCard
            icon={PiggyBank}
            title="Savings growth"
            description="Compound a starting balance plus monthly deposits."
          >
            <div className="grid gap-4 sm:grid-cols-4">
              <Field label="Starting amount" value={initial} onChange={setInitial} />
              <Field label="Monthly deposit" value={monthlyDep} onChange={setMonthlyDep} />
              <Field label="Annual return" value={growthRate} onChange={setGrowthRate} suffix="%" />
              <Field label="Period" value={growthYears} onChange={setGrowthYears} suffix="years" />
            </div>
            <Result
              items={[
                { label: "Future value", value: money(growth.future), hero: true },
                { label: "Total contributed", value: money(growth.contributed) },
                { label: "Interest earned", value: money(growth.earned) },
              ]}
            />
          </CalcCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}
