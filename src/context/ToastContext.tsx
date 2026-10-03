import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  title?: string;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, title?: string) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

let globalShowToast: ((message: string, type?: ToastType, title?: string) => void) | null = null;

export const toast = {
  success: (msg: string, title?: string) => globalShowToast?.(msg, 'success', title),
  error: (msg: string, title?: string) => globalShowToast?.(msg, 'error', title),
  warning: (msg: string, title?: string) => globalShowToast?.(msg, 'warning', title),
  info: (msg: string, title?: string) => globalShowToast?.(msg, 'info', title),
  show: (msg: string, type: ToastType = 'info', title?: string) => globalShowToast?.(msg, type, title)
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'info', title?: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    setToasts(prev => [...prev.slice(-4), { id, message, type, title }]);
    setTimeout(() => {
      removeToast(id);
    }, 5000);
  }, [removeToast]);

  globalShowToast = showToast;

  const success = useCallback((msg: string, title?: string) => showToast(msg, 'success', title), [showToast]);
  const error = useCallback((msg: string, title?: string) => showToast(msg, 'error', title), [showToast]);
  const warning = useCallback((msg: string, title?: string) => showToast(msg, 'warning', title), [showToast]);
  const info = useCallback((msg: string, title?: string) => showToast(msg, 'info', title), [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, success, error, warning, info }}>
      {children}
      {/* Toast Render Container */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-md w-full pointer-events-none p-2">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl shadow-lg border backdrop-blur-md transition-all animate-in fade-in slide-in-from-bottom-2 ${
              t.type === 'success'
                ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-100'
                : t.type === 'error'
                ? 'bg-rose-950/90 border-rose-500/40 text-rose-100'
                : t.type === 'warning'
                ? 'bg-amber-950/90 border-amber-500/40 text-amber-100'
                : 'bg-slate-900/90 border-slate-700/60 text-slate-100'
            }`}
          >
            <div className="mt-0.5 shrink-0">
              {t.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
              {t.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-400" />}
              {t.type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-400" />}
              {t.type === 'info' && <Info className="w-5 h-5 text-blue-400" />}
            </div>
            <div className="flex-1 text-xs leading-relaxed">
              {t.title && <div className="font-bold mb-0.5 text-[11px] uppercase tracking-wider">{t.title}</div>}
              <div>{t.message}</div>
            </div>
            <button
              onClick={() => removeToast(t.id)}
              className="shrink-0 p-1 hover:bg-white/10 rounded-md transition text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    return {
      showToast: (msg: string, type: ToastType = 'info', title?: string) => toast.show(msg, type, title),
      success: (msg: string, title?: string) => toast.success(msg, title),
      error: (msg: string, title?: string) => toast.error(msg, title),
      warning: (msg: string, title?: string) => toast.warning(msg, title),
      info: (msg: string, title?: string) => toast.info(msg, title)
    };
  }
  return context;
};
