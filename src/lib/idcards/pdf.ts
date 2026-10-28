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

export interface LoadedImage {
  dataUrl: string;
  w: number;
  h: number;
}

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
  logo?: LoadedImage | null;
  photo?: LoadedImage | null;
  signature?: LoadedImage | null;
}

export async function loadCardImages(images: {
  logo?: string | null;
  photo?: string | null;
  signature?: string | null;
}): Promise<CardImages> {
  const out: CardImages = {};
  for (const key of ["logo", "photo", "signature"] as const) {
    const url = images[key];
    if (!url) {
      out[key] = null;
      continue;
    }
    const dataUrl = await toDataUrl(url);
    if (!dataUrl) {
      out[key] = null;
      continue;
    }
    const dims = await new Promise<{ w: number; h: number }>((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ w: img.width, h: img.height });
      img.onerror = () => resolve({ w: 0, h: 0 });
      img.src = dataUrl;
    });
    out[key] = dims.w > 0 ? { dataUrl, ...dims } : null;
  }
  return out;
}

/** Cover-fit (fill box, centre-crop) inside a clipped rounded frame. */
function drawCover(doc: jsPDF, img: LoadedImage, ox: number, oy: number, box: { x: number; y: number; w: number; h: number }): void {
  const scale = Math.max(box.w / img.w, box.h / img.h);
  const dw = img.w * scale;
  const dh = img.h * scale;
  const dx = box.x + (box.w - dw) / 2;
  const dy = box.y + (box.h - dh) / 2;
  doc.saveGraphicsState();
  doc.roundedRect(box.x + ox, box.y + oy, box.w, box.h, 1.2, 1.2).clip().discardPath();
  doc.addImage(img.dataUrl, "PNG", dx + ox, dy + oy, dw, dh, undefined, "FAST");
  doc.restoreGraphicsState();
}

/** Contain-fit (whole image visible) centred inside a box. */
function drawContain(doc: jsPDF, img: LoadedImage, ox: number, oy: number, box: { x: number; y: number; w: number; h: number }): void {
  const ratio = img.w / img.h || 1;
  let dw = box.w;
  let dh = box.w / ratio;
  if (dh > box.h) {
    dh = box.h;
    dw = box.h * ratio;
  }
  doc.addImage(img.dataUrl, "PNG", box.x + (box.w - dw) / 2 + ox, box.y + (box.h - dh) / 2 + oy, dw, dh, undefined, "FAST");
}

export function drawIdCard(
  doc: jsPDF,
  data: IdCardData,
  images: CardImages,
  ox = 0,
  oy = 0,
): void {
  const X = (v: number) => v + ox;
  const Y = (v: number) => v + oy;

  // Card body — light background with rounded corners
  doc.setFillColor(CARD_BG);
  doc.roundedRect(X(0), Y(0), CARD_W, CARD_H, 2.2, 2.2, "F");

  // ── Header: company name ──
  doc.setFillColor(HEADER_TEXT);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(LAYOUT.companyNameSize * MM_TO_PT);
  const nameCx = (LAYOUT.companyNameX + CARD_W - LAYOUT.pad) / 2;
  doc.text(data.companyName || "Company Name", X(nameCx), Y(LAYOUT.companyNameBaseline), { align: "center" });

  // ── Badge ──
  const b = LAYOUT.badge;
  doc.setFillColor(GREEN);
  doc.roundedRect(X(b.x), Y(b.y), b.w, b.h, 0.6, 0.6, "F");
  doc.setFillColor(YELLOW);
  doc.setFontSize(LAYOUT.badgeTextSize * MM_TO_PT);
  doc.text(data.badgeText || "STAFF ID CARD", X(b.x + b.w / 2), Y(b.y + b.h * 0.68), { align: "center" });

  // ── Photo (green rounded frame) ──
  const p = LAYOUT.photo;
  doc.setDrawColor(GREEN);
  doc.setFillColor("#ffffff");
  doc.setLineWidth(0.55);
  doc.roundedRect(X(p.x), Y(p.y), p.w, p.h, 1.4, 1.4, "FD");
  const inset = 0.9;
  const photoClip = { x: p.x + inset, y: p.y + inset, w: p.w - inset * 2, h: p.h - inset * 2 };
  doc.setFillColor("#e8f5ec");
  doc.rect(X(photoClip.x), Y(photoClip.y), photoClip.w, photoClip.h, "F");
  if (images.photo) drawCover(doc, images.photo, ox, oy, photoClip);

  // ── Name ──
  doc.setFillColor(HEADER_TEXT);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(LAYOUT.nameSize * MM_TO_PT);
  doc.text(data.fullName || "Full Name", X(LAYOUT.nameX), Y(LAYOUT.nameBaseline));

  // ── Fields ──
  const fields = data.fields.slice(0, 4);
  fields.forEach((f, i) => {
    const y = LAYOUT.fieldFirstBaseline + i * LAYOUT.fieldPitch;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(LAYOUT.fieldLabelSize * MM_TO_PT);
    doc.text(f.label || "", X(LAYOUT.fieldLabelX), Y(y));
    doc.text(":", X(LAYOUT.fieldColonX), Y(y));
    doc.setFont("helvetica", "bold");
    doc.setFontSize(LAYOUT.fieldValueSize * MM_TO_PT);
    doc.text(f.value || "", X(LAYOUT.fieldValueX), Y(y));
  });

  // ── Authorizing signature ──
  const lastBaseline = LAYOUT.fieldFirstBaseline + Math.max(fields.length - 1, 0) * LAYOUT.fieldPitch;
  let sigBaseline = lastBaseline + LAYOUT.fieldPitch;
  if (sigBaseline > 44.4) sigBaseline = 44.4;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(LAYOUT.fieldLabelSize * MM_TO_PT);
  const sigLabel = data.signatureLabel || "";
  doc.text(sigLabel, X(LAYOUT.fieldLabelX), Y(sigBaseline));
  const labelW = doc.getTextWidth(sigLabel) / MM_TO_PT;
  if (images.signature) {
    drawContain(doc, images.signature, ox, oy, {
      x: LAYOUT.fieldLabelX + labelW + 1.2,
      y: sigBaseline - LAYOUT.sigImageH,
      w: LAYOUT.sigImageW,
      h: LAYOUT.sigImageH,
    });
  }

  // ── Footer strip ──
  const ft = LAYOUT.footerTop;
  doc.setFillColor(GREEN);
  doc.rect(X(0), Y(ft), CARD_W, CARD_H - ft, "F");
  doc.setFillColor(YELLOW);
  const maxW = CARD_W - 4;
  const fitSize = (text: string) => {
    let size = LAYOUT.footerTextSize;
    doc.setFontSize(size * MM_TO_PT);
    while (size > 1.6 && doc.getTextWidth(text) > maxW) {
      size -= 0.1;
      doc.setFontSize(size * MM_TO_PT);
    }
    return size;
  };
  fitSize(data.footerLine1 || "");
  doc.text(data.footerLine1 || "", X(CARD_W / 2), Y(LAYOUT.footerLine1Baseline), { align: "center" });
  fitSize(data.footerLine2 || "");
  doc.text(data.footerLine2 || "", X(CARD_W / 2), Y(LAYOUT.footerLine2Baseline), { align: "center" });

  // ── Header logo (drawn last so it sits above the background) ──
  const lg = LAYOUT.logoBox;
  if (images.logo) drawContain(doc, images.logo, ox, oy, lg);
}

/** Single card PDF at its exact physical size: 85.6 mm × 54 mm (CR80). */
export async function generateIdCardPDF(data: IdCardData, urls: CardImages["logo"] extends never ? never : {
  logo?: string | null;
  photo?: string | null;
  signature?: string | null;
}): Promise<jsPDF> {
  const doc = new jsPDF({ unit: "mm", format: [CARD_W, CARD_H], orientation: "landscape" });
  const images = await loadCardImages(urls);
  drawIdCard(doc, data, images);
  return doc;
}

/** A4 print sheet with the card repeated in a cut-out grid. */
export async function generateIdCardPrintSheet(
  data: IdCardData,
  urls: {
    logo?: string | null;
    photo?: string | null;
    signature?: string | null;
  },
  copies: number,
): Promise<jsPDF> {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const images = await loadCardImages(urls);
  const margin = 6;
  const gap = 3;
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const perRow = Math.floor((pageW - margin * 2 + gap) / (CARD_W + gap));
  const perCol = Math.floor((pageH - margin * 2 + gap) / (CARD_H + gap));
  const perPage = Math.max(perRow * perCol, 1);
  let placed = 0;
  for (let index = 0; index < copies; index++) {
    if (placed === perPage) {
      doc.addPage();
      placed = 0;
    }
    const row = Math.floor(placed / perRow);
    const col = placed % perRow;
    const x = margin + col * (CARD_W + gap);
    const y = margin + row * (CARD_H + gap);
    drawIdCard(doc, data, images, x, y);
    // Cut guide around each card
    doc.setDrawColor("#b9c6be");
    doc.setLineWidth(0.2);
    doc.roundedRect(x, y, CARD_W, CARD_H, 2.2, 2.2, "S");
    placed += 1;
  }
  return doc;
}
