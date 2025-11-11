"use client";

import { createContext, useContext, ReactNode, useState } from "react";

type ToastType = "success" | "error" | "info" | "warning";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

const ToastContext = createContext<{
  showToast: (message: string, type?: ToastType) => void;
}>({ showToast: () => {} });

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (message: string, type: ToastType = "info") => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 min-w-[300px] animate-slide-in-right ${
              toast.type === "success"
                ? "bg-green-500/90 text-white"
                : toast.type === "error"
                ? "bg-red-500/90 text-white"
                : toast.type === "warning"
                ? "bg-amber-500/90 text-white"
                : "bg-blue-500/90 text-white"
            }`}
          >
            <span className="text-xl">
              {toast.type === "success"
                ? "✓"
                : toast.type === "error"
                ? "✕"
                : toast.type === "warning"
                ? "⚠"
                : "ℹ"}
            </span>
            <span className="flex-1">{toast.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
