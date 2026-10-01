"use client";

import { useEffect, useState } from "react";

export function HttpsGpsBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const host = window.location.hostname;
    const insecure =
      window.location.protocol === "http:" &&
      host !== "localhost" &&
      host !== "127.0.0.1";
    setShow(insecure);
  }, []);

  if (!show) return null;

  return (
    <p className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm">
      This link is not secure. Phone location will not work. Open the normal farm app link
      (HTTPS) or use localhost before walking the houses.
    </p>
  );
}
