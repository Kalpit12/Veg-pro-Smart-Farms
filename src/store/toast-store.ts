import { create } from "zustand";

export type ToastTone = "default" | "success" | "error";

export type ToastItem = {
  id: string;
  title: string;
  description?: string;
  tone?: ToastTone;
  durationMs?: number;
};

type ToastState = {
  items: ToastItem[];
  push: (toast: Omit<ToastItem, "id">) => void;
  dismiss: (id: string) => void;
  clear: () => void;
};

const DEFAULT_DURATION_MS = 4000;
const ERROR_DURATION_MS = 5000;

export const useToastStore = create<ToastState>((set, get) => ({
  items: [],
  push: (toast) => {
    const id = crypto.randomUUID();
    const item: ToastItem = {
      id,
      ...toast,
      tone: toast.tone ?? "default",
    };

    set((s) => ({
      items: [...s.items, item].slice(-3),
    }));

    const duration =
      toast.durationMs ??
      (toast.tone === "error" ? ERROR_DURATION_MS : DEFAULT_DURATION_MS);

    window.setTimeout(() => {
      if (get().items.some((t) => t.id === id)) {
        get().dismiss(id);
      }
    }, duration);
  },
  dismiss: (id) => set((s) => ({ items: s.items.filter((t) => t.id !== id) })),
  clear: () => set({ items: [] }),
}));

