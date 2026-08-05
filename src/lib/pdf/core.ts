/**
 * Shared client-side PDF utilities: loading, text extraction with layout,
 * page rasterisation and OCR. Everything runs in the browser.
 */

export type TextItem = {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontName: string;
};

export type PageLine = {
  y: number;
  x: number;
  text: string;
  size: number;
  bold: boolean;
  italic: boolean;
};

export type PageContent = {
  pageNumber: number;
  width: number;
  height: number;
  lines: PageLine[];
  /** true when the page had no selectable text and OCR was used */
  ocr: boolean;
};

/* eslint-disable @typescript-eslint/no-explicit-any */

let pdfjsPromise: Promise<any> | null = null;

export async function getPdfjs() {
  if (!pdfjsPromise) {
    pdfjsPromise = (async () => {
      const pdfjs = await import("pdfjs-dist");
      const workerSrc = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
      pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
      return pdfjs;
    })();
  }
  return pdfjsPromise;
}

export async function loadPdf(file: File | ArrayBuffer) {
  const pdfjs = await getPdfjs();
  const data = file instanceof File ? await file.arrayBuffer() : file;
  return pdfjs.getDocument({ data }).promise;
}

/** Render one page to a canvas at the given scale. */
export async function renderPageToCanvas(page: any, scale = 2): Promise<HTMLCanvasElement> {
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);
  const context = canvas.getContext("2d")!;
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvas, canvasContext: context, viewport }).promise;
  return canvas;
}

export function canvasToBlob(canvas: HTMLCanvasElement, type = "image/png", quality = 0.92) {
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Canvas export failed"))), type, quality),
  );
}

/** Group raw text items into visual lines, preserving order, size and style. */
export function itemsToLines(items: TextItem[]): PageLine[] {
  const sorted = [...items].filter((i) => i.str !== "").sort((a, b) => b.y - a.y || a.x - b.x);
  const lines: PageLine[] = [];
  let current: { y: number; parts: TextItem[] } | null = null;

  for (const item of sorted) {
    const tolerance = Math.max(2, item.height * 0.5);
    if (current && Math.abs(current.y - item.y) <= tolerance) {
      current.parts.push(item);
    } else {
      if (current) lines.push(buildLine(current.parts, current.y));
      current = { y: item.y, parts: [item] };
    }
  }
  if (current) lines.push(buildLine(current.parts, current.y));
  return lines;
}

function buildLine(parts: TextItem[], y: number): PageLine {
  const ordered = [...parts].sort((a, b) => a.x - b.x);
  let text = "";
  let prev: TextItem | null = null;
  for (const p of ordered) {
    if (prev) {
      const gap = p.x - (prev.x + prev.width);
      if (gap > prev.height * 0.25 && !/\s$/.test(text) && !/^\s/.test(p.str)) text += " ";
      if (gap > prev.height * 2) text += "\t";
    }
    text += p.str;
    prev = p;
  }
  const size = Math.max(...ordered.map((p) => p.height)) || 11;
  const font = ordered[0]?.fontName ?? "";
  return {
    y,
    x: ordered[0]?.x ?? 0,
    text: text.replace(/\s+$/, ""),
    size,
    bold: /bold|black|heavy|semibold/i.test(font),
    italic: /italic|oblique/i.test(font),
  };
}

/** Extract per-page layout-aware content, falling back to OCR when needed. */
export async function extractPages(
  file: File,
  opts: {
    ocr?: boolean;
    /** Tesseract language pack, e.g. "eng", "swa", "fra". */
    ocrLanguage?: string;
    onProgress?: (pct: number, label: string) => void;
  } = {},
): Promise<PageContent[]> {
  const pdf = await loadPdf(file);
  const pages: PageContent[] = [];
  let worker: any = null;

  try {
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 1 });
      const content = await page.getTextContent();
      const items: TextItem[] = (content.items as any[])
        .filter((it) => typeof it.str === "string")
        .map((it) => ({
          str: it.str as string,
          x: it.transform?.[4] ?? 0,
          y: it.transform?.[5] ?? 0,
          width: it.width ?? 0,
          height: Math.abs(it.transform?.[3] ?? it.height ?? 11) || 11,
          fontName: String(it.fontName ?? ""),
        }));

      let lines = itemsToLines(items);
      let usedOcr = false;

      const hasText = lines.some((l) => l.text.trim().length > 0);
      if (!hasText && opts.ocr) {
        opts.onProgress?.(Math.round(((i - 1) / pdf.numPages) * 100), `OCR page ${i}…`);
        if (!worker) {
          const { createWorker } = await import("tesseract.js");
          worker = await createWorker("eng");
        }
        const canvas = await renderPageToCanvas(page, 2);
        const { data } = await worker.recognize(canvas);
        usedOcr = true;
        lines = (data.text as string)
          .split("\n")
          .map((t: string) => t.replace(/\s+$/, ""))
          .filter((t: string) => t.trim().length > 0)
          .map((t: string, idx: number, arr: string[]) => ({
            y: viewport.height - (idx / Math.max(arr.length, 1)) * viewport.height,
            x: 0,
            text: t,
            size: 11,
            bold: false,
            italic: false,
          }));
      }

      pages.push({
        pageNumber: i,
        width: viewport.width,
        height: viewport.height,
        lines,
        ocr: usedOcr,
      });
      opts.onProgress?.(Math.round((i / pdf.numPages) * 100), `Page ${i} of ${pdf.numPages}`);
    }
  } finally {
    if (worker) await worker.terminate();
  }

  return pages;
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function baseName(name: string) {
  return name.replace(/\.[^.]+$/, "");
}

/** Parse "1-3,5,8-" style page selections into 0-based indexes. */
export function parseRanges(input: string, total: number): number[] {
  const out = new Set<number>();
  for (const chunk of input.split(/[,\s]+/).filter(Boolean)) {
    const m = chunk.match(/^(\d+)?\s*(-)?\s*(\d+)?$/);
    if (!m) continue;
    const [, aRaw, dash, bRaw] = m;
    const a = aRaw ? parseInt(aRaw, 10) : 1;
    const b = dash ? (bRaw ? parseInt(bRaw, 10) : total) : a;
    for (let i = Math.max(1, a); i <= Math.min(total, b); i++) out.add(i - 1);
  }
  return [...out].sort((x, y) => x - y);
}
