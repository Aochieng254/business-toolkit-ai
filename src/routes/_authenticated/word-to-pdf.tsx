import { createFileRoute } from "@tanstack/react-router";
import { FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { FileDrop, ToolHeader } from "@/components/tools/file-drop";
import { JobProgress, QuotaBanner, UpgradeDialog } from "@/components/tools/conversion-status";
import { useConversion } from "@/hooks/use-conversion";
import { wordFileToPdfBlob } from "@/lib/pdf/convert";
import { downloadBlob } from "@/lib/pdf/core";
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
  const conv = useConversion("word-to-pdf");

  const run = async (file: File) => {
    if (!/\.docx?$/i.test(file.name)) {
      toast.error("Please choose a Word .docx file.");
      return;
    }
    if (/\.doc$/i.test(file.name)) {
      toast.error("Legacy .doc files aren't supported — save as .docx first.");
      return;
    }
    await conv.run({ sourceName: file.name, sourceSize: file.size }, async (ctx) => {
      ctx.onProgress(30, "Reading document…");
      const out = await wordFileToPdfBlob(file);
      ctx.onProgress(90, "Preparing download…");
      downloadBlob(out.blob, out.filename);
      return out;
    });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <ToolHeader
        icon={FileText}
        title="Word to PDF"
        description="Convert .docx files into clean, shareable PDFs without leaving your browser."
      />
      <QuotaBanner remaining={conv.remaining} />
      <Card>
        <CardContent className="space-y-4 p-6">
          <FileDrop
            accept=".docx"
            label="Drop a Word file here"
            hint="Only .docx is supported"
            busy={conv.busy}
            onFiles={(f) => run(f[0])}
          />
          <JobProgress busy={conv.busy} progress={conv.progress} stage={conv.stage} />
        </CardContent>
      </Card>
      <UpgradeDialog message={conv.blocked} onClose={conv.clearBlocked} />
    </div>
  );
}
