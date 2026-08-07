import { createFileRoute } from "@tanstack/react-router";
import { LayoutTemplate, Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { FileDrop, ToolHeader } from "@/components/tools/file-drop";
import {
  JobProgress,
  OcrLanguageSelect,
  QuotaBanner,
  UpgradeDialog,
} from "@/components/tools/conversion-status";
import { useConversion } from "@/hooks/use-conversion";
import { extractPages, downloadBlob } from "@/lib/pdf/core";
import { pdfToPublisherBundleBlob } from "@/lib/pdf/convert";

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
  const conv = useConversion("pdf-to-publisher");

  const run = async (file: File) => {
    await conv.run(
      { sourceName: file.name, sourceSize: file.size, ocrLanguage: conv.prefs.ocrLanguage },
      async (ctx) => {
        const pages = await extractPages(file, {
          ocr: true,
          ocrLanguage: conv.prefs.ocrLanguage,
          onProgress: (p, label) => ctx.onProgress(Math.round(p / 2), label),
        });
        const out = await pdfToPublisherBundleBlob(file, pages, (p) =>
          ctx.onProgress(50 + Math.round(p / 2), "Packaging artwork…"),
        );
        downloadBlob(out.blob, out.filename);
        return out;
      },
    );
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <ToolHeader
        icon={LayoutTemplate}
        title="PDF to Publisher"
        description="Package a PDF into artwork and text that Microsoft Publisher can import."
      />

      <QuotaBanner remaining={conv.remaining} />

      <div className="flex gap-3 rounded-xl border border-border bg-muted/40 p-4 text-sm">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <p className="text-muted-foreground">
          Publisher&apos;s <span className="font-medium">.pub</span> format is closed, so no tool can
          write one directly. Instead you get a ZIP with print-quality page images, the editable text
          as a Word file, and step-by-step import instructions — which is how Publisher expects
          outside artwork to arrive.
        </p>
      </div>

      <Card>
        <CardContent className="space-y-4 p-6">
          <FileDrop
            accept="application/pdf"
            label="Drop a PDF here"
            hint="Creates a ZIP bundle for Publisher"
            busy={conv.busy}
            onFiles={(f) => run(f[0])}
          />
          <OcrLanguageSelect
            value={conv.prefs.ocrLanguage}
            onChange={(v) => conv.setPrefs((p) => ({ ...p, ocrLanguage: v }))}
          />
          <JobProgress busy={conv.busy} progress={conv.progress} stage={conv.stage} />
        </CardContent>
      </Card>
      <UpgradeDialog message={conv.blocked} onClose={conv.clearBlocked} />
    </div>
  );
}
