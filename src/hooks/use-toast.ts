"use client";

import { useToastStore } from "@/store/toast-store";

export function useToast() {
  const push = useToastStore((s) => s.push);
  return { toast: push };
}

