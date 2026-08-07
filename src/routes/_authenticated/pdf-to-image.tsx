import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Image as ImageIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileDrop, ToolHeader } from "@/components/tools/file-drop";
import { JobProgress, QuotaBanner, UpgradeDialog } from "@/components/tools/conversion-status";
import { useConversion } from "@/hooks/use-conversion";
import { pdfToImagesBlob } from "@/lib/pdf/convert";
import { downloadBlob } from "@/lib/pdf/core";

export const Route = createFileRoute("/_authenticated/pdf-to-image")({
  head: () => ({
    meta: [
      { title: "PDF to Image Converter | Business Toolkit AI" },
      {
        name: "description",
        content:
          "Export PDF pages as sharp PNG or JPG images at your chosen resolution, processed locally in your browser.",
      },
      { property: "og:title", content: "PDF to Image Converter | Business Toolkit AI" },
      { property: "og:description", content: "Save every PDF page as a PNG or JPG image." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PdfToImagePage,
});

function PdfToImagePage() {
  const conv = useConversion("pdf-to-image");
  const [format, setFormat] = useState<"png" | "jpeg">("png");
  const [scale, setScale] = useState("2");

  const run = async (file: File) => {
    await conv.run(
      { sourceName: file.name, sourceSize: file.size, options: { format, scale: Number(scale) } },
      async (ctx) => {
        const out = await pdfToImagesBlob(file, {
          format,
          scale: Number(scale),
          onProgress: (p) => ctx.onProgress(p, "Rendering pages…"),
        });
        downloadBlob(out.blob, out.filename);
        return out;
      },
    );
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <ToolHeader
        icon={ImageIcon}
        title="PDF to Image"
        description="Export pages as PNG or JPG — single page downloads directly, multi-page as a ZIP."
      />
      <QuotaBanner remaining={conv.remaining} />
      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Format</Label>
              <Select value={format} onValueChange={(v) => setFormat(v as "png" | "jpeg")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="png">PNG — lossless</SelectItem>
                  <SelectItem value="jpeg">JPG — smaller files</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Resolution</Label>
              <Select value={scale} onValueChange={setScale}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Standard (72 dpi)</SelectItem>
                  <SelectItem value="2">High (150 dpi)</SelectItem>
                  <SelectItem value="3">Very high (220 dpi)</SelectItem>
                  <SelectItem value="4">Print (300 dpi)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <FileDrop
            accept="application/pdf"
            label="Drop a PDF here"
            hint="Every page is rendered as an image"
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
