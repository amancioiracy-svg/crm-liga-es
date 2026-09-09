import React, { useState, useEffect } from 'react';
import { Salesperson, Lead } from '../types';
import {
  TrendingUp,
  Layers,
  PhoneCall,
  Shield,
  Briefcase,
  Search,
  RefreshCw
} from 'lucide-react';

interface AdminSellerInspectionViewProps {
  salespersonId: string;
  salespeople: Salesperson[];
  leads: Lead[];
  onSelectSalesperson: (id: string) => void;
  onNavigateToKanban: (sellerId?: string) => void;
  onShowToast: (msg: string) => void;
}

export const AdminSellerInspectionView: React.FC<AdminSellerInspectionViewProps> = ({
  salespersonId,
  salespeople,
  leads,
  onSelectSalesperson,
  onNavigateToKanban,
  onShowToast
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'funil' | 'carteira' | 'historico' | 'acesso'>('funil');
  const [statsData, setStatsData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [leadSearch, setLeadSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const currentSeller = salespeople.find((s) => s.id === salespersonId);
  const isAll = salespersonId === 'ALL';

  useEffect(() => {
    fetchStats();
  }, [salespersonId]);

  const fetchStats = async () => {
    if (isAll) {
      setStatsData(null);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/salesperson/${salespersonId}/stats`);
      if (res.ok) {
        const data = await res.json();
        setStatsData(data);
      }
    } catch (err) {
      console.error('Erro ao carregar estatísticas do vendedor:', err);
    } finally {
      setLoading(false);
    }
  };

  const sellerLeads = isAll
    ? leads
    : leads.filter((l) => (l.salespersonId || '').toLowerCase() === salespersonId.toLowerCase());

  const totalLeads = sellerLeads.length;
  const uncontacted = sellerLeads.filter((l) => l.columnStatus === 'Leads' && (!l.callCount || l.callCount === 0)).length;
  const inProgress = sellerLeads.filter((l) => l.columnStatus && l.columnStatus.startsWith('Ligação')).length;
  const closed = sellerLeads.filter((l) => l.columnStatus === 'Fechado').length;
  const lost = sellerLeads.filter((l) => l.columnStatus === 'Perdido').length;
  const totalCalls = sellerLeads.reduce((acc, l) => acc + (l.callCount || 0), 0);
  const conversionRate = totalLeads > 0 ? ((closed / totalLeads) * 100).toFixed(1) : '0.0';

  const filteredLeads = sellerLeads.filter((l) => {
    if (statusFilter !== 'ALL' && l.columnStatus !== statusFilter) return false;
    if (leadSearch.trim()) {
      const q = leadSearch.toLowerCase();
      return l.name.toLowerCase().includes(q) || (l.phone && l.phone.includes(q));
    }
    return true;
  });

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f8f9fa] overflow-y-auto">
      {/* Top Header of Inspection View */}
      <div className="bg-white border-b border-neutral-200 px-6 py-4 shrink-0 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className="w-11 h-11 rounded-2xl flex items-center justify-center font-black text-white text-base shadow-xs shrink-0"
              style={{ backgroundColor: isAll ? '#171717' : currentSeller?.color || '#0284c7' }}
            >
              {isAll ? <Briefcase className="w-5 h-5 text-neutral-300" /> : currentSeller?.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-neutral-900 tracking-tight">
                  {isAll ? 'Desempenho Geral Consolidado de Todos os Closers' : `Raio-X: ${currentSeller?.name}`}
                </h1>
                {!isAll && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200 font-bold">
                    ID: {currentSeller?.id}
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-500 mt-0.5">
                {isAll
                  ? 'Métricas somadas, funil macro de vendas e auditoria de carteira global.'
                  : `Auditoria detalhada da carteira, ligações realizadas, notas de follow-up e status de acesso.`}
              </p>
            </div>
          </div>

          {/* Quick Actions & Closer Selector */}
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={salespersonId}
              onChange={(e) => onSelectSalesperson(e.target.value)}
              className="text-xs font-semibold bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-neutral-800 focus:outline-none"
            >
              <option value="ALL">Visão Geral (Todos os Closers)</option>
              {salespeople.map((s) => (
                <option key={s.id} value={s.id}>
                  Vendedor: {s.name}
                </option>
              ))}
            </select>

            {!isAll && (
              <button
                onClick={() => onNavigateToKanban(salespersonId)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors"
                title="Abrir o Kanban exclusivo desse vendedor"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Abrir Kanban Dele</span>
              </button>
            )}

            <button
              onClick={fetchStats}
              className="p-2 rounded-xl border border-neutral-200 text-neutral-600 hover:bg-neutral-50 transition-colors"
              title="Atualizar dados"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* 6 Cards de Métricas Principais do Closer */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-4 pt-4 border-t border-neutral-100">
          <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200">
            <span className="text-[10px] text-neutral-400 font-bold block uppercase tracking-wider">
              Total de Leads
            </span>
            <div className="text-lg font-black text-neutral-900 mt-1">
              {totalLeads}
            </div>
            <span className="text-[10px] text-neutral-500">na carteira</span>
          </div>

          <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200">
            <span className="text-[10px] text-amber-700 font-bold block uppercase tracking-wider">
              Sem Contato
            </span>
            <div className="text-lg font-black text-amber-600 mt-1">
              {uncontacted}
            </div>
            <span className="text-[10px] text-neutral-500">leads virgens</span>
          </div>

          <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200">
            <span className="text-[10px] text-blue-700 font-bold block uppercase tracking-wider">
              Em Atendimento
            </span>
            <div className="text-lg font-black text-blue-600 mt-1">
              {inProgress}
            </div>
            <span className="text-[10px] text-neutral-500">em follow-up</span>
          </div>

          <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200">
            <span className="text-[10px] text-emerald-700 font-bold block uppercase tracking-wider">
              Fechados
            </span>
            <div className="text-lg font-black text-emerald-600 mt-1">
              {closed}
            </div>
            <span className="text-[10px] text-neutral-500">vendas ganhas</span>
          </div>

          <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200">
            <span className="text-[10px] text-neutral-500 font-bold block uppercase tracking-wider">
              Ligações Totais
            </span>
            <div className="text-lg font-black text-neutral-900 mt-1">
              {totalCalls}
            </div>
            <span className="text-[10px] text-neutral-500">registradas</span>
          </div>

          <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200">
            <span className="text-[10px] text-indigo-700 font-bold block uppercase tracking-wider">
              Taxa de Conversão
            </span>
            <div className="text-lg font-black text-indigo-600 mt-1">
              {conversionRate}%
            </div>
            <span className="text-[10px] text-neutral-500">fechamento</span>
          </div>
        </div>

        {/* Navigation Sub-Tabs */}
        <div className="flex items-center gap-2 mt-4 pt-2 overflow-x-auto">
          <button
            onClick={() => setActiveSubTab('funil')}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border transition-all whitespace-nowrap ${
              activeSubTab === 'funil'
                ? 'bg-neutral-900 text-white border-neutral-900 shadow-2xs'
                : 'bg-white text-neutral-600 hover:bg-neutral-50 border-neutral-200'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>1. Funil de Vendas & Desempenho</span>
          </button>

          <button
            onClick={() => setActiveSubTab('carteira')}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border transition-all whitespace-nowrap ${
              activeSubTab === 'carteira'
                ? 'bg-neutral-900 text-white border-neutral-900 shadow-2xs'
                : 'bg-white text-neutral-600 hover:bg-neutral-50 border-neutral-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>2. Carteira de Leads ({totalLeads})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('historico')}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border transition-all whitespace-nowrap ${
              activeSubTab === 'historico'
                ? 'bg-neutral-900 text-white border-neutral-900 shadow-2xs'
                : 'bg-white text-neutral-600 hover:bg-neutral-50 border-neutral-200'
            }`}
          >
            <PhoneCall className="w-3.5 h-3.5" />
            <span>3. Histórico de Chamadas & Notas</span>
          </button>

          {!isAll && (
            <button
              onClick={() => setActiveSubTab('acesso')}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border transition-all whitespace-nowrap ${
                activeSubTab === 'acesso'
                  ? 'bg-neutral-900 text-white border-neutral-900 shadow-2xs'
                  : 'bg-white text-neutral-600 hover:bg-neutral-50 border-neutral-200'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>4. Acesso & Credenciais</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Sub-Tab Body */}
      <div className="p-6 space-y-6">
        {/* SUB-TAB 1: FUNIL DE VENDAS */}
        {activeSubTab === 'funil' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-neutral-200 p-5 shadow-2xs">
              <h3 className="text-sm font-bold text-neutral-900 mb-1">
                Etapas do Funil de Conversão
              </h3>
              <p className="text-xs text-neutral-500 mb-4">
                Distribuição dos leads nas etapas do processo comercial.
              </p>

              <div className="space-y-3 text-xs">
                {[
                  { label: 'Leads Virgens (Sem Contato)', count: uncontacted, color: 'bg-amber-500' },
                  { label: 'Ligação 1 (Primeiro Contato)', count: sellerLeads.filter(l => l.columnStatus === 'Ligação 1').length, color: 'bg-blue-400' },
                  { label: 'Ligação 2 (Follow-up)', count: sellerLeads.filter(l => l.columnStatus === 'Ligação 2').length, color: 'bg-blue-500' },
                  { label: 'Ligação 3 (Fechamento/Negociação)', count: sellerLeads.filter(l => l.columnStatus === 'Ligação 3').length, color: 'bg-blue-600' },
                  { label: 'Fechado (Venda Ganha)', count: closed, color: 'bg-emerald-500' },
                  { label: 'Perdido (Descartado/Sem Interesse)', count: lost, color: 'bg-neutral-400' }
                ].map((step, idx) => {
                  const pct = totalLeads > 0 ? ((step.count / totalLeads) * 100).toFixed(0) : '0';
                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex items-center justify-between font-semibold">
                        <span className="text-neutral-700">{step.label}</span>
                        <span className="text-neutral-900 font-mono">
                          {step.count} ({pct}%)
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-neutral-100 overflow-hidden">
                        <div
                          className={`h-full ${step.color} rounded-full transition-all duration-500`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-neutral-200 p-5 shadow-2xs space-y-4">
              <h3 className="text-sm font-bold text-neutral-900 mb-1">
                Diagnóstico de Produtividade Comercial
              </h3>
              <p className="text-xs text-neutral-500">
                Avaliação dos pontos de gargalo e velocidade de atendimento.
              </p>

              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200">
                  <div className="font-bold text-neutral-800 mb-0.5">Leads Parados na Gaveta</div>
                  <div className="text-neutral-600">
                    {uncontacted > 0 ? (
                      <span className="text-amber-700 font-semibold">
                        Atenção: existem {uncontacted} leads na carteira sem nenhuma ligação realizada.
                      </span>
                    ) : (
                      <span className="text-emerald-700 font-semibold">
                        Excelente: zero leads virgens parados. Toda a carteira recebeu ao menos um toque.
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200">
                  <div className="font-bold text-neutral-800 mb-0.5">Taxa de Conversão</div>
                  <div className="text-neutral-600">
                    Conversão calculada em <strong className="text-neutral-900">{conversionRate}%</strong> com {closed} fechamentos concretizados.
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200">
                  <div className="font-bold text-neutral-800 mb-0.5">Intensidade de Contato</div>
                  <div className="text-neutral-600">
                    Média de{' '}
                    <strong className="text-neutral-900">
                      {totalLeads > 0 ? (totalCalls / totalLeads).toFixed(1) : '0'} ligações por lead
                    </strong>{' '}
                    na carteira deste closer.
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SUB-TAB 2: CARTEIRA DE LEADS */}
        {activeSubTab === 'carteira' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-neutral-200 shadow-2xs">
              <div className="flex items-center gap-2 flex-1 max-w-md">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={leadSearch}
                    onChange={(e) => setLeadSearch(e.target.value)}
                    placeholder="Buscar lead por nome ou telefone..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none"
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="text-xs bg-neutral-50 border border-neutral-200 rounded-xl px-2.5 py-1.5 font-medium text-neutral-700 focus:outline-none"
                >
                  <option value="ALL">Todas as Etapas</option>
                  <option value="Leads">Leads (Sem Contato)</option>
                  <option value="Ligação 1">Ligação 1</option>
                  <option value="Ligação 2">Ligação 2</option>
                  <option value="Ligação 3">Ligação 3</option>
                  <option value="Fechado">Fechado</option>
                  <option value="Perdido">Perdido</option>
                </select>
              </div>

              <span className="text-xs text-neutral-400 font-mono">
                Exibindo {filteredLeads.length} de {sellerLeads.length} leads
              </span>
            </div>

            {/* Tabela de Leads */}
            <div className="bg-white rounded-2xl border border-neutral-200 shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-neutral-50/80 border-b border-neutral-200 text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
                      <th className="py-3 px-4">Nome do Lead</th>
                      <th className="py-3 px-4">Telefone</th>
                      <th className="py-3 px-4">Etapa Atual</th>
                      <th className="py-3 px-4">Ligações</th>
                      <th className="py-3 px-4">Vendedor Responsável</th>
                      <th className="py-3 px-4 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {filteredLeads.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-8 text-neutral-400">
                          Nenhum lead encontrado com os filtros aplicados.
                        </td>
                      </tr>
                    ) : (
                      filteredLeads.map((lead) => {
                        const seller = salespeople.find((s) => s.id === lead.salespersonId);
                        return (
                          <tr key={lead.id} className="hover:bg-neutral-50/60 transition-colors">
                            <td className="py-3 px-4 font-bold text-neutral-900">
                              {lead.name}
                            </td>
                            <td className="py-3 px-4 text-neutral-600 font-mono text-[11px]">
                              {lead.phone || 'Sem telefone'}
                            </td>
                            <td className="py-3 px-4">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                lead.columnStatus === 'Fechado'
                                  ? 'bg-emerald-100 text-emerald-900'
                                  : lead.columnStatus === 'Perdido'
                                  ? 'bg-neutral-100 text-neutral-700'
                                  : lead.columnStatus === 'Leads'
                                  ? 'bg-amber-100 text-amber-900'
                                  : 'bg-blue-100 text-blue-900'
                              }`}>
                                {lead.columnStatus}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-mono font-bold text-neutral-800">
                              {lead.callCount || 0}
                            </td>
                            <td className="py-3 px-4">
                              <span className="font-medium text-neutral-800">
                                {seller?.name || lead.salespersonId || 'Geral'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <button
                                onClick={() => onNavigateToKanban(lead.salespersonId)}
                                className="text-blue-600 hover:text-blue-800 text-[11px] font-bold"
                              >
                                Ver no Kanban
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* SUB-TAB 3: HISTÓRICO DE LIGAÇÕES & NOTAS */}
        {activeSubTab === 'historico' && (
          <div className="bg-white rounded-2xl border border-neutral-200 p-5 shadow-2xs space-y-4">
            <h3 className="text-sm font-bold text-neutral-900">
              Registro Caixa-Preta de Chamadas Realizadas
            </h3>
            <p className="text-xs text-neutral-500">
              Acompanhamento das anotações e retornos gravados pelos closers.
            </p>

            {loading ? (
              <div className="text-center py-8 text-neutral-400">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                Carregando histórico de ligações...
              </div>
            ) : statsData?.recentCalls && statsData.recentCalls.length > 0 ? (
              <div className="space-y-3">
                {statsData.recentCalls.map((call: any, idx: number) => (
                  <div key={idx} className="p-3 rounded-xl bg-neutral-50 border border-neutral-200 text-xs">
                    <div className="flex items-center justify-between pb-1 border-b border-neutral-100">
                      <span className="font-bold text-neutral-900">
                        Lead: {call.lead_name || 'Lead sem nome'} ({call.lead_phone || 'Sem fone'})
                      </span>
                      <span className="text-[10px] text-neutral-400 font-mono">
                        {call.created_at ? new Date(call.created_at).toLocaleString('pt-BR') : '—'}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-900">
                        Tag: {call.tag || 'Sem tag'}
                      </span>
                      {call.duration && (
                        <span className="text-neutral-500 font-mono">
                          Duração: {call.duration}s
                        </span>
                      )}
                    </div>
                    {call.comment && (
                      <p className="mt-1.5 text-neutral-700 italic bg-white p-2 rounded-lg border border-neutral-200">
                        "{call.comment}"
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 text-neutral-400 text-xs">
                Nenhum registro de chamada gravado ainda para este vendedor.
              </div>
            )}
          </div>
        )}

        {/* SUB-TAB 4: ACESSO & CREDENCIAIS */}
        {activeSubTab === 'acesso' && currentSeller && (
          <div className="bg-white rounded-2xl border border-neutral-200 p-5 shadow-2xs max-w-xl space-y-4">
            <h3 className="text-sm font-bold text-neutral-900">
              Controle de Acesso de {currentSeller.name}
            </h3>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 flex items-center justify-between">
                <div>
                  <strong className="text-neutral-900 block">Status da Conta</strong>
                  <span className="text-neutral-500">
                    {currentSeller.active ? 'Ativo e apto a ligar' : 'Acesso bloqueado pelo Super Admin'}
                  </span>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                  currentSeller.active ? 'bg-emerald-100 text-emerald-900' : 'bg-red-100 text-red-900'
                }`}>
                  {currentSeller.active ? 'Ativo' : 'Bloqueado'}
                </span>
              </div>

              <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200">
                <strong className="text-neutral-900 block mb-1">Rota Exclusiva do Vendedor</strong>
                <code className="text-[11px] font-mono bg-neutral-200/80 text-neutral-800 px-2 py-1 rounded block">
                  /v/{currentSeller.slug || currentSeller.id.replace(/^seller-/, '')}
                </code>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
