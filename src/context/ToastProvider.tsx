import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import styles from "./ToastProvider.module.css";

type ToastInput = {
  message: string;
  duration?: number;
  type?: "info" | "success" | "error";
};

type Toast = ToastInput & {
  id: string;
  duration: number;
  type: "info" | "success" | "error";
};

type ToastContextType = {
  setToast: (toast: ToastInput) => void;
};

const ToastContext = createContext<ToastContextType>({} as ToastContextType);

export function ToastProver({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const handleToast = useCallback((next: ToastInput) => {
    const toast: Toast = {
      id: crypto.randomUUID(),
      type: "info",
      duration: 5000,
      ...next,
    };
    setToasts((prev) => [...prev, toast]);
  }, []);

  return (
    <ToastContext value={{ setToast: handleToast }}>
      {children}
      {createPortal(
        <div className={styles.stack} aria-live="polite">
          {toasts.map((toast) => (
            <ToastItem key={toast.id} toast={toast} onDismiss={dismiss} />
          ))}
        </div>,
        document.body,
      )}
    </ToastContext>
  );
}

const ToastItem = ({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: (id: string) => void;
}) => {
  useEffect(() => {
    const id = window.setTimeout(() => {
      onDismiss(toast.id);
    }, toast.duration);
    return () => clearTimeout(id);
  }, [toast.id, toast.duration, onDismiss]);

  return (
    <div
      className={`${styles.toast} ${styles[toast.type]}`}
      role="status"
    >
      {toast.message}
    </div>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useToast = () => useContext(ToastContext);
