import { Download, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  AttendanceStatusText,
  EditionStatusText,
  PaymentStatusText,
} from '../components/ui/StatusText';
import type { EditionSummary, EnrichedParticipation } from '../services/fairService';
import type { FairEdition, Payment } from '../types/domain';
import { downloadCsv } from '../utils/csv';
import { formatCentsToBRL } from '../utils/currency';
import { formatDateBR } from '../utils/date';
import {
  ATTENDANCE_STATUS_LABELS,
  EDITION_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
} from '../utils/labels';

interface ReportsPageProps {
  editions: FairEdition[];
  editionSummaries: EditionSummary[];
  participations: EnrichedParticipation[];
  payments: Payment[];
  loading: boolean;
  onSuccess: (message: string) => void;
}

type ReportType = 'payments_history' | 'pending_vendors' | 'edition_revenue' | 'attendance_history';

export function ReportsPage({
  editions,
  editionSummaries,
  participations,
  payments,
  loading,
  onSuccess,
}: ReportsPageProps) {
  const [reportType, setReportType] = useState<ReportType>('payments_history');
  const [editionFilter, setEditionFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  const participationMap = useMemo(
    () => new Map(participations.map((p) => [p.participation.id, p])),
    [participations]
  );

  const paymentRows = useMemo(() => {
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
          row.enriched.vendor.business_name.toLowerCase().includes(q)
        );
      });
  }, [payments, participationMap, editionFilter, search]);

  const pendingRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return participations.filter((item) => {
      if (item.participation.payment_status !== 'pending') return false;
      if (editionFilter !== 'all' && item.edition.id !== editionFilter) return false;
      if (!q) return true;
      return (
        item.vendor.name.toLowerCase().includes(q) ||
        item.vendor.business_name.toLowerCase().includes(q)
      );
    });
  }, [participations, editionFilter, search]);

  const revenueRows = useMemo(() => {
    return editionSummaries.filter((s) =>
      editionFilter === 'all' ? true : s.edition.id === editionFilter
    );
  }, [editionSummaries, editionFilter]);

  const attendanceRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return participations.filter((item) => {
      if (editionFilter !== 'all' && item.edition.id !== editionFilter) return false;
      if (!q) return true;
      return (
        item.vendor.name.toLowerCase().includes(q) ||
        item.vendor.business_name.toLowerCase().includes(q)
      );
    });
  }, [participations, editionFilter, search]);

  const handleExportCsv = () => {
    const dateStamp = new Date().toISOString().slice(0, 10);

    if (reportType === 'payments_history') {
      downloadCsv(
        `feira-da-lua-historico-pagamentos-${dateStamp}.csv`,
        ['Data Pagamento', 'Feirante', 'Barraca', 'Edição', 'Data Edição', 'Forma', 'Valor', 'Observação'],
        paymentRows.map(({ payment, enriched }) => [
          formatDateBR(payment.payment_date),
          enriched?.vendor.name ?? '',
          enriched?.vendor.business_name ?? '',
          enriched?.edition.name ?? '',
          enriched ? formatDateBR(enriched.edition.event_date) : '',
          PAYMENT_METHOD_LABELS[payment.payment_method],
          formatCentsToBRL(payment.amount),
          payment.notes,
        ])
      );
    } else if (reportType === 'pending_vendors') {
      downloadCsv(
        `feira-da-lua-pagamentos-pendentes-${dateStamp}.csv`,
        ['Feirante', 'Barraca', 'Telefone', 'Edição', 'Data Edição', 'Presença', 'Cobrado', 'Pago', 'Saldo Pendente'],
        pendingRows.map((item) => [
          item.vendor.name,
          item.vendor.business_name,
          item.vendor.phone,
          item.edition.name,
          formatDateBR(item.edition.event_date),
          ATTENDANCE_STATUS_LABELS[item.participation.attendance_status],
          formatCentsToBRL(item.participation.charged_amount),
          formatCentsToBRL(item.paidAmount),
          formatCentsToBRL(item.remainingAmount),
        ])
      );
    } else if (reportType === 'edition_revenue') {
      downloadCsv(
        `feira-da-lua-arrecadacao-por-edicao-${dateStamp}.csv`,
        ['Edição', 'Data', 'Status', 'Taxa Padrão', 'Participantes', 'Previsto', 'Recebido', 'Pendente'],
        revenueRows.map((s) => [
          s.edition.name,
          formatDateBR(s.edition.event_date),
          EDITION_STATUS_LABELS[s.edition.status],
          formatCentsToBRL(s.edition.participation_fee),
          s.participantsCount,
          formatCentsToBRL(s.expectedAmount),
          formatCentsToBRL(s.receivedAmount),
          formatCentsToBRL(s.pendingAmount),
        ])
      );
    } else {
      downloadCsv(
        `feira-da-lua-historico-presenca-${dateStamp}.csv`,
        ['Feirante', 'Barraca', 'Edição', 'Data Edição', 'Presença', 'Situação Pagamento'],
        attendanceRows.map((item) => [
          item.vendor.name,
          item.vendor.business_name,
          item.edition.name,
          formatDateBR(item.edition.event_date),
          ATTENDANCE_STATUS_LABELS[item.participation.attendance_status],
          PAYMENT_STATUS_LABELS[item.participation.payment_status],
        ])
      );
    }

    onSuccess('Arquivo CSV exportado.');
  };

  return (
    <div className="space-y-5">
      {/* Seleção de relatório + Exportação */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div
          className="inline-flex items-center p-1 bg-slate-200/70 rounded-md self-start overflow-x-auto max-w-full"
          role="tablist"
          aria-label="Tipo de relatório"
        >
          {(
            [
              ['payments_history', 'Histórico de pagamentos'],
              ['pending_vendors', 'Pagamentos pendentes'],
              ['edition_revenue', 'Arrecadação por edição'],
              ['attendance_history', 'Histórico de presença'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={reportType === id}
              onClick={() => setReportType(id)}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                reportType === id
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={handleExportCsv}
          className="min-h-[40px] inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
        >
          <Download className="w-4 h-4" aria-hidden="true" />
          Exportar CSV
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        {reportType !== 'edition_revenue' && (
          <div className="relative flex-1 max-w-md">
            <Search
              className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pesquisar por nome do feirante ou barraca..."
              aria-label="Pesquisar no relatório"
              className="w-full min-h-[40px] pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-600"
            />
          </div>
        )}

        <select
          aria-label="Filtrar relatório por edição"
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

      {/* Tabela do Relatório */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-10 bg-slate-100 rounded animate-pulse" />
            ))}
          </div>
        ) : reportType === 'payments_history' ? (
          paymentRows.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              Nenhum pagamento registrado para os filtros aplicados.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-500">
                    <th className="py-3 px-4">Data</th>
                    <th className="py-3 px-4">Feirante / Barraca</th>
                    <th className="py-3 px-4">Edição</th>
                    <th className="py-3 px-4">Forma</th>
                    <th className="py-3 px-4">Observação</th>
                    <th className="py-3 px-4 text-right">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {paymentRows.map(({ payment, enriched }) => (
                    <tr key={payment.id} className="hover:bg-slate-50/80">
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
        ) : reportType === 'pending_vendors' ? (
          pendingRows.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              Nenhum feirante com pagamento pendente para os filtros aplicados.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-500">
                    <th className="py-3 px-4">Feirante / Barraca</th>
                    <th className="py-3 px-4">Telefone</th>
                    <th className="py-3 px-4">Edição</th>
                    <th className="py-3 px-4">Presença</th>
                    <th className="py-3 px-4 text-right">Cobrado</th>
                    <th className="py-3 px-4 text-right">Pendente</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {pendingRows.map((item) => (
                    <tr key={item.participation.id} className="hover:bg-slate-50/80">
                      <td className="py-3 px-4">
                        <p className="font-medium text-slate-900">{item.vendor.name}</p>
                        <p className="text-xs text-slate-500">{item.vendor.business_name}</p>
                      </td>
                      <td className="py-3 px-4 font-mono tabular-nums text-slate-600 whitespace-nowrap">
                        {item.vendor.phone || '—'}
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-slate-900">{item.edition.name}</p>
                        <p className="text-xs font-mono tabular-nums text-slate-500">
                          {formatDateBR(item.edition.event_date)}
                        </p>
                      </td>
                      <td className="py-3 px-4">
                        <AttendanceStatusText status={item.participation.attendance_status} />
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700 whitespace-nowrap">
                        {formatCentsToBRL(item.participation.charged_amount)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-amber-700 whitespace-nowrap">
                        {formatCentsToBRL(item.remainingAmount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : reportType === 'edition_revenue' ? (
          revenueRows.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              Nenhuma edição cadastrada para exibir arrecadação.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-500">
                    <th className="py-3 px-4">Edição</th>
                    <th className="py-3 px-4">Data</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Participantes</th>
                    <th className="py-3 px-4 text-right">Previsto</th>
                    <th className="py-3 px-4 text-right">Recebido</th>
                    <th className="py-3 px-4 text-right">Pendente</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {revenueRows.map((s) => (
                    <tr key={s.edition.id} className="hover:bg-slate-50/80">
                      <td className="py-3 px-4 font-medium text-slate-900">{s.edition.name}</td>
                      <td className="py-3 px-4 font-mono tabular-nums text-slate-600 whitespace-nowrap">
                        {formatDateBR(s.edition.event_date)}
                      </td>
                      <td className="py-3 px-4">
                        <EditionStatusText status={s.edition.status} />
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700">
                        {s.participantsCount}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-900 whitespace-nowrap">
                        {formatCentsToBRL(s.expectedAmount)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums font-medium text-emerald-700 whitespace-nowrap">
                        {formatCentsToBRL(s.receivedAmount)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums font-medium text-amber-700 whitespace-nowrap">
                        {formatCentsToBRL(s.pendingAmount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : attendanceRows.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            Nenhum registro de presença para os filtros aplicados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-500">
                  <th className="py-3 px-4">Feirante / Barraca</th>
                  <th className="py-3 px-4">Edição</th>
                  <th className="py-3 px-4">Data</th>
                  <th className="py-3 px-4">Presença</th>
                  <th className="py-3 px-4">Pagamento</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {attendanceRows.map((item) => (
                  <tr key={item.participation.id} className="hover:bg-slate-50/80">
                    <td className="py-3 px-4">
                      <p className="font-medium text-slate-900">{item.vendor.name}</p>
                      <p className="text-xs text-slate-500">{item.vendor.business_name}</p>
                    </td>
                    <td className="py-3 px-4 text-slate-900">{item.edition.name}</td>
                    <td className="py-3 px-4 font-mono tabular-nums text-slate-600 whitespace-nowrap">
                      {formatDateBR(item.edition.event_date)}
                    </td>
                    <td className="py-3 px-4">
                      <AttendanceStatusText status={item.participation.attendance_status} />
                    </td>
                    <td className="py-3 px-4">
                      <PaymentStatusText status={item.participation.payment_status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
