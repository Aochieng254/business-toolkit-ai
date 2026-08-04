import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { LayoutTemplate, Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { FileDrop, ToolHeader } from "@/components/tools/file-drop";
import { extractPages } from "@/lib/pdf/core";
import { pdfToPublisherBundle } from "@/lib/pdf/convert";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/pdf-to-publisher")({
  head: () => ({
    meta: [
      { title: "PDF to Publisher Bundle | Business Toolkit AI" },
      {
        name: "description",
        content:
          "Prepare a PDF for Microsoft Publisher: high-resolution page artwork plus editable text, packaged in one ZIP.",
      },
      { property: "og:title", content: "PDF to Publisher Bundle | Business Toolkit AI" },
      { property: "og:description", content: "Everything Microsoft Publisher can import, from one PDF." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PdfToPublisherPage,
});

function PdfToPublisherPage() {
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);

  const run = async (file: File) => {
    setBusy(true);
    setProgress(0);
    try {
      const pages = await extractPages(file, { ocr: true, onProgress: (p) => setProgress(p / 2) });
      await pdfToPublisherBundle(file, pages, (p) => setProgress(50 + p / 2));
      toast.success("Publisher bundle downloaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Conversion failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <ToolHeader
        icon={LayoutTemplate}
        title="PDF to Publisher"
        description="Package a PDF into artwork and text that Microsoft Publisher can import."
      />

      <div className="flex gap-3 rounded-xl border border-border bg-muted/40 p-4 text-sm">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <p className="text-muted-foreground">
          Publisher's <span className="font-medium">.pub</span> format is closed, so no tool can write
          one directly. Instead you get a ZIP with print-quality page images, the editable text as a
          Word file, and step-by-step import instructions — which is how Publisher expects outside
          artwork to arrive.
        </p>
      </div>

      <Card>
        <CardContent className="space-y-4 p-6">
          <FileDrop
            accept="application/pdf"
            label="Drop a PDF here"
            hint="Creates images + editable text in one ZIP"
            busy={busy}
            onFiles={(f) => run(f[0])}
          />
          {busy && <Progress value={progress} />}
        </CardContent>
      </Card>
    </div>
  );
}
