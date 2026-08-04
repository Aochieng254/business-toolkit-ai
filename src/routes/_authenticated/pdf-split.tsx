import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Scissors } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { FileDrop, ToolHeader } from "@/components/tools/file-drop";
import { parseRanges } from "@/lib/pdf/core";
import { getPageCount, splitPdf } from "@/lib/pdf/convert";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/pdf-split")({
  head: () => ({
    meta: [
      { title: "Split PDF Pages | Business Toolkit AI" },
      {
        name: "description",
        content:
          "Split a PDF into single pages or pull out an exact page range, privately in your browser.",
      },
      { property: "og:title", content: "Split PDF Pages | Business Toolkit AI" },
      { property: "og:description", content: "Break a PDF apart or extract just the pages you need." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SplitPage,
});

function SplitPage() {
  const [file, setFile] = useState<File | null>(null);
  const [count, setCount] = useState(0);
  const [mode, setMode] = useState<"each" | "range">("range");
  const [ranges, setRanges] = useState("1-");
  const [busy, setBusy] = useState(false);

  const pick = async (f: File) => {
    setBusy(true);
    try {
      const n = await getPageCount(f);
      setFile(f);
      setCount(n);
      setRanges(`1-${n}`);
    } catch {
      toast.error("Could not read that PDF");
    } finally {
      setBusy(false);
    }
  };

  const run = async () => {
    if (!file) return;
    const pages = mode === "each" ? Array.from({ length: count }, (_, i) => i) : parseRanges(ranges, count);
    if (!pages.length) {
      toast.error("No valid pages selected");
      return;
    }
    setBusy(true);
    try {
      await splitPdf(file, mode, pages);
      toast.success(mode === "each" ? "Split pages downloaded as a ZIP" : "Extracted PDF downloaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Split failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <ToolHeader
        icon={Scissors}
        title="Split PDF"
        description="Separate every page into its own file, or extract a specific range."
      />
      <Card>
        <CardContent className="space-y-5 p-6">
          <FileDrop
            accept="application/pdf"
            label={file ? `${file.name} — ${count} page(s)` : "Drop a PDF here"}
            hint="Choose the file you want to split"
            busy={busy}
            onFiles={(f) => pick(f[0])}
          />

          {file && (
            <>
              <RadioGroup value={mode} onValueChange={(v) => setMode(v as "each" | "range")} className="gap-3">
                <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3">
                  <RadioGroupItem value="range" className="mt-1" />
                  <span>
                    <span className="block text-sm font-medium">Extract a page range</span>
                    <span className="block text-xs text-muted-foreground">
                      Produces one PDF with just the pages you list.
                    </span>
                  </span>
                </label>
                <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3">
                  <RadioGroupItem value="each" className="mt-1" />
                  <span>
                    <span className="block text-sm font-medium">Every page separately</span>
                    <span className="block text-xs text-muted-foreground">
                      Downloads a ZIP containing one PDF per page.
                    </span>
                  </span>
                </label>
              </RadioGroup>

              {mode === "range" && (
                <div className="space-y-1">
                  <Label htmlFor="ranges">Pages</Label>
                  <Input
                    id="ranges"
                    value={ranges}
                    onChange={(e) => setRanges(e.target.value)}
                    placeholder="e.g. 1-3, 5, 8-"
                  />
                  <p className="text-xs text-muted-foreground">
                    {parseRanges(ranges, count).length} of {count} pages selected
                  </p>
                </div>
              )}

              <Button onClick={run} disabled={busy}>
                Split PDF
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
