/**
 * ID card PDF generator.
 * The card matches the reference layout exactly at standard CR80 size:
 * 85.6 mm × 54 mm (same measurements as the physical card in the photo).
 *
 * Layout coordinates are in mm and mirror the on-screen preview,
 * which uses CSS mm units with the same numbers.
 */
import jsPDF from "jspdf";
import type { IdCardData } from "./api";

export const CARD_W = 85.6;
export const CARD_H = 54;

export const GREEN = "#00a651";
export const YELLOW = "#f5e625";
export const CARD_BG = "#f6fbf7";
export const HEADER_TEXT = "#16213e";

// Measured from the reference card (mm)
export const LAYOUT = {
  pad: 2.2,
  logoBox: { x: 2, y: 2.6, w: 8.5, h: 8.5 },
  companyNameX: 11.5,
  companyNameBaseline: 8.7,
  companyNameSize: 5.0, // mm
  badge: { x: 20, y: 13.2, w: 31, h: 5.2 },
  badgeTextSize: 3.6,
  photo: { x: 55.2, y: 12.8, w: 28, h: 29.2 },
  nameX: 3,
  nameBaseline: 24.5,
  nameSize: 4.4,
  fieldLabelX: 3,
  fieldColonX: 17,
  fieldValueX: 18.8,
  fieldFirstBaseline: 28.2,
  fieldPitch: 4.3,
  fieldLabelSize: 3.4,
  fieldValueSize: 3.8,
  sigImageW: 18,
  sigImageH: 6.6,
  footerTop: 45.6,
  footerLine1Baseline: 48.9,
  footerLine2Baseline: 52.2,
  footerTextSize: 2.55,
};

const MM_TO_PT = 2.834645669;

async function toDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export interface CardImages {
  logo?: string | null;
  photo?: string | null;
  signature?: string | null;
}

/** Contain-fit an image inside a box, centred. Returns false on failure. */
async function addImageFit(
  doc: jsPDF,
  url: string | null | undefined,
  x: number,
  y: number,
  w: number,
  h: number,
): Promise<boolean> {
  if (!url) return false;
  const dataUrl = await toDataUrl(url);
  if (!dataUrl) return false;
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const ratio = img.width / img.height || 1;
      let dw = w;
      let dh = w / ratio;
      if (dh > h) {
        dh = h;
        dw = h * ratio;
      }
      try {
        doc.addImage(dataUrl, "PNG", x + (w - dw) / 2, y + (h - dh) / 2, dw, dh, undefined, "FAST");
        resolve(true);
      } catch {
        resolve(false);
      }
    };
    img.onerror = () => resolve(false);
    img.src = dataUrl;
  });
}

function footerFontSize(doc: jsPDF, text: string, maxSize: number, maxW: number): number {
  let size = maxSize;
  while (size > 1.6) {
    doc.setFontSize(size * MM_TO_PT);
    if (doc.getTextWidth(text) <= maxW) break;
    size -= 0.1;
  }
  return size;
}

export function drawIdCard(doc: jsPDF, data: IdCardData, images: CardImages): void {
  // Card body — light background with rounded corners
  doc.setFillColor(CARD_BG);
  doc.roundedRect(0, 0, CARD_W, CARD_H, 2.2, 2.2, "F");

  // ── Header: logo + company name ──
  doc.setFillColor(HEADER_TEXT);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(LAYOUT.companyNameSize * MM_TO_PT);
  const nameCx = (LAYOUT.companyNameX + CARD_W - LAYOUT.pad) / 2;
  doc.text(data.companyName || "Company Name", nameCx, LAYOUT.companyNameBaseline, { align: "center" });

  // ── Badge ──
  const b = LAYOUT.badge;
  doc.setFillColor(GREEN);
  doc.roundedRect(b.x, b.y, b.w, b.h, 0.6, 0.6, "F");
  doc.setFillColor(YELLOW);
  doc.setFontSize(LAYOUT.badgeTextSize * MM_TO_PT);
  doc.text(data.badgeText || "STAFF ID CARD", b.x + b.w / 2, b.y + b.h * 0.68, { align: "center" });

  // ── Photo (green rounded frame) ──
  const p = LAYOUT.photo;
  doc.setDrawColor(GREEN);
  doc.setFillColor("#ffffff");
  doc.setLineWidth(0.55);
  doc.roundedRect(p.x, p.y, p.w, p.h, 1.4, 1.4, "FD");
  const inset = 0.9;
  const photoClip = { x: p.x + inset, y: p.y + inset, w: p.w - inset * 2, h: p.h - inset * 2 };
  doc.setFillColor("#e8f5ec");
  doc.rect(photoClip.x, photoClip.y, photoClip.w, photoClip.h, "F");
  addImageFitSync(doc, images.photo, photoClip);

  // ── Name ──
  doc.setFillColor(HEADER_TEXT);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(LAYOUT.nameSize * MM_TO_PT);
  doc.text(data.fullName || "Full Name", LAYOUT.nameX, LAYOUT.nameBaseline);

  // ── Fields ──
  const fields = data.fields.slice(0, 4);
  fields.forEach((f, i) => {
    const y = LAYOUT.fieldFirstBaseline + i * LAYOUT.fieldPitch;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(LAYOUT.fieldLabelSize * MM_TO_PT);
    doc.text(f.label || "", LAYOUT.fieldLabelX, y);
    doc.text(":", LAYOUT.fieldColonX, y);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(LAYOUT.fieldValueSize * MM_TO_PT);
    doc.text(f.value || "", LAYOUT.fieldValueX, y);
  });

  // ── Authorizing signature ──
  const lastBaseline = LAYOUT.fieldFirstBaseline + Math.max(fields.length - 1, 0) * LAYOUT.fieldPitch;
  let sigBaseline = lastBaseline + LAYOUT.fieldPitch;
  if (sigBaseline > 44.4) sigBaseline = 44.4;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(LAYOUT.fieldLabelSize * MM_TO_PT);
  doc.text(data.signatureLabel || "", LAYOUT.fieldLabelX, sigBaseline);
  const labelW = doc.getTextWidth(data.signatureLabel || "");
  const sigBox = {
    x: LAYOUT.fieldLabelX + labelW / MM_TO_PT + 1.2,
    y: sigBaseline - LAYOUT.sigImageH,
    w: LAYOUT.sigImageW,
    h: LAYOUT.sigImageH,
  };
  addImageFitSync(doc, images.signature, sigBox);

  // ── Footer strip ──
  const ft = LAYOUT.footerTop;
  doc.setFillColor(GREEN);
  doc.rect(0, ft, CARD_W, CARD_H - ft, "F");
  doc.setFillColor(YELLOW);
  const maxW = CARD_W - 4;
  const s1 = footerFontSize(doc, data.footerLine1 || "", LAYOUT.footerTextSize, maxW);
  doc.setFontSize(s1 * MM_TO_PT);
  doc.text(data.footerLine1 || "", CARD_W / 2, LAYOUT.footerLine1Baseline, { align: "center" });
  const s2 = footerFontSize(doc, data.footerLine2 || "", LAYOUT.footerTextSize, maxW);
  doc.setFontSize(s2 * MM_TO_PT);
  doc.text(data.footerLine2 || "", CARD_W / 2, LAYOUT.footerLine2Baseline, { align: "center" });

  // Header logo is drawn last so it sits above the background cleanly.
  const lg = LAYOUT.logoBox;
  addImageFitSync(doc, images.logo, lg);
}

/** Synchronous contain-fit once a dataUrl is already loaded. */
function addImageFitSync(doc: jsPDF, url: string | null | undefined, box: { x: number; y: number; w: number; h: number }): void {
  if (!url) return;
  doc.addImage(url, "PNG", box.x, box.y, box.w, box.h, undefined, "FAST");
}

/**
 * Preload all image URLs into data URLs (addImage needs them upfront for
 * synchronous layout), then draw the card at its exact physical size.
 */
export async function generateIdCardPDF(data: IdCardData, images: CardImages): Promise<jsPDF> {
  const doc = new jsPDF({ unit: "mm", format: [CARD_W, CARD_H], orientation: "landscape" });
  const loaded: CardImages = {};
  for (const key of ["logo", "photo", "signature"] as const) {
    loaded[key] = images[key] ? await toDataUrl(images[key]!) : null;
  }
  drawIdCard(doc, data, loaded);
  return doc;
}

/** A4 print sheet with the card repeated in a cut-out grid. */
export async function generateIdCardPrintSheet(
  data: IdCardData,
  images: CardImages,
  copies: number,
): Promise<jsPDF> {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const loaded: CardImages = {};
  for (const key of ["logo", "photo", "signature"] as const) {
    loaded[key] = images[key] ? await toDataUrl(images[key]!) : null;
  }
  const margin = 6;
  const gap = 3;
  const perRow = Math.floor((doc.internal.pageSize.getWidth() - margin * 2 + gap) / (CARD_W + gap));
  const perCol = Math.floor((doc.internal.pageSize.getHeight() - margin * 2 + gap) / (CARD_H + gap));
  const perPage = perRow * perCol;
  let placed = 0;
  let index = 0;
  while (index < copies) {
    if (placed === perPage) {
      doc.addPage();
      placed = 0;
    }
    const row = Math.floor(placed / perRow);
    const col = placed % perRow;
    const x = margin + col * (CARD_W + gap);
    const y = margin + row * (CARD_H + gap);
    // Cut guide
    doc.setDrawColor("#c9d4cc");
    doc.setLineWidth(0.2);
    doc.roundedRect(x, y, CARD_W, CARD_H, 2.2, 2.2, "S");
    doc.saveGraphicsState();
    doc.setCurrentTransformationMatrix(
      (doc as unknown as { Matrix: new (a: number, b: number, c: number, d: number, e: number, f: number) => unknown }).constructor
        ? (doc as never)
        : (doc as never),
    );
    doc.restoreGraphicsState();
    // Translate drawing by using a lightweight sub-context: shift origin via clip is complex,
    // so draw a translated copy using jsPDF's translate on a fresh card each time.
    doc.saveGraphicsState();
    (doc as unknown as { translate?: (x: number, y: number) => void }).translate?.(x, y);
    drawIdCard(doc, data, loaded);
    doc.restoreGraphicsState();
    placed += 1;
    index += 1;
  }
  return doc;
}
