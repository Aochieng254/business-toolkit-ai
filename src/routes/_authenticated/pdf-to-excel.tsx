import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { FileSpreadsheet, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { FileDrop, ToolHeader } from "@/components/tools/file-drop";
import {
  JobProgress,
  OcrLanguageSelect,
  QuotaBanner,
  UpgradeDialog,
} from "@/components/tools/conversion-status";
import { useConversion } from "@/hooks/use-conversion";
import { extractPages, baseName, downloadBlob } from "@/lib/pdf/core";
import { pagesToRows, rowsToXlsxBlob } from "@/lib/pdf/convert";

export const Route = createFileRoute("/_authenticated/pdf-to-excel")({
  head: () => ({
    meta: [
      { title: "PDF to Excel Converter | Business Toolkit AI" },
      {
        name: "description",
        content:
          "Pull tables and figures out of a PDF into an Excel workbook, one sheet per page, with OCR for scans.",
      },
      { property: "og:title", content: "PDF to Excel Converter | Business Toolkit AI" },
      { property: "og:description", content: "Extract PDF tables straight into a .xlsx workbook." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PdfToExcelPage,
});

function PdfToExcelPage() {
  const conv = useConversion("pdf-to-excel");
  const [ocr, setOcr] = useState(true);
  const [preview, setPreview] = useState<Record<string, string[][]> | null>(null);

  const run = async (file: File) => {
    setPreview(null);
    const name = baseName(file.name);
    await conv.run(
      {
        sourceName: file.name,
        sourceSize: file.size,
        ocrLanguage: ocr ? conv.prefs.ocrLanguage : undefined,
      },
      async (ctx) => {
        const pages = await extractPages(file, {
          ocr,
          ocrLanguage: conv.prefs.ocrLanguage,
          onProgress: (p, label) => ctx.onProgress(Math.round(p * 0.8), label),
        });
        const sheets = pagesToRows(pages);
        setPreview(sheets);
        ctx.onProgress(90, "Building workbook…");
        const out = await rowsToXlsxBlob(sheets, name);
        downloadBlob(out.blob, out.filename);
        return out;
      },
    );
  };

  const firstSheet = preview ? Object.entries(preview)[0] : null;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <ToolHeader
        icon={FileSpreadsheet}
        title="PDF to Excel"
        description="Turn PDF tables and lists into a spreadsheet, one worksheet per page."
      />
      <QuotaBanner remaining={conv.remaining} />
      <Card>
        <CardContent className="space-y-4 p-6">
          <FileDrop
            accept="application/pdf"
            label="Drop a PDF here"
            hint="Table-style layouts convert best"
            busy={conv.busy}
            onFiles={(f) => run(f[0])}
          />
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <Label htmlFor="ocr-x">OCR for scanned pages</Label>
              <p className="text-xs text-muted-foreground">Reads text from image-only pages.</p>
            </div>
            <Switch id="ocr-x" checked={ocr} onCheckedChange={setOcr} />
          </div>
          {ocr && (
            <OcrLanguageSelect
              value={conv.prefs.ocrLanguage}
              onChange={(v) => conv.setPrefs((p) => ({ ...p, ocrLanguage: v }))}
            />
          )}
          <JobProgress busy={conv.busy} progress={conv.progress} stage={conv.stage} />
        </CardContent>
      </Card>

      {preview && firstSheet && (
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Preview — {firstSheet[0]}</CardTitle>
            <Button
              variant="outline"
              onClick={async () => {
                const out = await rowsToXlsxBlob(preview, "converted");
                downloadBlob(out.blob, out.filename);
              }}
            >
              <Download className="mr-2 h-4 w-4" /> Download again
            </Button>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-xs">
              <tbody>
                {firstSheet[1].slice(0, 25).map((row, i) => (
                  <tr key={i} className="border-b border-border/60">
                    {row.map((cell, j) => (
                      <td key={j} className="px-2 py-1 align-top">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <p className="text-xs text-muted-foreground">
        Columns are detected from the spacing in the PDF, so wide gaps split cleanly while tightly
        packed tables may need a quick tidy in Excel.
      </p>
      <UpgradeDialog message={conv.blocked} onClose={conv.clearBlocked} />
    </div>
  );
}
