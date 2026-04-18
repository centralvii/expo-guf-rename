import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { ToastContext } from '../hooks/useToast';

type ToastTone = 'success' | 'error' | 'info';

type ToastItem = {
  id: number;
  message: string;
  tone: ToastTone;
  isClosing: boolean;
};

const TOAST_DURATION_MS = 2400;
const TOAST_EXIT_ANIMATION_MS = 300;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextToastId = useRef(1);

  const notify = useCallback((message: string, tone: ToastTone = 'success') => {
    const id = nextToastId.current++;

    setToasts((currentToasts) => [...currentToasts, { id, message, tone, isClosing: false }]);

    window.setTimeout(() => {
      setToasts((currentToasts) =>
        currentToasts.map((toast) => (toast.id === id ? { ...toast, isClosing: true } : toast))
      );

      // Wait for exit animation to complete before removing from state
      window.setTimeout(() => {
        setToasts((currentToasts) => currentToasts.filter((toast) => toast.id !== id));
      }, TOAST_EXIT_ANIMATION_MS);
    }, TOAST_DURATION_MS);
  }, []);

  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="app-toast-stack" aria-live="polite" aria-atomic="true">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`app-toast app-toast--${toast.tone}${toast.isClosing ? ' app-toast--closing' : ''}`}
          >
            <div className="app-toast__message">{toast.message}</div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
