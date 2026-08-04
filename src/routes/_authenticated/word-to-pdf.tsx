import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { FileDrop, ToolHeader } from "@/components/tools/file-drop";
import { wordFileToPdf } from "@/lib/pdf/convert";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/word-to-pdf")({
  head: () => ({
    meta: [
      { title: "Word to PDF Converter | Business Toolkit AI" },
      {
        name: "description",
        content:
          "Turn Word (.docx) documents into clean, shareable PDFs in your browser with headings, bold text and lists preserved.",
      },
      { property: "og:title", content: "Word to PDF Converter | Business Toolkit AI" },
      { property: "og:description", content: "Convert .docx files to polished PDFs instantly." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: WordToPdfPage,
});

function WordToPdfPage() {
  const [busy, setBusy] = useState(false);

  const run = async (file: File) => {
    if (!/\.docx?$/i.test(file.name)) {
      toast.error("Please choose a Word .docx file.");
      return;
    }
    if (/\.doc$/i.test(file.name)) {
      toast.error("Legacy .doc files aren't supported — save as .docx first.");
      return;
    }
    setBusy(true);
    try {
      await wordFileToPdf(file);
      toast.success("PDF downloaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Conversion failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <ToolHeader
        icon={FileText}
        title="Word to PDF"
        description="Convert a .docx document into a clean, print-ready PDF."
      />
      <Card>
        <CardContent className="space-y-4 p-6">
          <FileDrop
            accept=".docx"
            label="Drop a Word document here"
            hint="Supports .docx files"
            busy={busy}
            onFiles={(f) => run(f[0])}
          />
          {busy && <Progress value={70} />}
        </CardContent>
      </Card>
      <p className="text-xs text-muted-foreground">
        Text, headings, bold and italic styling, lists and tables are carried across. Embedded
        images and complex column layouts are simplified.
      </p>
    </div>
  );
}
