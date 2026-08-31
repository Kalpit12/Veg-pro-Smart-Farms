import { createClient } from "@/lib/supabase/client";

export async function uploadActivityEvidence(file: File) {
  const supabase = createClient();
  const ext = file.name.split(".").pop() || "jpg";
  const path = `activities/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from(process.env.NEXT_PUBLIC_STORAGE_BUCKET || "activity-evidence")
    .upload(path, file, { upsert: false, contentType: file.type });

  if (error) throw error;
  return path;
}

export async function getEvidenceSignedUrl(path: string, expiresInSeconds = 3600) {
  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from(process.env.NEXT_PUBLIC_STORAGE_BUCKET || "activity-evidence")
    .createSignedUrl(path, expiresInSeconds);
  if (error) throw error;
  return data.signedUrl;
}

