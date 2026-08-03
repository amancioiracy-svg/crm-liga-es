import React, { useState, useEffect } from 'react';
import { Lead, ColumnStatus, CallTag } from './types';
import { Sidebar } from './components/Sidebar';
import { KanbanBoard } from './components/KanbanBoard';
import { AllLeadsTable } from './components/AllLeadsTable';
import { LeadDetailModal } from './components/LeadDetailModal';
import { ZipUploadModal } from './components/ZipUploadModal';
import { Toast } from './components/Toast';
import { PhoneCall, Users, CheckCircle, RefreshCw } from 'lucide-react';

export default function App() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(true);
  const [activeTab, setActiveTab] = useState<'kanban' | 'table'>('kanban');
  
  // Modals & Toasts
  const [selectedLeadForDetail, setSelectedLeadForDetail] = useState<Lead | null>(null);
  const [isZipModalOpen, setIsZipModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    setLoadingLeads(true);
    try {
      const res = await fetch('/api/leads');
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        setLeads(data);
      }
    } catch (err) {
      console.error('Erro ao buscar leads:', err);
      showToast('Erro ao carregar lista de leads.');
    } finally {
      setLoadingLeads(false);
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

  // Registrar ligação para o lead
  const handleAddCallLog = async (leadId: string, tag: CallTag, comment: string) => {
    const res = await fetch(`/api/leads/${leadId}/calls`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tag, comment })
    });

    if (res.ok) {
      fetchLeads(); // Atualiza contagem
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
      } else {
        showToast('Erro ao carregar resposta do servidor.');
      }
    } catch (err) {
      console.error(err);
      showToast('Erro ao gerar leads de exemplo.');
    }
  };

  return (
    <div className="flex min-h-screen bg-[#f8f9fa] text-neutral-900 font-sans antialiased">
      {/* Sidebar de Navegação */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenZipModal={() => setIsZipModalOpen(true)}
        onSeedSamples={handleSeedSamples}
        totalLeads={leads.length}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Navbar Header */}
        <header className="bg-white border-b border-neutral-200 px-6 py-3.5 flex items-center justify-between sticky top-0 z-10 shadow-2xs">
          <div>
            <h2 className="text-sm font-bold text-neutral-900 tracking-tight">
              {activeTab === 'kanban' ? 'Pipeline Kanban de Vendas' : 'Lista Completa de Leads'}
            </h2>
            <p className="text-[11px] text-neutral-500">
              {leads.length} lead(s) cadastrado(s) no sistema
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchLeads}
              className="p-1.5 rounded-lg border border-neutral-200 text-neutral-600 hover:bg-neutral-50 transition-colors"
              title="Atualizar dados"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingLeads ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </header>

        {/* View Content */}
        <div className="flex-1 p-6 overflow-y-auto">
          {loadingLeads && leads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-neutral-400">
              <RefreshCw className="w-6 h-6 animate-spin mb-2" />
              <span className="text-xs">Carregando leads do banco de dados...</span>
            </div>
          ) : activeTab === 'kanban' ? (
            <KanbanBoard
              leads={leads}
              onOpenDetails={(lead) => setSelectedLeadForDetail(lead)}
              onMoveColumn={handleUpdateLeadColumn}
              onShowToast={showToast}
            />
          ) : (
            <AllLeadsTable
              leads={leads}
              onOpenDetails={(lead) => setSelectedLeadForDetail(lead)}
              onUpdateColumn={handleUpdateLeadColumn}
              onDeleteLead={handleDeleteLead}
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
        onAddCallLog={handleAddCallLog}
        onUpdateColumn={handleUpdateLeadColumn}
        onShowToast={showToast}
      />

      <ZipUploadModal
        isOpen={isZipModalOpen}
        onClose={() => setIsZipModalOpen(false)}
        onImportComplete={fetchLeads}
        onShowToast={showToast}
      />

      {/* Global Toast Notification */}
      <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
    </div>
  );
}
