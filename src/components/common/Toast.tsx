import React, { createContext, useContext, useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { lokalkanPesan } from "../../utils/pesanError";

export interface ToastItem {
  id: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  duration?: number;
}

interface ToastContextType {
  showToast: (message: string, actionLabel?: string, onAction?: () => void) => void;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType>({
  showToast: () => {},
  dismissToast: () => {}
});

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timersRef = useRef<Map<string, any>>(new Map());

  const dismissToast = useCallback((id: string) => {
    const timer = timersRef.current.get(id);
    if (timer) clearTimeout(timer);
    timersRef.current.delete(id);
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, actionLabel?: string, onAction?: () => void) => {
      const id = "toast-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6);
      const newToast: ToastItem = {
        id,
        message: lokalkanPesan(message),
        actionLabel,
        onAction,
        duration: 6000
      };

      setToasts((prev) => [...prev, newToast]);

      const timer = setTimeout(() => {
        dismissToast(id);
      }, 6000);
      timersRef.current.set(id, timer);
    },
    [dismissToast]
  );

  return (
    <ToastContext.Provider value={{ showToast, dismissToast }}>
      {children}
      {/* Toast di body (bukan di #root): tetap terlihat dan terbaca saat lembar terbuka (halaman di belakangnya inert).
          Bawah-tengah di HP, kanan-bawah di desktop. */}
      {createPortal(
      <div
        className="fixed z-[70] pointer-events-none bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-6 flex flex-col items-center md:items-end gap-2"
        aria-live="polite"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            className="pointer-events-auto bg-surface text-text border border-border px-4 py-3 rounded-control text-[14px] flex items-center justify-between gap-4 max-w-sm w-full transition-all duration-150 ease-out"
            style={{ boxShadow: "var(--shadow-popover)" }}
          >
            <span className="leading-snug">{toast.message}</span>
            {toast.actionLabel && toast.onAction && (
              <button
                type="button"
                onClick={() => {
                  toast.onAction?.();
                  dismissToast(toast.id);
                }}
                className="text-primary hover:text-primary-hover font-medium underline underline-offset-2 shrink-0 cursor-pointer min-h-[44px] flex items-center"
              >
                {toast.actionLabel}
              </button>
            )}
          </div>
        ))}
      </div>,
      document.body
      )}
    </ToastContext.Provider>
  );
};

export const useToast = () => useContext(ToastContext);
