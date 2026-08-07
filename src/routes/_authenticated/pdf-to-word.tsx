import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { FileType2, FileText, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { FileDrop, ToolHeader } from "@/components/tools/file-drop";
import {
  JobProgress,
  OcrLanguageSelect,
  QuotaBanner,
  UpgradeDialog,
} from "@/components/tools/conversion-status";
import { useConversion } from "@/hooks/use-conversion";
import { extractPages, downloadBlob, baseName, type PageContent } from "@/lib/pdf/core";
import { pagesToDocxBlob, pdfToImageDocxBlob } from "@/lib/pdf/convert";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/pdf-to-word")({
  head: () => ({
    meta: [
      { title: "PDF to Word with OCR | Business Toolkit AI" },
      {
        name: "description",
        content:
          "Convert PDFs into editable Word documents with the original layout intact, including OCR for scanned pages — all in your browser.",
      },
      { property: "og:title", content: "PDF to Word with OCR | Business Toolkit AI" },
      {
        property: "og:description",
        content: "Layout-accurate PDF to Word conversion with built-in OCR for scanned files.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PdfToWordPage,
});

type Mode = "layout" | "text" | "image";

function PdfToWordPage() {
  const conv = useConversion("pdf-to-word");
  const [file, setFile] = useState<File | null>(null);
  const [pages, setPages] = useState<PageContent[]>([]);
  const [reading, setReading] = useState(false);
  const [readProgress, setReadProgress] = useState(0);
  const [status, setStatus] = useState("");
  const [ocr, setOcr] = useState(true);
  const [mode, setMode] = useState<Mode>("layout");
  const [text, setText] = useState("");

  const busy = reading || conv.busy;

  const analyse = async (f: File) => {
    if (!f.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Please choose a PDF file.");
      return;
    }
    setFile(f);
    setReading(true);
    setReadProgress(0);
    setPages([]);
    setText("");
    try {
      const result = await extractPages(f, {
        ocr,
        ocrLanguage: conv.prefs.ocrLanguage,
        onProgress: (pct, label) => {
          setReadProgress(pct);
          setStatus(label);
        },
      });
      setPages(result);
      setText(
        result
          .map((p) => p.lines.map((l) => l.text).join("\n"))
          .join("\n\n")
          .trim(),
      );
      const ocrPages = result.filter((p) => p.ocr).length;
      const empty = result.every((p) => p.lines.length === 0);
      if (empty)
        toast.warning(
          ocr
            ? "No text could be read from this PDF. Try the page-image mode below."
            : "No selectable text found — turn on OCR and try again.",
        );
      else
        toast.success(
          ocrPages ? `Read ${result.length} page(s), ${ocrPages} via OCR` : `Read ${result.length} page(s)`,
        );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not read that PDF");
    } finally {
      setReading(false);
      setStatus("");
    }
  };

  const convert = async () => {
    if (!file) return;
    const name = baseName(file.name);
    const filename = `${name}.docx`;
    await conv.run(
      {
        sourceName: file.name,
        sourceSize: file.size,
        pageCount: pages.length,
        ocrLanguage: ocr ? conv.prefs.ocrLanguage : undefined,
        options: { mode },
      },
      async (ctx) => {
        let blob: Blob;
        if (mode === "image") {
          ctx.onProgress(5, "Rendering pages…");
          blob = await pdfToImageDocxBlob(file, (p) => ctx.onProgress(p, "Rendering pages…"));
        } else if (mode === "layout") {
          ctx.onProgress(40, "Rebuilding layout…");
          blob = await pagesToDocxBlob(pages);
        } else {
          ctx.onProgress(40, "Building document…");
          blob = await pagesToDocxBlob([
            {
              pageNumber: 1,
              width: 612,
              height: 792,
              ocr: false,
              lines: text.split("\n").map((t, i, arr) => ({
                y: arr.length - i,
                x: 0,
                text: t,
                size: 11,
                bold: false,
                italic: false,
              })),
            },
          ]);
        }
        ctx.onProgress(95, "Preparing download…");
        downloadBlob(blob, filename);
        return { blob, filename };
      },
    );
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <ToolHeader
        icon={FileType2}
        title="PDF to Word"
        description="Keeps the original layout, and reads scanned pages with OCR — all on your device."
      />

      <QuotaBanner remaining={conv.remaining} />

      <Card>
        <CardContent className="space-y-4 p-6">
          <FileDrop
            accept="application/pdf"
            label="Drop a PDF here"
            hint="or choose a file from your device"
            busy={busy}
            onFiles={(f) => analyse(f[0])}
          />
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <Label htmlFor="ocr">OCR for scanned pages</Label>
              <p className="text-xs text-muted-foreground">
                Recognises text in image-only pages. Slower, but makes scans editable.
              </p>
            </div>
            <Switch id="ocr" checked={ocr} onCheckedChange={setOcr} />
          </div>
          {ocr && (
            <OcrLanguageSelect
              value={conv.prefs.ocrLanguage}
              onChange={(v) => conv.setPrefs((p) => ({ ...p, ocrLanguage: v }))}
            />
          )}
          {reading && (
            <div className="space-y-1">
              <Progress value={readProgress} />
              <p className="text-xs text-muted-foreground">{status || "Working…"}</p>
            </div>
          )}
          <JobProgress busy={conv.busy} progress={conv.progress} stage={conv.stage} />
        </CardContent>
      </Card>

      {file && !busy && (
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Conversion style</CardTitle>
            <Button onClick={convert}>
              <Download className="mr-2 h-4 w-4" /> Download .docx
            </Button>
          </CardHeader>
          <CardContent>
            <RadioGroup value={mode} onValueChange={(v) => setMode(v as Mode)} className="gap-3">
              {[
                {
                  v: "layout",
                  t: "Keep layout (recommended)",
                  d: "Reproduces the document as-is: page breaks, headings, font sizes, bold text and indentation.",
                },
                {
                  v: "text",
                  t: "Plain editable text",
                  d: "One continuous flow of text you can review and edit below before exporting.",
                },
                {
                  v: "image",
                  t: "Exact page pictures",
                  d: "Each page embedded as a high-resolution image — pixel-perfect, but not editable text.",
                },
              ].map((o) => (
                <label
                  key={o.v}
                  className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3"
                >
                  <RadioGroupItem value={o.v} className="mt-1" />
                  <span>
                    <span className="block text-sm font-medium">{o.t}</span>
                    <span className="block text-xs text-muted-foreground">{o.d}</span>
                  </span>
                </label>
              ))}
            </RadioGroup>
          </CardContent>
        </Card>
      )}

      {mode === "text" && text && (
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Extracted text — edit before export</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <Textarea rows={18} value={text} onChange={(e) => setText(e.target.value)} />
          </CardContent>
        </Card>
      )}

      <p className="text-xs text-muted-foreground">
        Everything is processed locally in your browser — your documents never leave your device.
      </p>

      <UpgradeDialog message={conv.blocked} onClose={conv.clearBlocked} />
    </div>
  );
}
