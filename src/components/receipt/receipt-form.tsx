import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, GripVertical, Save, Send, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

import type {
  PaymentMethod,
  Receipt,
  ReceiptItemInput,
  ReceiptWithRelations,
} from "@/lib/receipts/types";
import { PAYMENT_METHOD_LABELS } from "@/lib/receipts/types";
import { calcLine, calcTotals, formatMoney } from "@/lib/invoices/calc";
import { CURRENCIES } from "@/lib/invoices/currencies";
import { getCompany, listCustomers } from "@/lib/invoices/api";
import { buildReceiptFromInvoice, nextReceiptNumber, saveReceipt } from "@/lib/receipts/api";
import { useAuth } from "@/lib/auth";
import { ImproveWithAIButton } from "@/components/invoice/improve-with-ai-button";

const schema = z.object({
  receipt_number: z.string().trim().min(1, "Receipt number is required"),
  receipt_date: z.string().min(1, "Receipt date is required"),
  currency: z.string().min(1),
  amount_received: z.number().min(0),
});

function emptyItem(position: number): ReceiptItemInput {
  return {
    position,
    description: "",
    quantity: 1,
    unit_price: 0,
    discount_value: 0,
    discount_is_percent: true,
    vat_percent: 0,
  };
}

type Props = {
  initial?: ReceiptWithRelations;
  mode: "create" | "edit";
};

export function ReceiptForm({ initial, mode }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  // Support ?from_invoice=<id> to prefill from an invoice.
  const search = useSearch({ strict: false }) as { from_invoice?: string };
  const fromInvoice = search?.from_invoice;

  const { data: company } = useQuery({ queryKey: ["company"], queryFn: getCompany });
  const { data: customers = [] } = useQuery({ queryKey: ["customers"], queryFn: () => listCustomers() });

  const [receiptNumber, setReceiptNumber] = useState(initial?.receipt_number ?? "");
  const [receiptDate, setReceiptDate] = useState<string>(
    initial?.receipt_date ?? new Date().toISOString().slice(0, 10),
  );
  const [customerId, setCustomerId] = useState<string | null>(initial?.customer_id ?? null);
  const [sourceInvoiceId, setSourceInvoiceId] = useState<string | null>(initial?.source_invoice_id ?? null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    (initial?.payment_method as PaymentMethod) ?? "cash",
  );
  const [paymentReference, setPaymentReference] = useState(initial?.payment_reference ?? "");
  const [currency, setCurrency] = useState<string>(
    initial?.currency ?? company?.default_currency ?? "USD",
  );
  const [amountReceived, setAmountReceived] = useState<number>(Number(initial?.amount_received ?? 0));
  const [amountOverridden, setAmountOverridden] = useState(false);
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [terms, setTerms] = useState(initial?.terms ?? "");
  const [items, setItems] = useState<ReceiptItemInput[]>(
    initial?.items?.length
      ? initial.items.map((it, i) => ({
          id: it.id,
          position: i,
          description: it.description,
          quantity: Number(it.quantity),
          unit_price: Number(it.unit_price),
          discount_value: Number(it.discount_value),
          discount_is_percent: it.discount_is_percent,
          vat_percent: Number(it.vat_percent),
        }))
      : [emptyItem(0)],
  );

  // Auto-generate receipt number on create.
  useEffect(() => {
    if (mode === "create" && !receiptNumber && user && !fromInvoice) {
      nextReceiptNumber(user.id).then(setReceiptNumber).catch(() => setReceiptNumber("RCP-000001"));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, user]);

  // Prefill from invoice if requested.
  useEffect(() => {
    if (mode === "create" && fromInvoice && user && !initial) {
      buildReceiptFromInvoice(user.id, fromInvoice).then((p) => {
        if (!p) return;
        setReceiptNumber(p.receipt_number);
        setReceiptDate(p.receipt_date);
        setCustomerId(p.customer_id);
        setSourceInvoiceId(p.source_invoice_id);
        setCurrency(p.currency);
        setAmountReceived(p.amount_received);
        setItems(p.items.length ? p.items : [emptyItem(0)]);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromInvoice, user]);

  useEffect(() => {
    if (mode === "create" && !initial && company?.default_currency && !fromInvoice) {
      setCurrency(company.default_currency);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [company?.default_currency]);

  const totals = useMemo(() => calcTotals(items), [items]);

  // Auto-fill amount received from totals until user edits it.
  useEffect(() => {
    if (!amountOverridden) setAmountReceived(totals.grand_total);
  }, [totals.grand_total, amountOverridden]);

  const patchItem = (idx: number, patch: Partial<ReceiptItemInput>) => {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  };
  const addItem = () => setItems((prev) => [...prev, emptyItem(prev.length)]);
  const removeItem = (idx: number) =>
    setItems((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== idx)));

  const saveMut = useMutation({
    mutationFn: async (status: Receipt["status"]) => {
      const parse = schema.safeParse({
        receipt_number: receiptNumber,
        receipt_date: receiptDate,
        currency,
        amount_received: amountReceived,
      });
      if (!parse.success) throw new Error(parse.error.issues[0].message);
      return saveReceipt(user!.id, {
        id: initial?.id,
        receipt_number: receiptNumber.trim(),
        receipt_date: receiptDate,
        customer_id: customerId,
        company_id: company?.id ?? null,
        source_invoice_id: sourceInvoiceId,
        payment_method: paymentMethod,
        payment_reference: paymentReference || null,
        currency,
        status,
        amount_received: amountReceived,
        notes: notes || null,
        terms: terms || null,
        items,
      });
    },
    onSuccess: (rec, status) => {
      toast.success(status === "draft" ? "Draft saved" : "Receipt saved");
      qc.invalidateQueries({ queryKey: ["receipts"] });
      qc.invalidateQueries({ queryKey: ["invoices"] });
      navigate({ to: "/receipt/$id", params: { id: rec.id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-5xl pb-16">
      <div className="mb-4 flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/receipt" })}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Back
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => saveMut.mutate("draft")} disabled={saveMut.isPending}>
            <Save className="mr-2 h-4 w-4" /> Save draft
          </Button>
          <Button onClick={() => saveMut.mutate("issued")} disabled={saveMut.isPending}>
            <Send className="mr-2 h-4 w-4" /> {mode === "create" ? "Issue receipt" : "Save changes"}
          </Button>
        </div>
      </div>

      <h1 className="text-2xl font-bold tracking-tight">
        {mode === "create" ? "New receipt" : `Edit ${receiptNumber}`}
      </h1>
      {sourceInvoiceId && (
        <p className="mt-2 rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-xs text-primary">
          Linked to an invoice — issuing this receipt marks it as <strong>Paid</strong>.
        </p>
      )}

      {/* Header fields */}
      <div className="mt-6 grid gap-4 rounded-xl border border-border bg-card p-5 md:grid-cols-2">
        <div>
          <Label>Receipt number</Label>
          <Input value={receiptNumber} onChange={(e) => setReceiptNumber(e.target.value)} className="mt-1" />
        </div>
        <div>
          <Label>Customer</Label>
          <Select value={customerId ?? ""} onValueChange={(v) => setCustomerId(v || null)}>
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Select customer" />
            </SelectTrigger>
            <SelectContent>
              {customers.length === 0 ? (
                <div className="px-3 py-6 text-center text-xs text-muted-foreground">
                  No customers yet.
                  <br />
                  <a href="/customers" className="text-primary underline">
                    Add one
                  </a>
                  .
                </div>
              ) : (
                customers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Receipt date</Label>
          <Input
            type="date"
            value={receiptDate}
            onChange={(e) => setReceiptDate(e.target.value)}
            className="mt-1"
          />
        </div>
        <div>
          <Label>Currency</Label>
          <Select value={currency} onValueChange={setCurrency}>
            <SelectTrigger className="mt-1">
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
        <div>
          <Label>Payment method</Label>
          <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}>
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(PAYMENT_METHOD_LABELS).map(([k, label]) => (
                <SelectItem key={k} value={k}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Payment reference</Label>
          <Input
            value={paymentReference ?? ""}
            onChange={(e) => setPaymentReference(e.target.value)}
            placeholder="e.g. MPX12345 or bank txn id"
            className="mt-1"
          />
        </div>
      </div>

      {/* Line items */}
      <div className="mt-6 rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border p-4">
          <div>
            <h2 className="font-semibold">Items paid for</h2>
            <p className="text-xs text-muted-foreground">
              Optional — describe what this payment covers. Totals update live.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={addItem}>
            <Plus className="mr-1 h-4 w-4" /> Add item
          </Button>
        </div>

        <div className="divide-y divide-border">
          {items.map((it, idx) => {
            const line = calcLine(it);
            return (
              <div key={idx} className="grid gap-3 p-4 md:grid-cols-12">
                <div className="hidden items-center justify-center text-muted-foreground md:col-span-1 md:flex">
                  <GripVertical className="h-4 w-4" />
                </div>
                <div className="md:col-span-5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Description</Label>
                    <ImproveWithAIButton />
                  </div>
                  <Textarea
                    rows={2}
                    value={it.description}
                    onChange={(e) => patchItem(idx, { description: e.target.value })}
                    placeholder="e.g. Website design — final payment"
                    className="mt-1"
                  />
                </div>
                <div className="md:col-span-1">
                  <Label className="text-xs">Qty</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={it.quantity}
                    onChange={(e) => patchItem(idx, { quantity: parseFloat(e.target.value) || 0 })}
                    className="mt-1"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label className="text-xs">Unit price</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={it.unit_price}
                    onChange={(e) => patchItem(idx, { unit_price: parseFloat(e.target.value) || 0 })}
                    className="mt-1"
                  />
                </div>
                <div className="md:col-span-1">
                  <Label className="text-xs">Disc {it.discount_is_percent ? "%" : "amt"}</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={it.discount_value}
                    onChange={(e) => patchItem(idx, { discount_value: parseFloat(e.target.value) || 0 })}
                    className="mt-1"
                  />
                  <div className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Switch
                      checked={it.discount_is_percent}
                      onCheckedChange={(c) => patchItem(idx, { discount_is_percent: c })}
                      className="scale-75"
                    />
                    <span>%</span>
                  </div>
                </div>
                <div className="md:col-span-1">
                  <Label className="text-xs">VAT %</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={it.vat_percent}
                    onChange={(e) => patchItem(idx, { vat_percent: parseFloat(e.target.value) || 0 })}
                    className="mt-1"
                  />
                </div>
                <div className="flex items-end justify-between gap-1 md:col-span-1">
                  <div className="flex-1 text-right">
                    <div className="text-xs text-muted-foreground">Total</div>
                    <div className="text-sm font-semibold">{formatMoney(line.total, currency)}</div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeItem(idx)}
                    disabled={items.length === 1}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Totals */}
        <div className="flex flex-wrap items-start justify-between gap-6 border-t border-border p-5">
          <div className="min-w-[220px]">
            <Label className="text-xs">Amount received</Label>
            <Input
              type="number"
              step="0.01"
              value={amountReceived}
              onChange={(e) => {
                setAmountOverridden(true);
                setAmountReceived(parseFloat(e.target.value) || 0);
              }}
              className="mt-1"
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              Overrides the calculated total (e.g. partial payments).
            </p>
          </div>
          <div className="w-full max-w-xs space-y-2 text-sm">
            <Row label="Subtotal" value={formatMoney(totals.subtotal, currency)} />
            <Row label="Discount" value={`- ${formatMoney(totals.discount_total, currency)}`} />
            <Row label="VAT" value={formatMoney(totals.vat_total, currency)} />
            <div className="mt-2 border-t border-border pt-2">
              <Row label="Grand total" value={formatMoney(totals.grand_total, currency)} bold />
            </div>
          </div>
        </div>
      </div>

      {/* Notes & Terms */}
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <Label>Notes</Label>
            <ImproveWithAIButton />
          </div>
          <Textarea
            rows={5}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Thanks for your payment!"
            className="mt-2"
          />
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <Label>Terms</Label>
          <Textarea
            rows={5}
            value={terms}
            onChange={(e) => setTerms(e.target.value)}
            placeholder="Non-refundable after 14 days."
            className="mt-2"
          />
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? "text-base font-bold" : "text-muted-foreground"}`}>
      <span>{label}</span>
      <span className={bold ? "text-foreground" : ""}>{value}</span>
    </div>
  );
}
