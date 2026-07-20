import type { FileRow } from "./types";

export const PreviewService = {
  isImage(f: Pick<FileRow, "mime_type" | "extension">) {
    if (f.mime_type?.startsWith("image/")) return true;
    return ["png", "jpg", "jpeg", "webp", "gif", "svg"].includes((f.extension ?? "").toLowerCase());
  },
  isPdf(f: Pick<FileRow, "mime_type" | "extension">) {
    return f.mime_type === "application/pdf" || (f.extension ?? "").toLowerCase() === "pdf";
  },
  isText(f: Pick<FileRow, "mime_type" | "extension">) {
    if (f.mime_type?.startsWith("text/")) return true;
    return ["txt", "csv", "md", "log", "json"].includes((f.extension ?? "").toLowerCase());
  },
  isOffice(f: Pick<FileRow, "extension">) {
    return ["docx", "doc", "xlsx", "xls", "pptx", "ppt"].includes((f.extension ?? "").toLowerCase());
  },
  canPreview(f: Pick<FileRow, "mime_type" | "extension">) {
    return this.isImage(f) || this.isPdf(f) || this.isText(f);
  },
  iconFor(extension: string | null | undefined): string {
    const e = (extension ?? "").toLowerCase();
    if (["png","jpg","jpeg","webp","gif","svg"].includes(e)) return "image";
    if (e === "pdf") return "file-text";
    if (["doc","docx"].includes(e)) return "file-text";
    if (["xls","xlsx","csv"].includes(e)) return "sheet";
    if (["ppt","pptx"].includes(e)) return "presentation";
    if (["zip"].includes(e)) return "archive";
    if (["txt","md","log"].includes(e)) return "file-text";
    return "file";
  },
  humanSize(bytes: number): string {
    if (!bytes) return "0 B";
    const units = ["B","KB","MB","GB","TB"];
    const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
    return `${(bytes / Math.pow(1024, i)).toFixed(i ? 1 : 0)} ${units[i]}`;
  },
};
