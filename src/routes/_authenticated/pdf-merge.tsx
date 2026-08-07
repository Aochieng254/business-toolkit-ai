import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Combine, X, ArrowUp, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FileDrop, ToolHeader } from "@/components/tools/file-drop";
import { JobProgress, QuotaBanner, UpgradeDialog } from "@/components/tools/conversion-status";
import { useConversion } from "@/hooks/use-conversion";
import { mergePdfsBlob } from "@/lib/pdf/convert";
import { downloadBlob } from "@/lib/pdf/core";
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
  const conv = useConversion("pdf-merge");
  const [files, setFiles] = useState<File[]>([]);

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
    const totalSize = files.reduce((a, f) => a + f.size, 0);
    await conv.run(
      { sourceName: files[0].name, sourceSize: totalSize, options: { fileCount: files.length } },
      async (ctx) => {
        ctx.onProgress(40, "Combining documents…");
        const out = await mergePdfsBlob(files);
        ctx.onProgress(90, "Preparing download…");
        downloadBlob(out.blob, out.filename);
        return out;
      },
    );
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <ToolHeader
        icon={Combine}
        title="Merge PDFs"
        description="Combine multiple PDFs into one file, in the order you choose."
      />
      <QuotaBanner remaining={conv.remaining} />
      <Card>
        <CardContent className="space-y-5 p-6">
          <FileDrop
            accept="application/pdf"
            label="Drop PDFs here"
            hint="Add as many files as you need"
            multiple
            busy={conv.busy}
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

          <JobProgress busy={conv.busy} progress={conv.progress} stage={conv.stage} />

          <Button onClick={run} disabled={conv.busy || files.length < 2}>
            Merge {files.length || ""} PDFs
          </Button>
        </CardContent>
      </Card>
      <UpgradeDialog message={conv.blocked} onClose={conv.clearBlocked} />
    </div>
  );
}
