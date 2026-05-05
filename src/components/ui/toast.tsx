"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { AnimatePresence, motion } from "framer-motion";

type ToastTone = "success" | "warning" | "critical" | "info";

type Toast = {
  id: string;
  tone: ToastTone;
  title: string;
  body?: string;
  durationMs: number;
};

type ToastInput = Omit<Toast, "id" | "durationMs"> & { durationMs?: number };

type ToastCtx = {
  push: (t: ToastInput) => void;
};

const Ctx = createContext<ToastCtx | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((t: ToastInput) => {
    const id = `t_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const toast: Toast = { id, durationMs: 4000, ...t };
    setToasts((prev) => [...prev, toast]);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <Ctx.Provider value={{ push }}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="fixed bottom-4 right-4 z-[60] flex flex-col gap-2 w-[min(380px,calc(100vw-2rem))]"
      >
        <AnimatePresence>
          {toasts.map((t) => (
            <ToastItem key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
          ))}
        </AnimatePresence>
      </div>
    </Ctx.Provider>
  );
}

const TONE_CLASSES: Record<ToastTone, string> = {
  success:
    "border-[color:var(--color-success-border)] bg-[color:var(--color-success-soft)] text-[color:var(--color-fg)]",
  warning:
    "border-[color:var(--color-warning-border)] bg-[color:var(--color-warning-soft)] text-[color:var(--color-fg)]",
  critical:
    "border-[color:var(--color-critical-border)] bg-[color:var(--color-critical-soft)] text-[color:var(--color-fg)]",
  info: "border-[color:var(--color-border)] bg-[color:var(--color-bg)] text-[color:var(--color-fg)]",
};

const TONE_KICKERS: Record<ToastTone, string> = {
  success: "Erledigt",
  warning: "Hinweis",
  critical: "Fehler",
  info: "Info",
};

const TONE_KICKER_COLORS: Record<ToastTone, string> = {
  success: "text-[color:var(--color-success)]",
  warning: "text-[color:var(--color-warning)]",
  critical: "text-[color:var(--color-critical)]",
  info: "text-[color:var(--color-fg-muted)]",
};

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, toast.durationMs);
    return () => clearTimeout(timer);
  }, [toast.durationMs, onDismiss]);

  return (
    <motion.div
      role="status"
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.98 }}
      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
      className={`border rounded-md px-4 py-3 shadow-lg ${TONE_CLASSES[toast.tone]}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p
            className={`font-mono text-[10px] uppercase tracking-[0.22em] ${TONE_KICKER_COLORS[toast.tone]}`}
          >
            {TONE_KICKERS[toast.tone]}
          </p>
          <p className="mt-1 text-sm font-medium leading-snug">{toast.title}</p>
          {toast.body ? (
            <p className="mt-1 text-xs text-[color:var(--color-fg-muted)] leading-relaxed">
              {toast.body}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Hinweis schließen"
          className="text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)] text-sm shrink-0"
        >
          ✕
        </button>
      </div>
    </motion.div>
  );
}

export function useToast(): ToastCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
