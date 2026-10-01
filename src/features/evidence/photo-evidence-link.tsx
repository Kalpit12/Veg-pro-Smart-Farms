"use client";

import { useEffect, useState } from "react";

import { getEvidenceSignedUrl } from "@/services/supabase/storage-service";
import { hasSupabaseEnv } from "@/lib/supabase/config";

export function PhotoEvidenceLink({ path }: { path: string }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!hasSupabaseEnv() || path.startsWith("demo-photo://")) {
      setUrl(null);
      return;
    }
    let cancelled = false;
    void getEvidenceSignedUrl(path)
      .then((signed) => {
        if (!cancelled) setUrl(signed);
      })
      .catch(() => {
        if (!cancelled) setUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [path]);

  if (path.startsWith("demo-photo://")) {
    return <span className="text-xs text-muted-foreground">Demo photo</span>;
  }
  if (!url) {
    return <span className="text-xs text-muted-foreground">Photo</span>;
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="text-xs font-medium text-primary underline-offset-2 hover:underline"
    >
      View
    </a>
  );
}
