import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { FileSpreadsheet, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { FileDrop, ToolHeader } from "@/components/tools/file-drop";
import { extractPages, baseName } from "@/lib/pdf/core";
import { pagesToRows, downloadRowsAsXlsx } from "@/lib/pdf/convert";
import { toast } from "sonner";

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
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [ocr, setOcr] = useState(true);
  const [preview, setPreview] = useState<Record<string, string[][]> | null>(null);
  const [name, setName] = useState("");

  const run = async (file: File) => {
    setBusy(true);
    setProgress(0);
    setPreview(null);
    try {
      const pages = await extractPages(file, { ocr, onProgress: (p) => setProgress(p) });
      const sheets = pagesToRows(pages);
      setPreview(sheets);
      setName(baseName(file.name));
      toast.success(`Found ${Object.values(sheets).reduce((a, r) => a + r.length, 0)} rows`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not read that PDF");
    } finally {
      setBusy(false);
    }
  };

  const firstSheet = preview ? Object.entries(preview)[0] : null;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <ToolHeader
        icon={FileSpreadsheet}
        title="PDF to Excel"
        description="Turn PDF tables and lists into a spreadsheet, one worksheet per page."
      />
      <Card>
        <CardContent className="space-y-4 p-6">
          <FileDrop
            accept="application/pdf"
            label="Drop a PDF here"
            hint="Table-style layouts convert best"
            busy={busy}
            onFiles={(f) => run(f[0])}
          />
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <Label htmlFor="ocr-x">OCR for scanned pages</Label>
              <p className="text-xs text-muted-foreground">Reads text from image-only pages.</p>
            </div>
            <Switch id="ocr-x" checked={ocr} onCheckedChange={setOcr} />
          </div>
          {busy && <Progress value={progress} />}
        </CardContent>
      </Card>

      {preview && firstSheet && (
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Preview — {firstSheet[0]}</CardTitle>
            <Button
              onClick={async () => {
                try {
                  await downloadRowsAsXlsx(preview, name || "converted");
                  toast.success("Workbook downloaded");
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Export failed");
                }
              }}
            >
              <Download className="mr-2 h-4 w-4" /> Download .xlsx
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
    </div>
  );
}
