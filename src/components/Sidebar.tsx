import React from 'react';
import { LayoutGrid, Table, FileArchive, Plus, Sparkles, Building2, PhoneCall } from 'lucide-react';

interface SidebarProps {
  activeTab: 'kanban' | 'table';
  setActiveTab: (tab: 'kanban' | 'table') => void;
  onOpenZipModal: () => void;
  onSeedSamples: () => void;
  totalLeads: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  onOpenZipModal,
  onSeedSamples,
  totalLeads
}) => {
  return (
    <aside className="w-64 bg-white border-r border-neutral-200 flex flex-col justify-between h-screen shrink-0 sticky top-0 select-none">
      {/* Top Header */}
      <div>
        <div className="p-4 border-b border-neutral-100 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-neutral-900 text-white flex items-center justify-center font-bold text-sm shadow-xs">
            CRM
          </div>
          <div>
            <h1 className="text-xs font-bold text-neutral-900 leading-tight">
              CRM de Leads
            </h1>
            <p className="text-[10px] text-neutral-400">
              Acompanhamento & Ligações
            </p>
          </div>
        </div>

        {/* Navigation Menu */}
        <div className="p-3 space-y-1">
          <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider px-3 py-1 block">
            Navegação
          </span>

          <button
            onClick={() => setActiveTab('kanban')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
              activeTab === 'kanban'
                ? 'bg-neutral-100 text-neutral-900 font-semibold'
                : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <LayoutGrid className="w-4 h-4 text-neutral-500" />
              <span>Pipeline (Kanban)</span>
            </div>
            <span className="text-[10px] font-mono bg-neutral-200/80 text-neutral-700 px-1.5 py-0.5 rounded">
              {totalLeads}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('table')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
              activeTab === 'table'
                ? 'bg-neutral-100 text-neutral-900 font-semibold'
                : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <Table className="w-4 h-4 text-neutral-500" />
              <span>Lista Geral de Leads</span>
            </div>
          </button>
        </div>

        {/* Import & Actions Section */}
        <div className="p-3 space-y-2 border-t border-neutral-100 mt-2">
          <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider px-3 py-1 block">
            Ações & Importação
          </span>

          <button
            onClick={onOpenZipModal}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg transition-colors shadow-2xs"
          >
            <FileArchive className="w-4 h-4 text-neutral-300" />
            <span>Upload de ZIP Recursivo</span>
          </button>

          <button
            onClick={onSeedSamples}
            className="w-full flex items-center justify-center gap-2 px-3 py-1.5 text-xs font-medium text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors border border-neutral-200"
            title="Adiciona 5 leads de demonstração para testes rápidos"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Gerar Leads de Exemplo</span>
          </button>
        </div>
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-neutral-100 text-[11px] text-neutral-400 space-y-1">
        <div className="flex items-center justify-between text-[10px]">
          <span>Deploy Railway Ready</span>
          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
        </div>
        <p className="text-[10px] text-neutral-400">
          PostgreSQL Database Active
        </p>
      </div>
    </aside>
  );
};
