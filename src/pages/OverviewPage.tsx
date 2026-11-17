import { ArrowRight, CalendarDays, Plus, Users } from 'lucide-react';
import type { NavSection } from '../components/layout/SidebarLayout';
import { EditionStatusText } from '../components/ui/StatusText';
import type { DashboardSummary } from '../services/fairService';
import { formatCentsToBRL } from '../utils/currency';
import { formatDateBR } from '../utils/date';
import { PAYMENT_METHOD_LABELS } from '../utils/labels';

interface OverviewPageProps {
  summary: DashboardSummary | null;
  loading: boolean;
  onNavigate: (section: NavSection) => void;
  onOpenEdition: (editionId: string) => void;
}

export function OverviewPage({
  summary,
  loading,
  onNavigate,
  onOpenEdition,
}: OverviewPageProps) {
  if (loading || !summary) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div
              key={n}
              className="h-24 bg-white border border-slate-200 rounded-lg animate-pulse"
            />
          ))}
        </div>
        <div className="h-56 bg-white border border-slate-200 rounded-lg animate-pulse" />
      </div>
    );
  }

  const hasAnyData =
    summary.totalVendorsCount > 0 ||
    summary.recentEditions.length > 0 ||
    summary.recentPayments.length > 0;

  if (!hasAnyData) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-8 sm:p-10">
        <div className="max-w-xl">
          <h2 className="text-lg font-semibold text-slate-900">
            Comece a organizar a Feira da Lua
          </h2>
          <p className="mt-2 text-sm text-slate-600 leading-relaxed">
            O banco de dados local está pronto para uso, mas ainda não há feirantes ou edições
            cadastradas. Siga os passos abaixo para iniciar a administração:
          </p>

          <ol className="mt-6 space-y-3 text-sm text-slate-700">
            <li className="flex items-start gap-3">
              <span className="font-mono text-xs font-semibold text-indigo-800 pt-0.5">01.</span>
              <span>Cadastre os feirantes ativos com o nome do responsável e da barraca.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="font-mono text-xs font-semibold text-indigo-800 pt-0.5">02.</span>
              <span>Crie a próxima edição da feira definindo a data e o valor da taxa.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="font-mono text-xs font-semibold text-indigo-800 pt-0.5">03.</span>
              <span>Vincule os feirantes participantes e acompanhe os pagamentos.</span>
            </li>
          </ol>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => onNavigate('vendors')}
              className="min-h-[40px] inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-800 rounded-md hover:bg-indigo-900 transition-colors whitespace-nowrap"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              Cadastrar primeiro feirante
            </button>
            <button
              type="button"
              onClick={() => onNavigate('editions')}
              className="min-h-[40px] inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors whitespace-nowrap"
            >
              <CalendarDays className="w-4 h-4" aria-hidden="true" />
              Criar primeira edição
            </button>
          </div>
        </div>
      </div>
    );
  }

  const nextEd = summary.nextEditionSummary;

  return (
    <div className="space-y-6">
      {/* Grade de Indicadores Reais */}
      <section aria-label="Indicadores principais">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-white border border-slate-200 rounded-lg p-5">
            <p className="text-xs font-medium text-slate-500">Feirantes ativos</p>
            <p className="mt-2 text-2xl font-semibold font-mono tabular-nums text-slate-900">
              {summary.activeVendorsCount}
            </p>
            <p className="mt-1 text-xs text-slate-500 tabular-nums">
              {summary.totalVendorsCount} cadastrados no total
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-5">
            <p className="text-xs font-medium text-slate-500">Próxima edição</p>
            <p className="mt-2 text-base font-semibold text-slate-900 truncate">
              {nextEd ? nextEd.edition.name : 'Nenhuma edição planejada'}
            </p>
            <p className="mt-1 text-xs text-slate-500 font-mono tabular-nums">
              {nextEd
                ? `${formatDateBR(nextEd.edition.event_date)} · Taxa ${formatCentsToBRL(
                    nextEd.edition.participation_fee
                  )}`
                : 'Crie uma edição em Edições da feira'}
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-5">
            <p className="text-xs font-medium text-slate-500">Participantes da próxima edição</p>
            <p className="mt-2 text-2xl font-semibold font-mono tabular-nums text-slate-900">
              {nextEd ? nextEd.participantsCount : 0}
            </p>
            <p className="mt-1 text-xs text-slate-500 tabular-nums">
              {nextEd
                ? `${nextEd.paidCount} pagos · ${nextEd.pendingCount} pendentes`
                : 'Sem participantes vinculados'}
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-5">
            <p className="text-xs font-medium text-slate-500">Total previsto de arrecadação</p>
            <p className="mt-2 text-2xl font-semibold font-mono tabular-nums text-slate-900">
              {formatCentsToBRL(summary.totalExpected)}
            </p>
            <p className="mt-1 text-xs text-slate-500">Soma das cobranças ativas</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-5">
            <p className="text-xs font-medium text-slate-500">Total efetivamente recebido</p>
            <p className="mt-2 text-2xl font-semibold font-mono tabular-nums text-emerald-700">
              {formatCentsToBRL(summary.totalReceived)}
            </p>
            <p className="mt-1 text-xs text-slate-500">Pagamentos registrados</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-5">
            <p className="text-xs font-medium text-slate-500">Total pendente de recebimento</p>
            <p className="mt-2 text-2xl font-semibold font-mono tabular-nums text-amber-700">
              {formatCentsToBRL(summary.totalPending)}
            </p>
            <p className="mt-1 text-xs text-slate-500">Aguardando quitação</p>
          </div>
        </div>
      </section>

      {/* Próxima Edição */}
      <section className="bg-white border border-slate-200 rounded-lg">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-6 py-4 border-b border-slate-200">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Próxima edição</h2>
            <p className="text-xs text-slate-500">
              Resumo financeiro e de participação da próxima edição planejada
            </p>
          </div>
          {nextEd && (
            <button
              type="button"
              onClick={() => onOpenEdition(nextEd.edition.id)}
              className="min-h-[40px] inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-indigo-800 bg-slate-50 border border-slate-200 rounded-md hover:bg-slate-100 transition-colors whitespace-nowrap shrink-0"
            >
              Gerenciar participantes
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>
          )}
        </div>

        {nextEd ? (
          <div className="p-6">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600 mb-5">
              <span className="font-semibold text-slate-900">{nextEd.edition.name}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">
                Data: {formatDateBR(nextEd.edition.event_date)}
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">
                Taxa: {formatCentsToBRL(nextEd.edition.participation_fee)}
              </span>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 pt-4 border-t border-slate-100">
              <div>
                <p className="text-xs text-slate-500">Participantes</p>
                <p className="mt-1 text-lg font-semibold font-mono tabular-nums text-slate-900">
                  {nextEd.participantsCount}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Total previsto</p>
                <p className="mt-1 text-lg font-semibold font-mono tabular-nums text-slate-900">
                  {formatCentsToBRL(nextEd.expectedAmount)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Total recebido</p>
                <p className="mt-1 text-lg font-semibold font-mono tabular-nums text-emerald-700">
                  {formatCentsToBRL(nextEd.receivedAmount)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Total pendente</p>
                <p className="mt-1 text-lg font-semibold font-mono tabular-nums text-amber-700">
                  {formatCentsToBRL(nextEd.pendingAmount)}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <p className="text-sm text-slate-600">
              Não há nenhuma edição com status planejada no momento.
            </p>
            <button
              type="button"
              onClick={() => onNavigate('editions')}
              className="min-h-[40px] inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-800 rounded-md hover:bg-indigo-900 transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              Nova edição
            </button>
          </div>
        )}
      </section>

      {/* Últimas movimentações */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-lg flex flex-col">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
            <h2 className="text-base font-semibold text-slate-900">
              Pagamentos recentes
            </h2>
            <button
              type="button"
              onClick={() => onNavigate('payments')}
              className="text-sm font-medium text-indigo-800 hover:underline whitespace-nowrap"
            >
              Ver todos
            </button>
          </div>

          {summary.recentPayments.length === 0 ? (
            <div className="p-6 text-sm text-slate-500">
              Nenhum pagamento registrado até o momento.
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {summary.recentPayments.map((item) => (
                <li
                  key={item.payment.id}
                  className="px-6 py-3.5 flex items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {item.vendorName} · {item.businessName}
                    </p>
                    <p className="text-xs text-slate-500 truncate">
                      {item.editionName} · {PAYMENT_METHOD_LABELS[item.payment.payment_method]} ·{' '}
                      <span className="font-mono tabular-nums">
                        {formatDateBR(item.payment.payment_date)}
                      </span>
                    </p>
                  </div>
                  <span className="text-sm font-semibold font-mono tabular-nums text-emerald-700 shrink-0">
                    {formatCentsToBRL(item.payment.amount)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-lg flex flex-col">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
            <h2 className="text-base font-semibold text-slate-900">
              Edições criadas recentemente
            </h2>
            <button
              type="button"
              onClick={() => onNavigate('editions')}
              className="text-sm font-medium text-indigo-800 hover:underline whitespace-nowrap"
            >
              Ver edições
            </button>
          </div>

          {summary.recentEditions.length === 0 ? (
            <div className="p-6 text-sm text-slate-500">
              Nenhuma edição cadastrada até o momento.
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {summary.recentEditions.map((edition) => (
                <li
                  key={edition.id}
                  className="px-6 py-3.5 flex items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <button
                      type="button"
                      onClick={() => onOpenEdition(edition.id)}
                      className="text-sm font-medium text-slate-900 hover:text-indigo-800 hover:underline truncate text-left block max-w-full"
                    >
                      {edition.name}
                    </button>
                    <p className="text-xs text-slate-500 font-mono tabular-nums">
                      {formatDateBR(edition.event_date)} · Taxa{' '}
                      {formatCentsToBRL(edition.participation_fee)}
                    </p>
                  </div>
                  <EditionStatusText status={edition.status} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Atalhos rápidos discretos */}
      <div className="flex flex-wrap items-center gap-3 pt-1">
        <button
          type="button"
          onClick={() => onNavigate('vendors')}
          className="min-h-[40px] inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors whitespace-nowrap"
        >
          <Users className="w-4 h-4" aria-hidden="true" />
          Gerenciar feirantes
        </button>
        <button
          type="button"
          onClick={() => onNavigate('payments')}
          className="min-h-[40px] inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors whitespace-nowrap"
        >
          Consultar pendências
        </button>
      </div>
    </div>
  );
}
