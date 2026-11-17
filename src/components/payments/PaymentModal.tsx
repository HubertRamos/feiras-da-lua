import { useEffect, useState, type FormEvent } from 'react';
import { fairService, type EnrichedParticipation } from '../../services/fairService';
import type { PaymentMethod } from '../../types/domain';
import {
  formatCentsToBRL,
  formatCentsToInput,
  parseCurrencyInputToCents,
} from '../../utils/currency';
import { formatDateBR, getTodayISODate } from '../../utils/date';
import { PAYMENT_METHOD_LABELS } from '../../utils/labels';
import { Modal } from '../ui/Modal';

interface PaymentModalProps {
  open: boolean;
  item: EnrichedParticipation | null;
  onClose: () => void;
  onSaved: (message: string) => Promise<void> | void;
  onError: (message: string) => void;
}

export function PaymentModal({
  open,
  item,
  onClose,
  onSaved,
  onError,
}: PaymentModalProps) {
  const [amountInput, setAmountInput] = useState('');
  const [paymentDate, setPaymentDate] = useState(getTodayISODate());
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && item) {
      const initialCents =
        item.remainingAmount > 0 ? item.remainingAmount : item.participation.charged_amount;
      setAmountInput(formatCentsToInput(initialCents));
      setPaymentDate(getTodayISODate());
      setPaymentMethod('pix');
      setNotes('');
    }
  }, [open, item]);

  if (!item) return null;

  const parsedCents = parseCurrencyInputToCents(amountInput);
  const exceedsRemaining = parsedCents !== null && parsedCents > item.remainingAmount;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (parsedCents === null || parsedCents <= 0) {
      onError('Informe um valor recebido válido maior que zero.');
      return;
    }
    if (!paymentDate) {
      onError('Informe a data do pagamento.');
      return;
    }
    if (exceedsRemaining && !notes.trim()) {
      onError(
        'O valor informado ultrapassa o saldo devido. Informe uma justificativa explícita nas observações.'
      );
      return;
    }

    setSaving(true);
    try {
      await fairService.registerPayment({
        participation_id: item.participation.id,
        amount: parsedCents,
        payment_date: paymentDate,
        payment_method: paymentMethod,
        notes: notes.trim(),
      });
      await onSaved('Pagamento registrado com sucesso.');
      onClose();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Erro ao registrar pagamento.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Registrar pagamento"
      subtitle={`${item.vendor.name} · ${item.vendor.business_name}`}
    >
      <div className="space-y-5">
        <div className="grid grid-cols-3 gap-4 py-3 border-y border-slate-200 text-sm">
          <div>
            <p className="text-xs text-slate-500">Valor cobrado</p>
            <p className="mt-0.5 font-mono tabular-nums font-medium text-slate-900">
              {formatCentsToBRL(item.participation.charged_amount)}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Já pago</p>
            <p className="mt-0.5 font-mono tabular-nums font-medium text-emerald-700">
              {formatCentsToBRL(item.paidAmount)}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Saldo pendente</p>
            <p className="mt-0.5 font-mono tabular-nums font-semibold text-amber-700">
              {formatCentsToBRL(item.remainingAmount)}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="payment-amount"
                className="block text-sm font-medium text-slate-700 mb-1"
              >
                Valor recebido (R$) *
              </label>
              <input
                id="payment-amount"
                type="text"
                inputMode="decimal"
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                placeholder="30,00"
                required
                className="w-full min-h-[40px] px-3 py-2 text-sm font-mono tabular-nums bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600"
              />
            </div>

            <div>
              <label
                htmlFor="payment-date"
                className="block text-sm font-medium text-slate-700 mb-1"
              >
                Data do pagamento *
              </label>
              <input
                id="payment-date"
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                required
                className="w-full min-h-[40px] px-3 py-2 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="payment-method"
              className="block text-sm font-medium text-slate-700 mb-1"
            >
              Forma de pagamento *
            </label>
            <select
              id="payment-method"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
              className="w-full min-h-[40px] px-3 py-2 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600"
            >
              <option value="pix">PIX</option>
              <option value="cash">Dinheiro</option>
              <option value="other">Outro</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="payment-notes"
              className="block text-sm font-medium text-slate-700 mb-1"
            >
              {exceedsRemaining
                ? 'Justificativa (obrigatória para valor acima do devido) *'
                : 'Observação opcional'}
            </label>
            <textarea
              id="payment-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              required={exceedsRemaining}
              placeholder={
                exceedsRemaining
                  ? 'Explique o motivo do recebimento acima do saldo devido...'
                  : 'Ex: Comprovante enviado no grupo, troco entregue...'
              }
              className={`w-full px-3 py-2 text-sm bg-white border rounded-md focus:outline-none focus:ring-2 ${
                exceedsRemaining
                  ? 'border-amber-500 focus:ring-amber-500 focus:border-amber-500'
                  : 'border-slate-300 focus:ring-indigo-600 focus:border-indigo-600'
              }`}
            />
            {exceedsRemaining && (
              <p className="mt-1 text-xs text-amber-700">
                O valor digitado excede o saldo pendente de{' '}
                {formatCentsToBRL(item.remainingAmount)}.
              </p>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="min-h-[40px] px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors whitespace-nowrap"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="min-h-[40px] px-4 py-2 text-sm font-medium text-white bg-indigo-800 rounded-md hover:bg-indigo-900 transition-colors whitespace-nowrap disabled:opacity-50"
            >
              {saving ? 'Salvando...' : 'Confirmar pagamento'}
            </button>
          </div>
        </form>

        {item.payments.length > 0 && (
          <div className="pt-4 border-t border-slate-200">
            <h3 className="text-xs font-semibold text-slate-500 mb-2">
              Histórico desta cobrança
            </h3>
            <ul className="divide-y divide-slate-100 text-sm">
              {item.payments.map((pay) => (
                <li key={pay.id} className="py-2 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-slate-800">
                      {PAYMENT_METHOD_LABELS[pay.payment_method]} · {formatDateBR(pay.payment_date)}
                    </p>
                    {pay.notes && <p className="text-xs text-slate-500 truncate">{pay.notes}</p>}
                  </div>
                  <span className="font-mono tabular-nums font-medium text-emerald-700 shrink-0">
                    {formatCentsToBRL(pay.amount)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Modal>
  );
}
