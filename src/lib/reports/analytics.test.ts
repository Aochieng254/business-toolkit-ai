import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  filterReportRecords,
  getReportDateWindow,
  reportRecordsToCsv,
  summarizeBusinessRecords,
  type ReportRecord,
} from "./analytics";

describe("business report calculations", () => {
  it("counts only issued receipts and open invoices in monetary summaries", () => {
    const records: ReportRecord[] = [
      { id: "1", type: "Receipt", number: "R-1", date: "2026-11-01", currency: "USD", amount: 75, status: "issued", customer: null, paymentMethod: "cash" },
      { id: "2", type: "Receipt", number: "R-2", date: "2026-11-02", currency: "USD", amount: 100, status: "void", customer: null, paymentMethod: "cash" },
      { id: "3", type: "Invoice", number: "I-1", date: "2026-11-03", currency: "USD", amount: 140, status: "sent", customer: null, paymentMethod: null },
      { id: "4", type: "Invoice", number: "I-2", date: "2026-11-04", currency: "USD", amount: 200, status: "paid", customer: null, paymentMethod: null },
      { id: "5", type: "Invoice", number: "I-3", date: "2026-11-05", currency: "USD", amount: 90, status: "draft", customer: null, paymentMethod: null },
      { id: "6", type: "Invoice", number: "I-4", date: "2026-11-06", currency: "USD", amount: 40, status: "overdue", customer: null, paymentMethod: null },
      { id: "7", type: "Quotation", number: "Q-1", date: "2026-11-07", currency: "USD", amount: 50, status: "accepted", customer: null, paymentMethod: null, linked: true },
      { id: "8", type: "Quotation", number: "Q-2", date: "2026-11-08", currency: "USD", amount: 25, status: "sent", customer: null, paymentMethod: null, linked: false },
    ];

    assert.deepEqual(summarizeBusinessRecords(records), {
      collected: 75,
      receiptCount: 1,
      invoiceValue: 380,
      invoiceCount: 3,
      outstanding: 180,
      outstandingCount: 2,
      quotationCount: 2,
      convertedCount: 1,
      conversionRate: 50,
    });
  });

  it("returns an inclusive 30-day range for the selected report period", () => {
    assert.deepEqual(getReportDateWindow("30d", new Date("2026-11-26T12:00:00.000Z")), {
      startDate: "2026-10-28",
      endDate: "2026-11-26",
    });
  });

  it("filters by currency, period, document kind and search term", () => {
    const records: ReportRecord[] = [
      { id: "1", type: "Invoice", number: "INV-1", date: "2026-11-02", currency: "USD", amount: 40, status: "sent", customer: "Harbor Co", paymentMethod: null },
      { id: "2", type: "Invoice", number: "INV-2", date: "2026-10-02", currency: "USD", amount: 50, status: "sent", customer: "Harbor Co", paymentMethod: null },
      { id: "3", type: "Receipt", number: "REC-1", date: "2026-11-03", currency: "KES", amount: 70, status: "issued", customer: "Harbor Co", paymentMethod: "cash" },
    ];

    assert.deepEqual(filterReportRecords(records, {
      startDate: "2026-11-01",
      endDate: "2026-11-30",
      currency: "USD",
      type: "Invoice",
      status: "sent",
      search: "harbor",
    }).map((record) => record.number), ["INV-1"]);
  });

  it("quotes CSV fields and neutralizes spreadsheet formulas", () => {
    const records: ReportRecord[] = [
      { id: "1", type: "Invoice", number: "=IMPORTDATA(1)", date: "2026-11-02", currency: "USD", amount: 40, status: "sent", customer: "Acme, \"North\"", paymentMethod: null },
    ];

    assert.ok(reportRecordsToCsv(records).includes('"\'=IMPORTDATA(1)"'));
    assert.ok(reportRecordsToCsv(records).includes('"Acme, ""North"""'));
  });
});