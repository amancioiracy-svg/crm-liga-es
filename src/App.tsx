import React, { useState, useEffect, useCallback, useMemo, useDeferredValue } from 'react';
import { Lead, ColumnStatus, CustomTag, Salesperson, User } from './types';
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
import { LoginScreen } from './components/LoginScreen';
import { AdminCockpitModal } from './components/AdminCockpitModal';
import { AdminDashboardView } from './components/AdminDashboardView';
import { AdminSidebar, AdminViewSection } from './components/AdminSidebar';
import { AdminSellerInspectionView } from './components/AdminSellerInspectionView';
import { AdminCarteirasView } from './components/AdminCarteirasView';
import { MetricsBar } from './components/MetricsBar';
import { Toast } from './components/Toast';
import { ChangePasswordModal } from './components/ChangePasswordModal';
import { getLeadNiche } from './lib/niche';
import { PhoneCall, Users, CheckCircle, RefreshCw, UserCheck, Share2, Plus, ArrowLeft, ExternalLink, Shield, LogOut, Lock } from 'lucide-react';
import { getSalespersonSlug, matchSalespersonFromRoute } from './lib/salesperson';

export default function App() {
  // Authentication & RBAC
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [isAdminCockpitOpen, setIsAdminCockpitOpen] = useState(false);
  const [adminSection, setAdminSection] = useState<AdminViewSection>('cockpit');
  const [inspectedSellerId, setInspectedSellerId] = useState<string>('ALL');

  const [leads, setLeads] = useState<Lead[]>([]);
  const [tags, setTags] = useState<CustomTag[]>([]);
  const [salespeople, setSalespeople] = useState<Salesperson[]>([
    { id: 'seller-thomas', name: 'Thomas', isDefault: true, color: '#0284c7', bgColor: '#e0f2fe' }
  ]);
  const [selectedSalespersonId, setSelectedSalespersonId] = useState<string>('ALL');
  const [selectedNicheFilter, setSelectedNicheFilter] = useState<string>('ALL');
  const [routeSalespersonSlug, setRouteSalespersonSlug] = useState<string | null>(null);
  const [loadingLeads, setLoadingLeads] = useState(true);
  const [activeTab, setActiveTab] = useState<'admin' | 'kanban' | 'table' | 'dashboard'>('kanban');
  const [selectedTagFilters, setSelectedTagFilters] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Modals & Toasts
  const [selectedLeadForDetail, setSelectedLeadForDetail] = useState<Lead | null>(null);
  const [isZipModalOpen, setIsZipModalOpen] = useState(false);
  const [isTagsModalOpen, setIsTagsModalOpen] = useState(false);
  const [isJsonModalOpen, setIsJsonModalOpen] = useState(false);
  const [isSalesTeamModalOpen, setIsSalesTeamModalOpen] = useState(false);
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);
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

  const fetchCurrentUser = async () => {
    setIsAuthChecking(true);
    try {
      const res = await fetch('/api/auth/me');
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        if (data.user) {
          setCurrentUser(data.user);
          if (data.user.role === 'salesperson' && data.user.salespersonId) {
            setSelectedSalespersonId(data.user.salespersonId);
            setActiveTab('kanban');
          } else if (data.user.role === 'admin') {
            setActiveTab('admin');
            setAdminSection('cockpit');
          }
        } else {
          setCurrentUser(null);
        }
      } else {
        setCurrentUser(null);
      }
    } catch (err) {
      console.error('Erro checando autenticação:', err);
      setCurrentUser(null);
    } finally {
      setIsAuthChecking(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error('Erro ao sair:', err);
    } finally {
      setCurrentUser(null);
      setSelectedSalespersonId('ALL');
      showToast('Sessão encerrada com sucesso.');
    }
  };

  useEffect(() => {
    fetchCurrentUser();
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

  // Atualizar subStatus do lead (ex: 'Site Enviado', 'Site Visualizado', 'Em Decisão')
  const handleUpdateSubStatus = async (leadId: string, subStatus: string) => {
    setLeads((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, subStatus } : l))
    );

    if (selectedLeadForDetail && selectedLeadForDetail.id === leadId) {
      setSelectedLeadForDetail((prev) => prev ? { ...prev, subStatus } : null);
    }

    try {
      const res = await fetch(`/api/leads/${leadId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subStatus })
      });

      if (!res.ok) {
        throw new Error('Falha ao atualizar sub-estágio');
      }
    } catch (err) {
      console.error(err);
      showToast('Erro ao atualizar sub-estágio do lead.');
      fetchLeads();
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

  // Excluir Leads em Lote
  const handleBulkDeleteLeads = async (leadIds: string[]) => {
    if (leadIds.length === 0) return;
    if (!window.confirm(`Tem certeza que deseja excluir ${leadIds.length} lead(s) selecionado(s) da base? Esta ação não pode ser desfeita.`)) {
      return;
    }
    try {
      const res = await fetch('/api/leads/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: leadIds })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao excluir leads em lote.');
      setLeads((prev) => prev.filter((l) => !leadIds.includes(l.id)));
      showToast(data.message || `${leadIds.length} leads excluídos com sucesso!`);
      fetchSalespeople();
    } catch (err: any) {
      showToast(err.message || 'Erro ao excluir leads em lote.');
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

  const deferredSearchQuery = useDeferredValue(searchQuery);

  // Filter leads by selected tags, salesperson AND global search query (Nome, Telefone, Site Nyroh, ID, Tag)
  const displayedLeads = useMemo(() => {
    const cleanSearch = deferredSearchQuery.trim().toLowerCase();
    const searchDigits = cleanSearch.replace(/\D/g, '');

    return leads.filter((l) => {
      // 1. Salesperson filter
      if (selectedSalespersonId !== 'ALL') {
        const sellerId = l.salespersonId || 'seller-thomas';
        if (sellerId !== selectedSalespersonId) return false;
      }

      // 2. Niche filter
      if (selectedNicheFilter !== 'ALL') {
        const leadNiche = getLeadNiche(l);
        if (leadNiche !== selectedNicheFilter) return false;
      }

      // 3. Tag filter
      if (selectedTagFilters.length > 0) {
        if (!l.lastCallTag) return false;
        const lTags = l.lastCallTag.split(',').map((t) => t.trim());
        const hasTag = selectedTagFilters.some((fTag) => lTags.includes(fTag));
        if (!hasTag) return false;
      }

      // 4. Global search filter
      if (cleanSearch) {
        const leadPhoneDigits = (l.phoneNumber || '').replace(/\D/g, '');

        const matches =
          l.name.toLowerCase().includes(cleanSearch) ||
          l.phoneNumber.toLowerCase().includes(cleanSearch) ||
          (searchDigits.length >= 3 && leadPhoneDigits.includes(searchDigits)) ||
          (l.publicUrl && l.publicUrl.toLowerCase().includes(cleanSearch)) ||
          getLeadNiche(l).toLowerCase().includes(cleanSearch) ||
          l.id.toLowerCase().includes(cleanSearch) ||
          (l.lastCallTag && l.lastCallTag.toLowerCase().includes(cleanSearch)) ||
          (l.salespersonName && l.salespersonName.toLowerCase().includes(cleanSearch));

        if (!matches) return false;
      }

      return true;
    });
  }, [leads, selectedSalespersonId, selectedNicheFilter, selectedTagFilters, deferredSearchQuery]);

  const activeSalesperson = salespeople.find((s) => s.id === selectedSalespersonId);
  const isAdmin = currentUser?.role === 'admin';

  // Loading Screen durante validação de sessão
  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-neutral-900 text-white flex items-center justify-center font-bold text-sm shadow-md">
            CRM
          </div>
          <div className="w-5 h-5 border-2 border-neutral-300 border-t-neutral-900 rounded-full animate-spin" />
          <span className="text-xs text-neutral-500 font-medium">Validando sessão segura...</span>
        </div>
      </div>
    );
  }

  // Se não autenticado, exibe Tela de Login Elegante com Sistema de Segurança
  if (!currentUser) {
    return (
      <>
        <LoginScreen
          onLoginSuccess={(user) => {
            setCurrentUser(user);
            if (user.role === 'salesperson' && user.salespersonId) {
              setSelectedSalespersonId(user.salespersonId);
              setActiveTab('kanban');
            } else if (user.role === 'admin') {
              setActiveTab('admin');
              setAdminSection('cockpit');
            }
            fetchLeads();
            fetchSalespeople();
            fetchTags();
          }}
          onShowToast={showToast}
        />
        {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage(null)} />}
      </>
    );
  }

  return (
    <div className="flex flex-col xl:flex-row h-screen bg-[#f8f9fa] text-neutral-900 font-sans antialiased overflow-hidden">
      {/* Sidebar de Navegação */}
      {currentUser?.role === 'admin' ? (
        <AdminSidebar
          currentSection={adminSection}
          onChangeSection={(sec) => {
            setAdminSection(sec);
            setActiveTab('admin');
          }}
          selectedSalespersonId={inspectedSellerId}
          onSelectSalesperson={(id) => {
            setInspectedSellerId(id);
            setAdminSection('vendedores');
            setActiveTab('admin');
          }}
          currentUser={currentUser}
          salespeople={salespeople}
          totalLeadsCount={leads.length}
          isKanbanActive={activeTab === 'kanban'}
          onNavigateToKanban={() => setActiveTab('kanban')}
          onOpenChangePassword={() => setIsChangePasswordModalOpen(true)}
          onLogout={handleLogout}
        />
      ) : (
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
          currentUser={currentUser}
          onOpenAdminCockpit={() => setIsAdminCockpitOpen(true)}
          onOpenChangePassword={() => setIsChangePasswordModalOpen(true)}
          onLogout={handleLogout}
        />
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen min-w-0 overflow-hidden">
        {activeTab === 'admin' && currentUser?.role === 'admin' ? (
          <>
            {adminSection === 'carteiras' ? (
              <AdminCarteirasView
                salespeople={salespeople}
                leads={leads}
                onOpenCreateSellerModal={() => setIsSalesTeamModalOpen(true)}
                onNavigateToKanban={(sellerId) => {
                  if (sellerId) setSelectedSalespersonId(sellerId);
                  setActiveTab('kanban');
                }}
                onInspectSeller={(sellerId) => {
                  setInspectedSellerId(sellerId);
                  setAdminSection('vendedores');
                  setActiveTab('admin');
                }}
                onRefreshData={() => {
                  fetchLeads();
                  fetchSalespeople();
                }}
                onShowToast={showToast}
              />
            ) : adminSection === 'vendedores' ? (
              <AdminSellerInspectionView
                salespersonId={inspectedSellerId}
                salespeople={salespeople}
                leads={leads}
                onSelectSalesperson={(id) => setInspectedSellerId(id)}
                onNavigateToKanban={(sellerId) => {
                  if (sellerId) setSelectedSalespersonId(sellerId);
                  setActiveTab('kanban');
                }}
                onRefreshData={() => {
                  fetchLeads();
                  fetchSalespeople();
                }}
                onLeadClick={(lead) => setSelectedLeadForDetail(lead)}
                onShowToast={showToast}
              />
            ) : (
              <AdminDashboardView
                currentUser={currentUser}
                salespeople={salespeople}
                leads={leads}
                activeSection={adminSection}
                onChangeSection={(sec) => setAdminSection(sec as AdminViewSection)}
                onSelectSalesperson={(id) => {
                  setInspectedSellerId(id);
                  setAdminSection('vendedores');
                }}
                onOpenZipModal={() => setIsZipModalOpen(true)}
                onOpenSalesTeamModal={() => setIsSalesTeamModalOpen(true)}
                onNavigateToKanban={(sellerId) => {
                  if (sellerId) {
                    setSelectedSalespersonId(sellerId);
                  }
                  setActiveTab('kanban');
                }}
                onRefreshData={() => {
                  fetchLeads();
                  fetchSalespeople();
                }}
                onShowToast={showToast}
              />
            )}
          </>
        ) : (
          <>
            {/* Top Operational Audit Banner for Super Admin when inspecting Kanban */}
            {currentUser?.role === 'admin' && (
              <div className="bg-neutral-900 text-white px-4 py-2 flex items-center justify-between text-xs shrink-0 border-b border-neutral-800 shadow-2xs">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  <span className="font-bold text-neutral-100">
                    Modo de Auditoria e Inspeção do Pipeline Comercial
                  </span>
                  <span className="text-neutral-400 hidden md:inline">
                    — Você está visualizando a mesa operacional dos closers
                  </span>
                </div>
                <button
                  onClick={() => {
                    setActiveTab('admin');
                    setAdminSection('cockpit');
                  }}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white font-bold transition-all border border-neutral-700 shadow-2xs cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5 text-amber-400" />
                  <span>Voltar ao Cockpit Executivo</span>
                </button>
              </div>
            )}

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

              {/* Salesperson Quick Tabs / Selector & Routing Switcher (Role-Based) */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {isAdmin ? (
                  <>
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

                    {/* Return to Admin Cockpit Button */}
                    <button
                      onClick={() => {
                        setActiveTab('admin');
                        setAdminSection('cockpit');
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-black text-white text-xs font-bold shadow-2xs transition-all"
                      title="Voltar à Mesa Diretora do Super Admin"
                    >
                      <ArrowLeft className="w-3.5 h-3.5 text-amber-400" />
                      <span>Mesa do Admin</span>
                    </button>
                  </>
                ) : (
                  /* Salesperson Mode: Dedicated Isolated Workspace Pill */
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-200">
                    <span 
                      className="w-2.5 h-2.5 rounded-full shrink-0" 
                      style={{ backgroundColor: activeSalesperson?.color || '#0284c7' }}
                    />
                    <span className="text-xs font-bold text-neutral-900 truncate">
                      Carteira Exclusiva: {currentUser.name}
                    </span>
                    <span className="text-[10px] bg-blue-200/80 text-blue-900 px-1.5 py-0.2 rounded-full font-mono font-bold">
                      {displayedLeads.length} leads
                    </span>
                  </div>
                )}

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
                allLeads={leads}
                totalLeadsCount={leads.length}
                tags={tags}
                selectedSalespersonId={selectedSalespersonId}
                selectedTagFilters={selectedTagFilters}
                onTagFilterChange={(newTags) => setSelectedTagFilters(newTags)}
                selectedNicheFilter={selectedNicheFilter}
                onNicheFilterChange={(niche) => setSelectedNicheFilter(niche)}
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
                  onUpdateSubStatus={handleUpdateSubStatus}
                />
              ) : activeTab === 'table' ? (
                <AllLeadsTable
                  leads={displayedLeads}
                  tags={tags}
                  onOpenDetails={(lead) => setSelectedLeadForDetail(lead)}
                  onUpdateColumn={handleUpdateLeadColumn}
                  onDeleteLead={handleDeleteLead}
                  onBulkDeleteLeads={handleBulkDeleteLeads}
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
          </>
        )}
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
        currentUser={currentUser || undefined}
        onOpenTagsModal={() => setIsTagsModalOpen(true)}
        onAddCallLog={handleAddCallLog}
        onUpdateColumn={handleUpdateLeadColumn}
        onReassignLead={handleReassignLead}
        onDeleteLead={handleDeleteLead}
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

      {/* Admin Cockpit Modal (RBAC, Audit, User Management) */}
      {isAdmin && (
        <AdminCockpitModal
          isOpen={isAdminCockpitOpen}
          onClose={() => setIsAdminCockpitOpen(false)}
          currentUser={currentUser}
          salespeople={salespeople}
          leads={leads}
          onShowToast={showToast}
          onRefreshData={() => {
            fetchLeads();
            fetchSalespeople();
          }}
        />
      )}

      {/* Change Password Modal for Current User */}
      <ChangePasswordModal
        isOpen={isChangePasswordModalOpen}
        onClose={() => setIsChangePasswordModalOpen(false)}
        currentUser={currentUser}
        onShowToast={showToast}
      />

      {/* Global Toast Notification */}
      <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
    </div>
  );
}


