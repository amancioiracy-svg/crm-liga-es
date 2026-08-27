import React, { useState, useEffect, useCallback } from 'react';
import { Lead, ColumnStatus, CustomTag, Salesperson } from './types';
import { Sidebar } from './components/Sidebar';
import { KanbanBoard } from './components/KanbanBoard';
import { AllLeadsTable } from './components/AllLeadsTable';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { LeadDetailModal } from './components/LeadDetailModal';
import { TagManagerModal } from './components/TagManagerModal';
import { ZipUploadModal } from './components/ZipUploadModal';
import { JsonBatchUpdateModal } from './components/JsonBatchUpdateModal';
import { SalesTeamModal } from './components/SalesTeamModal';
import { WhatsAppSettingsModal } from './components/WhatsAppSettingsModal';
import { MetricsBar } from './components/MetricsBar';
import { Toast } from './components/Toast';
import { PhoneCall, Users, CheckCircle, RefreshCw, UserCheck, Share2, Plus, ArrowLeft, ExternalLink } from 'lucide-react';
import { getSalespersonSlug, matchSalespersonFromRoute } from './lib/salesperson';

export default function App() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [tags, setTags] = useState<CustomTag[]>([]);
  const [salespeople, setSalespeople] = useState<Salesperson[]>([
    { id: 'seller-thomas', name: 'Thomas', isDefault: true, color: '#0284c7', bgColor: '#e0f2fe' }
  ]);
  const [selectedSalespersonId, setSelectedSalespersonId] = useState<string>('ALL');
  const [routeSalespersonSlug, setRouteSalespersonSlug] = useState<string | null>(null);
  const [loadingLeads, setLoadingLeads] = useState(true);
  const [activeTab, setActiveTab] = useState<'kanban' | 'table' | 'dashboard'>('kanban');
  const [selectedTagFilters, setSelectedTagFilters] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Modals & Toasts
  const [selectedLeadForDetail, setSelectedLeadForDetail] = useState<Lead | null>(null);
  const [isZipModalOpen, setIsZipModalOpen] = useState(false);
  const [isTagsModalOpen, setIsTagsModalOpen] = useState(false);
  const [isJsonModalOpen, setIsJsonModalOpen] = useState(false);
  const [isSalesTeamModalOpen, setIsSalesTeamModalOpen] = useState(false);
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Parse salesperson route from URL (e.g. /v/thomas or /v/seller-thomas or /vendedor/thomas)
  const parseCurrentRoute = useCallback((allSellers: Salesperson[]) => {
    if (typeof window === 'undefined') return;
    const pathname = window.location.pathname;
    const match = pathname.match(/^\/(?:v|vendedor|seller)\/([^/]+)/i);

    if (match && match[1]) {
      const identifier = match[1];
      setRouteSalespersonSlug(identifier);
      const matchedSeller = matchSalespersonFromRoute(identifier, allSellers);
      if (matchedSeller) {
        setSelectedSalespersonId(matchedSeller.id);
      }
    } else {
      setRouteSalespersonSlug(null);
    }
  }, []);

  useEffect(() => {
    fetchTags();
    fetchSalespeople();
  }, []);

  // Listen to popstate (browser back/forward button)
  useEffect(() => {
    const handlePopState = () => {
      parseCurrentRoute(salespeople);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [salespeople, parseCurrentRoute]);

  // Navigate to salesperson route
  const handleNavigateToSalesperson = (sellerIdOrAll: string) => {
    if (sellerIdOrAll === 'ALL') {
      setSelectedSalespersonId('ALL');
      setRouteSalespersonSlug(null);
      if (window.location.pathname !== '/') {
        window.history.pushState({}, '', '/');
      }
    } else {
      const seller = salespeople.find((s) => s.id === sellerIdOrAll);
      if (seller) {
        setSelectedSalespersonId(seller.id);
        const slug = getSalespersonSlug(seller);
        setRouteSalespersonSlug(slug);
        const newPath = `/v/${slug}`;
        if (window.location.pathname !== newPath) {
          window.history.pushState({}, '', newPath);
        }
      } else {
        setSelectedSalespersonId(sellerIdOrAll);
      }
    }
  };

  const fetchSalespeople = async () => {
    try {
      const res = await fetch('/api/salespeople');
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setSalespeople(data);
          parseCurrentRoute(data);
        }
      }
    } catch (err) {
      console.error('Erro ao buscar vendedores:', err);
    }
  };

  // Re-fetch leads when selected salesperson changes or on initial load
  useEffect(() => {
    fetchLeads();
  }, [selectedSalespersonId]);

  const fetchLeads = async () => {
    setLoadingLeads(true);
    try {
      // If a specific salesperson route is active, we can fetch their isolated leads or full list
      const res = await fetch('/api/leads');
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        setLeads(Array.isArray(data) ? data : []);
      } else {
        setLeads([]);
      }
    } catch (err) {
      console.error('Erro ao buscar leads:', err);
      showToast('Erro ao carregar lista de leads.');
      setLeads([]);
    } finally {
      setLoadingLeads(false);
    }
  };

  const fetchTags = async () => {
    try {
      const res = await fetch('/api/tags');
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        setTags(data);
      }
    } catch (err) {
      console.error('Erro ao buscar etiquetas:', err);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Mover lead entre colunas do Kanban
  const handleUpdateLeadColumn = async (leadId: string, newColumn: ColumnStatus) => {
    // Atualização otimista na UI
    setLeads((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, columnStatus: newColumn } : l))
    );

    try {
      const res = await fetch(`/api/leads/${leadId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ columnStatus: newColumn })
      });

      if (!res.ok) {
        throw new Error('Falha ao salvar no banco');
      }
    } catch (err) {
      console.error(err);
      showToast('Erro ao atualizar status do lead.');
      fetchLeads(); // Reverte
    }
  };

  // Atribuir lead a um vendedor específico
  const handleReassignLead = async (leadId: string, salespersonId: string, salespersonName: string) => {
    // Atualização otimista na UI
    setLeads((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, salespersonId, salespersonName } : l))
    );

    if (selectedLeadForDetail && selectedLeadForDetail.id === leadId) {
      setSelectedLeadForDetail((prev) => prev ? { ...prev, salespersonId, salespersonName } : null);
    }

    try {
      const res = await fetch(`/api/leads/${leadId}/assign`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ salespersonId, salespersonName })
      });

      if (!res.ok) {
        throw new Error('Erro ao atribuir vendedor.');
      }
      fetchSalespeople();
    } catch (err) {
      console.error(err);
      showToast('Erro ao reatribuir vendedor.');
      fetchLeads();
    }
  };

  // Registrar ligação para o lead
  const handleAddCallLog = async (leadId: string, tag: string, comment: string, durationSeconds?: number, followUpAt?: string) => {
    const res = await fetch(`/api/leads/${leadId}/calls`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tag, comment, durationSeconds, followUpAt })
    });

    if (res.ok) {
      fetchLeads(); // Atualiza contagem
      fetchSalespeople();
    } else {
      throw new Error('Erro ao salvar ligação.');
    }
  };

  // Excluir Lead
  const handleDeleteLead = async (leadId: string) => {
    if (window.confirm('Tem certeza que deseja excluir este lead e todo seu histórico?')) {
      try {
        const res = await fetch(`/api/leads/${leadId}`, { method: 'DELETE' });
        if (res.ok) {
          setLeads((prev) => prev.filter((l) => l.id !== leadId));
          showToast('Lead removido com sucesso!');
          fetchSalespeople();
        }
      } catch (err) {
        console.error(err);
        showToast('Erro ao remover lead.');
      }
    }
  };

  // Semear leads de exemplo para teste rápido
  const handleSeedSamples = async () => {
    try {
      const res = await fetch('/api/seed-samples', { method: 'POST' });
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        showToast(data.message || 'Leads de exemplo carregados!');
        fetchLeads();
        fetchSalespeople();
      } else {
        showToast('Erro ao carregar resposta do servidor.');
      }
    } catch (err) {
      console.error(err);
      showToast('Erro ao gerar leads de exemplo.');
    }
  };

  // Filter leads by selected tags, salesperson AND global search query (Nome, Telefone, Site Nyroh, ID, Tag)
  const displayedLeads = leads.filter((l) => {
    // 1. Salesperson filter
    if (selectedSalespersonId !== 'ALL') {
      const sellerId = l.salespersonId || 'seller-thomas';
      if (sellerId !== selectedSalespersonId) return false;
    }

    // 2. Tag filter
    if (selectedTagFilters.length > 0) {
      if (!l.lastCallTag) return false;
      const lTags = l.lastCallTag.split(',').map((t) => t.trim());
      const hasTag = selectedTagFilters.some((fTag) => lTags.includes(fTag));
      if (!hasTag) return false;
    }

    // 3. Global search filter
    if (searchQuery.trim()) {
      const cleanSearch = searchQuery.trim().toLowerCase();
      const searchDigits = cleanSearch.replace(/\D/g, '');
      const leadPhoneDigits = (l.phoneNumber || '').replace(/\D/g, '');

      const matches =
        l.name.toLowerCase().includes(cleanSearch) ||
        l.phoneNumber.toLowerCase().includes(cleanSearch) ||
        (searchDigits.length >= 3 && leadPhoneDigits.includes(searchDigits)) ||
        (l.publicUrl && l.publicUrl.toLowerCase().includes(cleanSearch)) ||
        l.id.toLowerCase().includes(cleanSearch) ||
        (l.lastCallTag && l.lastCallTag.toLowerCase().includes(cleanSearch)) ||
        (l.salespersonName && l.salespersonName.toLowerCase().includes(cleanSearch));

      if (!matches) return false;
    }

    return true;
  });

  const activeSalesperson = salespeople.find((s) => s.id === selectedSalespersonId);

  return (
    <div className="flex flex-col xl:flex-row h-screen bg-[#f8f9fa] text-neutral-900 font-sans antialiased overflow-hidden">
      {/* Sidebar de Navegação */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenZipModal={() => setIsZipModalOpen(true)}
        onOpenTagsModal={() => setIsTagsModalOpen(true)}
        onOpenSalesTeamModal={() => setIsSalesTeamModalOpen(true)}
        onOpenWhatsAppSettings={() => setIsWhatsAppModalOpen(true)}
        onSeedSamples={handleSeedSamples}
        totalLeads={leads.length}
        salespeopleCount={salespeople.length}
        activeSalesperson={activeSalesperson}
        onClearSalespersonFilter={() => handleNavigateToSalesperson('ALL')}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen min-w-0 overflow-hidden">
        {/* Top Navbar Header with Salesperson Selector & Dedicated Instance indicator */}
        <header className="bg-white border-b border-neutral-200 px-3 md:px-6 py-2 md:py-2.5 flex flex-wrap items-center justify-between gap-2.5 shrink-0 shadow-2xs z-10">
          <div className="min-w-0 flex items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xs md:text-sm font-bold text-neutral-900 tracking-tight truncate">
                  {activeTab === 'kanban'
                    ? 'Pipeline Kanban de Vendas'
                    : activeTab === 'table'
                    ? 'Lista Completa de Leads'
                    : 'Dashboard Analítico de Vendas'}
                </h2>
                {activeSalesperson && (
                  <span
                    className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border shadow-2xs"
                    style={{
                      backgroundColor: activeSalesperson.bgColor || '#e0f2fe',
                      color: activeSalesperson.color || '#0284c7',
                      borderColor: `${activeSalesperson.color || '#0284c7'}40`
                    }}
                  >
                    <UserCheck className="w-3 h-3" />
                    <span>Instância: {activeSalesperson.name}</span>
                  </span>
                )}
              </div>
              <p className="text-[10px] md:text-[11px] text-neutral-500 truncate">
                {displayedLeads.length} de {leads.length} lead(s)
                {selectedSalespersonId !== 'ALL' && activeSalesperson && ` • Carteira Isolada`}
                {selectedTagFilters.length > 0 && ` • (${selectedTagFilters.length} tag(s))`}
              </p>
            </div>
          </div>

          {/* Salesperson Quick Tabs / Selector & Routing Switcher */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <div className="flex items-center bg-neutral-100/90 p-1 rounded-xl border border-neutral-200 shadow-2xs">
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider px-2 hidden sm:inline-block">
                Rota:
              </span>

              {/* All Sellers Button */}
              <button
                onClick={() => handleNavigateToSalesperson('ALL')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  selectedSalespersonId === 'ALL'
                    ? 'bg-white text-neutral-900 shadow-2xs font-bold'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
                title="Visualizar visão geral de todos os vendedores"
              >
                <Users className="w-3.5 h-3.5" />
                <span>Geral</span>
                <span className="text-[10px] font-mono bg-neutral-200 text-neutral-700 px-1.5 py-0.2 rounded-full font-bold">
                  {leads.length}
                </span>
              </button>

              {/* Individual Salesperson Pills with Dedicated Route Swapping */}
              {salespeople.map((seller) => {
                const sellerLeadCount = leads.filter(l => (l.salespersonId || 'seller-thomas') === seller.id).length;
                const isSelected = selectedSalespersonId === seller.id;

                return (
                  <button
                    key={seller.id}
                    onClick={() => handleNavigateToSalesperson(seller.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                      isSelected
                        ? 'bg-white text-blue-700 shadow-2xs ring-1 ring-neutral-200 font-bold'
                        : 'text-neutral-600 hover:text-neutral-900'
                    }`}
                    title={`Abrir rota exclusiva /v/${getSalespersonSlug(seller)}`}
                  >
                    <span 
                      className="w-2.5 h-2.5 rounded-full shrink-0" 
                      style={{ backgroundColor: seller.color || '#0284c7' }}
                    />
                    <span className="truncate max-w-[90px]">{seller.name}</span>
                    <span 
                      className="text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold"
                      style={{
                        backgroundColor: isSelected ? seller.bgColor || '#e0f2fe' : '#e5e7eb',
                        color: isSelected ? seller.color || '#0284c7' : '#374151'
                      }}
                    >
                      {sellerLeadCount}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Manage Sales Team & Distribute Leads Action Button */}
            <button
              onClick={() => setIsSalesTeamModalOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors"
              title="Cadastrar vendedores e dividir carteira de novos leads"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Equipe & Distribuir</span>
            </button>

            {/* Refresh Button */}
            <button
              onClick={() => {
                fetchLeads();
                fetchSalespeople();
              }}
              className="p-1.5 rounded-xl border border-neutral-200 text-neutral-600 hover:bg-neutral-50 transition-colors"
              title="Atualizar dados"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingLeads ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </header>

        {/* Barra de Métricas, Busca Global & Filtros de Vendas */}
        {activeTab !== 'dashboard' && (
          <MetricsBar
            leads={displayedLeads}
            totalLeadsCount={leads.length}
            tags={tags}
            selectedSalespersonId={selectedSalespersonId}
            selectedTagFilters={selectedTagFilters}
            onTagFilterChange={(newTags) => setSelectedTagFilters(newTags)}
            searchQuery={searchQuery}
            onSearchChange={(q) => setSearchQuery(q)}
            onShowToast={showToast}
            onOpenJsonBatchModal={() => setIsJsonModalOpen(true)}
          />
        )}

        {/* View Content */}
        <div className="flex-1 p-2 sm:p-4 md:p-5 overflow-x-auto overflow-y-auto">
          {loadingLeads && leads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-neutral-400">
              <RefreshCw className="w-6 h-6 animate-spin mb-2" />
              <span className="text-xs">Carregando leads do banco de dados...</span>
            </div>
          ) : activeTab === 'kanban' ? (
            <KanbanBoard
              leads={displayedLeads}
              tags={tags}
              onOpenDetails={(lead) => setSelectedLeadForDetail(lead)}
              onMoveColumn={handleUpdateLeadColumn}
              onShowToast={showToast}
            />
          ) : activeTab === 'table' ? (
            <AllLeadsTable
              leads={displayedLeads}
              tags={tags}
              onOpenDetails={(lead) => setSelectedLeadForDetail(lead)}
              onUpdateColumn={handleUpdateLeadColumn}
              onDeleteLead={handleDeleteLead}
              onShowToast={showToast}
              onOpenJsonBatchModal={() => setIsJsonModalOpen(true)}
            />
          ) : (
            <AnalyticsDashboard
              leads={displayedLeads}
              allLeads={leads}
              tags={tags}
              salespeople={salespeople}
              selectedSalespersonId={selectedSalespersonId}
              onOpenDetails={(lead) => setSelectedLeadForDetail(lead)}
              onShowToast={showToast}
            />
          )}
        </div>
      </main>

      {/* Modals */}
      <LeadDetailModal
        isOpen={!!selectedLeadForDetail}
        onClose={() => setSelectedLeadForDetail(null)}
        lead={selectedLeadForDetail}
        allLeads={displayedLeads}
        onSelectLead={(nextLead) => setSelectedLeadForDetail(nextLead)}
        tags={tags}
        salespeople={salespeople}
        onOpenTagsModal={() => setIsTagsModalOpen(true)}
        onAddCallLog={handleAddCallLog}
        onUpdateColumn={handleUpdateLeadColumn}
        onReassignLead={handleReassignLead}
        onShowToast={showToast}
      />

      <SalesTeamModal
        isOpen={isSalesTeamModalOpen}
        onClose={() => setIsSalesTeamModalOpen(false)}
        salespeople={salespeople}
        leads={leads}
        onRefreshSalespeople={fetchSalespeople}
        onRefreshLeads={fetchLeads}
        onShowToast={showToast}
        onSelectSalespersonRoute={(seller) => handleNavigateToSalesperson(seller.id)}
      />

      <WhatsAppSettingsModal
        isOpen={isWhatsAppModalOpen}
        onClose={() => setIsWhatsAppModalOpen(false)}
        onShowToast={showToast}
      />

      <TagManagerModal
        isOpen={isTagsModalOpen}
        onClose={() => setIsTagsModalOpen(false)}
        tags={tags}
        onRefreshTags={fetchTags}
        onShowToast={showToast}
      />

      <ZipUploadModal
        isOpen={isZipModalOpen}
        onClose={() => setIsZipModalOpen(false)}
        salespeople={salespeople}
        onImportComplete={() => {
          fetchLeads();
          fetchSalespeople();
        }}
        onShowToast={showToast}
      />

      <JsonBatchUpdateModal
        isOpen={isJsonModalOpen}
        onClose={() => setIsJsonModalOpen(false)}
        onUpdateComplete={() => {
          fetchLeads();
          fetchSalespeople();
        }}
        onShowToast={showToast}
      />

      {/* Global Toast Notification */}
      <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
    </div>
  );
}


