import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Bot,
  Building2,
  Calculator,
  Combine,
  CreditCard,
  FileSpreadsheet,
  FileText,
  FileType2,
  FolderOpen,
  Image as ImageIcon,
  LayoutDashboard,
  LayoutTemplate,
  Mail,
  Presentation,
  Receipt,
  Scissors,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  UserSquare2,
  Users,
  Wallet,
  Wrench,
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

type NavItem = { title: string; url: string; icon: React.ComponentType<{ className?: string }> };

const PAGES: NavItem[] = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Files", url: "/files", icon: FolderOpen },
  { title: "AI Assistant", url: "/ai-assistant", icon: Bot },
  { title: "Invoice", url: "/invoice", icon: FileText },
  { title: "Quotation", url: "/quotation", icon: FileSpreadsheet },
  { title: "Receipt", url: "/receipt", icon: Receipt },
  { title: "Payslip", url: "/payslip", icon: Wallet },
  { title: "CV Builder", url: "/cv-builder", icon: UserSquare2 },
  { title: "Cover Letter", url: "/cover-letter", icon: Mail },
  { title: "Business Name Generator", url: "/business-name-generator", icon: Sparkles },
  { title: "Customers", url: "/customers", icon: Users },
  { title: "Company profile", url: "/company", icon: Building2 },
  { title: "PDF Tools", url: "/pdf-tools", icon: Wrench },
  { title: "PDF to Word", url: "/pdf-to-word", icon: FileType2 },
  { title: "Word to PDF", url: "/word-to-pdf", icon: FileText },
  { title: "PDF to Excel", url: "/pdf-to-excel", icon: FileSpreadsheet },
  { title: "PDF to PowerPoint", url: "/pdf-to-powerpoint", icon: Presentation },
  { title: "PDF to Image", url: "/pdf-to-image", icon: ImageIcon },
  { title: "Split PDF", url: "/pdf-split", icon: Scissors },
  { title: "Merge PDFs", url: "/pdf-merge", icon: Combine },
  { title: "PDF to Publisher", url: "/pdf-to-publisher", icon: LayoutTemplate },
  { title: "Calculators", url: "/calculators", icon: Calculator },
  { title: "Subscription", url: "/subscription", icon: CreditCard },
  { title: "Admin", url: "/admin", icon: ShieldCheck },
  { title: "Settings", url: "/settings", icon: Settings },
];

const ACTIONS: NavItem[] = [
  { title: "New invoice", url: "/invoice/new", icon: FileText },
  { title: "New quotation", url: "/quotation/new", icon: FileSpreadsheet },
  { title: "New receipt", url: "/receipt/new", icon: Receipt },
];

type Hit = { id: string; label: string; sub?: string; url: string; group: string };

export function CommandPalette() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const reqId = useRef(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) {
      setHits([]);
      return;
    }
    const mine = ++reqId.current;
    const like = `%${term.replace(/[%_]/g, "")}%`;
    const timer = setTimeout(async () => {
      const [inv, quo, rec, cus, fil] = await Promise.all([
        supabase.from("invoices").select("id, invoice_number, grand_total, currency").ilike("invoice_number", like).limit(5),
        supabase.from("quotations").select("id, quotation_number, grand_total, currency").ilike("quotation_number", like).limit(5),
        supabase.from("receipts").select("id, receipt_number, grand_total, currency").ilike("receipt_number", like).limit(5),
        supabase.from("customers").select("id, name, email").ilike("name", like).limit(5),
        supabase.from("files").select("id, name").eq("is_trashed", false).ilike("name", like).limit(5),
      ]);
      if (mine !== reqId.current) return;

      const next: Hit[] = [
        ...(inv.data ?? []).map((r) => ({
          id: `inv-${r.id}`,
          label: r.invoice_number,
          sub: `${r.currency} ${Number(r.grand_total).toFixed(2)}`,
          url: `/invoice/${r.id}`,
          group: "Invoices",
        })),
        ...(quo.data ?? []).map((r) => ({
          id: `quo-${r.id}`,
          label: r.quotation_number,
          sub: `${r.currency} ${Number(r.grand_total).toFixed(2)}`,
          url: `/quotation/${r.id}`,
          group: "Quotations",
        })),
        ...(rec.data ?? []).map((r) => ({
          id: `rec-${r.id}`,
          label: r.receipt_number,
          sub: `${r.currency} ${Number(r.grand_total).toFixed(2)}`,
          url: `/receipt/${r.id}`,
          group: "Receipts",
        })),
        ...(cus.data ?? []).map((r) => ({
          id: `cus-${r.id}`,
          label: r.name,
          sub: r.email ?? undefined,
          url: `/customers`,
          group: "Customers",
        })),
        ...(fil.data ?? []).map((r) => ({
          id: `fil-${r.id}`,
          label: r.name,
          url: `/files`,
          group: "Files",
        })),
      ];
      setHits(next);
    }, 220);
    return () => clearTimeout(timer);
  }, [query]);

  const grouped = useMemo(() => {
    const map = new Map<string, Hit[]>();
    for (const h of hits) map.set(h.group, [...(map.get(h.group) ?? []), h]);
    return [...map.entries()];
  }, [hits]);

  const go = (url: string) => {
    setOpen(false);
    setQuery("");
    navigate({ to: url });
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="h-9 gap-2 px-2 text-muted-foreground sm:px-3"
        aria-label="Open search"
      >
        <Search className="h-4 w-4" />
        <span className="hidden sm:inline">Search…</span>
        <kbd className="hidden rounded border border-border bg-muted px-1.5 text-[10px] font-medium sm:inline">
          ⌘K
        </kbd>
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Search invoices, quotes, receipts, customers, files…"
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>

          {grouped.map(([group, items]) => (
            <CommandGroup key={group} heading={group}>
              {items.map((h) => (
                <CommandItem key={h.id} value={`${h.label} ${h.group}`} onSelect={() => go(h.url)}>
                  <span className="truncate">{h.label}</span>
                  {h.sub ? (
                    <span className="ml-auto truncate text-xs text-muted-foreground">{h.sub}</span>
                  ) : null}
                </CommandItem>
              ))}
            </CommandGroup>
          ))}

          {grouped.length > 0 ? <CommandSeparator /> : null}

          <CommandGroup heading="Create">
            {ACTIONS.map((a) => (
              <CommandItem key={a.url} value={a.title} onSelect={() => go(a.url)}>
                <a.icon className="mr-2 h-4 w-4" />
                {a.title}
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandGroup heading="Go to">
            {PAGES.map((p) => (
              <CommandItem key={p.url} value={p.title} onSelect={() => go(p.url)}>
                <p.icon className="mr-2 h-4 w-4" />
                {p.title}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
