import { AlertCircle, CheckCircle2, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error';
  message: string;
}

interface ToastBannerProps {
  toast: ToastMessage | null;
  onDismiss: () => void;
}

export function ToastBanner({ toast, onDismiss }: ToastBannerProps) {
  if (!toast) return null;

  const isSuccess = toast.type === 'success';

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-5 right-5 z-50 max-w-md flex items-center gap-3 px-4 py-3 rounded-lg border shadow-md transition-opacity duration-150 ${
        isSuccess
          ? 'bg-white border-emerald-200 text-slate-900'
          : 'bg-white border-rose-200 text-slate-900'
      }`}
    >
      {isSuccess ? (
        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" aria-hidden="true" />
      ) : (
        <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" aria-hidden="true" />
      )}
      <p className="text-sm font-medium text-slate-800">{toast.message}</p>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Fechar aviso"
        className="ml-2 p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
