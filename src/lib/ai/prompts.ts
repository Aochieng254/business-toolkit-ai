/**
 * Central prompt library. Add new templates here without touching call sites.
 * Each template returns a system prompt tuned for one purpose.
 */

export type Tone = "professional" | "friendly" | "formal" | "casual";
export type Length = "short" | "medium" | "long";

export interface PromptContext {
  tone?: Tone;
  length?: Length;
  language?: string;
}

const toneLine = (t?: Tone) =>
  t ? `Use a ${t} tone.` : "Use a professional tone.";
const lengthLine = (l?: Length) => {
  if (l === "short") return "Keep the response concise (1-2 short paragraphs).";
  if (l === "long") return "Provide a detailed response with examples.";
  return "Keep the response focused and medium-length.";
};
const langLine = (lang?: string) =>
  lang && lang !== "en" ? `Respond in ${lang}.` : "";

export const buildSystemPrompt = (base: string, ctx: PromptContext = {}) =>
  [base, toneLine(ctx.tone), lengthLine(ctx.length), langLine(ctx.language)]
    .filter(Boolean)
    .join(" ");

export type AiAction =
  | "improve"
  | "rewrite"
  | "summarize"
  | "expand"
  | "shorten"
  | "translate"
  | "explain"
  | "tone-professional"
  | "tone-friendly"
  | "tone-formal";

export const ACTION_PROMPTS: Record<AiAction, string> = {
  improve:
    "Improve the following text. Fix grammar, clarity, and flow while preserving meaning and length. Return only the improved text.",
  rewrite:
    "Rewrite the following text with the same meaning but different wording. Return only the rewritten text.",
  summarize:
    "Summarize the following text into its key points. Return only the summary.",
  expand:
    "Expand the following text with more detail, examples, and context. Return only the expanded text.",
  shorten:
    "Shorten the following text to about half its length while preserving key meaning. Return only the shortened text.",
  translate:
    "Translate the following text to the requested target language. Return only the translation.",
  explain:
    "Explain the following text in plain, easy-to-understand language. Return only the explanation.",
  "tone-professional":
    "Rewrite the following text with a polished professional tone suitable for business communication. Return only the rewritten text.",
  "tone-friendly":
    "Rewrite the following text with a warm, friendly tone. Return only the rewritten text.",
  "tone-formal":
    "Rewrite the following text with a strictly formal tone. Return only the rewritten text.",
};

export const MODULE_PROMPTS = {
  invoiceNotes:
    "You are helping a business owner write clear, professional invoice notes for their customer.",
  invoiceItem:
    "You are helping describe an invoice line item clearly and concisely for a customer.",
  quotationNotes:
    "You are helping write persuasive, professional quotation notes for a prospect.",
  receiptDescription:
    "You are helping write a short, professional receipt description.",
  payslipExplanation:
    "You are helping explain payslip components clearly to an employee.",
  cvWriter:
    "You are an expert CV writer. Produce achievement-focused, quantified content.",
  coverLetter:
    "You are an expert cover-letter writer. Produce persuasive, tailored content.",
  businessName:
    "You are a creative brand strategist generating memorable, brandable business names.",
  businessAdvice:
    "You are a pragmatic business advisor helping small business owners.",
  assistant:
    "You are Business Toolkit AI — a helpful copilot for a small-business owner. You can help with invoices, quotations, receipts, payslips, CVs, cover letters, business names, and general business advice. Be concise and practical.",
} as const;

export type ModulePromptKey = keyof typeof MODULE_PROMPTS;
