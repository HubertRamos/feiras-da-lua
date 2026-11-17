import { Edit2, History, Plus, Power, Search } from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Modal } from '../components/ui/Modal';
import { PaymentStatusText, VendorStatusText } from '../components/ui/StatusText';
import { fairService, type EnrichedParticipation } from '../services/fairService';
import type { Vendor } from '../types/domain';
import { formatCentsToBRL } from '../utils/currency';
import { formatDateBR } from '../utils/date';
import { ATTENDANCE_STATUS_LABELS } from '../utils/labels';

interface VendorsPageProps {
  vendors: Vendor[];
  participations: EnrichedParticipation[];
  loading: boolean;
  onRefresh: () => Promise<void>;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

type StatusFilter = 'all' | 'active' | 'inactive';

export function VendorsPage({
  vendors,
  participations,
  loading,
  onRefresh,
  onSuccess,
  onError,
}: VendorsPageProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const [formOpen, setFormOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);

  const [name, setName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [phone, setPhone] = useState('');
  const [productCategory, setProductCategory] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const [confirmToggleVendor, setConfirmToggleVendor] = useState<Vendor | null>(null);
  const [toggling, setToggling] = useState(false);

  const [historyVendor, setHistoryVendor] = useState<Vendor | null>(null);

  const filteredVendors = useMemo(() => {
    const q = search.trim().toLowerCase();
    return vendors.filter((v) => {
      if (statusFilter !== 'all' && v.status !== statusFilter) return false;
      if (!q) return true;
      return (
        v.name.toLowerCase().includes(q) ||
        v.business_name.toLowerCase().includes(q) ||
        v.product_category.toLowerCase().includes(q)
      );
    });
  }, [vendors, search, statusFilter]);

  const vendorHistory = useMemo(() => {
    if (!historyVendor) return [];
    return participations.filter((p) => p.vendor.id === historyVendor.id);
  }, [participations, historyVendor]);

  const openCreateModal = () => {
    setEditingVendor(null);
    setName('');
    setBusinessName('');
    setPhone('');
    setProductCategory('');
    setNotes('');
    setFormOpen(true);
  };

  const openEditModal = (vendor: Vendor) => {
    setEditingVendor(vendor);
    setName(vendor.name);
    setBusinessName(vendor.business_name);
    setPhone(vendor.phone);
    setProductCategory(vendor.product_category);
    setNotes(vendor.notes);
    setFormOpen(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !businessName.trim()) {
      onError('Nome do feirante e nome da barraca são obrigatórios.');
      return;
    }

    setSaving(true);
    try {
      if (editingVendor) {
        await fairService.updateVendor(editingVendor.id, {
          name,
          business_name: businessName,
          phone,
          product_category: productCategory,
          notes,
        });
        onSuccess('Cadastro do feirante atualizado.');
      } else {
        await fairService.createVendor({
          name,
          business_name: businessName,
          phone,
          product_category: productCategory,
          notes,
        });
        onSuccess('Feirante cadastrado com sucesso.');
      }
      setFormOpen(false);
      await onRefresh();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Erro ao salvar feirante.');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmToggle = async () => {
    if (!confirmToggleVendor) return;
    setToggling(true);
    try {
      const updated = await fairService.toggleVendorStatus(confirmToggleVendor);
      onSuccess(
        updated.status === 'active'
          ? 'Feirante reativado com sucesso.'
          : 'Feirante desativado. Histórico financeiro preservado.'
      );
      setConfirmToggleVendor(null);
      await onRefresh();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Erro ao alterar status do feirante.');
    } finally {
      setToggling(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Barra de pesquisa, filtros e ação principal */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1">
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
              aria-label="Pesquisar feirantes"
              className="w-full min-h-[40px] pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600"
            />
          </div>

          <div
            className="inline-flex items-center p-1 bg-slate-200/70 rounded-md self-start"
            role="group"
            aria-label="Filtrar por status"
          >
            {(
              [
                ['all', 'Todos'],
                ['active', 'Ativos'],
                ['inactive', 'Inativos'],
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
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="min-h-[40px] inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-800 rounded-md hover:bg-indigo-900 transition-colors whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          Novo feirante
        </button>
      </div>

      {/* Tabela de Feirantes */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-10 bg-slate-100 rounded animate-pulse" />
            ))}
          </div>
        ) : vendors.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm font-medium text-slate-900">Nenhum feirante cadastrado</p>
            <p className="mt-1 text-sm text-slate-500">
              Cadastre os responsáveis e suas barracas para incluí-los nas edições da feira.
            </p>
            <button
              type="button"
              onClick={openCreateModal}
              className="mt-4 min-h-[40px] inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-800 rounded-md hover:bg-indigo-900 transition-colors"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              Cadastrar primeiro feirante
            </button>
          </div>
        ) : filteredVendors.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            Nenhum feirante encontrado para o filtro aplicado.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-500">
                  <th className="py-3 px-4">Feirante / Barraca</th>
                  <th className="py-3 px-4">Produto</th>
                  <th className="py-3 px-4">Telefone</th>
                  <th className="py-3 px-4">Cadastro</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredVendors.map((vendor) => (
                  <tr key={vendor.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <p className="font-medium text-slate-900">{vendor.name}</p>
                      <p className="text-xs text-slate-500">{vendor.business_name}</p>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {vendor.product_category || '—'}
                    </td>
                    <td className="py-3 px-4 font-mono tabular-nums text-slate-600 whitespace-nowrap">
                      {vendor.phone || '—'}
                    </td>
                    <td className="py-3 px-4 font-mono tabular-nums text-slate-500 whitespace-nowrap">
                      {formatDateBR(vendor.created_at.slice(0, 10))}
                    </td>
                    <td className="py-3 px-4">
                      <VendorStatusText status={vendor.status} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setHistoryVendor(vendor)}
                          title="Consultar histórico de participações e pagamentos"
                          className="min-h-[36px] inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:text-indigo-800 hover:bg-slate-100 rounded transition-colors whitespace-nowrap"
                        >
                          <History className="w-3.5 h-3.5" aria-hidden="true" />
                          Histórico
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditModal(vendor)}
                          title="Editar feirante"
                          className="min-h-[36px] inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:text-indigo-800 hover:bg-slate-100 rounded transition-colors whitespace-nowrap"
                        >
                          <Edit2 className="w-3.5 h-3.5" aria-hidden="true" />
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmToggleVendor(vendor)}
                          className={`min-h-[36px] inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                            vendor.status === 'active'
                              ? 'text-rose-700 hover:bg-rose-50'
                              : 'text-emerald-700 hover:bg-emerald-50'
                          }`}
                        >
                          <Power className="w-3.5 h-3.5" aria-hidden="true" />
                          {vendor.status === 'active' ? 'Desativar' : 'Reativar'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Cadastro / Edição */}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editingVendor ? 'Editar feirante' : 'Cadastrar feirante'}
        subtitle="Informe os dados do responsável e da barraca."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="vendor-name" className="block text-sm font-medium text-slate-700 mb-1">
              Nome completo ou responsável *
            </label>
            <input
              id="vendor-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Ex: Maria Helena Souza"
              className="w-full min-h-[40px] px-3 py-2 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600"
            />
          </div>

          <div>
            <label
              htmlFor="vendor-business"
              className="block text-sm font-medium text-slate-700 mb-1"
            >
              Nome da barraca ou empreendimento *
            </label>
            <input
              id="vendor-business"
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              required
              placeholder="Ex: Pastelaria da Lua"
              className="w-full min-h-[40px] px-3 py-2 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="vendor-phone"
                className="block text-sm font-medium text-slate-700 mb-1"
              >
                Telefone (opcional)
              </label>
              <input
                id="vendor-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(11) 99999-9999"
                className="w-full min-h-[40px] px-3 py-2 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600"
              />
            </div>

            <div>
              <label
                htmlFor="vendor-category"
                className="block text-sm font-medium text-slate-700 mb-1"
              >
                Tipo de produto
              </label>
              <input
                id="vendor-category"
                type="text"
                value={productCategory}
                onChange={(e) => setProductCategory(e.target.value)}
                placeholder="Ex: Alimentação, Artesanato"
                className="w-full min-h-[40px] px-3 py-2 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="vendor-notes"
              className="block text-sm font-medium text-slate-700 mb-1"
            >
              Observações opcionais
            </label>
            <textarea
              id="vendor-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Informações úteis sobre a barraca ou preferências..."
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              disabled={saving}
              className="min-h-[40px] px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="min-h-[40px] px-4 py-2 text-sm font-medium text-white bg-indigo-800 rounded-md hover:bg-indigo-900 transition-colors disabled:opacity-50"
            >
              {saving ? 'Salvando...' : editingVendor ? 'Salvar alterações' : 'Cadastrar feirante'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Histórico do Feirante */}
      <Modal
        open={Boolean(historyVendor)}
        onClose={() => setHistoryVendor(null)}
        title={historyVendor ? `Histórico — ${historyVendor.name}` : 'Histórico'}
        subtitle={historyVendor?.business_name}
        maxWidthClass="max-w-2xl"
      >
        {historyVendor && (
          <div className="space-y-4">
            {vendorHistory.length === 0 ? (
              <p className="text-sm text-slate-500">
                Este feirante ainda não possui participações registradas em edições da feira.
              </p>
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded-md">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-xs font-medium text-slate-500">
                      <th className="py-2.5 px-3">Edição</th>
                      <th className="py-2.5 px-3">Data</th>
                      <th className="py-2.5 px-3">Presença</th>
                      <th className="py-2.5 px-3 text-right">Cobrado</th>
                      <th className="py-2.5 px-3 text-right">Pago</th>
                      <th className="py-2.5 px-3">Situação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {vendorHistory.map((item) => (
                      <tr key={item.participation.id}>
                        <td className="py-2.5 px-3 font-medium text-slate-900">
                          {item.edition.name}
                        </td>
                        <td className="py-2.5 px-3 font-mono tabular-nums text-slate-600 whitespace-nowrap">
                          {formatDateBR(item.edition.event_date)}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                          {ATTENDANCE_STATUS_LABELS[item.participation.attendance_status]}
                        </td>
                        <td className="py-2.5 px-3 font-mono tabular-nums text-right text-slate-900 whitespace-nowrap">
                          {formatCentsToBRL(item.participation.charged_amount)}
                        </td>
                        <td className="py-2.5 px-3 font-mono tabular-nums text-right text-emerald-700 whitespace-nowrap">
                          {formatCentsToBRL(item.paidAmount)}
                        </td>
                        <td className="py-2.5 px-3">
                          <PaymentStatusText status={item.participation.payment_status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Confirmação de Desativação / Reativação */}
      <ConfirmDialog
        open={Boolean(confirmToggleVendor)}
        onClose={() => setConfirmToggleVendor(null)}
        onConfirm={handleConfirmToggle}
        busy={toggling}
        tone={confirmToggleVendor?.status === 'active' ? 'danger' : 'primary'}
        title={
          confirmToggleVendor?.status === 'active'
            ? 'Desativar feirante'
            : 'Reativar feirante'
        }
        description={
          confirmToggleVendor?.status === 'active'
            ? `Deseja desativar "${confirmToggleVendor.name}" (${confirmToggleVendor.business_name})? Ele não aparecerá automaticamente nas próximas edições, mas todo o histórico de participações e pagamentos será mantido.`
            : `Deseja reativar "${confirmToggleVendor?.name}" (${confirmToggleVendor?.business_name}) para que volte a ficar disponível nas novas edições?`
        }
        confirmLabel={
          confirmToggleVendor?.status === 'active' ? 'Desativar feirante' : 'Reativar feirante'
        }
      />
    </div>
  );
}
