import { supabase } from "@/integrations/supabase/client";
import { StorageService, FileService } from "./service";
import type { FileRow } from "./types";

const CONVERSIONS_FOLDER = "Conversions";

async function currentUserId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Not signed in");
  return data.user.id;
}

/** Find (or create) the folder every tool output lands in. */
export async function ensureConversionsFolder(): Promise<string> {
  const uid = await currentUserId();
  const { data: existing } = await supabase
    .from("folders")
    .select("id")
    .eq("user_id", uid)
    .eq("name", CONVERSIONS_FOLDER)
    .eq("is_trashed", false)
    .maybeSingle();
  if (existing) return existing.id;

  const { data, error } = await supabase
    .from("folders")
    .insert({ user_id: uid, name: CONVERSIONS_FOLDER, icon: "wrench", color: "primary" })
    .select("id")
    .single();
  if (error) throw error;
  await supabase.from("file_activity").insert({
    user_id: uid,
    folder_id: data.id,
    action: "folder.create",
    metadata: { reason: "conversions" } as never,
  });
  return data.id;
}

export type SavedOutput = {
  file: FileRow;
  version: number;
  isNewVersion: boolean;
};

/**
 * Store a tool output in the file library.
 * Re-converting the same document adds a new **version** of the existing file
 * rather than a duplicate, and every step is written to the activity log.
 */
export async function saveConversionOutput(
  blob: Blob,
  filename: string,
  meta: {
    tool: string;
    sourceName: string;
    ocrLanguage?: string | null;
    pageCount?: number | null;
    jobId?: string | null;
  },
): Promise<SavedOutput> {
  const uid = await currentUserId();
  const folderId = await ensureConversionsFolder();
  const file = new File([blob], filename, { type: blob.type || "application/octet-stream" });

  const { data: existing } = await supabase
    .from("files")
    .select("*")
    .eq("user_id", uid)
    .eq("folder_id", folderId)
    .eq("name", filename)
    .eq("is_trashed", false)
    .maybeSingle();

  const activityMeta = {
    tool: meta.tool,
    source: meta.sourceName,
    ocr_language: meta.ocrLanguage ?? null,
    pages: meta.pageCount ?? null,
    job_id: meta.jobId ?? null,
    size: blob.size,
  };

  if (existing) {
    await FileService.uploadNewVersion(existing.id, file, `${meta.tool} · ${meta.sourceName}`);
    const refreshed = await FileService.get(existing.id);
    await supabase.from("file_activity").insert({
      user_id: uid,
      file_id: existing.id,
      folder_id: folderId,
      action: "conversion.output",
      metadata: { ...activityMeta, version: refreshed?.version ?? null } as never,
    });
    return {
      file: (refreshed ?? (existing as FileRow)) as FileRow,
      version: refreshed?.version ?? 1,
      isNewVersion: true,
    };
  }

  const created = await StorageService.upload(file, { folderId });
  await supabase.from("files").update({
    source_module: meta.tool,
    metadata: activityMeta as never,
  }).eq("id", created.id);

  await supabase.from("file_activity").insert({
    user_id: uid,
    file_id: created.id,
    folder_id: folderId,
    action: "conversion.output",
    metadata: { ...activityMeta, version: 1 } as never,
  });

  return { file: created, version: 1, isNewVersion: false };
}

/** Preferred OCR language + auto-save switch for the signed-in user. */
export async function getToolPreferences() {
  const uid = await currentUserId();
  const { data } = await supabase
    .from("ai_preferences")
    .select("ocr_language, auto_save_conversions")
    .eq("user_id", uid)
    .maybeSingle();
  return {
    ocrLanguage: data?.ocr_language ?? "eng",
    autoSave: data?.auto_save_conversions ?? true,
  };
}

export async function saveToolPreferences(patch: { ocrLanguage?: string; autoSave?: boolean }) {
  const uid = await currentUserId();
  const row: Record<string, unknown> = { user_id: uid };
  if (patch.ocrLanguage !== undefined) row.ocr_language = patch.ocrLanguage;
  if (patch.autoSave !== undefined) row.auto_save_conversions = patch.autoSave;
  const { error } = await supabase.from("ai_preferences").upsert(row as never, { onConflict: "user_id" });
  if (error) throw error;
}
