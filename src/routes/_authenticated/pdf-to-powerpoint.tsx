import { createFileRoute } from "@tanstack/react-router";
import { Presentation } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { FileDrop, ToolHeader } from "@/components/tools/file-drop";
import { JobProgress, QuotaBanner, UpgradeDialog } from "@/components/tools/conversion-status";
import { useConversion } from "@/hooks/use-conversion";
import { pdfToPptxBlob } from "@/lib/pdf/convert";
import { downloadBlob } from "@/lib/pdf/core";

export const Route = createFileRoute("/_authenticated/pdf-to-powerpoint")({
  head: () => ({
    meta: [
      { title: "PDF to PowerPoint Converter | Business Toolkit AI" },
      {
        name: "description",
        content:
          "Turn every page of a PDF into a PowerPoint slide, rendered at high resolution right in your browser.",
      },
      { property: "og:title", content: "PDF to PowerPoint Converter | Business Toolkit AI" },
      { property: "og:description", content: "Convert a PDF deck into an editable .pptx presentation." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PdfToPptPage,
});

function PdfToPptPage() {
  const conv = useConversion("pdf-to-powerpoint");

  const run = async (file: File) => {
    await conv.run({ sourceName: file.name, sourceSize: file.size }, async (ctx) => {
      const out = await pdfToPptxBlob(file, (p) => ctx.onProgress(p, "Building slides…"));
      downloadBlob(out.blob, out.filename);
      return out;
    });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <ToolHeader
        icon={Presentation}
        title="PDF to PowerPoint"
        description="Each PDF page becomes a slide you can annotate and present."
      />
      <QuotaBanner remaining={conv.remaining} />
      <Card>
        <CardContent className="space-y-4 p-6">
          <FileDrop
            accept="application/pdf"
            label="Drop a PDF here"
            hint="One slide per page"
            busy={conv.busy}
            onFiles={(f) => run(f[0])}
          />
          <JobProgress busy={conv.busy} progress={conv.progress} stage={conv.stage} />
        </CardContent>
      </Card>
      <p className="text-xs text-muted-foreground">
        Pages are placed as high-resolution slide images. To edit the wording as text, run the file
        through PDF to Word first and paste it in.
      </p>
      <UpgradeDialog message={conv.blocked} onClose={conv.clearBlocked} />
    </div>
  );
}
