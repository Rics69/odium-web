"use client";

import { AnimatePresence, motion } from "motion/react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { Doodle } from "@/components/doodles/doodle";
import { spring } from "@/components/motion/presets";

type Tone = "neutral" | "success" | "error";
type ToastInput = { title: string; description?: string; tone?: Tone };
type ToastItem = ToastInput & { id: number };

const ToastContext = createContext<(toast: ToastInput) => void>(() => {});

/** Shows a short message at the bottom of the screen. */
export function useToast() {
  return useContext(ToastContext);
}

let nextId = 0;
const VISIBLE_AT_ONCE = 3;
const LIFETIME_MS = 4500;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const show = useCallback((toast: ToastInput) => {
    nextId += 1;
    const item = { ...toast, id: nextId };
    setToasts((list) => [...list, item].slice(-VISIBLE_AT_ONCE));
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((list) => list.filter((toast) => toast.id !== id));
  }, []);

  return (
    <ToastContext value={show}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 p-4 md:items-end md:p-6">
        <AnimatePresence initial={false}>
          {toasts.map((toast) => (
            <Toast key={toast.id} toast={toast} onDismiss={dismiss} />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext>
  );
}

function ToneIcon({ tone }: { tone: Tone }) {
  if (tone === "success") {
    return (
      <Doodle
        name="check"
        className="mt-0.5 size-5 shrink-0 text-add-soft"
        strokeWidth={2.5}
      />
    );
  }
  if (tone === "error") {
    return (
      <svg
        viewBox="0 0 20 20"
        aria-hidden
        className="mt-0.5 size-5 shrink-0 text-remove-soft"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.5}
        strokeLinecap="round"
      >
        <path d="M10 4v7M10 15.5v.5" />
      </svg>
    );
  }
  return (
    <Doodle name="sparkle" className="mt-0.5 size-5 shrink-0 text-paper" />
  );
}

function Toast({
  toast,
  onDismiss,
}: {
  toast: ToastItem;
  onDismiss: (id: number) => void;
}) {
  const tone = toast.tone ?? "neutral";

  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), LIFETIME_MS);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  return (
    <motion.div
      layout
      role={tone === "error" ? "alert" : "status"}
      initial={{ opacity: 0, y: 24, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
      transition={spring.bouncy}
      onClick={() => onDismiss(toast.id)}
      className="pointer-events-auto flex w-full max-w-sm cursor-pointer items-start gap-3 rounded-md bg-ink px-4 py-3 text-paper shadow-md"
    >
      <ToneIcon tone={tone} />
      <div className="flex flex-col gap-1">
        <p className="font-medium">{toast.title}</p>
        {toast.description && (
          <p className="text-sm text-paper/75">{toast.description}</p>
        )}
      </div>
    </motion.div>
  );
}
