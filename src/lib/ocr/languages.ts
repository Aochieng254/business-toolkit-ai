/** Tesseract language packs offered in the UI. */
export const OCR_LANGUAGES = [
  { code: "eng", label: "English" },
  { code: "swa", label: "Swahili" },
  { code: "fra", label: "French" },
  { code: "spa", label: "Spanish" },
  { code: "deu", label: "German" },
  { code: "por", label: "Portuguese" },
  { code: "ita", label: "Italian" },
  { code: "nld", label: "Dutch" },
  { code: "ara", label: "Arabic" },
  { code: "hin", label: "Hindi" },
  { code: "chi_sim", label: "Chinese (Simplified)" },
  { code: "chi_tra", label: "Chinese (Traditional)" },
  { code: "jpn", label: "Japanese" },
  { code: "kor", label: "Korean" },
  { code: "rus", label: "Russian" },
  { code: "tur", label: "Turkish" },
  { code: "pol", label: "Polish" },
  { code: "afr", label: "Afrikaans" },
  { code: "amh", label: "Amharic" },
  { code: "som", label: "Somali" },
  { code: "vie", label: "Vietnamese" },
  { code: "ind", label: "Indonesian" },
] as const;

export type OcrLanguage = (typeof OCR_LANGUAGES)[number]["code"];
export const DEFAULT_OCR_LANGUAGE: OcrLanguage = "eng";

export function ocrLabel(code: string) {
  return OCR_LANGUAGES.find((l) => l.code === code)?.label ?? code;
}
