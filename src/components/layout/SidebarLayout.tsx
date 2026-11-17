import {
  BarChart3,
  CalendarDays,
  CreditCard,
  LayoutDashboard,
  Menu,
  Moon,
  Settings,
  Users,
  X,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';

export type NavSection =
  | 'overview'
  | 'vendors'
  | 'editions'
  | 'payments'
  | 'reports'
  | 'settings';

interface NavItem {
  id: NavSection;
  label: string;
  icon: typeof LayoutDashboard;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'overview', label: 'Visão geral', icon: LayoutDashboard },
  { id: 'vendors', label: 'Feirantes', icon: Users },
  { id: 'editions', label: 'Edições da feira', icon: CalendarDays },
  { id: 'payments', label: 'Pagamentos', icon: CreditCard },
  { id: 'reports', label: 'Relatórios', icon: BarChart3 },
  { id: 'settings', label: 'Configurações', icon: Settings },
];

interface SidebarLayoutProps {
  activeSection: NavSection;
  onNavigate: (section: NavSection) => void;
  pageTitle: string;
  pageSubtitle?: string;
  headerAction?: ReactNode;
  children: ReactNode;
}

export function SidebarLayout({
  activeSection,
  onNavigate,
  pageTitle,
  pageSubtitle,
  headerAction,
  children,
}: SidebarLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSelect = (section: NavSection) => {
    onNavigate(section);
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-slate-50 text-slate-900">
      {/* Barra superior compacta em dispositivos móveis */}
      <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between gap-4 px-4 h-14 bg-slate-950 text-white border-b border-slate-800">
        <div className="flex items-center gap-2.5 min-w-0">
          <Moon className="w-5 h-5 text-amber-300 shrink-0" aria-hidden="true" />
          <span className="font-semibold text-base tracking-tight whitespace-nowrap truncate">
            Feira da Lua
          </span>
        </div>
        <button
          type="button"
          onClick={() => setMobileMenuOpen((v) => !v)}
          aria-label={mobileMenuOpen ? 'Fechar menu' : 'Abrir menu'}
          aria-expanded={mobileMenuOpen}
          className="min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-md text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* Drawer móvel */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-slate-950/60"
          onClick={() => setMobileMenuOpen(false)}
        >
          <aside
            className="w-64 h-full bg-slate-950 text-slate-100 flex flex-col border-r border-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 h-16 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <Moon className="w-5 h-5 text-amber-300 shrink-0" aria-hidden="true" />
                <span className="font-semibold text-base tracking-tight text-white">
                  Feira da Lua
                </span>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Fechar menu"
                className="min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-md text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 p-3 space-y-1" aria-label="Navegação principal">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelect(item.id)}
                    className={`w-full min-h-[44px] flex items-center gap-3 px-3.5 py-2.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                      isActive
                        ? 'bg-slate-800 text-white'
                        : 'text-slate-300 hover:text-white hover:bg-slate-900'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </aside>
        </div>
      )}

      {/* Menu lateral fixo no desktop */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:shrink-0 bg-slate-950 text-slate-100 border-r border-slate-800">
        <div className="flex items-center gap-2.5 px-6 h-16 border-b border-slate-800/80">
          <Moon className="w-5 h-5 text-amber-300 shrink-0" aria-hidden="true" />
          <span className="font-semibold text-base tracking-tight text-white whitespace-nowrap">
            Feira da Lua
          </span>
        </div>

        <nav className="flex-1 px-3 py-5 space-y-1" aria-label="Navegação principal">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelect(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`w-full min-h-[42px] flex items-center gap-3 px-3.5 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="px-6 py-4 border-t border-slate-800/80 text-xs text-slate-400">
          Painel Administrativo
        </div>
      </aside>

      {/* Área principal */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="bg-white border-b border-slate-200 px-4 sm:px-8 py-4">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-xl font-semibold text-slate-900 tracking-tight truncate">
                {pageTitle}
              </h1>
              {pageSubtitle && (
                <p className="mt-0.5 text-sm text-slate-500">{pageSubtitle}</p>
              )}
            </div>
            {headerAction && <div className="shrink-0 flex items-center gap-3">{headerAction}</div>}
          </div>
        </header>

        <main className="flex-1 px-4 sm:px-8 py-6">
          <div className="max-w-6xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
