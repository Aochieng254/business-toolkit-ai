import { supabase } from "@/integrations/supabase/client";
import type { Folder, FileRow, FileFilter, SharedFile } from "./types";

const BUCKET = "user-files";

async function currentUserId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Not signed in");
  return data.user.id;
}

function extOf(name: string) {
  const i = name.lastIndexOf(".");
  return i > -1 ? name.slice(i + 1).toLowerCase() : "";
}

async function logActivity(fileId: string | null, folderId: string | null, action: string, metadata: Record<string, unknown> = {}) {
  const uid = await currentUserId();
  await supabase.from("file_activity").insert({
    user_id: uid, file_id: fileId, folder_id: folderId, action, metadata,
  });
}

/* ================= StorageService ================= */
export const StorageService = {
  bucket: BUCKET,

  async upload(file: File, opts: { folderId?: string | null } = {}): Promise<FileRow> {
    const uid = await currentUserId();
    const ext = extOf(file.name);
    const key = `${uid}/${crypto.randomUUID()}${ext ? "." + ext : ""}`;
    const { error } = await supabase.storage.from(BUCKET).upload(key, file, {
      cacheControl: "3600", upsert: false, contentType: file.type || undefined,
    });
    if (error) throw error;
    const { data, error: dbErr } = await supabase.from("files").insert({
      user_id: uid,
      folder_id: opts.folderId ?? null,
      name: file.name,
      storage_path: key,
      mime_type: file.type || null,
      extension: ext || null,
      size_bytes: file.size,
    }).select("*").single();
    if (dbErr) throw dbErr;
    await logActivity(data.id, opts.folderId ?? null, "upload", { size: file.size });
    return data as FileRow;
  },

  async signedUrl(storagePath: string, expiresIn = 3600, download?: string) {
    const { data, error } = await supabase.storage.from(BUCKET)
      .createSignedUrl(storagePath, expiresIn, download ? { download } : undefined);
    if (error) throw error;
    return data.signedUrl;
  },

  async downloadUrl(file: FileRow) {
    return this.signedUrl(file.storage_path, 3600, file.name);
  },

  async copyObject(srcPath: string): Promise<string> {
    const uid = await currentUserId();
    const ext = srcPath.split(".").pop();
    const newKey = `${uid}/${crypto.randomUUID()}${ext ? "." + ext : ""}`;
    const { error } = await supabase.storage.from(BUCKET).copy(srcPath, newKey);
    if (error) throw error;
    return newKey;
  },

  async removeObject(path: string) {
    await supabase.storage.from(BUCKET).remove([path]);
  },
};

/* ================= FolderService ================= */
export const FolderService = {
  async list(parentId: string | null = null): Promise<Folder[]> {
    let q = supabase.from("folders").select("*").eq("is_trashed", false).order("name");
    q = parentId === null ? q.is("parent_id", null) : q.eq("parent_id", parentId);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as Folder[];
  },
  async listAll(): Promise<Folder[]> {
    const { data, error } = await supabase.from("folders").select("*").eq("is_trashed", false).order("name");
    if (error) throw error;
    return (data ?? []) as Folder[];
  },
  async create(name: string, parentId: string | null = null, opts: { color?: string; icon?: string } = {}) {
    const uid = await currentUserId();
    const { data, error } = await supabase.from("folders").insert({
      user_id: uid, name, parent_id: parentId, color: opts.color ?? null, icon: opts.icon ?? null,
    }).select("*").single();
    if (error) throw error;
    await logActivity(null, data.id, "folder.create");
    return data as Folder;
  },
  async rename(id: string, name: string) {
    const { error } = await supabase.from("folders").update({ name }).eq("id", id);
    if (error) throw error;
    await logActivity(null, id, "folder.rename", { name });
  },
  async update(id: string, patch: Partial<Pick<Folder, "name" | "color" | "icon" | "parent_id">>) {
    const { error } = await supabase.from("folders").update(patch).eq("id", id);
    if (error) throw error;
  },
  async trash(id: string) {
    const { error } = await supabase.from("folders").update({ is_trashed: true, trashed_at: new Date().toISOString() }).eq("id", id);
    if (error) throw error;
    await logActivity(null, id, "folder.trash");
  },
  async breadcrumb(folderId: string | null): Promise<Folder[]> {
    if (!folderId) return [];
    const chain: Folder[] = [];
    let current: string | null = folderId;
    while (current) {
      const { data } = await supabase.from("folders").select("*").eq("id", current).maybeSingle();
      if (!data) break;
      chain.unshift(data as Folder);
      current = (data as Folder).parent_id;
    }
    return chain;
  },
};

/* ================= FileService ================= */
export const FileService = {
  async list(filter: FileFilter = {}): Promise<FileRow[]> {
    let q = supabase.from("files").select("*")
      .eq("is_trashed", filter.trashed ?? false)
      .order("updated_at", { ascending: false });
    if (filter.folderId !== undefined) {
      q = filter.folderId === null ? q.is("folder_id", null) : q.eq("folder_id", filter.folderId);
    }
    if (filter.favoritesOnly) q = q.eq("is_favorite", true);
    if (filter.archived !== undefined) q = q.eq("is_archived", filter.archived);
    if (filter.search) q = q.ilike("name", `%${filter.search}%`);
    if (filter.type) q = q.eq("extension", filter.type);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as FileRow[];
  },
  async recent(limit = 10): Promise<FileRow[]> {
    const { data, error } = await supabase.from("files").select("*")
      .eq("is_trashed", false).order("updated_at", { ascending: false }).limit(limit);
    if (error) throw error;
    return (data ?? []) as FileRow[];
  },
  async touch(id: string) {
    const uid = await currentUserId();
    await supabase.from("recents").insert({ user_id: uid, file_id: id });
  },
  async get(id: string): Promise<FileRow | null> {
    const { data } = await supabase.from("files").select("*").eq("id", id).maybeSingle();
    return (data as FileRow) ?? null;
  },
  async rename(id: string, name: string) {
    const { error } = await supabase.from("files").update({ name }).eq("id", id);
    if (error) throw error;
    await logActivity(id, null, "rename", { name });
  },
  async move(id: string, folderId: string | null) {
    const { error } = await supabase.from("files").update({ folder_id: folderId }).eq("id", id);
    if (error) throw error;
    await logActivity(id, folderId, "move");
  },
  async toggleFavorite(id: string, isFav: boolean) {
    const uid = await currentUserId();
    await supabase.from("files").update({ is_favorite: isFav }).eq("id", id);
    if (isFav) await supabase.from("favorites").upsert({ user_id: uid, file_id: id });
    else await supabase.from("favorites").delete().eq("user_id", uid).eq("file_id", id);
    await logActivity(id, null, isFav ? "favorite" : "unfavorite");
  },
  async archive(id: string, on: boolean) {
    await supabase.from("files").update({ is_archived: on }).eq("id", id);
    await logActivity(id, null, on ? "archive" : "unarchive");
  },
  async trash(id: string) {
    await supabase.from("files").update({ is_trashed: true, trashed_at: new Date().toISOString() }).eq("id", id);
    await logActivity(id, null, "trash");
  },
  async restore(id: string) {
    await supabase.from("files").update({ is_trashed: false, trashed_at: null }).eq("id", id);
    await logActivity(id, null, "restore");
  },
  async permanentDelete(id: string) {
    const f = await this.get(id);
    if (!f) return;
    await StorageService.removeObject(f.storage_path);
    await supabase.from("files").delete().eq("id", id);
    await logActivity(null, null, "delete", { name: f.name });
  },
  async duplicate(id: string): Promise<FileRow> {
    const uid = await currentUserId();
    const f = await this.get(id);
    if (!f) throw new Error("File not found");
    const newKey = await StorageService.copyObject(f.storage_path);
    const { data, error } = await supabase.from("files").insert({
      user_id: uid, folder_id: f.folder_id, name: `Copy of ${f.name}`,
      storage_path: newKey, mime_type: f.mime_type, extension: f.extension, size_bytes: f.size_bytes,
    }).select("*").single();
    if (error) throw error;
    await logActivity(data.id, f.folder_id, "duplicate");
    return data as FileRow;
  },
  async uploadNewVersion(id: string, file: File, note?: string) {
    const uid = await currentUserId();
    const existing = await this.get(id);
    if (!existing) throw new Error("File not found");
    const ext = extOf(file.name) || existing.extension || "";
    const key = `${uid}/${crypto.randomUUID()}${ext ? "." + ext : ""}`;
    const { error } = await supabase.storage.from(StorageService.bucket).upload(key, file);
    if (error) throw error;
    await supabase.from("file_versions").insert({
      file_id: id, user_id: uid, version: existing.version,
      storage_path: existing.storage_path, size_bytes: existing.size_bytes, note: note ?? null,
    });
    await supabase.from("files").update({
      storage_path: key, size_bytes: file.size, version: existing.version + 1,
      mime_type: file.type || existing.mime_type,
    }).eq("id", id);
    await logActivity(id, null, "version.new", { size: file.size });
  },
  async versions(id: string) {
    const { data } = await supabase.from("file_versions").select("*").eq("file_id", id).order("created_at", { ascending: false });
    return data ?? [];
  },
  async storageUsage(): Promise<number> {
    const uid = await currentUserId();
    const { data } = await supabase.rpc("storage_usage", { _user_id: uid });
    return Number(data ?? 0);
  },
  async searchGlobal(q: string, limit = 50): Promise<FileRow[]> {
    if (!q.trim()) return [];
    const { data } = await supabase.from("files").select("*")
      .eq("is_trashed", false).ilike("name", `%${q}%`).limit(limit);
    return (data ?? []) as FileRow[];
  },
};

/* ================= SharingService ================= */
export const SharingService = {
  async listForFile(fileId: string): Promise<SharedFile[]> {
    const { data } = await supabase.from("shared_files").select("*").eq("file_id", fileId).order("created_at", { ascending: false });
    return (data ?? []) as SharedFile[];
  },
  async create(fileId: string, opts: { expiresAt?: string | null; allowDownload?: boolean; password?: string | null } = {}) {
    const uid = await currentUserId();
    const token = crypto.randomUUID().replace(/-/g, "") + Math.random().toString(36).slice(2, 8);
    let passwordHash: string | null = null;
    if (opts.password) {
      const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(opts.password + ":" + token));
      passwordHash = Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
    }
    const { data, error } = await supabase.from("shared_files").insert({
      user_id: uid, file_id: fileId, token, allow_download: opts.allowDownload ?? true,
      expires_at: opts.expiresAt ?? null, password_hash: passwordHash,
    }).select("*").single();
    if (error) throw error;
    await logActivity(fileId, null, "share.create");
    return data as SharedFile;
  },
  async revoke(id: string) {
    await supabase.from("shared_files").update({ revoked_at: new Date().toISOString() }).eq("id", id);
  },
  buildUrl(token: string) {
    return `${window.location.origin}/share/${token}`;
  },
};

export type { FileRow, Folder, SharedFile };
