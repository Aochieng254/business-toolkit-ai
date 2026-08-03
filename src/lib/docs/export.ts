/**
 * Shared client-side document export helpers.
 * Turns simple text blocks into a printable PDF (jsPDF) or a Word file (docx).
 */
import jsPDF from "jspdf";
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from "docx";

export type Block =
  | { type: "title"; text: string }
  | { type: "heading"; text: string }
  | { type: "text"; text: string }
  | { type: "bullet"; text: string }
  | { type: "spacer" };

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Render blocks to a clean A4 PDF and trigger download. */
export function exportBlocksToPDF(blocks: Block[], filename: string) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 48;
  const maxW = pageW - margin * 2;
  let y = margin;

  const ensure = (h: number) => {
    if (y + h > pageH - margin) {
      doc.addPage();
      y = margin;
    }
  };

  for (const b of blocks) {
    if (b.type === "spacer") {
      y += 10;
      continue;
    }
    if (b.type === "title") {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
    } else if (b.type === "heading") {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      y += 8;
    } else {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10.5);
    }
    const text = b.type === "bullet" ? `•  ${b.text}` : b.text;
    const lines = doc.splitTextToSize(text, maxW) as string[];
    const lh = b.type === "title" ? 24 : b.type === "heading" ? 16 : 14;
    for (const line of lines) {
      ensure(lh);
      doc.text(line, margin, y);
      y += lh;
    }
    if (b.type === "heading") {
      ensure(6);
      doc.setDrawColor(200);
      doc.line(margin, y - 8, pageW - margin, y - 8);
      y += 2;
    }
  }

  doc.save(filename.endsWith(".pdf") ? filename : `${filename}.pdf`);
}

/** Render blocks to a .docx Word file and trigger download. */
export async function exportBlocksToWord(blocks: Block[], filename: string) {
  const children = blocks.map((b) => {
    if (b.type === "spacer") return new Paragraph({ children: [new TextRun("")] });
    if (b.type === "title")
      return new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun({ text: b.text, bold: true, size: 36, font: "Arial" })],
      });
    if (b.type === "heading")
      return new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 },
        children: [new TextRun({ text: b.text, bold: true, size: 26, font: "Arial" })],
      });
    if (b.type === "bullet")
      return new Paragraph({
        bullet: { level: 0 },
        children: [new TextRun({ text: b.text, size: 22, font: "Arial" })],
      });
    return new Paragraph({
      spacing: { after: 100 },
      children: [new TextRun({ text: b.text, size: 22, font: "Arial" })],
    });
  });

  const document = new Document({
    sections: [
      {
        properties: {
          page: {
            size: { width: 12240, height: 15840 },
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
          },
        },
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(document);
  download(blob, filename.endsWith(".docx") ? filename : `${filename}.docx`);
}

/** Turn plain AI text into blocks (headings = lines ending with ':' or ALL CAPS short lines). */
export function textToBlocks(text: string): Block[] {
  const out: Block[] = [];
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line) {
      out.push({ type: "spacer" });
      continue;
    }
    if (/^[-*•]\s+/.test(line)) {
      out.push({ type: "bullet", text: line.replace(/^[-*•]\s+/, "") });
    } else if (/^#{1,6}\s+/.test(line)) {
      out.push({ type: "heading", text: line.replace(/^#{1,6}\s+/, "") });
    } else if (line.length < 60 && line.endsWith(":")) {
      out.push({ type: "heading", text: line.replace(/:$/, "") });
    } else {
      out.push({ type: "text", text: line.replace(/\*\*/g, "") });
    }
  }
  return out;
}
