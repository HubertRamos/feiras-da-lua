import { AlertTriangle } from 'lucide-react';
import { Modal } from './Modal';

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'danger' | 'primary';
  busy?: boolean;
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  tone = 'danger',
  busy = false,
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onClose} title={title} maxWidthClass="max-w-md">
      <div className="space-y-5">
        <div className="flex items-start gap-3 text-sm text-slate-600 leading-relaxed">
          <AlertTriangle
            className={`w-5 h-5 shrink-0 mt-0.5 ${
              tone === 'danger' ? 'text-rose-600' : 'text-amber-600'
            }`}
            aria-hidden="true"
          />
          <p>{description}</p>
        </div>
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="min-h-[40px] px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={`min-h-[40px] px-4 py-2 text-sm font-medium text-white rounded-md transition-colors whitespace-nowrap shrink-0 disabled:opacity-50 ${
              tone === 'danger'
                ? 'bg-rose-700 hover:bg-rose-800'
                : 'bg-indigo-800 hover:bg-indigo-900'
            }`}
          >
            {busy ? 'Processando...' : confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
