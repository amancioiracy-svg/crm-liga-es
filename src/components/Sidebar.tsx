import React, { useState } from 'react';
import { LayoutGrid, Table, FileArchive, Sparkles, Tag, BarChart3, Menu, X, Users, MessageSquare, UserCheck, ChevronRight } from 'lucide-react';
import { Salesperson } from '../types';
import { getSalespersonSlug } from '../lib/salesperson';

interface SidebarProps {
  activeTab: 'kanban' | 'table' | 'dashboard';
  setActiveTab: (tab: 'kanban' | 'table' | 'dashboard') => void;
  onOpenZipModal: () => void;
  onOpenTagsModal: () => void;
  onOpenSalesTeamModal: () => void;
  onOpenWhatsAppSettings: () => void;
  onSeedSamples: () => void;
  totalLeads: number;
  salespeopleCount?: number;
  activeSalesperson?: Salesperson;
  onClearSalespersonFilter?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  onOpenZipModal,
  onOpenTagsModal,
  onOpenSalesTeamModal,
  onOpenWhatsAppSettings,
  onSeedSamples,
  totalLeads,
  salespeopleCount = 1,
  activeSalesperson,
  onClearSalespersonFilter
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      {/* DESKTOP SIDEBAR - Only visible on xl screens (1280px+) */}
      <aside className="hidden xl:flex w-52 bg-white border-r border-neutral-200 flex-col justify-between h-screen shrink-0 sticky top-0 select-none">
        {/* Top Header */}
        <div>
          <div className="p-3 border-b border-neutral-100 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-neutral-900 text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
                CRM
              </div>
              <div className="min-w-0">
                <h1 className="text-xs font-bold text-neutral-900 leading-tight truncate">
                  {activeSalesperson ? `CRM • ${activeSalesperson.name}` : 'CRM de Leads'}
                </h1>
                <p className="text-[10px] text-neutral-400 truncate">
                  {activeSalesperson ? `/v/${getSalespersonSlug(activeSalesperson)}` : 'Acompanhamento & Ligações'}
                </p>
              </div>
            </div>
          </div>

          {activeSalesperson && (
            <div className="mx-2.5 mt-2.5 p-2 rounded-xl border border-blue-200 bg-blue-50/80">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-800">
                  Instância do Vendedor
                </span>
                <span 
                  className="w-2.5 h-2.5 rounded-full" 
                  style={{ backgroundColor: activeSalesperson.color || '#0284c7' }} 
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-900 truncate">
                  {activeSalesperson.name}
                </span>
                {onClearSalespersonFilter && (
                  <button
                    onClick={onClearSalespersonFilter}
                    className="text-[10px] text-blue-700 hover:text-blue-900 underline font-semibold"
                  >
                    Ver Todos
                  </button>
                )}
              </div>
            </div>
          )}

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

            <button
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeTab === 'dashboard'
                  ? 'bg-neutral-100 text-neutral-900 font-semibold'
                  : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <BarChart3 className="w-4 h-4 text-blue-600 shrink-0" />
                <span className="truncate">Dashboard Analítico</span>
              </div>
            </button>
          </div>

          {/* Tags & Actions Section */}
          <div className="p-2.5 space-y-1.5 border-t border-neutral-100 mt-1">
            <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider px-2 py-0.5 block">
              Ações & Equipe
            </span>

            <button
              onClick={onOpenSalesTeamModal}
              className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs font-semibold text-blue-800 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200"
              title="Gerenciar vendedores e distribuir leads novos"
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <Users className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span className="truncate">Equipe & Divisão</span>
              </div>
              <span className="text-[10px] bg-blue-200 text-blue-900 px-1.5 py-0.2 rounded-full font-bold">
                {salespeopleCount}
              </span>
            </button>

            <button
              onClick={onOpenWhatsAppSettings}
              className="w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors border border-emerald-200"
              title="Personalizar mensagem padrão enviada no WhatsApp"
            >
              <MessageSquare className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="truncate">Mensagem WhatsApp</span>
            </button>

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

      {/* MOBILE TOP BAR (Only visible on screens < xl) */}
      <div className="xl:hidden bg-white border-b border-neutral-200 px-3 py-2 flex items-center justify-between sticky top-0 z-30 shadow-2xs shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-neutral-900 text-white flex items-center justify-center font-bold text-xs shrink-0">
            CRM
          </div>
          <div className="min-w-0">
            <h1 className="text-xs font-bold text-neutral-900 leading-tight truncate">
              {activeSalesperson ? activeSalesperson.name : 'CRM Leads'}
            </h1>
            <p className="text-[10px] text-neutral-500 font-mono truncate">
              {totalLeads} lead(s) {activeSalesperson && `• /v/${getSalespersonSlug(activeSalesperson)}`}
            </p>
          </div>
        </div>

        {/* Quick View Switcher Tabs for Mobile */}
        <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('kanban')}
            className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors flex items-center gap-1 ${
              activeTab === 'kanban' ? 'bg-white text-neutral-900 shadow-2xs' : 'text-neutral-600'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Kanban</span>
          </button>

          <button
            onClick={() => setActiveTab('table')}
            className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors flex items-center gap-1 ${
              activeTab === 'table' ? 'bg-white text-neutral-900 shadow-2xs' : 'text-neutral-600'
            }`}
          >
            <Table className="w-3.5 h-3.5" />
            <span>Tabela</span>
          </button>

          <button
            onClick={() => setActiveTab('dashboard')}
            className={`p-1 rounded text-xs font-semibold transition-colors ${
              activeTab === 'dashboard' ? 'bg-white text-blue-600 shadow-2xs' : 'text-neutral-600'
            }`}
            title="Analytics"
          >
            <BarChart3 className="w-4 h-4" />
          </button>
        </div>

        {/* Hamburger Menu Toggle Button */}
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="p-1.5 text-neutral-700 hover:bg-neutral-100 rounded-lg shrink-0 border border-neutral-200"
          aria-label="Menu Principal"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* MOBILE DRAWER / SLIDE-OVER MENU */}
      {mobileMenuOpen && (
        <div
          className="xl:hidden fixed inset-0 z-50 bg-neutral-900/50 backdrop-blur-xs flex justify-end animate-in fade-in duration-200"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            className="w-72 bg-white h-full shadow-2xl flex flex-col justify-between p-4 animate-in slide-in-from-right duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-neutral-100 mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-neutral-900 text-white flex items-center justify-center font-bold text-xs">
                    CRM
                  </div>
                  <div>
                    <h2 className="text-xs font-bold text-neutral-900">Menu do Sistema</h2>
                    <p className="text-[10px] text-neutral-400">Opções & Ferramentas</p>
                  </div>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 text-neutral-400 hover:text-neutral-700 rounded-lg hover:bg-neutral-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block px-2 mb-1">
                  Navegação Principal
                </span>
                <button
                  onClick={() => {
                    setActiveTab('kanban');
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between p-2.5 rounded-lg text-xs font-medium ${
                    activeTab === 'kanban' ? 'bg-neutral-100 text-neutral-900 font-bold' : 'text-neutral-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <LayoutGrid className="w-4 h-4 text-neutral-500" />
                    <span>Pipeline Kanban</span>
                  </div>
                  <span className="text-[10px] font-mono bg-neutral-200 text-neutral-700 px-2 py-0.5 rounded-full">
                    {totalLeads}
                  </span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab('table');
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between p-2.5 rounded-lg text-xs font-medium ${
                    activeTab === 'table' ? 'bg-neutral-100 text-neutral-900 font-bold' : 'text-neutral-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Table className="w-4 h-4 text-neutral-500" />
                    <span>Lista Completa</span>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setActiveTab('dashboard');
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between p-2.5 rounded-lg text-xs font-medium ${
                    activeTab === 'dashboard' ? 'bg-neutral-100 text-blue-700 font-bold' : 'text-neutral-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-blue-600" />
                    <span>Dashboard Analítico</span>
                  </div>
                </button>
              </div>

              <div className="border-t border-neutral-100 my-4 pt-3 space-y-2">
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block px-2">
                  Equipe & Ferramentas
                </span>

                <button
                  onClick={() => {
                    onOpenSalesTeamModal();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center justify-between p-2.5 rounded-lg text-xs font-semibold text-blue-900 bg-blue-50 border border-blue-200"
                >
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-600" />
                    <span>Equipe & Divisão de Leads</span>
                  </div>
                  <span className="text-[10px] bg-blue-200 text-blue-900 px-2 py-0.5 rounded-full font-bold">
                    {salespeopleCount}
                  </span>
                </button>

                <button
                  onClick={() => {
                    onOpenWhatsAppSettings();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 p-2.5 rounded-lg text-xs font-semibold text-emerald-900 bg-emerald-50 border border-emerald-200"
                >
                  <MessageSquare className="w-4 h-4 text-emerald-600" />
                  <span>Configurar Mensagem WhatsApp</span>
                </button>

                <button
                  onClick={() => {
                    onOpenTagsModal();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 p-2.5 rounded-lg text-xs font-semibold text-neutral-800 bg-neutral-100 border border-neutral-200"
                >
                  <Tag className="w-4 h-4 text-blue-600" />
                  <span>Gerenciar Etiquetas</span>
                </button>

                <button
                  onClick={() => {
                    onOpenZipModal();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 p-2.5 rounded-lg text-xs font-semibold text-white bg-neutral-900 shadow-2xs"
                >
                  <FileArchive className="w-4 h-4 text-neutral-300" />
                  <span>Upload de Arquivos ZIP</span>
                </button>

                <button
                  onClick={() => {
                    onSeedSamples();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 p-2.5 rounded-lg text-xs font-medium text-neutral-700 bg-neutral-100 border border-neutral-200"
                >
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>Gerar Leads de Exemplo</span>
                </button>
              </div>
            </div>

            <div className="pt-3 border-t border-neutral-100 text-[10px] text-neutral-400 flex items-center justify-between">
              <span>Mobile Mode Active</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};


