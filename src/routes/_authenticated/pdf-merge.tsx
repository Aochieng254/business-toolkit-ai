import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Combine, X, ArrowUp, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FileDrop, ToolHeader } from "@/components/tools/file-drop";
import { mergePdfs } from "@/lib/pdf/convert";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/pdf-merge")({
  head: () => ({
    meta: [
      { title: "Merge & Combine PDFs | Business Toolkit AI" },
      {
        name: "description",
        content:
          "Combine several PDF files into one ordered document in your browser — reorder pages before you export.",
      },
      { property: "og:title", content: "Merge & Combine PDFs | Business Toolkit AI" },
      { property: "og:description", content: "Join multiple PDFs into a single tidy document." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MergePage,
});

function MergePage() {
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);

  const move = (i: number, dir: -1 | 1) => {
    setFiles((prev) => {
      const next = [...prev];
      const j = i + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  };

  const run = async () => {
    if (files.length < 2) {
      toast.error("Add at least two PDFs to merge");
      return;
    }
    setBusy(true);
    try {
      await mergePdfs(files);
      toast.success("Merged PDF downloaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Merge failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <ToolHeader
        icon={Combine}
        title="Merge PDFs"
        description="Combine multiple PDFs into one file, in the order you choose."
      />
      <Card>
        <CardContent className="space-y-5 p-6">
          <FileDrop
            accept="application/pdf"
            label="Drop PDFs here"
            hint="Add as many files as you need"
            multiple
            busy={busy}
            onFiles={(f) => setFiles((prev) => [...prev, ...f.filter((x) => /\.pdf$/i.test(x.name))])}
          />

          {files.length > 0 && (
            <ul className="space-y-2">
              {files.map((f, i) => (
                <li
                  key={`${f.name}-${i}`}
                  className="flex items-center gap-2 rounded-lg border border-border p-2 text-sm"
                >
                  <span className="w-6 text-center text-xs text-muted-foreground">{i + 1}</span>
                  <span className="flex-1 truncate">{f.name}</span>
                  <Button size="icon" variant="ghost" onClick={() => move(i, -1)} aria-label="Move up">
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => move(i, 1)} aria-label="Move down">
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setFiles((prev) => prev.filter((_, k) => k !== i))}
                    aria-label="Remove"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}

          <Button onClick={run} disabled={busy || files.length < 2}>
            Merge {files.length || ""} PDFs
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
