import {
  ArrowLeft,
  Ban,
  CheckSquare,
  Edit2,
  Plus,
  Square,
  UserPlus,
  Users,
} from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';
import { PaymentModal } from '../components/payments/PaymentModal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Modal } from '../components/ui/Modal';
import { EditionStatusText, PaymentStatusText } from '../components/ui/StatusText';
import {
  fairService,
  type EditionSummary,
  type EnrichedParticipation,
} from '../services/fairService';
import type {
  AttendanceStatus,
  FairEdition,
  FairEditionStatus,
  Vendor,
} from '../types/domain';
import {
  formatCentsToBRL,
  formatCentsToInput,
  parseCurrencyInputToCents,
} from '../utils/currency';
import { formatDateBR, getTodayISODate } from '../utils/date';
import { ATTENDANCE_STATUS_LABELS } from '../utils/labels';

interface EditionsPageProps {
  editions: FairEdition[];
  editionSummaries: EditionSummary[];
  vendors: Vendor[];
  participations: EnrichedParticipation[];
  selectedEditionId: string | null;
  onSelectEdition: (editionId: string | null) => void;
  loading: boolean;
  onRefresh: () => Promise<void>;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

type EditionFilter = 'all' | FairEditionStatus;

export function EditionsPage({
  editions,
  editionSummaries,
  vendors,
  participations,
  selectedEditionId,
  onSelectEdition,
  loading,
  onRefresh,
  onSuccess,
  onError,
}: EditionsPageProps) {
  const [statusFilter, setStatusFilter] = useState<EditionFilter>('all');

  // Form modal de criação/edição de edição
  const [formOpen, setFormOpen] = useState(false);
  const [editingEdition, setEditingEdition] = useState<FairEdition | null>(null);
  const [name, setName] = useState('');
  const [eventDate, setEventDate] = useState(getTodayISODate());
  const [feeInput, setFeeInput] = useState('30,00');
  const [status, setStatus] = useState<FairEditionStatus>('planned');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // Confirmação de cancelamento de edição
  const [confirmCancelEdition, setConfirmCancelEdition] = useState<FairEdition | null>(null);
  const [cancelingEdition, setCancelingEdition] = useState(false);

  // Modal de adicionar feirantes ativos à edição
  const [addVendorsOpen, setAddVendorsOpen] = useState(false);
  const [selectedVendorIds, setSelectedVendorIds] = useState<Set<string>>(new Set());
  const [addingVendors, setAddingVendors] = useState(false);

  // Modal de pagamento
  const [paymentTarget, setPaymentTarget] = useState<EnrichedParticipation | null>(null);

  // Cancelamento de cobrança individual
  const [cancelChargeTarget, setCancelChargeTarget] = useState<EnrichedParticipation | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelingCharge, setCancelingCharge] = useState(false);

  const summaryMap = useMemo(
    () => new Map(editionSummaries.map((s) => [s.edition.id, s])),
    [editionSummaries]
  );

  const filteredEditions = useMemo(() => {
    if (statusFilter === 'all') return editions;
    return editions.filter((e) => e.status === statusFilter);
  }, [editions, statusFilter]);

  const activeEdition = useMemo(
    () => editions.find((e) => e.id === selectedEditionId) ?? null,
    [editions, selectedEditionId]
  );

  const activeEditionSummary = activeEdition
    ? summaryMap.get(activeEdition.id) ?? null
    : null;

  const editionParticipations = useMemo(() => {
    if (!activeEdition) return [];
    return participations.filter((p) => p.edition.id === activeEdition.id);
  }, [participations, activeEdition]);

  // Feirantes ativos ainda não vinculados à edição selecionada
  const availableActiveVendors = useMemo(() => {
    if (!activeEdition) return [];
    const linkedIds = new Set(editionParticipations.map((p) => p.vendor.id));
    return vendors.filter((v) => v.status === 'active' && !linkedIds.has(v.id));
  }, [vendors, activeEdition, editionParticipations]);

  const openCreateModal = () => {
    setEditingEdition(null);
    setName('');
    setEventDate(getTodayISODate());
    setFeeInput('30,00');
    setStatus('planned');
    setNotes('');
    setFormOpen(true);
  };

  const openEditModal = (edition: FairEdition) => {
    setEditingEdition(edition);
    setName(edition.name);
    setEventDate(edition.event_date);
    setFeeInput(formatCentsToInput(edition.participation_fee));
    setStatus(edition.status);
    setNotes(edition.notes);
    setFormOpen(true);
  };

  const handleSaveEdition = async (e: FormEvent) => {
    e.preventDefault();
    const feeCents = parseCurrencyInputToCents(feeInput);
    if (feeCents === null || feeCents < 0) {
      onError('Informe um valor válido para a taxa de participação (ex: 30,00).');
      return;
    }

    setSaving(true);
    try {
      if (editingEdition) {
        await fairService.updateEdition(editingEdition.id, {
          name,
          event_date: eventDate,
          participation_fee: feeCents,
          status,
          notes,
        });
        onSuccess('Edição atualizada com sucesso.');
      } else {
        const created = await fairService.createEdition({
          name,
          event_date: eventDate,
          participation_fee: feeCents,
          status,
          notes,
        });
        onSuccess('Edição criada com sucesso.');
        onSelectEdition(created.id);
      }
      setFormOpen(false);
      await onRefresh();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Erro ao salvar edição.');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmCancelEdition = async () => {
    if (!confirmCancelEdition) return;
    setCancelingEdition(true);
    try {
      await fairService.cancelEdition(confirmCancelEdition.id);
      onSuccess('Edição marcada como cancelada. Novas cobranças foram bloqueadas.');
      setConfirmCancelEdition(null);
      await onRefresh();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Erro ao cancelar edição.');
    } finally {
      setCancelingEdition(false);
    }
  };

  const openAddVendorsModal = () => {
    setSelectedVendorIds(new Set(availableActiveVendors.map((v) => v.id)));
    setAddVendorsOpen(true);
  };

  const toggleVendorSelection = (vendorId: string) => {
    setSelectedVendorIds((prev) => {
      const next = new Set(prev);
      if (next.has(vendorId)) next.delete(vendorId);
      else next.add(vendorId);
      return next;
    });
  };

  const handleAddSelectedVendors = async (e: FormEvent) => {
    e.preventDefault();
    if (!activeEdition) return;
    if (selectedVendorIds.size === 0) {
      onError('Selecione ao menos um feirante ativo.');
      return;
    }

    setAddingVendors(true);
    try {
      await fairService.addVendorsToEdition(activeEdition.id, Array.from(selectedVendorIds));
      onSuccess(`${selectedVendorIds.size} feirante(s) vinculado(s) à edição.`);
      setAddVendorsOpen(false);
      await onRefresh();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Erro ao vincular feirantes.');
    } finally {
      setAddingVendors(false);
    }
  };

  const handleAttendanceChange = async (
    participationId: string,
    nextAttendance: AttendanceStatus
  ) => {
    try {
      await fairService.updateAttendance(participationId, nextAttendance);
      await onRefresh();
      onSuccess('Presença atualizada.');
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Erro ao atualizar presença.');
    }
  };

  const handleConfirmCancelCharge = async (e: FormEvent) => {
    e.preventDefault();
    if (!cancelChargeTarget) return;
    setCancelingCharge(true);
    try {
      await fairService.cancelCharge(cancelChargeTarget.participation.id, cancelReason);
      onSuccess('Cobrança cancelada.');
      setCancelChargeTarget(null);
      setCancelReason('');
      await onRefresh();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Erro ao cancelar cobrança.');
    } finally {
      setCancelingCharge(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Visão de Detalhes / Participantes da Edição Selecionada
  // ---------------------------------------------------------------------------
  if (activeEdition) {
    const isCanceled = activeEdition.status === 'canceled';

    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => onSelectEdition(null)}
            className="min-h-[40px] inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            Voltar para edições
          </button>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => openEditModal(activeEdition)}
              className="min-h-[40px] inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors"
            >
              <Edit2 className="w-4 h-4" aria-hidden="true" />
              Editar edição
            </button>
            {!isCanceled && (
              <button
                type="button"
                onClick={openAddVendorsModal}
                className="min-h-[40px] inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-800 rounded-md hover:bg-indigo-900 transition-colors"
              >
                <UserPlus className="w-4 h-4" aria-hidden="true" />
                Adicionar feirantes
              </button>
            )}
          </div>
        </div>

        {/* Cabeçalho da Edição */}
        <div className="bg-white border border-slate-200 rounded-lg p-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">{activeEdition.name}</h2>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-600">
                <span className="font-mono tabular-nums">
                  Data: {formatDateBR(activeEdition.event_date)}
                </span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">
                  Taxa padrão: {formatCentsToBRL(activeEdition.participation_fee)}
                </span>
                <span aria-hidden="true">·</span>
                <EditionStatusText status={activeEdition.status} />
              </div>
              {activeEdition.notes && (
                <p className="mt-2 text-sm text-slate-600">{activeEdition.notes}</p>
              )}
            </div>
          </div>

          {activeEditionSummary && (
            <div className="mt-5 pt-5 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-slate-500">Participantes</p>
                <p className="mt-0.5 text-lg font-semibold font-mono tabular-nums text-slate-900">
                  {activeEditionSummary.participantsCount}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Total previsto</p>
                <p className="mt-0.5 text-lg font-semibold font-mono tabular-nums text-slate-900">
                  {formatCentsToBRL(activeEditionSummary.expectedAmount)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Recebido</p>
                <p className="mt-0.5 text-lg font-semibold font-mono tabular-nums text-emerald-700">
                  {formatCentsToBRL(activeEditionSummary.receivedAmount)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Pendente</p>
                <p className="mt-0.5 text-lg font-semibold font-mono tabular-nums text-amber-700">
                  {formatCentsToBRL(activeEditionSummary.pendingAmount)}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Nota de regra de negócio */}
        <p className="text-xs text-slate-500">
          Regra de cobrança: a taxa é devida pela participação na edição. Marcar o feirante como
          ausente não cancela a cobrança nem altera o saldo pendente.
        </p>

        {/* Tabela de Participantes da Edição */}
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          {editionParticipations.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm font-medium text-slate-900">
                Nenhum feirante vinculado a esta edição
              </p>
              <p className="mt-1 text-sm text-slate-500">
                {isCanceled
                  ? 'Esta edição está cancelada e não pode receber novas cobranças.'
                  : 'Adicione os feirantes ativos para gerar as cobranças desta edição.'}
              </p>
              {!isCanceled && (
                <button
                  type="button"
                  onClick={openAddVendorsModal}
                  className="mt-4 min-h-[40px] inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-800 rounded-md hover:bg-indigo-900 transition-colors"
                >
                  <UserPlus className="w-4 h-4" aria-hidden="true" />
                  Adicionar feirantes ativos
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-500">
                    <th className="py-3 px-4">Feirante / Barraca</th>
                    <th className="py-3 px-4">Presença</th>
                    <th className="py-3 px-4 text-right">Cobrado</th>
                    <th className="py-3 px-4 text-right">Pago</th>
                    <th className="py-3 px-4">Pagamento</th>
                    <th className="py-3 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {editionParticipations.map((item) => (
                    <tr
                      key={item.participation.id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <p className="font-medium text-slate-900">{item.vendor.name}</p>
                        <p className="text-xs text-slate-500">{item.vendor.business_name}</p>
                      </td>
                      <td className="py-3 px-4">
                        <select
                          aria-label={`Presença de ${item.vendor.name}`}
                          value={item.participation.attendance_status}
                          onChange={(e) =>
                            handleAttendanceChange(
                              item.participation.id,
                              e.target.value as AttendanceStatus
                            )
                          }
                          className="min-h-[36px] px-2.5 py-1 text-xs font-medium bg-white border border-slate-300 rounded-md text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                        >
                          <option value="uninformed">
                            {ATTENDANCE_STATUS_LABELS.uninformed}
                          </option>
                          <option value="present">{ATTENDANCE_STATUS_LABELS.present}</option>
                          <option value="absent">{ATTENDANCE_STATUS_LABELS.absent}</option>
                        </select>
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-900 whitespace-nowrap">
                        {formatCentsToBRL(item.participation.charged_amount)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-emerald-700 whitespace-nowrap">
                        {formatCentsToBRL(item.paidAmount)}
                      </td>
                      <td className="py-3 px-4">
                        <PaymentStatusText status={item.participation.payment_status} />
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          {item.participation.payment_status === 'pending' && (
                            <>
                              <button
                                type="button"
                                onClick={() => setPaymentTarget(item)}
                                className="min-h-[36px] px-3 py-1.5 text-xs font-medium text-white bg-indigo-800 rounded hover:bg-indigo-900 transition-colors whitespace-nowrap"
                              >
                                Registrar pagamento
                              </button>
                              {item.paidAmount === 0 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setCancelChargeTarget(item);
                                    setCancelReason('');
                                  }}
                                  className="min-h-[36px] px-2.5 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50 rounded transition-colors whitespace-nowrap"
                                >
                                  Cancelar cobrança
                                </button>
                              )}
                            </>
                          )}
                          {item.participation.payment_status === 'paid' && (
                            <button
                              type="button"
                              onClick={() => setPaymentTarget(item)}
                              className="min-h-[36px] px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-indigo-800 hover:bg-slate-100 rounded transition-colors whitespace-nowrap"
                            >
                              Ver / Lançar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal Adicionar Feirantes Ativos */}
        <Modal
          open={addVendorsOpen}
          onClose={() => setAddVendorsOpen(false)}
          title="Adicionar feirantes à edição"
          subtitle={`Taxa aplicada nesta edição: ${formatCentsToBRL(
            activeEdition.participation_fee
          )}`}
          maxWidthClass="max-w-xl"
        >
          {availableActiveVendors.length === 0 ? (
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                Todos os feirantes ativos já estão vinculados a esta edição ou não há feirantes
                ativos cadastrados.
              </p>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setAddVendorsOpen(false)}
                  className="min-h-[40px] px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
                >
                  Fechar
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleAddSelectedVendors} className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-500 pb-2 border-b border-slate-100">
                <span>
                  {selectedVendorIds.size} de {availableActiveVendors.length} selecionados
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (selectedVendorIds.size === availableActiveVendors.length) {
                      setSelectedVendorIds(new Set());
                    } else {
                      setSelectedVendorIds(new Set(availableActiveVendors.map((v) => v.id)));
                    }
                  }}
                  className="font-medium text-indigo-800 hover:underline"
                >
                  {selectedVendorIds.size === availableActiveVendors.length
                    ? 'Desmarcar todos'
                    : 'Selecionar todos'}
                </button>
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-md">
                {availableActiveVendors.map((vendor) => {
                  const checked = selectedVendorIds.has(vendor.id);
                  return (
                    <label
                      key={vendor.id}
                      className="flex items-center gap-3 px-3.5 py-2.5 cursor-pointer hover:bg-slate-50 transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleVendorSelection(vendor.id)}
                        className="sr-only"
                      />
                      {checked ? (
                        <CheckSquare className="w-4 h-4 text-indigo-800 shrink-0" aria-hidden="true" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-900 truncate">{vendor.name}</p>
                        <p className="text-xs text-slate-500 truncate">
                          {vendor.business_name}
                          {vendor.product_category ? ` · ${vendor.product_category}` : ''}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAddVendorsOpen(false)}
                  disabled={addingVendors}
                  className="min-h-[40px] px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={addingVendors || selectedVendorIds.size === 0}
                  className="min-h-[40px] px-4 py-2 text-sm font-medium text-white bg-indigo-800 rounded-md hover:bg-indigo-900 disabled:opacity-50"
                >
                  {addingVendors ? 'Vinculando...' : 'Adicionar e gerar cobranças'}
                </button>
              </div>
            </form>
          )}
        </Modal>

        {/* Modal Cancelar Cobrança Individual */}
        <Modal
          open={Boolean(cancelChargeTarget)}
          onClose={() => setCancelChargeTarget(null)}
          title="Cancelar cobrança"
          subtitle={
            cancelChargeTarget
              ? `${cancelChargeTarget.vendor.name} · ${cancelChargeTarget.vendor.business_name}`
              : undefined
          }
          maxWidthClass="max-w-md"
        >
          <form onSubmit={handleConfirmCancelCharge} className="space-y-4">
            <p className="text-sm text-slate-600 leading-relaxed">
              Esta ação cancela a cobrança de{' '}
              <span className="font-mono font-medium text-slate-900">
                {cancelChargeTarget
                  ? formatCentsToBRL(cancelChargeTarget.participation.charged_amount)
                  : ''}
              </span>{' '}
              sem apagar o registro da participação. Utilize somente quando a cobrança for
              legitimamente cancelada.
            </p>
            <div>
              <label
                htmlFor="cancel-charge-reason"
                className="block text-sm font-medium text-slate-700 mb-1"
              >
                Motivo do cancelamento (opcional)
              </label>
              <input
                id="cancel-charge-reason"
                type="text"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Ex: Isenção autorizada pela coordenação"
                className="w-full min-h-[40px] px-3 py-2 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-600"
              />
            </div>
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCancelChargeTarget(null)}
                disabled={cancelingCharge}
                className="min-h-[40px] px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
              >
                Voltar
              </button>
              <button
                type="submit"
                disabled={cancelingCharge}
                className="min-h-[40px] px-4 py-2 text-sm font-medium text-white bg-rose-700 rounded-md hover:bg-rose-800 disabled:opacity-50"
              >
                {cancelingCharge ? 'Cancelando...' : 'Confirmar cancelamento'}
              </button>
            </div>
          </form>
        </Modal>

        {/* Modal Registrar Pagamento */}
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

        {/* Modal Editar Edição (quando dentro do detalhe) */}
        <Modal
          open={formOpen}
          onClose={() => setFormOpen(false)}
          title="Editar edição da feira"
          subtitle="Alterar a taxa padrão aqui não modifica cobranças já geradas."
        >
          <EditionForm
            name={name}
            setName={setName}
            eventDate={eventDate}
            setEventDate={setEventDate}
            feeInput={feeInput}
            setFeeInput={setFeeInput}
            status={status}
            setStatus={setStatus}
            notes={notes}
            setNotes={setNotes}
            saving={saving}
            isEditing={true}
            onCancel={() => setFormOpen(false)}
            onSubmit={handleSaveEdition}
          />
        </Modal>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Lista Geral de Edições
  // ---------------------------------------------------------------------------
  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div
          className="inline-flex items-center p-1 bg-slate-200/70 rounded-md self-start overflow-x-auto"
          role="group"
          aria-label="Filtrar edições por status"
        >
          {(
            [
              ['all', 'Todas'],
              ['planned', 'Planejadas'],
              ['completed', 'Realizadas'],
              ['canceled', 'Canceladas'],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setStatusFilter(value)}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                statusFilter === value
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
          onClick={openCreateModal}
          className="min-h-[40px] inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-800 rounded-md hover:bg-indigo-900 transition-colors whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          Nova edição
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-12 bg-slate-100 rounded animate-pulse" />
            ))}
          </div>
        ) : editions.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm font-medium text-slate-900">Nenhuma edição cadastrada</p>
            <p className="mt-1 text-sm text-slate-500">
              Crie uma edição da Feira da Lua definindo a data e a taxa de participação.
            </p>
            <button
              type="button"
              onClick={openCreateModal}
              className="mt-4 min-h-[40px] inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-800 rounded-md hover:bg-indigo-900"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              Criar primeira edição
            </button>
          </div>
        ) : filteredEditions.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            Nenhuma edição encontrada para este filtro.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-500">
                  <th className="py-3 px-4">Edição</th>
                  <th className="py-3 px-4">Data</th>
                  <th className="py-3 px-4 text-right">Taxa</th>
                  <th className="py-3 px-4 text-right">Participantes</th>
                  <th className="py-3 px-4 text-right">Recebido / Previsto</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredEditions.map((edition) => {
                  const summary = summaryMap.get(edition.id);
                  return (
                    <tr key={edition.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => onSelectEdition(edition.id)}
                          className="font-medium text-slate-900 hover:text-indigo-800 hover:underline text-left"
                        >
                          {edition.name}
                        </button>
                      </td>
                      <td className="py-3 px-4 font-mono tabular-nums text-slate-600 whitespace-nowrap">
                        {formatDateBR(edition.event_date)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-900 whitespace-nowrap">
                        {formatCentsToBRL(edition.participation_fee)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700 whitespace-nowrap">
                        {summary?.participantsCount ?? 0}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums whitespace-nowrap">
                        <span className="text-emerald-700 font-medium">
                          {formatCentsToBRL(summary?.receivedAmount ?? 0)}
                        </span>
                        <span className="text-slate-400"> / </span>
                        <span className="text-slate-600">
                          {formatCentsToBRL(summary?.expectedAmount ?? 0)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <EditionStatusText status={edition.status} />
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => onSelectEdition(edition.id)}
                            className="min-h-[36px] inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-indigo-800 hover:bg-indigo-50 rounded transition-colors whitespace-nowrap"
                          >
                            <Users className="w-3.5 h-3.5" aria-hidden="true" />
                            Participantes
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditModal(edition)}
                            className="min-h-[36px] inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded transition-colors whitespace-nowrap"
                          >
                            <Edit2 className="w-3.5 h-3.5" aria-hidden="true" />
                            Editar
                          </button>
                          {edition.status !== 'canceled' && (
                            <button
                              type="button"
                              onClick={() => setConfirmCancelEdition(edition)}
                              className="min-h-[36px] inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50 rounded transition-colors whitespace-nowrap"
                            >
                              <Ban className="w-3.5 h-3.5" aria-hidden="true" />
                              Cancelar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Criar / Editar Edição */}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editingEdition ? 'Editar edição da feira' : 'Nova edição da feira'}
        subtitle={
          editingEdition
            ? 'Alterar a taxa nesta edição não modifica cobranças anteriores.'
            : 'Defina identificação, data e taxa de participação desta edição.'
        }
      >
        <EditionForm
          name={name}
          setName={setName}
          eventDate={eventDate}
          setEventDate={setEventDate}
          feeInput={feeInput}
          setFeeInput={setFeeInput}
          status={status}
          setStatus={setStatus}
          notes={notes}
          setNotes={setNotes}
          saving={saving}
          isEditing={Boolean(editingEdition)}
          onCancel={() => setFormOpen(false)}
          onSubmit={handleSaveEdition}
        />
      </Modal>

      {/* Confirmação de Cancelamento de Edição */}
      <ConfirmDialog
        open={Boolean(confirmCancelEdition)}
        onClose={() => setConfirmCancelEdition(null)}
        onConfirm={handleConfirmCancelEdition}
        busy={cancelingEdition}
        tone="danger"
        title="Cancelar edição da feira"
        description={`Deseja cancelar "${confirmCancelEdition?.name}"? Edições canceladas não podem gerar novas cobranças nem receber novos feirantes.`}
        confirmLabel="Cancelar edição"
      />
    </div>
  );
}

interface EditionFormProps {
  name: string;
  setName: (v: string) => void;
  eventDate: string;
  setEventDate: (v: string) => void;
  feeInput: string;
  setFeeInput: (v: string) => void;
  status: FairEditionStatus;
  setStatus: (v: FairEditionStatus) => void;
  notes: string;
  setNotes: (v: string) => void;
  saving: boolean;
  isEditing: boolean;
  onCancel: () => void;
  onSubmit: (e: FormEvent) => void;
}

function EditionForm({
  name,
  setName,
  eventDate,
  setEventDate,
  feeInput,
  setFeeInput,
  status,
  setStatus,
  notes,
  setNotes,
  saving,
  isEditing,
  onCancel,
  onSubmit,
}: EditionFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label htmlFor="edition-name" className="block text-sm font-medium text-slate-700 mb-1">
          Nome ou identificação da edição *
        </label>
        <input
          id="edition-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="Ex: Feira da Lua — 22/11/2026"
          className="w-full min-h-[40px] px-3 py-2 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="edition-date" className="block text-sm font-medium text-slate-700 mb-1">
            Data de realização *
          </label>
          <input
            id="edition-date"
            type="date"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
            required
            className="w-full min-h-[40px] px-3 py-2 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600"
          />
        </div>

        <div>
          <label htmlFor="edition-fee" className="block text-sm font-medium text-slate-700 mb-1">
            Taxa de participação (R$) *
          </label>
          <input
            id="edition-fee"
            type="text"
            inputMode="decimal"
            value={feeInput}
            onChange={(e) => setFeeInput(e.target.value)}
            required
            placeholder="30,00"
            className="w-full min-h-[40px] px-3 py-2 text-sm font-mono tabular-nums bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600"
          />
        </div>
      </div>

      <div>
        <label htmlFor="edition-status" className="block text-sm font-medium text-slate-700 mb-1">
          Status da edição
        </label>
        <select
          id="edition-status"
          value={status}
          onChange={(e) => setStatus(e.target.value as FairEditionStatus)}
          className="w-full min-h-[40px] px-3 py-2 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600"
        >
          <option value="planned">Planejada</option>
          <option value="completed">Realizada</option>
          <option value="canceled">Cancelada</option>
        </select>
      </div>

      <div>
        <label htmlFor="edition-notes" className="block text-sm font-medium text-slate-700 mb-1">
          Observações opcionais
        </label>
        <textarea
          id="edition-notes"
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Informações adicionais sobre local, horário ou observações..."
          className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600"
        />
      </div>

      <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="min-h-[40px] px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={saving}
          className="min-h-[40px] px-4 py-2 text-sm font-medium text-white bg-indigo-800 rounded-md hover:bg-indigo-900 disabled:opacity-50"
        >
          {saving ? 'Salvando...' : isEditing ? 'Salvar alterações' : 'Criar edição'}
        </button>
      </div>
    </form>
  );
}
