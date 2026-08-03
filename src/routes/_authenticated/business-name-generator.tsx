import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles, Loader2, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { generateFromTemplate } from "@/lib/ai/service.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/business-name-generator")({
  head: () => ({
    meta: [
      { title: "Business Name Generator | Business Toolkit AI" },
      {
        name: "description",
        content:
          "Generate memorable, brandable business names with AI, complete with taglines and domain ideas.",
      },
      { property: "og:title", content: "Business Name Generator | Business Toolkit AI" },
      {
        property: "og:description",
        content: "Brainstorm memorable brand names in seconds.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BusinessNamePage,
});

type Idea = { name: string; tagline: string };

const STYLES = ["Modern", "Playful", "Premium", "Descriptive", "Invented word", "Short & punchy"];

function parseIdeas(text: string): Idea[] {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && /[a-z]/i.test(l))
    .map((l) => l.replace(/^\d+[.)]\s*/, "").replace(/^[-*•]\s*/, "").replace(/\*\*/g, ""))
    .map((l) => {
      const [name, ...rest] = l.split(/\s*[—–:|-]\s+/);
      return { name: (name ?? "").trim(), tagline: rest.join(" — ").trim() };
    })
    .filter((i) => i.name.length > 0 && i.name.length < 60)
    .slice(0, 20);
}

function BusinessNamePage() {
  const generate = useServerFn(generateFromTemplate);
  const [busy, setBusy] = useState(false);
  const [keywords, setKeywords] = useState("");
  const [industry, setIndustry] = useState("");
  const [audience, setAudience] = useState("");
  const [style, setStyle] = useState("Modern");
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [copied, setCopied] = useState<string | null>(null);

  const run = async () => {
    if (!keywords.trim() && !industry.trim()) {
      toast.info("Add a few keywords or an industry first.");
      return;
    }
    setBusy(true);
    try {
      const res = await generate({
        data: {
          promptKey: "businessName",
          input: `Generate 12 business name ideas.
Keywords: ${keywords || "n/a"}
Industry: ${industry || "n/a"}
Target audience: ${audience || "n/a"}
Style: ${style}
Format each line exactly as: Name — short tagline. No numbering, no extra commentary.`,
        },
      });
      const parsed = parseIdeas(res.text);
      setIdeas(parsed);
      if (parsed.length === 0) toast.error("No names returned, try again.");
      else toast.success(`${parsed.length} names generated`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "AI failed");
    } finally {
      setBusy(false);
    }
  };

  const copy = async (name: string) => {
    await navigator.clipboard.writeText(name);
    setCopied(name);
    setTimeout(() => setCopied(null), 1500);
  };

  const slug = (n: string) => n.toLowerCase().replace(/[^a-z0-9]/g, "");

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-accent-foreground">
          <Sparkles className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Business Name Generator</h1>
          <p className="text-sm text-muted-foreground">
            Brainstorm memorable brand names in seconds.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-base">Brief</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Keywords</Label>
              <Textarea
                rows={3}
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                placeholder="coffee, sustainable, fast delivery"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Industry</Label>
              <Input value={industry} onChange={(e) => setIndustry(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Target audience</Label>
              <Input value={audience} onChange={(e) => setAudience(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Style</Label>
              <Select value={style} onValueChange={setStyle}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STYLES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={run} disabled={busy} className="w-full">
              {busy ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              Generate names
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-3">
          {ideas.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
              Your generated names will appear here.
            </div>
          )}
          {ideas.map((idea) => (
            <Card key={idea.name}>
              <CardContent className="flex items-start justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{idea.name}</p>
                  {idea.tagline && (
                    <p className="text-sm text-muted-foreground">{idea.tagline}</p>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {slug(idea.name)}.com
                  </p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => copy(idea.name)}>
                  {copied === idea.name ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
