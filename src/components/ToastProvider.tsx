"use client";

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";

interface Toast {
  id: string;
  message: string;
  type: "success" | "info";
}

interface ToastContextValue {
  toast: (message: string, type?: "success" | "info") => void;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, type: "success" | "info" = "success") => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  useEffect(() => {
    if (toasts.length === 0) return;
    const timer = setTimeout(() => {
      setToasts((prev) => prev.slice(1));
    }, 2500);
    return () => clearTimeout(timer);
  }, [toasts]);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="pointer-events-none fixed bottom-6 right-6 z-[100] flex flex-col items-end gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto glass rounded-full px-5 py-2.5 text-[13px] font-medium text-text-primary shadow-[var(--shadow-lg)]"
            style={{
              animation: "toast-in 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94) both",
            }}
          >
            {t.type === "success" && (
              <span className="mr-2 text-[var(--success)]">✓</span>
            )}
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
