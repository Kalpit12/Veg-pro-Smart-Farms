"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useToastStore } from "@/store/toast-store";
import { cn } from "@/lib/utils";

export function Toaster() {
  const items = useToastStore((s) => s.items);
  const dismiss = useToastStore((s) => s.dismiss);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-50 flex justify-center px-3 pt-[env(safe-area-inset-top,0px)]">
      <div className="w-full max-w-md space-y-2">
        <AnimatePresence initial={false}>
          {items.map((t) => (
            <motion.button
              key={t.id}
              type="button"
              className={cn(
                "glass-card pointer-events-auto w-full rounded-2xl p-4 text-left",
                t.tone === "success" && "border-emerald-400/30",
                t.tone === "error" && "border-rose-400/30",
              )}
              initial={{ opacity: 0, y: -10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.98 }}
              onClick={() => dismiss(t.id)}
            >
              <p className="text-sm font-semibold">{t.title}</p>
              {t.description ? (
                <p className="mt-1 text-xs text-muted-foreground">{t.description}</p>
              ) : null}
            </motion.button>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

