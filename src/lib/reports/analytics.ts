export type ReportPeriod = "30d" | "90d" | "12m" | "all";
export type ReportRecordType = "Invoice" | "Quotation" | "Receipt";

export type ReportRecord = {
  id: string;
  type: ReportRecordType;
  number: string;
  date: string;
  currency: string;
  amount: number;
  status: string;
  customer: string | null;
  paymentMethod: string | null;
  linked?: boolean;
};

export type ReportDateWindow = { startDate: string | null; endDate: string };

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function getReportDateWindow(period: ReportPeriod, now = new Date()): ReportDateWindow {
  const endDate = toIsoDate(now);
  if (period === "all") return { startDate: null, endDate };

  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  if (period === "30d") start.setUTCDate(start.getUTCDate() - 29);
  if (period === "90d") start.setUTCDate(start.getUTCDate() - 89);
  if (period === "12m") start.setUTCMonth(start.getUTCMonth() - 11, 1);
  return { startDate: toIsoDate(start), endDate };
}

export function filterReportRecords(
  records: ReportRecord[],
  options: {
    startDate: string | null;
    endDate: string;
    currency: string;
    type?: ReportRecordType | "all";
    status?: string | "all";
    search?: string;
  },
) {
  const term = options.search?.trim().toLocaleLowerCase() ?? "";
  return records
    .filter((record) => record.currency === options.currency)
    .filter((record) => !options.startDate || record.date >= options.startDate)
    .filter((record) => !options.endDate || record.date <= options.endDate)
    .filter((record) => !options.type || options.type === "all" || record.type === options.type)
    .filter((record) => !options.status || options.status === "all" || record.status === options.status)
    .filter(
      (record) =>
        !term ||
        record.number.toLocaleLowerCase().includes(term) ||
        (record.customer ?? "").toLocaleLowerCase().includes(term),
    )
    .sort((left, right) => right.date.localeCompare(left.date) || right.number.localeCompare(left.number));
}

export function summarizeBusinessRecords(records: ReportRecord[]) {
  const invoices = records.filter((record) => record.type === "Invoice");
  const quotations = records.filter((record) => record.type === "Quotation");
  const receipts = records.filter((record) => record.type === "Receipt");
  const collected = receipts
    .filter((record) => record.status === "issued")
    .reduce((sum, record) => sum + record.amount, 0);
  const issuedInvoices = invoices.filter((record) => !["draft", "cancelled"].includes(record.status));
  const outstandingInvoices = invoices.filter((record) => ["sent", "overdue"].includes(record.status));
  const convertedQuotations = quotations.filter((record) => record.linked).length;

  return {
    collected: roundMoney(collected),
    receiptCount: receipts.filter((record) => record.status === "issued").length,
    invoiceValue: roundMoney(issuedInvoices.reduce((sum, record) => sum + record.amount, 0)),
    invoiceCount: issuedInvoices.length,
    outstanding: roundMoney(outstandingInvoices.reduce((sum, record) => sum + record.amount, 0)),
    outstandingCount: outstandingInvoices.length,
    quotationCount: quotations.length,
    convertedCount: convertedQuotations,
    conversionRate: quotations.length ? Math.round((convertedQuotations / quotations.length) * 100) : 0,
  };
}

export function buildRevenueSeries(
  records: ReportRecord[],
  period: ReportPeriod,
  now = new Date(),
) {
  const issuedReceipts = records.filter((record) => record.type === "Receipt" && record.status === "issued");
  const window = getReportDateWindow(period, now);
  const firstReceiptDate = issuedReceipts.map((record) => record.date).sort()[0];
  const startDate = window.startDate ?? firstReceiptDate ?? toIsoDate(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, 1)));
  const start = new Date(`${startDate}T00:00:00.000Z`);
  const end = new Date(`${window.endDate}T00:00:00.000Z`);
  const granularity = period === "30d" ? "day" : period === "90d" ? "week" : "month";
  const buckets: { key: string; label: string; revenue: number }[] = [];
  const indexByKey = new Map<string, number>();

  for (let cursor = new Date(start); cursor <= end; ) {
    const key = granularity === "month"
      ? `${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(2, "0")}`
      : toIsoDate(cursor);
    const labelDate = new Date(`${key}${granularity === "month" ? "-01" : ""}T00:00:00.000Z`);
    const label = new Intl.DateTimeFormat(undefined, granularity === "month"
      ? { month: "short", year: "2-digit", timeZone: "UTC" }
      : { month: "short", day: "numeric", timeZone: "UTC" }).format(labelDate);
    if (!indexByKey.has(key)) {
      indexByKey.set(key, buckets.length);
      buckets.push({ key, label, revenue: 0 });
    }
    if (granularity === "month") cursor.setUTCMonth(cursor.getUTCMonth() + 1, 1);
    else if (granularity === "week") cursor.setUTCDate(cursor.getUTCDate() + 7);
    else cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  for (const receipt of issuedReceipts) {
    if (receipt.date < startDate || receipt.date > window.endDate) continue;
    const date = new Date(`${receipt.date}T00:00:00.000Z`);
    const key = granularity === "month"
      ? `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`
      : granularity === "week"
        ? toIsoDate(new Date(start.getTime() + Math.floor((date.getTime() - start.getTime()) / (7 * 86400000)) * 7 * 86400000))
        : receipt.date;
    const index = indexByKey.get(key);
    if (index !== undefined) {
      const bucket = buckets[index];
      if (bucket) bucket.revenue += receipt.amount;
    }
  }

  return buckets.map((bucket) => ({ ...bucket, revenue: roundMoney(bucket.revenue) }));
}

export function reportRecordsToCsv(records: ReportRecord[]) {
  const header = ["Type", "Number", "Date", "Customer", "Status", "Currency", "Amount", "Payment method"];
  const rows = records.map((record) => [
    record.type,
    record.number,
    record.date,
    record.customer ?? "",
    record.status,
    record.currency,
    record.amount.toFixed(2),
    record.paymentMethod ?? "",
  ]);
  const cell = (value: string) => {
    const safeValue = /^[=+@\-\t\r]/.test(value) ? `'${value}` : value;
    return `"${safeValue.replaceAll('"', '""')}"`;
  };
  return `\uFEFF${[header, ...rows].map((row) => row.map((value) => cell(String(value))).join(",")).join("\r\n")}`;
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}