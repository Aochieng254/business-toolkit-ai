import { createFileRoute, Link } from "@tanstack/react-router";
import {
  FileType2,
  FileText,
  FileSpreadsheet,
  Presentation,
  Image as ImageIcon,
  Scissors,
  Combine,
  LayoutTemplate,
  Wrench,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { ToolHeader } from "@/components/tools/file-drop";

export const Route = createFileRoute("/_authenticated/pdf-tools")({
  head: () => ({
    meta: [
      { title: "PDF Tools — Convert, Split & Merge | Business Toolkit AI" },
      {
        name: "description",
        content:
          "A full PDF workbench: convert to Word, Excel, PowerPoint or images, split pages, merge files and run OCR — all in your browser.",
      },
      { property: "og:title", content: "PDF Tools — Convert, Split & Merge | Business Toolkit AI" },
      { property: "og:description", content: "Every PDF conversion you need, processed privately on your device." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PdfToolsPage,
});

const tools = [
  { to: "/pdf-to-word", icon: FileType2, title: "PDF to Word", desc: "Layout-accurate .docx with OCR for scans." },
  { to: "/word-to-pdf", icon: FileText, title: "Word to PDF", desc: "Turn .docx documents into clean PDFs." },
  { to: "/pdf-to-excel", icon: FileSpreadsheet, title: "PDF to Excel", desc: "Extract tables into a workbook." },
  { to: "/pdf-to-powerpoint", icon: Presentation, title: "PDF to PowerPoint", desc: "One slide per page." },
  { to: "/pdf-to-image", icon: ImageIcon, title: "PDF to Image", desc: "Export pages as PNG or JPG." },
  { to: "/pdf-split", icon: Scissors, title: "Split PDF", desc: "Separate or extract specific pages." },
  { to: "/pdf-merge", icon: Combine, title: "Merge PDFs", desc: "Combine files into one document." },
  { to: "/pdf-to-publisher", icon: LayoutTemplate, title: "PDF to Publisher", desc: "Publisher-ready import bundle." },
] as const;

function PdfToolsPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <ToolHeader
        icon={Wrench}
        title="PDF Tools"
        description="Convert, split, merge and read documents — nothing ever leaves your device."
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tools.map((t) => (
          <Link key={t.to} to={t.to}>
            <Card className="h-full transition-colors hover:border-primary">
              <CardContent className="space-y-2 p-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                  <t.icon className="h-5 w-5" />
                </div>
                <h2 className="text-sm font-semibold">{t.title}</h2>
                <p className="text-xs text-muted-foreground">{t.desc}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
