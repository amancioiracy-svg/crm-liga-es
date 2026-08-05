import React from 'react';
import { LayoutGrid, Table, FileArchive, Sparkles, Tag } from 'lucide-react';

interface SidebarProps {
  activeTab: 'kanban' | 'table';
  setActiveTab: (tab: 'kanban' | 'table') => void;
  onOpenZipModal: () => void;
  onOpenTagsModal: () => void;
  onSeedSamples: () => void;
  totalLeads: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  onOpenZipModal,
  onOpenTagsModal,
  onSeedSamples,
  totalLeads
}) => {
  return (
    <aside className="w-52 bg-white border-r border-neutral-200 flex flex-col justify-between h-screen shrink-0 sticky top-0 select-none">
      {/* Top Header */}
      <div>
        <div className="p-3 border-b border-neutral-100 flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-neutral-900 text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
            CRM
          </div>
          <div className="min-w-0">
            <h1 className="text-xs font-bold text-neutral-900 leading-tight truncate">
              CRM de Leads
            </h1>
            <p className="text-[10px] text-neutral-400 truncate">
              Acompanhamento & Ligações
            </p>
          </div>
        </div>

        {/* Navigation Menu */}
        <div className="p-2.5 space-y-1">
          <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider px-2 py-0.5 block">
            Navegação
          </span>

          <button
            onClick={() => setActiveTab('kanban')}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === 'kanban'
                ? 'bg-neutral-100 text-neutral-900 font-semibold'
                : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <LayoutGrid className="w-4 h-4 text-neutral-500 shrink-0" />
              <span className="truncate">Pipeline (Kanban)</span>
            </div>
            <span className="text-[10px] font-mono bg-neutral-200/80 text-neutral-700 px-1.5 py-0.5 rounded shrink-0 ml-1">
              {totalLeads}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('table')}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === 'table'
                ? 'bg-neutral-100 text-neutral-900 font-semibold'
                : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <Table className="w-4 h-4 text-neutral-500 shrink-0" />
              <span className="truncate">Lista Geral</span>
            </div>
          </button>
        </div>

        {/* Tags & Actions Section */}
        <div className="p-2.5 space-y-1.5 border-t border-neutral-100 mt-1">
          <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider px-2 py-0.5 block">
            Ações & Configurações
          </span>

          <button
            onClick={onOpenTagsModal}
            className="w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-neutral-800 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors border border-neutral-200"
            title="Gerenciar Etiquetas de Ligações Customizadas"
          >
            <Tag className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span className="truncate">Gerenciar Tags</span>
          </button>

          <button
            onClick={onOpenZipModal}
            className="w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg transition-colors shadow-2xs"
          >
            <FileArchive className="w-3.5 h-3.5 text-neutral-300 shrink-0" />
            <span className="truncate">Upload ZIP</span>
          </button>

          <button
            onClick={onSeedSamples}
            className="w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors border border-neutral-200"
            title="Adiciona 5 leads de demonstração para testes rápidos"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span className="truncate">Leads de Exemplo</span>
          </button>
        </div>
      </div>

      {/* Footer Info */}
      <div className="p-3 border-t border-neutral-100 text-[10px] text-neutral-400 space-y-0.5">
        <div className="flex items-center justify-between">
          <span className="truncate">Railway Ready</span>
          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse shrink-0"></span>
        </div>
        <p className="text-[10px] text-neutral-400 truncate">
          PostgreSQL Active
        </p>
      </div>
    </aside>
  );
};

