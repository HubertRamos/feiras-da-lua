import { Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { PaymentModal } from '../components/payments/PaymentModal';
import { PaymentStatusText } from '../components/ui/StatusText';
import type { EnrichedParticipation } from '../services/fairService';
import type { FairEdition, Payment, PaymentStatus } from '../types/domain';
import { formatCentsToBRL, sumCents } from '../utils/currency';
import { formatDateBR } from '../utils/date';
import { ATTENDANCE_STATUS_LABELS, PAYMENT_METHOD_LABELS } from '../utils/labels';

interface PaymentsPageProps {
  editions: FairEdition[];
  participations: EnrichedParticipation[];
  payments: Payment[];
  loading: boolean;
  onRefresh: () => Promise<void>;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

type PaymentsTab = 'pending' | 'paid' | 'canceled' | 'all' | 'history';

export function PaymentsPage({
  editions,
  participations,
  payments,
  loading,
  onRefresh,
  onSuccess,
  onError,
}: PaymentsPageProps) {
  const [activeTab, setActiveTab] = useState<PaymentsTab>('pending');
  const [editionFilter, setEditionFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [paymentTarget, setPaymentTarget] = useState<EnrichedParticipation | null>(null);

  const participationMap = useMemo(
    () => new Map(participations.map((p) => [p.participation.id, p])),
    [participations]
  );

  const filteredCharges = useMemo(() => {
    if (activeTab === 'history') return [];
    const q = search.trim().toLowerCase();
    return participations.filter((item) => {
      if (activeTab !== 'all' && item.participation.payment_status !== (activeTab as PaymentStatus)) {
        return false;
      }
      if (editionFilter !== 'all' && item.edition.id !== editionFilter) return false;
      if (!q) return true;
      return (
        item.vendor.name.toLowerCase().includes(q) ||
        item.vendor.business_name.toLowerCase().includes(q) ||
        item.edition.name.toLowerCase().includes(q)
      );
    });
  }, [participations, activeTab, editionFilter, search]);

  const filteredHistory = useMemo(() => {
    if (activeTab !== 'history') return [];
    const q = search.trim().toLowerCase();
    return payments
      .map((pay) => ({
        payment: pay,
        enriched: participationMap.get(pay.participation_id) ?? null,
      }))
      .filter((row) => {
        if (!row.enriched) return false;
        if (editionFilter !== 'all' && row.enriched.edition.id !== editionFilter) return false;
        if (!q) return true;
        return (
          row.enriched.vendor.name.toLowerCase().includes(q) ||
          row.enriched.vendor.business_name.toLowerCase().includes(q) ||
          row.enriched.edition.name.toLowerCase().includes(q)
        );
      });
  }, [payments, participationMap, activeTab, editionFilter, search]);

  const totals = useMemo(() => {
    const activeRows = filteredCharges.filter((r) => r.participation.payment_status !== 'canceled');
    return {
      charged: sumCents(activeRows.map((r) => r.participation.charged_amount)),
      paid: sumCents(activeRows.map((r) => r.paidAmount)),
      remaining: sumCents(activeRows.map((r) => r.remainingAmount)),
    };
  }, [filteredCharges]);

  return (
    <div className="space-y-5">
      {/* Abas de controle */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div
          className="inline-flex items-center p-1 bg-slate-200/70 rounded-md self-start overflow-x-auto max-w-full"
          role="tablist"
          aria-label="Situação dos pagamentos"
        >
          {(
            [
              ['pending', 'Pendentes'],
              ['paid', 'Pagos'],
              ['canceled', 'Cancelados'],
              ['all', 'Todas cobranças'],
              ['history', 'Histórico de recebimentos'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={activeTab === id}
              onClick={() => setActiveTab(id)}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                activeTab === id
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="relative">
            <Search
              className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pesquisar feirante ou barraca..."
              aria-label="Pesquisar pagamentos"
              className="w-full sm:w-64 min-h-[40px] pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-600"
            />
          </div>

          <select
            aria-label="Filtrar por edição"
            value={editionFilter}
            onChange={(e) => setEditionFilter(e.target.value)}
            className="min-h-[40px] px-3 py-2 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-600"
          >
            <option value="all">Todas as edições</option>
            {editions.map((ed) => (
              <option key={ed.id} value={ed.id}>
                {ed.name} ({formatDateBR(ed.event_date)})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Resumo da seleção atual */}
      {activeTab !== 'history' && (
        <div className="bg-white border border-slate-200 rounded-lg px-5 py-3.5 flex flex-wrap items-center gap-x-8 gap-y-2 text-sm">
          <div>
            <span className="text-slate-500">Cobranças exibidas: </span>
            <span className="font-mono tabular-nums font-semibold text-slate-900">
              {filteredCharges.length}
            </span>
          </div>
          <div>
            <span className="text-slate-500">Valor cobrado: </span>
            <span className="font-mono tabular-nums font-semibold text-slate-900">
              {formatCentsToBRL(totals.charged)}
            </span>
          </div>
          <div>
            <span className="text-slate-500">Total recebido: </span>
            <span className="font-mono tabular-nums font-semibold text-emerald-700">
              {formatCentsToBRL(totals.paid)}
            </span>
          </div>
          <div>
            <span className="text-slate-500">Total pendente: </span>
            <span className="font-mono tabular-nums font-semibold text-amber-700">
              {formatCentsToBRL(totals.remaining)}
            </span>
          </div>
        </div>
      )}

      {/* Conteúdo */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-10 bg-slate-100 rounded animate-pulse" />
            ))}
          </div>
        ) : activeTab === 'history' ? (
          filteredHistory.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              Nenhum pagamento registrado para os filtros selecionados.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-500">
                    <th className="py-3 px-4">Data do pagamento</th>
                    <th className="py-3 px-4">Feirante / Barraca</th>
                    <th className="py-3 px-4">Edição</th>
                    <th className="py-3 px-4">Forma</th>
                    <th className="py-3 px-4">Observação</th>
                    <th className="py-3 px-4 text-right">Valor recebido</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredHistory.map(({ payment, enriched }) => (
                    <tr key={payment.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono tabular-nums text-slate-700 whitespace-nowrap">
                        {formatDateBR(payment.payment_date)}
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-medium text-slate-900">{enriched?.vendor.name}</p>
                        <p className="text-xs text-slate-500">{enriched?.vendor.business_name}</p>
                      </td>
                      <td className="py-3 px-4 text-slate-700">{enriched?.edition.name}</td>
                      <td className="py-3 px-4 text-slate-700 whitespace-nowrap">
                        {PAYMENT_METHOD_LABELS[payment.payment_method]}
                      </td>
                      <td className="py-3 px-4 text-slate-500 max-w-xs truncate">
                        {payment.notes || '—'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-emerald-700 whitespace-nowrap">
                        {formatCentsToBRL(payment.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : filteredCharges.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            {activeTab === 'pending'
              ? 'Não há cobranças pendentes para os filtros selecionados.'
              : 'Nenhuma cobrança encontrada.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-500">
                  <th className="py-3 px-4">Feirante / Barraca</th>
                  <th className="py-3 px-4">Edição</th>
                  <th className="py-3 px-4">Presença</th>
                  <th className="py-3 px-4 text-right">Cobrado</th>
                  <th className="py-3 px-4 text-right">Pago</th>
                  <th className="py-3 px-4 text-right">Saldo</th>
                  <th className="py-3 px-4">Situação</th>
                  <th className="py-3 px-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredCharges.map((item) => (
                  <tr
                    key={item.participation.id}
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <p className="font-medium text-slate-900">{item.vendor.name}</p>
                      <p className="text-xs text-slate-500">{item.vendor.business_name}</p>
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-slate-900">{item.edition.name}</p>
                      <p className="text-xs font-mono tabular-nums text-slate-500">
                        {formatDateBR(item.edition.event_date)}
                      </p>
                    </td>
                    <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                      {ATTENDANCE_STATUS_LABELS[item.participation.attendance_status]}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-900 whitespace-nowrap">
                      {formatCentsToBRL(item.participation.charged_amount)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-emerald-700 whitespace-nowrap">
                      {formatCentsToBRL(item.paidAmount)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-medium text-amber-700 whitespace-nowrap">
                      {formatCentsToBRL(item.remainingAmount)}
                    </td>
                    <td className="py-3 px-4">
                      <PaymentStatusText status={item.participation.payment_status} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      {item.participation.payment_status === 'pending' ? (
                        <button
                          type="button"
                          onClick={() => setPaymentTarget(item)}
                          className="min-h-[36px] px-3 py-1.5 text-xs font-medium text-white bg-indigo-800 rounded hover:bg-indigo-900 transition-colors whitespace-nowrap"
                        >
                          Registrar pagamento
                        </button>
                      ) : item.participation.payment_status === 'paid' ? (
                        <button
                          type="button"
                          onClick={() => setPaymentTarget(item)}
                          className="min-h-[36px] px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-indigo-800 hover:bg-slate-100 rounded transition-colors whitespace-nowrap"
                        >
                          Ver histórico
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <PaymentModal
        open={Boolean(paymentTarget)}
        item={paymentTarget}
        onClose={() => setPaymentTarget(null)}
        onSaved={async (msg) => {
          onSuccess(msg);
          await onRefresh();
        }}
        onError={onError}
      />
    </div>
  );
}
