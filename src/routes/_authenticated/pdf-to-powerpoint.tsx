import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Presentation } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { FileDrop, ToolHeader } from "@/components/tools/file-drop";
import { pdfToPptx } from "@/lib/pdf/convert";
import { toast } from "sonner";

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
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);

  const run = async (file: File) => {
    setBusy(true);
    setProgress(0);
    try {
      await pdfToPptx(file, setProgress);
      toast.success("Presentation downloaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Conversion failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <ToolHeader
        icon={Presentation}
        title="PDF to PowerPoint"
        description="Each PDF page becomes a slide you can annotate and present."
      />
      <Card>
        <CardContent className="space-y-4 p-6">
          <FileDrop
            accept="application/pdf"
            label="Drop a PDF here"
            hint="One slide per page"
            busy={busy}
            onFiles={(f) => run(f[0])}
          />
          {busy && <Progress value={progress} />}
        </CardContent>
      </Card>
      <p className="text-xs text-muted-foreground">
        Pages are placed as high-resolution slide images. To edit the wording as text, run the file
        through PDF to Word first and paste it in.
      </p>
    </div>
  );
}
