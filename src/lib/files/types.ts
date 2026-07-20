export interface Folder {
  id: string;
  user_id: string;
  parent_id: string | null;
  name: string;
  color: string | null;
  icon: string | null;
  is_trashed: boolean;
  trashed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface FileRow {
  id: string;
  user_id: string;
  folder_id: string | null;
  name: string;
  storage_path: string;
  mime_type: string | null;
  extension: string | null;
  size_bytes: number;
  version: number;
  is_favorite: boolean;
  is_archived: boolean;
  is_trashed: boolean;
  trashed_at: string | null;
  source_module: string | null;
  source_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Tag {
  id: string;
  user_id: string;
  name: string;
  color: string | null;
}

export interface SharedFile {
  id: string;
  file_id: string;
  user_id: string;
  token: string;
  allow_download: boolean;
  expires_at: string | null;
  revoked_at: string | null;
  view_count: number;
  created_at: string;
  password_hash?: string | null;
}

export const SUPPORTED_EXTENSIONS = [
  "pdf","docx","doc","xlsx","xls","pptx","ppt","txt","csv",
  "png","jpg","jpeg","webp","gif","svg","zip",
] as const;

export type FileFilter = {
  search?: string;
  folderId?: string | null;
  favoritesOnly?: boolean;
  trashed?: boolean;
  archived?: boolean;
  type?: string;
};
