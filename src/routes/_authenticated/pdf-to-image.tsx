import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Image as ImageIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileDrop, ToolHeader } from "@/components/tools/file-drop";
import { pdfToImages } from "@/lib/pdf/convert";
import { toast } from "sonner";

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
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [format, setFormat] = useState<"png" | "jpeg">("png");
  const [scale, setScale] = useState("2");

  const run = async (file: File) => {
    setBusy(true);
    setProgress(0);
    try {
      await pdfToImages(file, { format, scale: Number(scale), onProgress: setProgress });
      toast.success("Images downloaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Conversion failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <ToolHeader
        icon={ImageIcon}
        title="PDF to Image"
        description="Export pages as PNG or JPG — single page downloads directly, multi-page as a ZIP."
      />
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
            busy={busy}
            onFiles={(f) => run(f[0])}
          />
          {busy && <Progress value={progress} />}
        </CardContent>
      </Card>
    </div>
  );
}
