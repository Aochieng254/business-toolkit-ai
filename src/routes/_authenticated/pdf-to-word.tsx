import { useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { FileType2, Upload, Loader2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { exportBlocksToWord, textToBlocks } from "@/lib/docs/export";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/pdf-to-word")({
  head: () => ({
    meta: [
      { title: "PDF to Word Converter | Business Toolkit AI" },
      {
        name: "description",
        content:
          "Convert PDF documents into editable Word (.docx) files right in your browser — nothing leaves your device.",
      },
      { property: "og:title", content: "PDF to Word Converter | Business Toolkit AI" },
      {
        property: "og:description",
        content: "Turn any PDF into an editable Word document in seconds.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PdfToWordPage,
});

function PdfToWordPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [fileName, setFileName] = useState("");
  const [text, setText] = useState("");

  const handleFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Please choose a PDF file.");
      return;
    }
    setBusy(true);
    setProgress(0);
    setFileName(file.name.replace(/\.pdf$/i, ""));
    try {
      const pdfjs = await import("pdfjs-dist");
      const workerSrc = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
      pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

      const buf = await file.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data: buf }).promise;
      const pages: string[] = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        let lastY: number | null = null;
        let out = "";
        for (const item of content.items as Array<{ str?: string; transform?: number[] }>) {
          if (typeof item.str !== "string") continue;
          const y = item.transform?.[5] ?? null;
          if (lastY !== null && y !== null && Math.abs(y - lastY) > 4) out += "\n";
          out += item.str;
          lastY = y;
        }
        pages.push(out.replace(/[ \t]{2,}/g, " ").trim());
        setProgress(Math.round((i / pdf.numPages) * 100));
      }
      const joined = pages.join("\n\n");
      setText(joined);
      if (!joined.trim())
        toast.warning("No selectable text found — this PDF is likely a scan.");
      else toast.success(`Extracted ${pdf.numPages} page(s)`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not read that PDF");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-accent-foreground">
          <FileType2 className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">PDF to Word</h1>
          <p className="text-sm text-muted-foreground">
            Convert a PDF into an editable Word document — processed on your device.
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const f = e.dataTransfer.files?.[0];
              if (f) handleFile(f);
            }}
            className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border p-10 text-center"
          >
            <Upload className="h-8 w-8 text-muted-foreground" />
            <p className="mt-3 text-sm font-medium">Drop a PDF here</p>
            <p className="text-xs text-muted-foreground">or choose a file from your device</p>
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
            <Button
              className="mt-4"
              variant="outline"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
            >
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Select PDF
            </Button>
            {busy && <Progress value={progress} className="mt-4 w-64" />}
          </div>
        </CardContent>
      </Card>

      {text && (
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Extracted text — edit before export</CardTitle>
            <Button
              onClick={async () => {
                await exportBlocksToWord(textToBlocks(text), fileName || "converted");
                toast.success("Word file downloaded");
              }}
            >
              <FileText className="mr-2 h-4 w-4" /> Download .docx
            </Button>
          </CardHeader>
          <CardContent>
            <Textarea rows={20} value={text} onChange={(e) => setText(e.target.value)} />
          </CardContent>
        </Card>
      )}

      <p className="text-xs text-muted-foreground">
        Text-based PDFs convert with full text fidelity. Scanned PDFs contain images rather
        than text, so nothing can be extracted from them here.
      </p>
    </div>
  );
}
