import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  ArrowDownToLine,
  ChartNoAxesCombined,
  CircleDollarSign,
  FileText,
  Search,
  TrendingUp,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  buildRevenueSeries,
  filterReportRecords,
  getReportDateWindow,
  summarizeBusinessRecords,
  type ReportPeriod,
  type ReportRecord,
  type ReportRecordType,
} from "@/lib/reports/analytics";
import { formatMoney } from "@/lib/invoices/calc";

export const Route = createFileRoute("/_authenticated/reports")({
  component: ReportsPage,
  head: () => ({
    meta: [
      { title: "Reports & Analytics | Business Toolkit AI" },
      {
        name: "description",
        content: "Review your business revenue, invoices, quotations, receipts and payment activity.",
      },
      { property: "og:title", content: "Reports & Analytics | Business Toolkit AI" },
      {
        property: "og:description",
        content: "Understand sales, open invoices, quotation conversion and payment trends.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

const PAGE_SIZE = 10;
const revenueConfig = { revenue: { label: "Collected", color: "var(--chart-1)" } } satisfies ChartConfig;
const invoiceConfig = { invoices: { label: "Invoices", color: "var(--chart-2)" } } satisfies ChartConfig;
const methodConfig = { amount: { label: "Collected", color: "var(--chart-3)" } } satisfies ChartConfig;

async function loadReportRecords(): Promise<ReportRecord[]> {
  const [invoices, quotations, receipts] = await Promise.all([
    loadInvoices(),
    loadQuotations(),
    loadReceipts(),
  ]);
  return [...invoices, ...quotations, ...receipts].sort((left, right) =>
    right.date.localeCompare(left.date),
  );
}

async function loadInvoices() {
  const records: ReportRecord[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await supabase
      .from("invoices")
      .select("id, invoice_number, invoice_date, currency, grand_total, status, customer:customers(name)")
      .order("invoice_date", { ascending: false })
      .range(offset, offset + 499);
    if (error) throw error;
    for (const row of data ?? []) {
      records.push({
        id: row.id,
        type: "Invoice",
        number: row.invoice_number,
        date: row.invoice_date,
        currency: row.currency,
        amount: Number(row.grand_total),
        status: row.status,
        customer: row.customer?.name ?? null,
        paymentMethod: null,
      });
    }
    if (!data || data.length < 500) return records;
  }
}

async function loadQuotations() {
  const records: ReportRecord[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await supabase
      .from("quotations")
      .select("id, quotation_number, quotation_date, currency, grand_total, status, converted_invoice_id, customer:customers(name)")
      .order("quotation_date", { ascending: false })
      .range(offset, offset + 499);
    if (error) throw error;
    for (const row of data ?? []) {
      records.push({
        id: row.id,
        type: "Quotation",
        number: row.quotation_number,
        date: row.quotation_date,
        currency: row.currency,
        amount: Number(row.grand_total),
        status: row.status,
        customer: row.customer?.name ?? null,
        paymentMethod: null,
        linked: Boolean(row.converted_invoice_id),
      });
    }
    if (!data || data.length < 500) return records;
  }
}

async function loadReceipts() {
  const records: ReportRecord[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await supabase
      .from("receipts")
      .select("id, receipt_number, receipt_date, currency, amount_received, status, payment_method, customer:customers(name)")
      .order("receipt_date", { ascending: false })
      .range(offset, offset + 499);
    if (error) throw error;
    for (const row of data ?? []) {
      records.push({
        id: row.id,
        type: "Receipt",
        number: row.receipt_number,
        date: row.receipt_date,
        currency: row.currency,
        amount: Number(row.amount_received),
        status: row.status,
        customer: row.customer?.name ?? null,
        paymentMethod: row.payment_method,
      });
    }
    if (!data || data.length < 500) return records;
  }
}

function ReportsPage() {
  const [period, setPeriod] = useState<ReportPeriod | "custom">("12m");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [currencyChoice, setCurrencyChoice] = useState("");
  const [recordType, setRecordType] = useState<ReportRecordType | "all">("all");
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const { data: records = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: ["business-report-data"],
    queryFn: loadReportRecords,
    staleTime: 60_000,
  });

  const currencies = useMemo(
    () => [...new Set(records.map((record) => record.currency))].sort(),
    [records],
  );
  const currency = currencyChoice && currencies.includes(currencyChoice)
    ? currencyChoice
    : currencies[0] ?? "USD";
  const today = new Date().toISOString().slice(0, 10);
  const presetRange = period === "custom" ? null : getReportDateWindow(period);
  const startDate = period === "custom" ? customFrom || null : presetRange?.startDate ?? null;
  const endDate = period === "custom" ? customTo || today : presetRange?.endDate ?? today;
  const invalidDateRange = Boolean(startDate && endDate && startDate > endDate);

  const rangeRecords = useMemo(() => filterReportRecords(records, {
    startDate: invalidDateRange ? "9999-12-31" : startDate,
    endDate,
    currency,
  }), [records, startDate, endDate, currency, invalidDateRange]);
  const tableRecords = useMemo(() => filterReportRecords(records, {
    startDate: invalidDateRange ? "9999-12-31" : startDate,
    endDate,
    currency,
    type: recordType,
    status,
    search,
  }), [records, startDate, endDate, currency, recordType, status, search, invalidDateRange]);
  const metrics = useMemo(() => summarizeBusinessRecords(rangeRecords), [rangeRecords]);
  const revenueSeries = useMemo(() => buildRevenueSeries(rangeRecords, period === "custom" ? "12m" : period), [rangeRecords, period]);
  const invoiceStatuses = useMemo(() => {
    const counts = new Map<string, number>();
    for (const record of rangeRecords) {
      if (record.type === "Invoice") counts.set(record.status, (counts.get(record.status) ?? 0) + 1);
    }
    return ["draft", "sent", "paid", "overdue", "cancelled"].map((value) => ({
      status: value.charAt(0).toUpperCase() + value.slice(1),
      invoices: counts.get(value) ?? 0,
    }));
  }, [rangeRecords]);
  const paymentMethods = useMemo(() => {
    const amounts = new Map<string, number>();
    for (const record of rangeRecords) {
      if (record.type === "Receipt" && record.status === "issued" && record.paymentMethod) {
        amounts.set(record.paymentMethod, (amounts.get(record.paymentMethod) ?? 0) + record.amount);
      }
    }
    return [...amounts.entries()].map(([method, amount]) => ({
      method,
      name: method.replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase()),
      amount: Math.round((amount + Number.EPSILON) * 100) / 100,
    }));
  }, [rangeRecords]);
  const pageCount = Math.max(1, Math.ceil(tableRecords.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageRecords = tableRecords.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const exportRows = tableRecords.map((record) => ({
    "Document type": record.type,
    "Document number": record.number,
    Date: record.date,
    Customer: record.customer ?? "",
    Status: record.status,
    Currency: record.currency,
    Amount: record.amount,
    "Payment method": record.paymentMethod ?? "",
  }));

  function downloadCsv() {
    const content = `\uFEFF${tableRecords.length ? reportCsv(tableRecords) : "Type,Number,Date,Customer,Status,Currency,Amount,Payment method"}`;
    downloadBlob(`business-report-${period}.csv`, content, "text/csv;charset=utf-8");
  }

  async function downloadExcel() {
    const xlsx = await import("xlsx");
    const workbook = xlsx.utils.book_new();
    const worksheet = xlsx.utils.json_to_sheet(exportRows);
    xlsx.utils.book_append_sheet(workbook, worksheet, "Business report");
    xlsx.writeFile(workbook, `business-report-${period}.xlsx`);
  }

  async function downloadPdf() {
    const { jsPDF } = await import("jspdf");
    const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(18);
    pdf.text("Business activity report", 14, 18);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.text(`${startDate ?? "All time"} — ${endDate} · ${currency} · ${tableRecords.length} records`, 14, 25);
    const columnX = [14, 47, 90, 117, 188, 222, 254];
    const headers = ["TYPE", "NUMBER", "DATE", "CUSTOMER", "STATUS", "CURRENCY", "AMOUNT"];
    let y = 35;
    const writeHeader = () => {
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(8);
      headers.forEach((header, index) => pdf.text(header, columnX[index] ?? 14, y));
      y += 6;
      pdf.setFont("helvetica", "normal");
    };
    writeHeader();
    for (const record of tableRecords) {
      if (y > 190) {
        pdf.addPage();
        y = 18;
        writeHeader();
      }
      const cells = [record.type, record.number, record.date, record.customer ?? "—", record.status, record.currency, record.amount.toFixed(2)];
      cells.forEach((value, index) => pdf.text(String(value).slice(0, index === 3 ? 36 : 20), columnX[index] ?? 14, y));
      y += 6;
    }
    pdf.save(`business-report-${period}.pdf`);
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
              <ChartNoAxesCombined className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Reports &amp; analytics</h1>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">A clear view of your sales, payments and document pipeline.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={downloadCsv} disabled={isLoading}>
            <ArrowDownToLine /> CSV
          </Button>
          <Button variant="outline" onClick={() => void downloadExcel()} disabled={isLoading}>
            <ArrowDownToLine /> Excel
          </Button>
          <Button onClick={() => void downloadPdf()} disabled={isLoading}>
            <ArrowDownToLine /> PDF
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3 border-y border-border py-4">
        <div className="w-40">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">Date range</span>
          <Select value={period} onValueChange={(value) => { setPeriod(value as ReportPeriod | "custom"); setPage(1); }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="12m">Last 12 months</SelectItem>
              <SelectItem value="all">All time</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {period === "custom" && (
          <>
            <label className="w-36 text-xs font-medium text-muted-foreground">
              From
              <Input aria-label="Report start date" type="date" value={customFrom} onChange={(event) => { setCustomFrom(event.target.value); setPage(1); }} className="mt-1" />
            </label>
            <label className="w-36 text-xs font-medium text-muted-foreground">
              To
              <Input aria-label="Report end date" type="date" value={customTo} onChange={(event) => { setCustomTo(event.target.value); setPage(1); }} className="mt-1" />
            </label>
          </>
        )}
        <div className="w-36">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">Currency</span>
          <Select value={currency} onValueChange={(value) => { setCurrencyChoice(value); setPage(1); }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {(currencies.length ? currencies : ["USD"]).map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {invalidDateRange && <p className="pb-2 text-sm text-destructive">The start date must be before the end date.</p>}
      </div>

      {isLoading ? (
        <LoadingState />
      ) : isError ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Activity className="h-8 w-8 text-destructive" />
            <div>
              <p className="font-medium">Reports could not be loaded</p>
              <p className="mt-1 max-w-md text-sm text-muted-foreground">{error instanceof Error ? error.message : "Please try again."}</p>
            </div>
            <Button variant="outline" onClick={() => void refetch()}>Try again</Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Business summary">
            <MetricCard icon={<CircleDollarSign />} label="Cash collected" value={formatMoney(metrics.collected, currency)} detail={`${metrics.receiptCount} issued receipts`} />
            <MetricCard icon={<FileText />} label="Invoice value" value={formatMoney(metrics.invoiceValue, currency)} detail={`${metrics.invoiceCount} issued invoices`} />
            <MetricCard icon={<TrendingUp />} label="Open invoices" value={formatMoney(metrics.outstanding, currency)} detail={`${metrics.outstandingCount} sent or overdue`} />
            <MetricCard icon={<ChartNoAxesCombined />} label="Quote conversion" value={`${metrics.conversionRate}%`} detail={`${metrics.convertedCount} of ${metrics.quotationCount} converted`} />
          </section>

          <section className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
            <Card>
              <CardHeader>
                <CardTitle>Cash collected</CardTitle>
                <CardDescription>Issued receipts over the selected time range.</CardDescription>
              </CardHeader>
              <CardContent className="pl-2">
                {revenueSeries.some((item) => item.revenue > 0) ? (
                  <ChartContainer config={revenueConfig} className="h-[280px] w-full aspect-auto">
                    <AreaChart data={revenueSeries} margin={{ left: 4, right: 12, top: 8 }}>
                      <defs>
                        <linearGradient id="reportRevenueFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--color-revenue)" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="var(--color-revenue)" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid vertical={false} stroke="var(--border)" />
                      <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={20} />
                      <YAxis tickLine={false} axisLine={false} width={70} tickFormatter={(value) => compactCurrency(Number(value), currency)} />
                      <ChartTooltip cursor={false} content={<ChartTooltipContent formatter={(value) => formatMoney(Number(value), currency)} />} />
                      <Area type="monotone" dataKey="revenue" stroke="var(--color-revenue)" strokeWidth={2} fill="url(#reportRevenueFill)" />
                    </AreaChart>
                  </ChartContainer>
                ) : <ChartEmpty message="No issued payments in this range." />}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Payment methods</CardTitle>
                <CardDescription>Receipts grouped by method.</CardDescription>
              </CardHeader>
              <CardContent>
                {paymentMethods.length ? (
                  <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(130px,0.8fr)] xl:grid-cols-1 2xl:grid-cols-[minmax(0,1fr)_minmax(130px,0.8fr)]">
                    <ChartContainer config={methodConfig} className="mx-auto h-[210px] w-full max-w-[240px] aspect-auto">
                      <PieChart>
                        <Pie data={paymentMethods} dataKey="amount" nameKey="name" innerRadius={52} outerRadius={82} strokeWidth={2}>
                          {paymentMethods.map((item, index) => <Cell key={item.method} fill={`var(--chart-${(index % 5) + 1})`} />)}
                        </Pie>
                        <ChartTooltip content={<ChartTooltipContent formatter={(value) => formatMoney(Number(value), currency)} />} />
                      </PieChart>
                    </ChartContainer>
                    <div className="grid content-center gap-2">
                      {paymentMethods.map((item, index) => (
                        <div key={item.method} className="flex items-center justify-between gap-3 text-xs">
                          <span className="flex min-w-0 items-center gap-2 capitalize text-muted-foreground">
                            <span className="h-2.5 w-2.5 flex-none rounded-sm" style={{ backgroundColor: `var(--chart-${(index % 5) + 1})` }} />
                            <span className="truncate">{item.name}</span>
                          </span>
                          <span className="shrink-0 font-medium">{formatMoney(item.amount, currency)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : <ChartEmpty message="Payment method totals will appear after receipts are issued." />}
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
            <Card>
              <CardHeader>
                <CardTitle>Invoice status</CardTitle>
                <CardDescription>Invoice count by current status.</CardDescription>
              </CardHeader>
              <CardContent>
                {metrics.invoiceCount || invoiceStatuses.some((item) => item.invoices > 0) ? (
                  <ChartContainer config={invoiceConfig} className="h-[250px] w-full aspect-auto">
                    <BarChart data={invoiceStatuses} margin={{ left: 4, right: 10, top: 8 }}>
                      <CartesianGrid vertical={false} stroke="var(--border)" />
                      <XAxis dataKey="status" tickLine={false} axisLine={false} />
                      <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={30} />
                      <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                      <Bar dataKey="invoices" fill="var(--color-invoices)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ChartContainer>
                ) : <ChartEmpty message="No invoices in this range." />}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Documents</CardTitle>
                <CardDescription>{tableRecords.length.toLocaleString()} records match the selected filters.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4 flex flex-wrap gap-2">
                  <div className="relative min-w-[190px] flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input aria-label="Search documents" placeholder="Search number or customer" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} className="pl-9" />
                  </div>
                  <Select value={recordType} onValueChange={(value) => { setRecordType(value as ReportRecordType | "all"); setPage(1); }}>
                    <SelectTrigger className="w-[145px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All documents</SelectItem>
                      <SelectItem value="Invoice">Invoices</SelectItem>
                      <SelectItem value="Quotation">Quotations</SelectItem>
                      <SelectItem value="Receipt">Receipts</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={status} onValueChange={(value) => { setStatus(value); setPage(1); }}>
                    <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All statuses</SelectItem>
                      {[...new Set(records.map((record) => record.status))].sort().map((value) => <SelectItem key={value} value={value}>{value.charAt(0).toUpperCase() + value.slice(1)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Document</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pageRecords.length ? pageRecords.map((record) => (
                        <TableRow key={`${record.type}-${record.id}`}>
                          <TableCell>
                            <div className="font-medium">{record.number}</div>
                            <div className="text-xs text-muted-foreground">{record.type}</div>
                          </TableCell>
                          <TableCell className="max-w-[140px] truncate">{record.customer ?? "—"}</TableCell>
                          <TableCell className="whitespace-nowrap">{record.date}</TableCell>
                          <TableCell><Badge variant="secondary" className="capitalize">{record.status}</Badge></TableCell>
                          <TableCell className="whitespace-nowrap text-right font-medium">{formatMoney(record.amount, record.currency)}</TableCell>
                        </TableRow>
                      )) : (
                        <TableRow><TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">No records match these filters.</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
                {tableRecords.length > PAGE_SIZE && (
                  <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
                    <span>Page {currentPage} of {pageCount}</span>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" disabled={currentPage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Previous</Button>
                      <Button size="sm" variant="outline" disabled={currentPage === pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))}>Next</Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </section>
        </>
      )}
    </div>
  );
}

function MetricCard({ icon, label, value, detail }: { icon: React.ReactNode; label: string; value: string; detail: string }) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-3 p-5">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-2 truncate text-2xl font-semibold tabular-nums">{value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
        </div>
        <div className="flex h-9 w-9 flex-none items-center justify-center rounded-md bg-muted text-primary">{icon}</div>
      </CardContent>
    </Card>
  );
}

function ChartEmpty({ message }: { message: string }) {
  return <div className="flex h-[220px] items-center justify-center px-6 text-center text-sm text-muted-foreground">{message}</div>;
}

function LoadingState() {
  return (
    <div className="space-y-4" aria-label="Loading reports" aria-busy="true">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((key) => <div key={key} className="h-28 animate-pulse rounded-xl border border-border bg-muted/50" />)}
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <div className="h-[360px] animate-pulse rounded-xl border border-border bg-muted/50" />
        <div className="h-[360px] animate-pulse rounded-xl border border-border bg-muted/50" />
      </div>
    </div>
  );
}

function compactCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency, notation: "compact", maximumFractionDigits: 1 }).format(amount);
}

function reportCsv(records: ReportRecord[]) {
  const header = ["Type", "Number", "Date", "Customer", "Status", "Currency", "Amount", "Payment method"];
  const csvCell = (value: string) => {
    const safe = /^[=+@\-\t\r]/.test(value) ? `'${value}` : value;
    return `"${safe.replaceAll('"', '""')}"`;
  };
  const rows = records.map((record) => [record.type, record.number, record.date, record.customer ?? "", record.status, record.currency, record.amount.toFixed(2), record.paymentMethod ?? ""]);
  return [header, ...rows].map((row) => row.map((value) => csvCell(String(value))).join(",")).join("\r\n");
}

function downloadBlob(filename: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}