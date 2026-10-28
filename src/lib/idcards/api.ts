import { supabase } from "@/integrations/supabase/client";

export interface IdCardField {
  label: string;
  value: string;
}

export interface IdCardData {
  companyName: string;
  badgeText: string;
  logoPath: string | null;
  fullName: string;
  fields: IdCardField[];
  signatureLabel: string;
  signaturePath: string | null;
  photoPath: string | null;
  footerLine1: string;
  footerLine2: string;
}

export interface IdCardRow {
  id: string;
  owner: string;
  title: string;
  data: IdCardData;
  created_at: string;
  updated_at: string;
}

export const DEFAULT_ID_CARD: IdCardData = {
  companyName: "Your Company Name",
  badgeText: "STAFF ID CARD",
  logoPath: null,
  fullName: "Full Name",
  fields: [
    { label: "Staff No", value: "0001" },
    { label: "ID No.", value: "00000000" },
    { label: "Dept.", value: "Finance" },
  ],
  signatureLabel: "Authorizing Signature:",
  signaturePath: null,
  photoPath: null,
  footerLine1: "This card is the property of Your Company, P. O. Box 00000 - 00100, Nairobi",
  footerLine2: "Mobile: 0700-000000 / 0733-000000  Email: info@yourcompany.com",
};

// ─── Saved cards ────────────────────────────────────────────────────────────

export async function listIdCards(): Promise<IdCardRow[]> {
  const { data, error } = await supabase
    .from("id_cards")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as IdCardRow[];
}

export async function saveIdCard(
  id: string | null,
  title: string,
  data: IdCardData,
): Promise<IdCardRow> {
  if (id) {
    const { data: row, error } = await supabase
      .from("id_cards")
      .update({ title, data, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    return row as IdCardRow;
  }
  const { data: row, error } = await supabase
    .from("id_cards")
    .insert({ title, data })
    .select("*")
    .single();
  if (error) throw error;
  return row as IdCardRow;
}

export async function deleteIdCard(id: string): Promise<void> {
  const { error } = await supabase.from("id_cards").delete().eq("id", id);
  if (error) throw error;
}

// ─── Card images (logo, photo, signature) ───────────────────────────────────

export async function uploadCardImage(
  userId: string,
  kind: "logo" | "photo" | "signature",
  file: File,
): Promise<string> {
  const ext = file.name.split(".").pop() ?? "png";
  const path = `${userId}/${kind}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("id-card-assets").upload(path, file, {
    cacheControl: "3600",
    upsert: true,
    contentType: file.type,
  });
  if (error) throw error;
  return path;
}

export async function deleteCardImage(path: string | null): Promise<void> {
  if (!path) return;
  await supabase.storage.from("id-card-assets").remove([path]);
}

/** Signed URL for preview / PDF embedding; null when the path is empty. */
export async function getCardImageUrl(path: string | null): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await supabase.storage.from("id-card-assets").createSignedUrl(path, 60 * 60);
  if (error || !data) return null;
  return data.signedUrl;
}
