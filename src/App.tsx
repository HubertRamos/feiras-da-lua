import { useCallback, useEffect, useRef, useState } from 'react';
import { SidebarLayout, type NavSection } from './components/layout/SidebarLayout';
import { ToastBanner, type ToastMessage } from './components/ui/Toast';
import { EditionsPage } from './pages/EditionsPage';
import { OverviewPage } from './pages/OverviewPage';
import { PaymentsPage } from './pages/PaymentsPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';
import { VendorsPage } from './pages/VendorsPage';
import {
  fairService,
  type DashboardSummary,
  type EditionSummary,
  type EnrichedParticipation,
} from './services/fairService';
import type { FairEdition, Payment, StorageStats, Vendor } from './types/domain';
import { generateUUID } from './utils/uuid';

const SECTION_META: Record<NavSection, { title: string; subtitle: string }> = {
  overview: {
    title: 'Visão geral',
    subtitle: 'Resumo operacional e financeiro da Feira da Lua',
  },
  vendors: {
    title: 'Feirantes',
    subtitle: 'Cadastro, atualização e situação dos feirantes participantes',
  },
  editions: {
    title: 'Edições da feira',
    subtitle: 'Organização de datas, taxas, participantes e presença',
  },
  payments: {
    title: 'Pagamentos',
    subtitle: 'Cobranças pendentes, recebimentos e histórico financeiro',
  },
  reports: {
    title: 'Relatórios',
    subtitle: 'Consultas administrativas e exportação de dados em CSV',
  },
  settings: {
    title: 'Configurações',
    subtitle: 'Estado do armazenamento local, backup e restauração',
  },
};

export default function App() {
  const [activeSection, setActiveSection] = useState<NavSection>('overview');
  const [selectedEditionId, setSelectedEditionId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [editions, setEditions] = useState<FairEdition[]>([]);
  const [editionSummaries, setEditionSummaries] = useState<EditionSummary[]>([]);
  const [participations, setParticipations] = useState<EnrichedParticipation[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [dashboard, setDashboard] = useState<DashboardSummary | null>(null);
  const [storageStats, setStorageStats] = useState<StorageStats | null>(null);

  const [toast, setToast] = useState<ToastMessage | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const showToast = useCallback((type: 'success' | 'error', message: string) => {
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    setToast({ id: generateUUID(), type, message });
    toastTimerRef.current = window.setTimeout(() => {
      setToast(null);
    }, 4500);
  }, []);

  const showSuccess = useCallback((message: string) => showToast('success', message), [showToast]);
  const showError = useCallback((message: string) => showToast('error', message), [showToast]);

  const loadAllData = useCallback(async () => {
    try {
      setLoadError(null);
      const [
        vendorsData,
        editionsData,
        editionSummariesData,
        participationsData,
        paymentsData,
        dashboardData,
        statsData,
      ] = await Promise.all([
        fairService.listVendors(),
        fairService.listEditions(),
        fairService.listEditionSummaries(),
        fairService.listEnrichedParticipations(),
        fairService.listPayments(),
        fairService.getDashboardSummary(),
        fairService.getStorageStats(),
      ]);

      setVendors(vendorsData);
      setEditions(editionsData);
      setEditionSummaries(editionSummariesData);
      setParticipations(participationsData);
      setPayments(paymentsData);
      setDashboard(dashboardData);
      setStorageStats(statsData);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Erro ao carregar os dados locais da aplicação.';
      setLoadError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();
    return () => {
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, [loadAllData]);

  const handleNavigate = (section: NavSection) => {
    setActiveSection(section);
    if (section !== 'editions') {
      setSelectedEditionId(null);
    }
  };

  const handleOpenEdition = (editionId: string) => {
    setSelectedEditionId(editionId);
    setActiveSection('editions');
  };

  const meta = SECTION_META[activeSection];

  return (
    <>
      <SidebarLayout
        activeSection={activeSection}
        onNavigate={handleNavigate}
        pageTitle={meta.title}
        pageSubtitle={meta.subtitle}
      >
        {loadError ? (
          <div className="bg-white border border-rose-200 rounded-lg p-6">
            <h2 className="text-base font-semibold text-rose-800">
              Erro ao acessar o armazenamento local
            </h2>
            <p className="mt-1 text-sm text-slate-600">{loadError}</p>
            <button
              type="button"
              onClick={() => {
                setLoading(true);
                loadAllData();
              }}
              className="mt-4 min-h-[40px] px-4 py-2 text-sm font-medium text-white bg-indigo-800 rounded-md hover:bg-indigo-900 transition-colors"
            >
              Tentar novamente
            </button>
          </div>
        ) : activeSection === 'overview' ? (
          <OverviewPage
            summary={dashboard}
            loading={loading}
            onNavigate={handleNavigate}
            onOpenEdition={handleOpenEdition}
          />
        ) : activeSection === 'vendors' ? (
          <VendorsPage
            vendors={vendors}
            participations={participations}
            loading={loading}
            onRefresh={loadAllData}
            onSuccess={showSuccess}
            onError={showError}
          />
        ) : activeSection === 'editions' ? (
          <EditionsPage
            editions={editions}
            editionSummaries={editionSummaries}
            vendors={vendors}
            participations={participations}
            selectedEditionId={selectedEditionId}
            onSelectEdition={setSelectedEditionId}
            loading={loading}
            onRefresh={loadAllData}
            onSuccess={showSuccess}
            onError={showError}
          />
        ) : activeSection === 'payments' ? (
          <PaymentsPage
            editions={editions}
            participations={participations}
            payments={payments}
            loading={loading}
            onRefresh={loadAllData}
            onSuccess={showSuccess}
            onError={showError}
          />
        ) : activeSection === 'reports' ? (
          <ReportsPage
            editions={editions}
            editionSummaries={editionSummaries}
            participations={participations}
            payments={payments}
            loading={loading}
            onSuccess={showSuccess}
          />
        ) : (
          <SettingsPage
            stats={storageStats}
            onRefresh={loadAllData}
            onSuccess={showSuccess}
            onError={showError}
          />
        )}
      </SidebarLayout>

      <ToastBanner toast={toast} onDismiss={() => setToast(null)} />
    </>
  );
}
