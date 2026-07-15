import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Upload, Building2 } from "lucide-react";
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
import { getCompany, getSignedLogoUrl, upsertCompany, uploadCompanyLogo } from "@/lib/invoices/api";
import { CURRENCIES } from "@/lib/invoices/currencies";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/company")({
  component: CompanyPage,
});

const schema = z.object({
  name: z.string().trim().min(1, "Company name is required").max(120),
  email: z.string().trim().email().max(255).or(z.literal("")).optional(),
  phone: z.string().trim().max(50).optional(),
  address: z.string().trim().max(500).optional(),
  website: z.string().trim().max(255).optional(),
  tax_number: z.string().trim().max(80).optional(),
  default_currency: z.string().min(1),
});

type FormState = z.infer<typeof schema>;

function CompanyPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: company, isLoading } = useQuery({ queryKey: ["company"], queryFn: getCompany });

  const [form, setForm] = useState<FormState>({
    name: "",
    email: "",
    phone: "",
    address: "",
    website: "",
    tax_number: "",
    default_currency: "USD",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  useEffect(() => {
    if (company) {
      setForm({
        name: company.name,
        email: company.email ?? "",
        phone: company.phone ?? "",
        address: company.address ?? "",
        website: company.website ?? "",
        tax_number: company.tax_number ?? "",
        default_currency: company.default_currency,
      });
      if (company.logo_url) getSignedLogoUrl(company.logo_url).then(setLogoPreview);
    }
  }, [company]);

  const saveMut = useMutation({
    mutationFn: async () => {
      const parse = schema.safeParse(form);
      if (!parse.success) {
        const errs: Record<string, string> = {};
        for (const issue of parse.error.issues) errs[issue.path.join(".")] = issue.message;
        setErrors(errs);
        throw new Error("Please fix the highlighted errors");
      }
      setErrors({});
      return upsertCompany(
        user!.id,
        {
          name: form.name.trim(),
          email: form.email?.trim() || null,
          phone: form.phone?.trim() || null,
          address: form.address?.trim() || null,
          website: form.website?.trim() || null,
          tax_number: form.tax_number?.trim() || null,
          default_currency: form.default_currency,
        },
        company?.id,
      );
    },
    onSuccess: () => {
      toast.success("Company profile saved");
      qc.invalidateQueries({ queryKey: ["company"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const logoMut = useMutation({
    mutationFn: async (file: File) => {
      if (!company) {
        toast.error("Save company info first, then upload a logo.");
        throw new Error("Save company first");
      }
      if (file.size > 2 * 1024 * 1024) throw new Error("Logo must be under 2 MB");
      const path = await uploadCompanyLogo(user!.id, file);
      await upsertCompany(user!.id, { name: company.name, logo_url: path }, company.id);
      const signed = await getSignedLogoUrl(path);
      setLogoPreview(signed);
      return signed;
    },
    onSuccess: () => {
      toast.success("Logo updated");
      qc.invalidateQueries({ queryKey: ["company"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
          <Building2 className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Company profile</h1>
          <p className="text-sm text-muted-foreground">Shown on your invoices and PDFs.</p>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-border bg-card p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted">
            {logoPreview ? (
              <img src={logoPreview} alt="Logo" className="h-full w-full object-contain" />
            ) : (
              <Building2 className="h-8 w-8 text-muted-foreground" />
            )}
          </div>
          <div>
            <Label className="text-xs">Logo</Label>
            <div className="mt-1 flex items-center gap-2">
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) logoMut.mutate(f);
                  }}
                />
                <span className="inline-flex items-center gap-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm hover:bg-accent">
                  <Upload className="h-4 w-4" /> Upload logo
                </span>
              </label>
              <span className="text-xs text-muted-foreground">PNG or JPG · max 2 MB</span>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Field label="Company name *" error={errors.name}>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Default currency">
            <Select value={form.default_currency} onValueChange={(v) => setForm({ ...form, default_currency: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => (
                  <SelectItem key={c.code} value={c.code}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Email" error={errors.email}>
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Field>
          <Field label="Phone">
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </Field>
          <Field label="Website">
            <Input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://" />
          </Field>
          <Field label="Tax / VAT number">
            <Input value={form.tax_number} onChange={(e) => setForm({ ...form, tax_number: e.target.value })} />
          </Field>
          <div className="md:col-span-2">
            <Field label="Address">
              <Textarea rows={3} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </Field>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
            Save company profile
          </Button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <div className="mt-1">{children}</div>
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}
