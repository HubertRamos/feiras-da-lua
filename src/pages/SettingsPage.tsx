import { Download, Trash2, Upload } from 'lucide-react';
import { useRef, useState, type ChangeEvent } from 'react';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Modal } from '../components/ui/Modal';
import type { ImportMode } from '../data/DatabaseProvider';
import { loadDemoData } from '../services/demoData';
import { fairService } from '../services/fairService';
import type { StorageStats } from '../types/domain';

interface SettingsPageProps {
  stats: StorageStats | null;
  onRefresh: () => Promise<void>;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

export function SettingsPage({
  stats,
  onRefresh,
  onSuccess,
  onError,
}: SettingsPageProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [pendingImportJson, setPendingImportJson] = useState<string | null>(null);
  const [pendingImportFilename, setPendingImportFilename] = useState<string>('');
  const [importMode, setImportMode] = useState<ImportMode>('replace');
  const [importing, setImporting] = useState(false);

  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [clearing, setClearing] = useState(false);

  const [confirmDemoOpen, setConfirmDemoOpen] = useState(false);
  const [loadingDemo, setLoadingDemo] = useState(false);

  const handleExportBackup = async () => {
    try {
      const snapshot = await fairService.exportBackup();
      const json = JSON.stringify(snapshot, null, 2);
      const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `feira-da-lua-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
      onSuccess('Backup exportado em JSON com sucesso.');
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Erro ao exportar backup.');
    }
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    try {
      const text = await file.text();
      setPendingImportJson(text);
      setPendingImportFilename(file.name);
      setImportMode('replace');
    } catch {
      onError('Não foi possível ler o arquivo selecionado.');
    }
  };

  const handleConfirmImport = async () => {
    if (!pendingImportJson) return;
    setImporting(true);
    try {
      const snapshot = await fairService.importBackup(pendingImportJson, importMode);
      setPendingImportJson(null);
      await onRefresh();
      onSuccess(
        `Backup importado (${snapshot.vendors.length} feirantes, ${snapshot.fair_editions.length} edições).`
      );
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Falha ao validar ou importar o backup.');
    } finally {
      setImporting(false);
    }
  };

  const handleLoadDemo = async () => {
    setLoadingDemo(true);
    try {
      await loadDemoData();
      setConfirmDemoOpen(false);
      await onRefresh();
      onSuccess('Dados de demonstração carregados no banco local.');
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Erro ao carregar dados de demonstração.');
    } finally {
      setLoadingDemo(false);
    }
  };

  const handleClearAll = async () => {
    setClearing(true);
    try {
      await fairService.clearAllData();
      setConfirmClearOpen(false);
      await onRefresh();
      onSuccess('Todos os dados locais foram removidos.');
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Erro ao limpar dados locais.');
    } finally {
      setClearing(false);
    }
  };

  const hasExistingRecords =
    (stats?.vendorsCount ?? 0) > 0 ||
    (stats?.editionsCount ?? 0) > 0 ||
    (stats?.paymentsCount ?? 0) > 0;

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Informações básicas e estado do armazenamento */}
      <section className="bg-white border border-slate-200 rounded-lg p-6">
        <h2 className="text-base font-semibold text-slate-900">
          Informações da aplicação e armazenamento
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Os registros da Feira da Lua são salvos localmente neste navegador e permanecem
          disponíveis mesmo após fechar a página.
        </p>

        <dl className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-100 text-sm">
          <div>
            <dt className="text-xs text-slate-500">Aplicação</dt>
            <dd className="mt-0.5 font-medium text-slate-900">
              Feira da Lua — Painel Administrativo
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Armazenamento atual</dt>
            <dd className="mt-0.5 font-medium text-slate-900">
              {stats?.provider === 'local'
                ? 'Banco Local (IndexedDB no navegador)'
                : 'Supabase'}
            </dd>
          </div>
        </dl>

        <div className="mt-5 pt-4 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-slate-500">Feirantes</p>
            <p className="mt-0.5 text-lg font-semibold font-mono tabular-nums text-slate-900">
              {stats?.vendorsCount ?? 0}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Edições</p>
            <p className="mt-0.5 text-lg font-semibold font-mono tabular-nums text-slate-900">
              {stats?.editionsCount ?? 0}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Participações</p>
            <p className="mt-0.5 text-lg font-semibold font-mono tabular-nums text-slate-900">
              {stats?.participationsCount ?? 0}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Pagamentos</p>
            <p className="mt-0.5 text-lg font-semibold font-mono tabular-nums text-slate-900">
              {stats?.paymentsCount ?? 0}
            </p>
          </div>
        </div>
      </section>

      {/* Backup e Restauração */}
      <section className="bg-white border border-slate-200 rounded-lg p-6">
        <h2 className="text-base font-semibold text-slate-900">Backup dos dados</h2>
        <p className="mt-1 text-sm text-slate-500 leading-relaxed">
          Exporte uma cópia de segurança em arquivo JSON para guardar em outro local ou transferir
          para outro computador. A importação valida a estrutura dos registros antes de gravar.
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleExportBackup}
            className="min-h-[40px] inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-800 rounded-md hover:bg-indigo-900 transition-colors"
          >
            <Download className="w-4 h-4" aria-hidden="true" />
            Exportar backup (JSON)
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="min-h-[40px] inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors"
          >
            <Upload className="w-4 h-4" aria-hidden="true" />
            Importar backup (JSON)
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      </section>

      {/* Dados de Demonstração e Limpeza */}
      <section className="bg-white border border-slate-200 rounded-lg p-6">
        <h2 className="text-base font-semibold text-slate-900">Dados de demonstração e limpeza</h2>
        <p className="mt-1 text-sm text-slate-500 leading-relaxed">
          Caso deseje experimentar o painel rapidamente, carregue registros de exemplo ou remova
          todos os dados armazenados neste navegador.
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => {
              if (hasExistingRecords) {
                setConfirmDemoOpen(true);
              } else {
                handleLoadDemo();
              }
            }}
            disabled={loadingDemo}
            className="min-h-[40px] inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors"
          >
            {loadingDemo ? 'Carregando...' : 'Carregar dados de demonstração'}
          </button>

          {hasExistingRecords && (
            <button
              type="button"
              onClick={() => setConfirmClearOpen(true)}
              className="min-h-[40px] inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-rose-700 bg-white border border-rose-200 rounded-md hover:bg-rose-50 transition-colors"
            >
              <Trash2 className="w-4 h-4" aria-hidden="true" />
              Limpar todos os dados
            </button>
          )}
        </div>
      </section>

      {/* Modal de escolha de modo de importação */}
      <Modal
        open={Boolean(pendingImportJson)}
        onClose={() => setPendingImportJson(null)}
        title="Importar backup"
        subtitle={pendingImportFilename}
        maxWidthClass="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Escolha como deseja aplicar os dados do arquivo selecionado:
          </p>

          <div className="space-y-2.5">
            <label className="flex items-start gap-3 p-3 border border-slate-200 rounded-md cursor-pointer hover:bg-slate-50">
              <input
                type="radio"
                name="import-mode"
                value="replace"
                checked={importMode === 'replace'}
                onChange={() => setImportMode('replace')}
                className="mt-1"
              />
              <div>
                <p className="text-sm font-medium text-slate-900">Substituir dados atuais</p>
                <p className="text-xs text-slate-500">
                  Apaga os registros atuais deste navegador e restaura exatamente o backup.
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 border border-slate-200 rounded-md cursor-pointer hover:bg-slate-50">
              <input
                type="radio"
                name="import-mode"
                value="merge"
                checked={importMode === 'merge'}
                onChange={() => setImportMode('merge')}
                className="mt-1"
              />
              <div>
                <p className="text-sm font-medium text-slate-900">Mesclar com dados existentes</p>
                <p className="text-xs text-slate-500">
                  Mantém os registros atuais e adiciona apenas os itens novos do backup.
                </p>
              </div>
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setPendingImportJson(null)}
              disabled={importing}
              className="min-h-[40px] px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirmImport}
              disabled={importing}
              className="min-h-[40px] px-4 py-2 text-sm font-medium text-white bg-indigo-800 rounded-md hover:bg-indigo-900 disabled:opacity-50"
            >
              {importing ? 'Importando...' : 'Confirmar importação'}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmDemoOpen}
        onClose={() => setConfirmDemoOpen(false)}
        onConfirm={handleLoadDemo}
        busy={loadingDemo}
        tone="primary"
        title="Substituir por dados de demonstração"
        description="Já existem registros salvos localmente. Carregar os dados de demonstração substituirá os dados atuais por registros de exemplo."
        confirmLabel="Carregar demonstração"
      />

      <ConfirmDialog
        open={confirmClearOpen}
        onClose={() => setConfirmClearOpen(false)}
        onConfirm={handleClearAll}
        busy={clearing}
        tone="danger"
        title="Remover todos os dados locais"
        description="Esta ação apaga permanentemente todos os feirantes, edições, participações e pagamentos salvos neste navegador. Recomenda-se exportar um backup antes."
        confirmLabel="Apagar tudo"
      />
    </div>
  );
}
