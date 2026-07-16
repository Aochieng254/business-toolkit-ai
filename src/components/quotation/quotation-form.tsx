import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
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

import { calcLine, calcTotals, formatMoney } from "@/lib/invoices/calc";
import { CURRENCIES } from "@/lib/invoices/currencies";
import { getCompany, listCustomers } from "@/lib/invoices/api";
import { useAuth } from "@/lib/auth";
import { ImproveWithAIButton } from "@/components/invoice/improve-with-ai-button";
import type {
  Quotation,
  QuotationItemInput,
  QuotationWithRelations,
} from "@/lib/quotations/types";
import { nextQuotationNumber, saveQuotation } from "@/lib/quotations/api";

const schema = z.object({
  quotation_number: z.string().trim().min(1, "Quotation number is required"),
  quotation_date: z.string().min(1, "Quotation date is required"),
  valid_until: z.string().optional().nullable(),
  customer_id: z.string().nullable(),
  currency: z.string().min(1),
});

function emptyItem(position: number): QuotationItemInput {
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
  initial?: QuotationWithRelations;
  mode: "create" | "edit";
};

export function QuotationForm({ initial, mode }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: company } = useQuery({ queryKey: ["company"], queryFn: getCompany });
  const { data: customers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: () => listCustomers(),
  });

  const [quotationNumber, setQuotationNumber] = useState(initial?.quotation_number ?? "");
  const [quotationDate, setQuotationDate] = useState<string>(
    initial?.quotation_date ?? new Date().toISOString().slice(0, 10),
  );
  const [validUntil, setValidUntil] = useState<string>(initial?.valid_until ?? "");
  const [referenceNumber, setReferenceNumber] = useState<string>(initial?.reference_number ?? "");
  const [salesRep, setSalesRep] = useState<string>(initial?.sales_rep ?? "");
  const [customerId, setCustomerId] = useState<string | null>(initial?.customer_id ?? null);
  const [currency, setCurrency] = useState<string>(
    initial?.currency ?? company?.default_currency ?? "USD",
  );
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [terms, setTerms] = useState(initial?.terms ?? "");
  const [items, setItems] = useState<QuotationItemInput[]>(
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

  useEffect(() => {
    if (mode === "create" && !quotationNumber && user) {
      nextQuotationNumber(user.id)
        .then(setQuotationNumber)
        .catch(() => setQuotationNumber("QUO-000001"));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, user]);

  useEffect(() => {
    if (mode === "create" && !initial && company?.default_currency) {
      setCurrency(company.default_currency);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [company?.default_currency]);

  const totals = useMemo(() => calcTotals(items), [items]);

  const patchItem = (idx: number, patch: Partial<QuotationItemInput>) => {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  };

  const addItem = () => setItems((prev) => [...prev, emptyItem(prev.length)]);
  const removeItem = (idx: number) =>
    setItems((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== idx)));

  const saveMut = useMutation({
    mutationFn: async (status: Quotation["status"]) => {
      const parse = schema.safeParse({
        quotation_number: quotationNumber,
        quotation_date: quotationDate,
        valid_until: validUntil || null,
        customer_id: customerId,
        currency,
      });
      if (!parse.success) throw new Error(parse.error.issues[0].message);
      return saveQuotation(user!.id, {
        id: initial?.id,
        quotation_number: quotationNumber.trim(),
        quotation_date: quotationDate,
        valid_until: validUntil || null,
        reference_number: referenceNumber.trim() || null,
        sales_rep: salesRep.trim() || null,
        customer_id: customerId,
        company_id: company?.id ?? null,
        currency,
        status,
        notes: notes || null,
        terms: terms || null,
        items,
      });
    },
    onSuccess: (q, status) => {
      toast.success(status === "draft" ? "Draft saved" : "Quotation saved");
      qc.invalidateQueries({ queryKey: ["quotations"] });
      navigate({ to: "/quotation/$id", params: { id: q.id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-5xl pb-16">
      <div className="mb-4 flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/quotation" })}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Back
        </Button>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => saveMut.mutate("draft")}
            disabled={saveMut.isPending}
          >
            <Save className="mr-2 h-4 w-4" /> Save draft
          </Button>
          <Button
            onClick={() =>
              saveMut.mutate(
                initial?.status && initial.status !== "draft" ? initial.status : "sent",
              )
            }
            disabled={saveMut.isPending}
          >
            <Send className="mr-2 h-4 w-4" />
            {mode === "create" ? "Save quotation" : "Save changes"}
          </Button>
        </div>
      </div>

      <h1 className="text-2xl font-bold tracking-tight">
        {mode === "create" ? "New quotation" : `Edit ${quotationNumber}`}
      </h1>
      {!company && (
        <p className="mt-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
          Set up your{" "}
          <a href="/company" className="underline">
            company profile
          </a>{" "}
          for branded PDFs.
        </p>
      )}

      <div className="mt-6 grid gap-4 rounded-xl border border-border bg-card p-5 md:grid-cols-2">
        <div>
          <Label>Quotation number</Label>
          <Input
            value={quotationNumber}
            onChange={(e) => setQuotationNumber(e.target.value)}
            className="mt-1"
          />
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
          <Label>Quotation date</Label>
          <Input
            type="date"
            value={quotationDate}
            onChange={(e) => setQuotationDate(e.target.value)}
            className="mt-1"
          />
        </div>
        <div>
          <Label>Valid until</Label>
          <Input
            type="date"
            value={validUntil}
            onChange={(e) => setValidUntil(e.target.value)}
            className="mt-1"
          />
        </div>
        <div>
          <Label>Reference number</Label>
          <Input
            value={referenceNumber}
            onChange={(e) => setReferenceNumber(e.target.value)}
            placeholder="Optional"
            className="mt-1"
          />
        </div>
        <div>
          <Label>Sales representative</Label>
          <Input
            value={salesRep}
            onChange={(e) => setSalesRep(e.target.value)}
            placeholder="Optional"
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
      </div>

      <div className="mt-6 rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border p-4">
          <div>
            <h2 className="font-semibold">Line items</h2>
            <p className="text-xs text-muted-foreground">
              Add products or services. Totals update live.
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
                    placeholder="e.g. Website redesign proposal — phase 1"
                    className="mt-1"
                  />
                </div>
                <div className="md:col-span-1">
                  <Label className="text-xs">Qty</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={it.quantity}
                    onChange={(e) =>
                      patchItem(idx, { quantity: parseFloat(e.target.value) || 0 })
                    }
                    className="mt-1"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label className="text-xs">Unit price</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={it.unit_price}
                    onChange={(e) =>
                      patchItem(idx, { unit_price: parseFloat(e.target.value) || 0 })
                    }
                    className="mt-1"
                  />
                </div>
                <div className="md:col-span-1">
                  <Label className="text-xs">Disc {it.discount_is_percent ? "%" : "amt"}</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={it.discount_value}
                    onChange={(e) =>
                      patchItem(idx, { discount_value: parseFloat(e.target.value) || 0 })
                    }
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
                    onChange={(e) =>
                      patchItem(idx, { vat_percent: parseFloat(e.target.value) || 0 })
                    }
                    className="mt-1"
                  />
                </div>
                <div className="flex items-end justify-between gap-1 md:col-span-1">
                  <div className="flex-1 text-right">
                    <div className="text-xs text-muted-foreground">Total</div>
                    <div className="text-sm font-semibold">
                      {formatMoney(line.total, currency)}
                    </div>
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

        <div className="flex justify-end border-t border-border p-5">
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
            placeholder="Thanks for the opportunity to quote for your project."
            className="mt-2"
          />
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <Label>Terms & conditions</Label>
            <ImproveWithAIButton />
          </div>
          <Textarea
            rows={5}
            value={terms}
            onChange={(e) => setTerms(e.target.value)}
            placeholder="Quote valid for 30 days. 50% deposit required to begin work."
            className="mt-2"
          />
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div
      className={`flex justify-between ${bold ? "text-base font-bold" : "text-muted-foreground"}`}
    >
      <span>{label}</span>
      <span className={bold ? "text-foreground" : ""}>{value}</span>
    </div>
  );
}
