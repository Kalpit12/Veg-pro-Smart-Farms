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
      This page is not HTTPS ({typeof window !== "undefined" ? window.location.host : ""}).
      Phone browsers block GPS on plain HTTP. Open the production HTTPS URL (or localhost)
      before walking the houses.
    </p>
  );
}
