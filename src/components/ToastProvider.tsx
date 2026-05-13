import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { ToastContext } from '../hooks/useToast';
import { IconButton } from '../ui';

type ToastTone = 'success' | 'error' | 'info';

type ToastItem = {
  id: number;
  message: string;
  tone: ToastTone;
  isClosing: boolean;
};

const TOAST_DURATION_MS = 4000;
const TOAST_EXIT_ANIMATION_MS = 300;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextToastId = useRef(1);

  const removeToast = useCallback((id: number) => {
    setToasts((currentToasts) =>
      currentToasts.map((toast) => (toast.id === id ? { ...toast, isClosing: true } : toast))
    );

    window.setTimeout(() => {
      setToasts((currentToasts) => currentToasts.filter((toast) => toast.id !== id));
    }, TOAST_EXIT_ANIMATION_MS);
  }, []);

  const notify = useCallback((message: string, tone: ToastTone = 'success') => {
    const id = nextToastId.current++;

    setToasts((currentToasts) => [...currentToasts, { id, message, tone, isClosing: false }]);

    window.setTimeout(() => {
      removeToast(id);
    }, TOAST_DURATION_MS);
  }, [removeToast]);

  const value = useMemo(() => ({ notify }), [notify]);

  const getIcon = (tone: ToastTone) => {
    switch (tone) {
      case 'success': return <CheckCircle2 size={18} className="app-toast__icon" />;
      case 'error': return <AlertCircle size={18} className="app-toast__icon" />;
      case 'info': return <Info size={18} className="app-toast__icon" />;
    }
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="app-toast-stack" aria-live="polite" aria-atomic="true">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`app-toast app-toast--${toast.tone}${toast.isClosing ? ' app-toast--closing' : ''}`}
          >
            <div className="app-toast__content">
              {getIcon(toast.tone)}
              <div className="app-toast__message">{toast.message}</div>
              <IconButton
                className="app-toast__close"
                variant="ghost"
                size="sm"
                icon={<X size={14} />}
                label="Close notification"
                onClick={() => removeToast(toast.id)}
              />
            </div>
            <div className="app-toast__progress">
              <div 
                className="app-toast__progress-bar" 
                style={{ animationDuration: `${TOAST_DURATION_MS}ms` }}
              />
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
