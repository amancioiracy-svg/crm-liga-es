import React from 'react';
import { User, Salesperson } from '../types';
import {
  LayoutDashboard,
  Users,
  Share2,
  Briefcase,
  Clock,
  Database,
  Layers,
  LogOut,
  ChevronRight,
  Shield
} from 'lucide-react';

export type AdminViewSection = 
  | 'cockpit'
  | 'usuarios'
  | 'carteiras'
  | 'vendedores'
  | 'auditoria'
  | 'blindagem';

interface AdminSidebarProps {
  currentSection: AdminViewSection;
  onChangeSection: (section: AdminViewSection) => void;
  selectedSalespersonId?: string;
  onSelectSalesperson: (id: string) => void;
  currentUser: User;
  salespeople: Salesperson[];
  totalLeadsCount: number;
  onNavigateToKanban: () => void;
  onLogout: () => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  currentSection,
  onChangeSection,
  selectedSalespersonId,
  onSelectSalesperson,
  currentUser,
  salespeople,
  totalLeadsCount,
  onNavigateToKanban,
  onLogout
}) => {
  return (
    <aside className="w-64 bg-white border-r border-neutral-200 flex flex-col h-screen shrink-0 select-none z-20">
      {/* Top Brand Header */}
      <div className="p-4 border-b border-neutral-200">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-neutral-900 flex items-center justify-center text-white shadow-xs font-bold text-sm">
            <Shield className="w-4 h-4 text-amber-400" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-neutral-900 text-sm tracking-tight">
                Super Admin
              </span>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold border border-amber-300">
                GOVERNANÇA
              </span>
            </div>
            <p className="text-[10px] text-neutral-400 truncate">
              Gestão Comercial & Diretoria
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Groups */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {/* Gestão Estratégica */}
        <div>
          <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block px-2 mb-1.5">
            Comando Executivo
          </span>

          <nav className="space-y-1">
            <button
              onClick={() => onChangeSection('cockpit')}
              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                currentSection === 'cockpit'
                  ? 'bg-neutral-900 text-white font-bold shadow-xs'
                  : 'text-neutral-700 hover:bg-neutral-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <LayoutDashboard className="w-4 h-4 text-neutral-400" />
                <span>Cockpit Geral</span>
              </div>
            </button>

            <button
              onClick={() => onChangeSection('usuarios')}
              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                currentSection === 'usuarios'
                  ? 'bg-neutral-900 text-white font-bold shadow-xs'
                  : 'text-neutral-700 hover:bg-neutral-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Users className="w-4 h-4 text-neutral-400" />
                <span>Gestão da Equipe</span>
              </div>
            </button>

            <button
              onClick={() => onChangeSection('carteiras')}
              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                currentSection === 'carteiras'
                  ? 'bg-neutral-900 text-white font-bold shadow-xs'
                  : 'text-neutral-700 hover:bg-neutral-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Share2 className="w-4 h-4 text-neutral-400" />
                <span>Divisão de Carteiras</span>
              </div>
            </button>
          </nav>
        </div>

        {/* Raio-X Individual dos Vendedores */}
        <div>
          <div className="flex items-center justify-between px-2 mb-1.5">
            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">
              Raio-X do Closer
            </span>
            <span className="text-[9px] font-mono text-neutral-400 font-bold">
              {salespeople.length} ativos
            </span>
          </div>

          <div className="space-y-1">
            <button
              onClick={() => {
                onSelectSalesperson('ALL');
                onChangeSection('vendedores');
              }}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                currentSection === 'vendedores' && selectedSalespersonId === 'ALL'
                  ? 'bg-neutral-900 text-white font-bold shadow-xs'
                  : 'text-neutral-700 hover:bg-neutral-100'
              }`}
            >
              <div className="flex items-center gap-2">
                <Briefcase className="w-3.5 h-3.5 text-neutral-400" />
                <span>Todos os Closers</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 opacity-60" />
            </button>

            {salespeople.length === 0 ? (
              <div className="px-2.5 py-2 text-[11px] text-neutral-400 italic">
                Nenhum vendedor cadastrado ainda no banco.
              </div>
            ) : (
              salespeople.map((seller) => {
                const isCurrent = currentSection === 'vendedores' && selectedSalespersonId === seller.id;
                return (
                  <button
                    key={seller.id}
                    onClick={() => {
                      onSelectSalesperson(seller.id);
                      onChangeSection('vendedores');
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
                      isCurrent
                        ? 'bg-blue-50 text-blue-900 font-bold border border-blue-200 shadow-2xs'
                        : 'text-neutral-700 hover:bg-neutral-100'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: seller.color || '#0284c7' }}
                      />
                      <span className="truncate">{seller.name}</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 opacity-50" />
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Governança & Auditoria */}
        <div>
          <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block px-2 mb-1.5">
            Auditoria & Infra
          </span>

          <nav className="space-y-1">
            <button
              onClick={() => onChangeSection('auditoria')}
              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                currentSection === 'auditoria'
                  ? 'bg-neutral-900 text-white font-bold shadow-xs'
                  : 'text-neutral-700 hover:bg-neutral-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Clock className="w-4 h-4 text-neutral-400" />
                <span>Caixa-Preta de Logs</span>
              </div>
            </button>

            <button
              onClick={() => onChangeSection('blindagem')}
              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                currentSection === 'blindagem'
                  ? 'bg-neutral-900 text-white font-bold shadow-xs'
                  : 'text-neutral-700 hover:bg-neutral-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Database className="w-4 h-4 text-neutral-400" />
                <span>Infraestrutura Railway</span>
              </div>
            </button>
          </nav>
        </div>
      </div>

      {/* Bottom Switch to Operational Field (Kanban) & Session */}
      <div className="p-3 border-t border-neutral-200 bg-neutral-50/70 space-y-2">
        <button
          onClick={onNavigateToKanban}
          className="w-full flex items-center justify-between p-2 rounded-xl bg-white hover:bg-neutral-100 border border-neutral-200 text-xs font-bold text-neutral-800 shadow-2xs transition-colors"
          title="Alternar para visão operacional de atendimento"
        >
          <div className="flex items-center gap-2">
            <Layers className="w-3.5 h-3.5 text-blue-600" />
            <span>Visão Kanban de Vendas</span>
          </div>
          <span className="text-[9px] font-mono bg-neutral-100 text-neutral-600 px-1.5 py-0.5 rounded">
            {totalLeadsCount}
          </span>
        </button>

        <div className="flex items-center justify-between pt-1">
          <div className="min-w-0 pr-2">
            <div className="text-xs font-bold text-neutral-900 truncate">
              {currentUser.name}
            </div>
            <div className="text-[10px] text-neutral-400 font-mono truncate">
              {currentUser.email}
            </div>
          </div>

          <button
            onClick={onLogout}
            className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors shrink-0"
            title="Sair do sistema"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
