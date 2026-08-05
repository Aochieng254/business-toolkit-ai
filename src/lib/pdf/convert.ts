/**
 * Client-side conversions between PDF and Office formats.
 * All work happens in the browser — no uploads.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  PageBreak,
  ImageRun,
} from "docx";
import jsPDF from "jspdf";
import {
  baseName,
  canvasToBlob,
  downloadBlob,
  loadPdf,
  renderPageToCanvas,
  type PageContent,
} from "./core";

/* ---------------------------------------------------------------- PDF → Word */

/**
 * Build a .docx that mirrors the PDF page layout: one section per page,
 * preserved font sizes, weights, indentation and blank-line spacing.
 */
export async function pagesToDocxBlob(pages: PageContent[]): Promise<Blob> {
  const children: Paragraph[] = [];

  pages.forEach((page, pageIdx) => {
    let prevY: number | null = null;
    const leftMost = Math.min(...page.lines.map((l) => l.x), 0);

    page.lines.forEach((line) => {
      // Preserve vertical whitespace as empty paragraphs.
      if (prevY !== null) {
        const gap = prevY - line.y;
        const blanks = Math.min(4, Math.max(0, Math.round(gap / Math.max(line.size, 8)) - 1));
        for (let i = 0; i < blanks; i++) children.push(new Paragraph({ children: [new TextRun("")] }));
      }
      prevY = line.y;

      const indentTwips = Math.max(0, Math.round((line.x - leftMost) * 20));
      const centered = Math.abs(line.x - (page.width - line.x) ) < page.width * 0.08 && line.x > page.width * 0.2;

      children.push(
        new Paragraph({
          alignment: centered ? AlignmentType.CENTER : AlignmentType.LEFT,
          indent: centered ? undefined : { left: indentTwips },
          spacing: { after: 40 },
          children: [
            new TextRun({
              text: line.text,
              bold: line.bold,
              italics: line.italic,
              size: Math.round(Math.min(48, Math.max(7, line.size)) * 2),
              font: "Arial",
            }),
          ],
        }),
      );
    });

    if (pageIdx < pages.length - 1) {
      children.push(new Paragraph({ children: [new PageBreak()] }));
    }
  });

  const first = pages[0];
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: first
              ? { width: Math.round(first.width * 20), height: Math.round(first.height * 20) }
              : { width: 12240, height: 15840 },
            margin: { top: 720, right: 720, bottom: 720, left: 720 },
          },
        },
        children,
      },
    ],
  });

  return Packer.toBlob(doc);
}

/** Word document where each PDF page is embedded as a full-page picture. */
export async function pdfToImageDocxBlob(
  file: File,
  onProgress?: (pct: number) => void,
): Promise<Blob> {
  const pdf = await loadPdf(file);
  const children: Paragraph[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const canvas = await renderPageToCanvas(page, 2);
    const blob = await canvasToBlob(canvas, "image/png");
    const data = new Uint8Array(await blob.arrayBuffer());
    const ratio = canvas.height / canvas.width;
    const width = 600;
    children.push(
      new Paragraph({
        children: [
          new ImageRun({
            type: "png",
            data,
            transformation: { width, height: Math.round(width * ratio) },
            altText: { title: `Page ${i}`, description: `Page ${i}`, name: `page-${i}` },
          }),
        ],
      }),
    );
    if (i < pdf.numPages) children.push(new Paragraph({ children: [new PageBreak()] }));
    onProgress?.(Math.round((i / pdf.numPages) * 100));
  }

  const doc = new Document({ sections: [{ children }] });
  return Packer.toBlob(doc);
}

/* --------------------------------------------------------------- Word → PDF */

type HtmlBlock = {
  text: string;
  size: number;
  bold: boolean;
  italic: boolean;
  bullet: boolean;
};

function htmlToBlocks(html: string): HtmlBlock[] {
  const parser = new DOMParser();
  const dom = parser.parseFromString(html, "text/html");
  const blocks: HtmlBlock[] = [];
  const sizes: Record<string, number> = { H1: 20, H2: 16, H3: 14, H4: 12.5, H5: 11.5, H6: 11 };

  const walk = (node: Element) => {
    for (const el of Array.from(node.children)) {
      const tag = el.tagName;
      if (tag === "UL" || tag === "OL" || tag === "TABLE" || tag === "TBODY" || tag === "THEAD") {
        walk(el);
        continue;
      }
      if (tag === "TR") {
        const cells = Array.from(el.children).map((c) => (c.textContent ?? "").trim());
        blocks.push({ text: cells.join("   |   "), size: 10, bold: false, italic: false, bullet: false });
        continue;
      }
      const text = (el.textContent ?? "").replace(/\s+/g, " ").trim();
      if (!text) {
        blocks.push({ text: "", size: 11, bold: false, italic: false, bullet: false });
        continue;
      }
      blocks.push({
        text,
        size: sizes[tag] ?? 11,
        bold: !!sizes[tag] || el.querySelector("strong,b") !== null,
        italic: el.querySelector("em,i") !== null,
        bullet: tag === "LI",
      });
    }
  };

  walk(dom.body);
  return blocks;
}

/** Convert a .docx file to a downloadable PDF preserving headings, bold and lists. */
export async function wordFileToPdf(file: File) {
  const mammoth = await import("mammoth");
  const arrayBuffer = await file.arrayBuffer();
  const { value: html } = await mammoth.convertToHtml({ arrayBuffer });
  const blocks = htmlToBlocks(html);

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 56;
  const maxW = pageW - margin * 2;
  let y = margin;

  for (const b of blocks) {
    if (!b.text) {
      y += 8;
      continue;
    }
    const style = b.bold && b.italic ? "bolditalic" : b.bold ? "bold" : b.italic ? "italic" : "normal";
    doc.setFont("helvetica", style);
    doc.setFontSize(b.size);
    const indent = b.bullet ? 18 : 0;
    const text = b.bullet ? `•  ${b.text}` : b.text;
    const lines = doc.splitTextToSize(text, maxW - indent) as string[];
    const lh = b.size * 1.45;
    for (const line of lines) {
      if (y + lh > pageH - margin) {
        doc.addPage();
        y = margin;
      }
      doc.text(line, margin + indent, y);
      y += lh;
    }
    y += b.size > 11 ? 8 : 3;
  }

  doc.save(`${baseName(file.name)}.pdf`);
}

/* -------------------------------------------------------------- PDF → Excel */

/** Split each line into columns using tab markers produced by the extractor. */
export function pagesToRows(pages: PageContent[]): Record<string, string[][]> {
  const sheets: Record<string, string[][]> = {};
  pages.forEach((page) => {
    const rows = page.lines
      .map((l) => l.text.split("\t").map((c) => c.trim()))
      .filter((cells) => cells.some((c) => c.length > 0));
    sheets[`Page ${page.pageNumber}`] = rows;
  });
  return sheets;
}

export async function downloadRowsAsXlsx(sheets: Record<string, string[][]>, filename: string) {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();
  const entries = Object.entries(sheets);
  if (entries.length === 0) throw new Error("Nothing to export");
  for (const [name, rows] of entries) {
    const ws = XLSX.utils.aoa_to_sheet(rows.length ? rows : [[""]]);
    XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 31));
  }
  const out = XLSX.write(wb, { bookType: "xlsx", type: "array" }) as ArrayBuffer;
  downloadBlob(
    new Blob([out], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
    `${filename}.xlsx`,
  );
}

/* --------------------------------------------------------- PDF → PowerPoint */

export async function pdfToPptx(file: File, onProgress?: (pct: number) => void) {
  const PptxGenJS = (await import("pptxgenjs")).default;
  const pdf = await loadPdf(file);
  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: "PDF", width: 10, height: 7.5 });
  pptx.layout = "PDF";

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const canvas = await renderPageToCanvas(page, 2);
    const dataUrl = canvas.toDataURL("image/png");
    const ratio = canvas.height / canvas.width;
    const slide = pptx.addSlide();
    let w = 10;
    let h = w * ratio;
    if (h > 7.5) {
      h = 7.5;
      w = h / ratio;
    }
    slide.addImage({ data: dataUrl, x: (10 - w) / 2, y: (7.5 - h) / 2, w, h });
    onProgress?.(Math.round((i / pdf.numPages) * 100));
  }

  await pptx.writeFile({ fileName: `${baseName(file.name)}.pptx` });
}

/* -------------------------------------------------------------- PDF → Image */

export async function pdfToImages(
  file: File,
  opts: { format: "png" | "jpeg"; scale: number; onProgress?: (pct: number) => void },
) {
  const JSZip = (await import("jszip")).default;
  const pdf = await loadPdf(file);
  const type = opts.format === "png" ? "image/png" : "image/jpeg";
  const ext = opts.format === "png" ? "png" : "jpg";
  const name = baseName(file.name);

  if (pdf.numPages === 1) {
    const canvas = await renderPageToCanvas(await pdf.getPage(1), opts.scale);
    downloadBlob(await canvasToBlob(canvas, type), `${name}.${ext}`);
    opts.onProgress?.(100);
    return;
  }

  const zip = new JSZip();
  for (let i = 1; i <= pdf.numPages; i++) {
    const canvas = await renderPageToCanvas(await pdf.getPage(i), opts.scale);
    const blob = await canvasToBlob(canvas, type);
    zip.file(`${name}-page-${String(i).padStart(3, "0")}.${ext}`, blob);
    opts.onProgress?.(Math.round((i / pdf.numPages) * 100));
  }
  downloadBlob(await zip.generateAsync({ type: "blob" }), `${name}-images.zip`);
}

/* ---------------------------------------------------- PDF → Publisher bundle */

/**
 * Microsoft Publisher (.pub) is a closed binary format with no writer available
 * in any runtime, so we produce a Publisher-importable bundle instead:
 * high-resolution page images plus the editable text.
 */
export async function pdfToPublisherBundle(
  file: File,
  pages: PageContent[],
  onProgress?: (pct: number) => void,
) {
  const JSZip = (await import("jszip")).default;
  const pdf = await loadPdf(file);
  const zip = new JSZip();
  const name = baseName(file.name);

  for (let i = 1; i <= pdf.numPages; i++) {
    const canvas = await renderPageToCanvas(await pdf.getPage(i), 3);
    zip.file(`images/page-${String(i).padStart(3, "0")}.png`, await canvasToBlob(canvas, "image/png"));
    onProgress?.(Math.round((i / pdf.numPages) * 90));
  }

  zip.file(
    "text/content.txt",
    pages.map((p) => `--- Page ${p.pageNumber} ---\n${p.lines.map((l) => l.text).join("\n")}`).join("\n\n"),
  );
  zip.file("text/content.docx", await pagesToDocxBlob(pages));
  zip.file(
    "HOW-TO-IMPORT.txt",
    [
      "Publisher import bundle",
      "",
      "Microsoft Publisher does not accept a converted .pub file from any third-party tool,",
      "so this bundle gives you everything Publisher can import directly:",
      "",
      "1. Open Microsoft Publisher and create a blank page the same size as your PDF.",
      "2. Insert > Pictures, and place images/page-001.png as the page background.",
      "3. Use text/content.docx (Insert > Text File) to drop the editable text on top.",
      "4. Repeat for each page.",
    ].join("\n"),
  );

  onProgress?.(100);
  downloadBlob(await zip.generateAsync({ type: "blob" }), `${name}-publisher-bundle.zip`);
}

/* ------------------------------------------------------- Split / merge pages */

export async function splitPdf(
  file: File,
  mode: "each" | "range",
  ranges: number[],
): Promise<void> {
  const { PDFDocument } = await import("pdf-lib");
  const JSZip = (await import("jszip")).default;
  const src = await PDFDocument.load(await file.arrayBuffer());
  const name = baseName(file.name);

  if (mode === "range") {
    const out = await PDFDocument.create();
    const copied = await out.copyPages(src, ranges);
    copied.forEach((p) => out.addPage(p));
    const bytes = await out.save();
    downloadBlob(new Blob([bytes as BlobPart], { type: "application/pdf" }), `${name}-extract.pdf`);
    return;
  }

  const zip = new JSZip();
  for (const idx of ranges) {
    const out = await PDFDocument.create();
    const [p] = await out.copyPages(src, [idx]);
    out.addPage(p);
    const bytes = await out.save();
    zip.file(`${name}-page-${String(idx + 1).padStart(3, "0")}.pdf`, bytes);
  }
  downloadBlob(await zip.generateAsync({ type: "blob" }), `${name}-split.zip`);
}

export async function mergePdfs(files: File[], filename = "merged.pdf") {
  const { PDFDocument } = await import("pdf-lib");
  const out = await PDFDocument.create();
  for (const f of files) {
    const src = await PDFDocument.load(await f.arrayBuffer());
    const copied = await out.copyPages(src, src.getPageIndices());
    copied.forEach((p) => out.addPage(p));
  }
  const bytes = await out.save();
  downloadBlob(new Blob([bytes as BlobPart], { type: "application/pdf" }), filename);
}

export async function getPageCount(file: File) {
  const { PDFDocument } = await import("pdf-lib");
  const doc = await PDFDocument.load(await file.arrayBuffer());
  return doc.getPageCount();
}

/* ------------------------------------------------- Blob variants (file-safe)
 * These return the produced file instead of downloading it, so the conversion
 * pipeline can both download it and store it as a File Version.
 */

export type ConversionOutput = { blob: Blob; filename: string };

export async function wordFileToPdfBlob(file: File): Promise<ConversionOutput> {
  const mammoth = await import("mammoth");
  const arrayBuffer = await file.arrayBuffer();
  const { value: html } = await mammoth.convertToHtml({ arrayBuffer });
  const blocks = htmlToBlocks(html);

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 56;
  const maxW = pageW - margin * 2;
  let y = margin;

  for (const b of blocks) {
    if (!b.text) {
      y += 8;
      continue;
    }
    const style = b.bold && b.italic ? "bolditalic" : b.bold ? "bold" : b.italic ? "italic" : "normal";
    doc.setFont("helvetica", style);
    doc.setFontSize(b.size);
    const indent = b.bullet ? 18 : 0;
    const text = b.bullet ? `•  ${b.text}` : b.text;
    const lines = doc.splitTextToSize(text, maxW - indent) as string[];
    const lh = b.size * 1.45;
    for (const line of lines) {
      if (y + lh > pageH - margin) {
        doc.addPage();
        y = margin;
      }
      doc.text(line, margin + indent, y);
      y += lh;
    }
    y += b.size > 11 ? 8 : 3;
  }

  return {
    blob: doc.output("blob"),
    filename: `${baseName(file.name)}.pdf`,
  };
}

export async function rowsToXlsxBlob(
  sheets: Record<string, string[][]>,
  filename: string,
): Promise<ConversionOutput> {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();
  const entries = Object.entries(sheets);
  if (entries.length === 0) throw new Error("Nothing to export");
  for (const [name, rows] of entries) {
    const ws = XLSX.utils.aoa_to_sheet(rows.length ? rows : [[""]]);
    XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 31));
  }
  const out = XLSX.write(wb, { bookType: "xlsx", type: "array" }) as ArrayBuffer;
  return {
    blob: new Blob([out], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    filename: `${filename}.xlsx`,
  };
}

export async function pdfToPptxBlob(
  file: File,
  onProgress?: (pct: number) => void,
): Promise<ConversionOutput> {
  const PptxGenJS = (await import("pptxgenjs")).default;
  const pdf = await loadPdf(file);
  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: "PDF", width: 10, height: 7.5 });
  pptx.layout = "PDF";

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const canvas = await renderPageToCanvas(page, 2);
    const dataUrl = canvas.toDataURL("image/png");
    const ratio = canvas.height / canvas.width;
    const slide = pptx.addSlide();
    let w = 10;
    let h = w * ratio;
    if (h > 7.5) {
      h = 7.5;
      w = h / ratio;
    }
    slide.addImage({ data: dataUrl, x: (10 - w) / 2, y: (7.5 - h) / 2, w, h });
    onProgress?.(Math.round((i / pdf.numPages) * 100));
  }

  const blob = (await pptx.write({ outputType: "blob" })) as Blob;
  return { blob, filename: `${baseName(file.name)}.pptx` };
}

export async function pdfToImagesBlob(
  file: File,
  opts: { format: "png" | "jpeg"; scale: number; onProgress?: (pct: number) => void },
): Promise<ConversionOutput> {
  const JSZip = (await import("jszip")).default;
  const pdf = await loadPdf(file);
  const type = opts.format === "png" ? "image/png" : "image/jpeg";
  const ext = opts.format === "png" ? "png" : "jpg";
  const name = baseName(file.name);

  if (pdf.numPages === 1) {
    const canvas = await renderPageToCanvas(await pdf.getPage(1), opts.scale);
    opts.onProgress?.(100);
    return { blob: await canvasToBlob(canvas, type), filename: `${name}.${ext}` };
  }

  const zip = new JSZip();
  for (let i = 1; i <= pdf.numPages; i++) {
    const canvas = await renderPageToCanvas(await pdf.getPage(i), opts.scale);
    zip.file(`${name}-page-${String(i).padStart(3, "0")}.${ext}`, await canvasToBlob(canvas, type));
    opts.onProgress?.(Math.round((i / pdf.numPages) * 100));
  }
  return {
    blob: await zip.generateAsync({ type: "blob" }),
    filename: `${name}-images.zip`,
  };
}

export async function pdfToPublisherBundleBlob(
  file: File,
  pages: PageContent[],
  onProgress?: (pct: number) => void,
): Promise<ConversionOutput> {
  const JSZip = (await import("jszip")).default;
  const pdf = await loadPdf(file);
  const zip = new JSZip();
  const name = baseName(file.name);

  for (let i = 1; i <= pdf.numPages; i++) {
    const canvas = await renderPageToCanvas(await pdf.getPage(i), 3);
    zip.file(`images/page-${String(i).padStart(3, "0")}.png`, await canvasToBlob(canvas, "image/png"));
    onProgress?.(Math.round((i / pdf.numPages) * 90));
  }

  zip.file(
    "text/content.txt",
    pages.map((p) => `--- Page ${p.pageNumber} ---\n${p.lines.map((l) => l.text).join("\n")}`).join("\n\n"),
  );
  zip.file("text/content.docx", await pagesToDocxBlob(pages));
  zip.file(
    "HOW-TO-IMPORT.txt",
    [
      "Publisher import bundle",
      "",
      "Microsoft Publisher does not accept a converted .pub file from any third-party tool,",
      "so this bundle gives you everything Publisher can import directly:",
      "",
      "1. Open Microsoft Publisher and create a blank page the same size as your PDF.",
      "2. Insert > Pictures, and place images/page-001.png as the page background.",
      "3. Use text/content.docx (Insert > Text File) to drop the editable text on top.",
      "4. Repeat for each page.",
    ].join("\n"),
  );

  onProgress?.(100);
  return {
    blob: await zip.generateAsync({ type: "blob" }),
    filename: `${name}-publisher-bundle.zip`,
  };
}

export async function splitPdfBlob(
  file: File,
  mode: "each" | "range",
  ranges: number[],
): Promise<ConversionOutput> {
  const { PDFDocument } = await import("pdf-lib");
  const JSZip = (await import("jszip")).default;
  const src = await PDFDocument.load(await file.arrayBuffer());
  const name = baseName(file.name);

  if (mode === "range") {
    const out = await PDFDocument.create();
    const copied = await out.copyPages(src, ranges);
    copied.forEach((p) => out.addPage(p));
    const bytes = await out.save();
    return {
      blob: new Blob([bytes as BlobPart], { type: "application/pdf" }),
      filename: `${name}-extract.pdf`,
    };
  }

  const zip = new JSZip();
  for (const idx of ranges) {
    const out = await PDFDocument.create();
    const [p] = await out.copyPages(src, [idx]);
    out.addPage(p);
    zip.file(`${name}-page-${String(idx + 1).padStart(3, "0")}.pdf`, await out.save());
  }
  return { blob: await zip.generateAsync({ type: "blob" }), filename: `${name}-split.zip` };
}

export async function mergePdfsBlob(
  files: File[],
  filename = "merged.pdf",
): Promise<ConversionOutput> {
  const { PDFDocument } = await import("pdf-lib");
  const out = await PDFDocument.create();
  for (const f of files) {
    const src = await PDFDocument.load(await f.arrayBuffer());
    const copied = await out.copyPages(src, src.getPageIndices());
    copied.forEach((p) => out.addPage(p));
  }
  const bytes = await out.save();
  return { blob: new Blob([bytes as BlobPart], { type: "application/pdf" }), filename };
}
