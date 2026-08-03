import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Wallet, Plus, Trash2, FileDown, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CURRENCIES } from "@/lib/invoices/currencies";
import { formatMoney } from "@/lib/invoices/calc";
import { exportBlocksToPDF, exportBlocksToWord, type Block } from "@/lib/docs/export";
import { toast } from "sonner";

type Row = { label: string; amount: number };

export const Route = createFileRoute("/_authenticated/payslip")({
  head: () => ({
    meta: [
      { title: "Payslip Generator | Business Toolkit AI" },
      {
        name: "description",
        content:
          "Create compliant payslips with earnings, deductions and net pay, then export to PDF or Word.",
      },
      { property: "og:title", content: "Payslip Generator | Business Toolkit AI" },
      {
        property: "og:description",
        content: "Generate professional payslips for your team in seconds.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PayslipPage,
});

function PayslipPage() {
  const [currency, setCurrency] = useState("USD");
  const [company, setCompany] = useState("");
  const [employee, setEmployee] = useState("");
  const [role, setRole] = useState("");
  const [empId, setEmpId] = useState("");
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [payDate, setPayDate] = useState(new Date().toISOString().slice(0, 10));
  const [method, setMethod] = useState("Bank transfer");
  const [earnings, setEarnings] = useState<Row[]>([
    { label: "Basic salary", amount: 0 },
  ]);
  const [deductions, setDeductions] = useState<Row[]>([{ label: "Tax", amount: 0 }]);

  const gross = useMemo(
    () => earnings.reduce((a, r) => a + (Number(r.amount) || 0), 0),
    [earnings],
  );
  const totalDed = useMemo(
    () => deductions.reduce((a, r) => a + (Number(r.amount) || 0), 0),
    [deductions],
  );
  const net = gross - totalDed;

  const blocks = (): Block[] => [
    { type: "title", text: company || "Payslip" },
    { type: "text", text: `Payslip for ${period}` },
    { type: "spacer" },
    { type: "heading", text: "Employee" },
    { type: "text", text: `Name: ${employee || "—"}` },
    { type: "text", text: `Role: ${role || "—"}` },
    { type: "text", text: `Employee ID: ${empId || "—"}` },
    { type: "text", text: `Pay date: ${payDate}   •   Method: ${method}` },
    { type: "heading", text: "Earnings" },
    ...earnings.map<Block>((r) => ({
      type: "text",
      text: `${r.label || "Item"} .......... ${formatMoney(Number(r.amount) || 0, currency)}`,
    })),
    { type: "text", text: `Gross pay: ${formatMoney(gross, currency)}` },
    { type: "heading", text: "Deductions" },
    ...deductions.map<Block>((r) => ({
      type: "text",
      text: `${r.label || "Item"} .......... ${formatMoney(Number(r.amount) || 0, currency)}`,
    })),
    { type: "text", text: `Total deductions: ${formatMoney(totalDed, currency)}` },
    { type: "spacer" },
    { type: "heading", text: "Net pay" },
    { type: "title", text: formatMoney(net, currency) },
  ];

  const fileName = `payslip-${(employee || "employee").toLowerCase().replace(/\s+/g, "-")}-${period}`;

  const rowEditor = (
    rows: Row[],
    setRows: (r: Row[]) => void,
    addLabel: string,
  ) => (
    <div className="space-y-2">
      {rows.map((r, i) => (
        <div key={i} className="flex gap-2">
          <Input
            value={r.label}
            placeholder="Description"
            onChange={(e) => {
              const next = [...rows];
              next[i] = { ...r, label: e.target.value };
              setRows(next);
            }}
          />
          <Input
            type="number"
            step="0.01"
            className="w-36"
            value={r.amount}
            onChange={(e) => {
              const next = [...rows];
              next[i] = { ...r, amount: Number(e.target.value) };
              setRows(next);
            }}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setRows(rows.filter((_, j) => j !== i))}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setRows([...rows, { label: "", amount: 0 }])}
      >
        <Plus className="mr-1 h-4 w-4" /> {addLabel}
      </Button>
    </div>
  );

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-accent-foreground">
            <Wallet className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Payslip Generator</h1>
            <p className="text-sm text-muted-foreground">
              Produce compliant payslips for your team.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={async () => {
              await exportBlocksToWord(blocks(), fileName);
              toast.success("Word file downloaded");
            }}
          >
            <FileText className="mr-2 h-4 w-4" /> Word
          </Button>
          <Button
            onClick={() => {
              exportBlocksToPDF(blocks(), fileName);
              toast.success("PDF downloaded");
            }}
          >
            <FileDown className="mr-2 h-4 w-4" /> PDF
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Details</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Company</Label>
                <Input value={company} onChange={(e) => setCompany(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Employee name</Label>
                <Input value={employee} onChange={(e) => setEmployee(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Job title</Label>
                <Input value={role} onChange={(e) => setRole(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Employee ID</Label>
                <Input value={empId} onChange={(e) => setEmpId(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Pay period</Label>
                <Input
                  type="month"
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Pay date</Label>
                <Input
                  type="date"
                  value={payDate}
                  onChange={(e) => setPayDate(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Payment method</Label>
                <Input value={method} onChange={(e) => setMethod(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Currency</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Earnings</CardTitle>
            </CardHeader>
            <CardContent>{rowEditor(earnings, setEarnings, "Add earning")}</CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Deductions</CardTitle>
            </CardHeader>
            <CardContent>
              {rowEditor(deductions, setDeductions, "Add deduction")}
            </CardContent>
          </Card>
        </div>

        <Card className="h-fit lg:sticky lg:top-6">
          <CardHeader>
            <CardTitle className="text-base">Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Gross pay</span>
              <span className="font-medium">{formatMoney(gross, currency)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Deductions</span>
              <span className="font-medium">-{formatMoney(totalDed, currency)}</span>
            </div>
            <Separator />
            <div className="flex justify-between text-lg font-bold">
              <span>Net pay</span>
              <span>{formatMoney(net, currency)}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
