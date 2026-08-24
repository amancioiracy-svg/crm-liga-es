import React, { useState, useEffect } from 'react';
import { Salesperson, Lead } from '../types';
import { 
  Users, UserPlus, Sparkles, Percent, Phone, Mail, Trash2, 
  Check, ArrowRight, Shield, RefreshCw, Send, CheckCircle2,
  TrendingUp, BarChart2, Award, Clock, PhoneCall, Copy, Download, FileJson
} from 'lucide-react';
import { getSalespersonAppUrl, getSalespersonSlug } from '../lib/salesperson';

interface SalesTeamManagementViewProps {
  salespeople: Salesperson[];
  leads: Lead[];
  onRefreshSalespeople: () => Promise<void>;
  onRefreshLeads: () => Promise<void>;
  onShowToast: (msg: string) => void;
}

const COLOR_PALETTES = [
  { name: 'Azul Executivo', color: '#0284c7', bgColor: '#e0f2fe' },
  { name: 'Verde Esmeralda', color: '#059669', bgColor: '#d1fae5' },
  { name: 'Roxo Moderno', color: '#7c3aed', bgColor: '#ede9fe' },
  { name: 'Âmbar Dourado', color: '#d97706', bgColor: '#fef3c7' },
  { name: 'Rosa Coral', color: '#db2777', bgColor: '#fce7f3' },
  { name: 'Indigo Noite', color: '#4f46e5', bgColor: '#e0e7ff' },
  { name: 'Teal Oceano', color: '#0d9488', bgColor: '#ccfbf1' },
];

export const SalesTeamManagementView: React.FC<SalesTeamManagementViewProps> = ({
  salespeople,
  leads,
  onRefreshSalespeople,
  onRefreshLeads,
  onShowToast
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'members' | 'distribution' | 'performance'>('members');

  // Form State for new seller
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [distributionPercent, setDistributionPercent] = useState<number>(50);
  const [selectedPaletteIndex, setSelectedPaletteIndex] = useState(1);
  const [savingSeller, setSavingSeller] = useState(false);

  // Quotas State
  const [quotasState, setQuotasState] = useState<Record<string, number>>({});
  const [savingQuotas, setSavingQuotas] = useState(false);

  // Manual Distribution State
  const [distSourceFilter, setDistSourceFilter] = useState<'new_only' | 'all_unattempted' | 'all'>('new_only');
  const [distTargetId, setDistTargetId] = useState<string>('');
  const [distMode, setDistMode] = useState<'percent' | 'count'>('percent');
  const [distPercentage, setDistPercentage] = useState<number>(50);
  const [distCount, setDistCount] = useState<number>(10);
  const [distributing, setDistributing] = useState(false);
  const [autoDistributing, setAutoDistributing] = useState(false);

  // Sync quotas state
  // Auto distribution scope
  const [autoDistributeScope, setAutoDistributeScope] = useState<'new_only' | 'all' | 'all_unattempted' | 'unconverted'>('new_only');
  const [showAutoDistributeConfirmModal, setShowAutoDistributeConfirmModal] = useState(false);
  const [downloadingNamesJson, setDownloadingNamesJson] = useState(false);

  const handleDownloadUncontactedNames = async () => {
    try {
      setDownloadingNamesJson(true);
      const res = await fetch('/api/export/uncontacted-names?download=true');
      if (!res.ok) throw new Error('Falha ao exportar JSON');
      const data = await res.json();
      
      const jsonString = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `leads_nao_abordados_nomes_${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      onShowToast(`📥 Arquivo baixado com sucesso (${data.length} nomes de leads)!`);
    } catch (e: any) {
      onShowToast(`Erro ao baixar JSON: ${e.message}`);
    } finally {
      setDownloadingNamesJson(false);
    }
  };

  useEffect(() => {
    const q: Record<string, number> = {};
    salespeople.forEach((s) => {
      q[s.id] = s.distributionPercent || (s.isDefault ? 50 : 0);
    });
    setQuotasState(q);
    if (!distTargetId && salespeople.length > 0) {
      setDistTargetId(salespeople[0].id);
    }
  }, [salespeople]);

  // Lead pools calculation
  const newLeads = leads.filter((l) => (l.columnStatus === 'leads' || l.columnStatus === 'Leads') && (l.callHistory?.length || 0) === 0);
  const unattemptedLeads = leads.filter((l) => (l.callHistory?.length || 0) === 0);
  const unconvertedLeads = leads.filter((l) => l.columnStatus !== 'fechamento');
  
  // Selected pool count for auto distribution
  const autoScopeCount = autoDistributeScope === 'new_only'
    ? newLeads.length
    : autoDistributeScope === 'all_unattempted'
      ? unattemptedLeads.length
      : autoDistributeScope === 'unconverted'
        ? unconvertedLeads.length
        : leads.length;

  const eligibleLeads = distSourceFilter === 'new_only' 
    ? newLeads 
    : distSourceFilter === 'all_unattempted' 
      ? unattemptedLeads 
      : leads;

  const totalEligibleCount = eligibleLeads.length;

  const calculatedLeadsToDistribute = distMode === 'percent'
    ? Math.round((totalEligibleCount * distPercentage) / 100)
    : Math.min(distCount, totalEligibleCount);

  // Total Quota Sum
  const totalQuotaSum = Object.values(quotasState).reduce((acc, v) => acc + (Number(v) || 0), 0);

  // Handlers
  const handleCreateSalesperson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      onShowToast('Informe o nome da vendedora.');
      return;
    }
    if (!phone.trim()) {
      onShowToast('Informe o telefone/WhatsApp para o login.');
      return;
    }

    setSavingSeller(true);
    try {
      const palette = COLOR_PALETTES[selectedPaletteIndex % COLOR_PALETTES.length];
      const res = await fetch('/api/salespeople', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim(),
          distributionPercent: Number(distributionPercent) || 0,
          color: palette.color,
          bgColor: palette.bgColor
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erro ao cadastrar vendedora.');
      }

      const created = await res.json();
      onShowToast(`🎉 Vendedora "${created.name}" cadastrada com sucesso! Login: ${created.phone}`);
      setName('');
      setPhone('');
      setEmail('');
      setDistributionPercent(50);
      await onRefreshSalespeople();
    } catch (err: any) {
      onShowToast(err.message || 'Erro ao salvar vendedora.');
    } finally {
      setSavingSeller(false);
    }
  };

  const handleSaveQuotas = async () => {
    setSavingQuotas(true);
    try {
      const res = await fetch('/api/salespeople/quotas/batch', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quotas: quotasState })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erro ao salvar quotas.');
      }
      onShowToast('✅ Porcentagens (%) salvas com sucesso!');
      await onRefreshSalespeople();
    } catch (err: any) {
      onShowToast(err.message || 'Erro ao salvar quotas.');
    } finally {
      setSavingQuotas(false);
    }
  };

  const handleAutoDistributeByQuotas = async () => {
    if (autoScopeCount === 0) {
      onShowToast('Não há leads disponíveis no grupo selecionado para distribuição.');
      return;
    }

    setAutoDistributing(true);
    try {
      const res = await fetch('/api/leads/distribute-by-quotas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetScope: autoDistributeScope,
          quotas: quotasState
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro na divisão automática.');
      }

      onShowToast(`⚡ ${data.message || 'Leads distribuídos com sucesso!'}`);
      setShowAutoDistributeConfirmModal(false);
      await onRefreshLeads();
      await onRefreshSalespeople();
    } catch (err: any) {
      onShowToast(err.message || 'Erro ao processar divisão.');
    } finally {
      setAutoDistributing(false);
    }
  };

  const handleManualDistribute = async () => {
    if (!distTargetId) {
      onShowToast('Selecione um vendedor de destino.');
      return;
    }
    if (calculatedLeadsToDistribute <= 0) {
      onShowToast('Quantidade de leads para transferir deve ser maior que zero.');
      return;
    }

    setDistributing(true);
    try {
      const targetSeller = salespeople.find((s) => s.id === distTargetId);
      const res = await fetch('/api/leads/distribute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceFilter: distSourceFilter,
          targetSalespersonId: distTargetId,
          targetSalespersonName: targetSeller?.name || 'Vendedor',
          count: calculatedLeadsToDistribute
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao distribuir leads.');
      }

      onShowToast(`✅ ${data.message || 'Leads transferidos com sucesso!'}`);
      await onRefreshLeads();
      await onRefreshSalespeople();
    } catch (err: any) {
      onShowToast(err.message || 'Erro ao distribuir leads.');
    } finally {
      setDistributing(false);
    }
  };

  const handleDeleteSalesperson = async (seller: Salesperson) => {
    if (seller.isDefault || seller.id === 'seller-thomas') {
      onShowToast('O gestor principal não pode ser excluído.');
      return;
    }

    const sellerLeads = leads.filter((l) => l.salespersonId === seller.id).length;
    const confirmMsg = sellerLeads > 0
      ? `A vendedora "${seller.name}" possui ${sellerLeads} lead(s) atribuído(s). Deseja excluí-la e devolver os leads para o Thomas?`
      : `Deseja realmente remover a vendedora "${seller.name}"?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await fetch(`/api/salespeople/${seller.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erro ao remover vendedora.');
      }

      onShowToast(`Vendedora "${seller.name}" removida com sucesso.`);
      await onRefreshSalespeople();
      await onRefreshLeads();
    } catch (err: any) {
      onShowToast(err.message || 'Erro ao excluir vendedora.');
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-[#f8f9fa] space-y-6">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl p-6 border border-neutral-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold shadow-2xs">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-neutral-900 leading-tight">
                Gestão da Equipe & Divisão de Leads
              </h2>
              <p className="text-xs text-neutral-500">
                Cadastre vendedoras, defina quotas (%) automáticas e monitore a carteira individual de cada uma.
              </p>
            </div>
          </div>
        </div>

        {/* Sub-tabs Navigation */}
        <div className="flex items-center bg-neutral-100 p-1 rounded-xl border border-neutral-200 self-start md:self-auto">
          <button
            onClick={() => setActiveSubTab('members')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition ${
              activeSubTab === 'members'
                ? 'bg-white text-neutral-900 shadow-2xs'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <Users className="w-4 h-4 text-blue-600" />
            <span>Vendedoras ({salespeople.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('distribution')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition ${
              activeSubTab === 'distribution'
                ? 'bg-white text-emerald-800 shadow-2xs'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <Percent className="w-4 h-4 text-emerald-600" />
            <span>Divisão & Quotas (%)</span>
          </button>

          <button
            onClick={() => setActiveSubTab('performance')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition ${
              activeSubTab === 'performance'
                ? 'bg-white text-neutral-900 shadow-2xs'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <TrendingUp className="w-4 h-4 text-amber-600" />
            <span>Ranking & Desempenho</span>
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: MEMBERS (VENDEDORAS) */}
      {activeSubTab === 'members' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Salespeople List */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-neutral-800 uppercase tracking-wider">
                Equipe Ativa ({salespeople.length})
              </h3>
              <span className="text-xs text-neutral-500">
                O telefone cadastrado é usado para o login da vendedora
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {salespeople.map((seller) => {
                const sellerLeads = leads.filter(
                  (l) => (l.salespersonId || 'seller-thomas') === seller.id
                );
                const callsCount = sellerLeads.reduce(
                  (acc, l) => acc + (l.callHistory?.length || 0), 0
                );
                const converted = sellerLeads.filter(
                  (l) => l.columnStatus === 'fechamento'
                ).length;

                return (
                  <div
                    key={seller.id}
                    className="bg-white rounded-2xl p-5 border border-neutral-200 shadow-xs hover:border-neutral-300 transition space-y-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-base shadow-2xs shrink-0"
                          style={{ backgroundColor: seller.bgColor, color: seller.color }}
                        >
                          {seller.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className="text-sm font-bold text-neutral-900">
                              {seller.name}
                            </h4>
                            {seller.isDefault && (
                              <span className="text-[10px] bg-neutral-900 text-white font-bold px-1.5 py-0.5 rounded">
                                Principal
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs font-mono font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60 flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {seller.phone || 'Sem telefone'}
                            </span>
                            <span className="text-[11px] font-bold text-neutral-600 bg-neutral-100 px-2 py-0.5 rounded">
                              {seller.distributionPercent || (seller.isDefault ? 50 : 0)}% quota
                            </span>
                          </div>
                        </div>
                      </div>

                      {!seller.isDefault && (
                        <button
                          onClick={() => handleDeleteSalesperson(seller)}
                          className="p-1.5 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          title="Excluir vendedora"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* Stats pills */}
                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-neutral-100 text-center">
                      <div className="p-2 bg-neutral-50 rounded-xl">
                        <span className="text-[10px] text-neutral-500 font-semibold block">Leads</span>
                        <span className="text-sm font-bold text-neutral-900">{sellerLeads.length}</span>
                      </div>
                      <div className="p-2 bg-blue-50/60 rounded-xl">
                        <span className="text-[10px] text-blue-700 font-semibold block">Ligações</span>
                        <span className="text-sm font-bold text-blue-900">{callsCount}</span>
                      </div>
                      <div className="p-2 bg-emerald-50/60 rounded-xl">
                        <span className="text-[10px] text-emerald-700 font-semibold block">Vendas</span>
                        <span className="text-sm font-bold text-emerald-900">{converted}</span>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => {
                          const url = getSalespersonAppUrl(seller);
                          navigator.clipboard.writeText(url);
                          onShowToast(`Link de acesso copiado!`);
                        }}
                        className="flex-1 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition"
                      >
                        <Copy className="w-3.5 h-3.5 text-neutral-500" />
                        <span>Copiar Link</span>
                      </button>

                      {seller.phone && (
                        <button
                          onClick={() => {
                            const url = getSalespersonAppUrl(seller);
                            const msg = encodeURIComponent(`Olá ${seller.name}, aqui está seu acesso ao CRM: ${url}`);
                            const cleanPhone = seller.phone!.replace(/\D/g, '');
                            const fullPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
                            window.open(`https://wa.me/${fullPhone}?text=${msg}`, '_blank');
                          }}
                          className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-lg border border-emerald-200 flex items-center gap-1 transition"
                          title="Enviar link no WhatsApp"
                        >
                          <Send className="w-3.5 h-3.5 text-emerald-600" />
                          <span>WhatsApp</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Col: Cadastrar Nova Vendedora */}
          <div className="bg-white rounded-2xl p-6 border border-neutral-200 shadow-xs space-y-4 h-fit sticky top-6">
            <div className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-blue-600" />
              <h3 className="text-sm font-bold text-neutral-900">
                Cadastrar Nova Vendedora
              </h3>
            </div>
            <p className="text-xs text-neutral-500">
              A vendedora poderá entrar no CRM usando apenas o número de WhatsApp cadastrado.
            </p>

            <form onSubmit={handleCreateSalesperson} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  placeholder="Ex: Mariana Silva"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full text-xs px-3 py-2.5 rounded-xl border border-neutral-300 focus:outline-hidden focus:border-blue-500 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Telefone / WhatsApp (Login da Vendedora) *
                </label>
                <input
                  type="tel"
                  placeholder="(31) 99150-3721"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  className="w-full text-xs px-3 py-2.5 rounded-xl border border-neutral-300 focus:outline-hidden focus:border-blue-500 bg-white font-mono"
                />
                <span className="text-[10px] text-neutral-400 mt-1 block">
                  Exatamente como ela digitará na tela de login
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    % Quota de Leads
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={distributionPercent}
                      onChange={(e) => setDistributionPercent(Number(e.target.value))}
                      className="w-full text-xs px-3 py-2.5 rounded-xl border border-neutral-300 focus:outline-hidden focus:border-blue-500 bg-white font-bold"
                    />
                    <span className="text-xs font-bold text-neutral-500">%</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    E-mail (opcional)
                  </label>
                  <input
                    type="email"
                    placeholder="mariana@empresa.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full text-xs px-3 py-2.5 rounded-xl border border-neutral-300 focus:outline-hidden focus:border-blue-500 bg-white"
                  />
                </div>
              </div>

              {/* Color selector */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-2">
                  Cor da Vendedora
                </label>
                <div className="flex flex-wrap gap-2">
                  {COLOR_PALETTES.map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedPaletteIndex(idx)}
                      className={`w-7 h-7 rounded-full flex items-center justify-center transition border-2 ${
                        selectedPaletteIndex === idx ? 'border-neutral-900 scale-110' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: p.color }}
                      title={p.name}
                    >
                      {selectedPaletteIndex === idx && <Check className="w-3.5 h-3.5 text-white" />}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={savingSeller}
                className="w-full py-3 bg-neutral-900 hover:bg-neutral-800 active:bg-black text-white text-xs font-bold rounded-xl shadow-xs flex items-center justify-center gap-2 transition disabled:opacity-50"
              >
                <UserPlus className="w-4 h-4" />
                <span>{savingSeller ? 'Cadastrando...' : 'Cadastrar Vendedora'}</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: DISTRIBUTION & QUOTAS */}
      {activeSubTab === 'distribution' && (
        <div className="space-y-6">
          {/* Quick 1-Click Auto Distribution Card with Group Selector */}
          <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-100/60 rounded-2xl p-6 border border-emerald-200 shadow-xs space-y-5">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
              <div className="space-y-1 max-w-xl">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-2xs">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-black text-emerald-950 uppercase tracking-wider">
                    Redistribuição Automática por Porcentagem (%) da Equipe
                  </h3>
                </div>
                <p className="text-xs text-emerald-800 leading-relaxed">
                  Escolha qual <strong>grupo de leads</strong> você deseja fatiar e redistribuir entre as vendedoras conforme as cotas (%) configuradas.
                </p>
              </div>

              <button
                onClick={() => setShowAutoDistributeConfirmModal(true)}
                disabled={autoDistributing || autoScopeCount === 0}
                className="px-6 py-3.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-2 transition shrink-0"
              >
                <Sparkles className="w-4 h-4" />
                <span>{autoDistributing ? 'Processando Divisão...' : `⚡ Redistribuir ${autoScopeCount} Leads Agora`}</span>
              </button>
            </div>

            {/* Scope Selection Pills */}
            <div className="bg-white/80 backdrop-blur-xs p-4 rounded-xl border border-emerald-200/80 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-xs font-bold text-neutral-800 flex items-center gap-1.5">
                  <span>1. Selecione o Grupo de Leads:</span>
                  <span className="text-[11px] font-normal text-neutral-500">(Clique em um dos 4 cartões abaixo)</span>
                </span>
                <span className="text-xs font-mono font-bold text-emerald-800 bg-emerald-100/80 px-2.5 py-0.5 rounded-full">
                  Total selecionado: {autoScopeCount} leads
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                {/* Option 1: Novos */}
                <button
                  type="button"
                  onClick={() => setAutoDistributeScope('new_only')}
                  className={`p-3.5 rounded-xl border text-left transition relative flex flex-col justify-between cursor-pointer ${
                    autoDistributeScope === 'new_only'
                      ? 'bg-emerald-100/90 border-emerald-600 shadow-md ring-2 ring-emerald-500/30'
                      : 'bg-white border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-neutral-900">🟢 Apenas Leads Novos</span>
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900">
                      {newLeads.length}
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-600">
                    Coluna "Leads" ainda não abordados (0 ligações)
                  </p>
                  {autoDistributeScope === 'new_only' && (
                    <div className="mt-2 text-[10px] font-bold text-emerald-800 flex items-center gap-1">
                      <Check className="w-3 h-3" /> Grupo Selecionado
                    </div>
                  )}
                </button>

                {/* Option 2: Toda a Base Existente */}
                <button
                  type="button"
                  onClick={() => setAutoDistributeScope('all')}
                  className={`p-3.5 rounded-xl border text-left transition relative flex flex-col justify-between cursor-pointer ${
                    autoDistributeScope === 'all'
                      ? 'bg-blue-100/90 border-blue-600 shadow-md ring-2 ring-blue-500/30'
                      : 'bg-white border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-neutral-900">🔵 Toda a Base de Leads</span>
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-blue-200 text-blue-900">
                      {leads.length}
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-600">
                    Todos os leads que já existem no CRM (rebalanceia carteiras)
                  </p>
                  {autoDistributeScope === 'all' && (
                    <div className="mt-2 text-[10px] font-bold text-blue-800 flex items-center gap-1">
                      <Check className="w-3 h-3" /> Grupo Selecionado
                    </div>
                  )}
                </button>

                {/* Option 3: Todos sem ligação */}
                <button
                  type="button"
                  onClick={() => setAutoDistributeScope('all_unattempted')}
                  className={`p-3.5 rounded-xl border text-left transition relative flex flex-col justify-between cursor-pointer ${
                    autoDistributeScope === 'all_unattempted'
                      ? 'bg-purple-100/90 border-purple-600 shadow-md ring-2 ring-purple-500/30'
                      : 'bg-white border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-neutral-900">🟣 Sem Nenhuma Ligação</span>
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-purple-200 text-purple-900">
                      {unattemptedLeads.length}
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-600">
                    Leads em qualquer coluna com 0 ligações registradas
                  </p>
                  {autoDistributeScope === 'all_unattempted' && (
                    <div className="mt-2 text-[10px] font-bold text-purple-800 flex items-center gap-1">
                      <Check className="w-3 h-3" /> Grupo Selecionado
                    </div>
                  )}
                </button>

                {/* Option 4: Não fechados (Tentativas / Parados) */}
                <button
                  type="button"
                  onClick={() => setAutoDistributeScope('unconverted')}
                  className={`p-3.5 rounded-xl border text-left transition relative flex flex-col justify-between cursor-pointer ${
                    autoDistributeScope === 'unconverted'
                      ? 'bg-amber-100/90 border-amber-600 shadow-md ring-2 ring-amber-500/30'
                      : 'bg-white border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-neutral-900">🟠 Não Fechados</span>
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-amber-200 text-amber-900">
                      {unconvertedLeads.length}
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-600">
                    Tentativas 1, 2, 3 e sem interesse (exceto Fechamento)
                  </p>
                  {autoDistributeScope === 'unconverted' && (
                    <div className="mt-2 text-[10px] font-bold text-amber-800 flex items-center gap-1">
                      <Check className="w-3 h-3" /> Grupo Selecionado
                    </div>
                  )}
                </button>
              </div>

              {/* Dynamic Live Calculation Table */}
              <div className="mt-3 p-3.5 rounded-xl bg-neutral-900 text-white shadow-xs space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-neutral-800 pb-2">
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    Simulação de Divisão ao Executar:
                  </span>
                  <span className="text-[11px] text-neutral-400">
                    Grupo Ativo: <strong className="text-white">
                      {autoDistributeScope === 'new_only' && `Apenas Leads Novos (${newLeads.length})`}
                      {autoDistributeScope === 'all' && `Toda a Base (${leads.length})`}
                      {autoDistributeScope === 'all_unattempted' && `Sem Nenhuma Ligação (${unattemptedLeads.length})`}
                      {autoDistributeScope === 'unconverted' && `Não Fechados (${unconvertedLeads.length})`}
                    </strong>
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {salespeople.map((s) => {
                    const pct = quotasState[s.id] ?? (s.distributionPercent || 0);
                    const count = totalQuotaSum > 0 ? Math.round((autoScopeCount * pct) / totalQuotaSum) : 0;
                    return (
                      <div key={s.id} className="bg-neutral-800/80 p-2.5 rounded-lg border border-neutral-700/60 flex flex-col justify-between">
                        <div className="flex items-center gap-1.5 min-w-0 mb-1">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                          <span className="text-xs font-bold text-neutral-200 truncate">{s.name}</span>
                        </div>
                        <div className="flex items-baseline justify-between">
                          <span className="text-[11px] font-mono text-neutral-400">{pct}%</span>
                          <span className="text-xs font-bold text-emerald-400 font-mono">~{count} leads</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Confirmation Modal */}
          {showAutoDistributeConfirmModal && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl p-6 max-w-md w-full border border-neutral-200 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-150">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-neutral-900">
                      Confirmar Redistribuição Automática
                    </h3>
                    <p className="text-xs text-neutral-500">
                      Grupo: <strong className="text-neutral-800">
                        {autoDistributeScope === 'new_only' && 'Apenas Leads Novos (Não Abordados)'}
                        {autoDistributeScope === 'all' && 'Toda a Base de Leads do CRM'}
                        {autoDistributeScope === 'all_unattempted' && 'Todos os Leads sem Ligação'}
                        {autoDistributeScope === 'unconverted' && 'Todos os Leads Não Fechados'}
                      </strong>
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200 space-y-2">
                  <span className="text-xs font-bold text-neutral-700 block">
                    Distribuição planejada de {autoScopeCount} leads:
                  </span>
                  <div className="space-y-1.5 text-xs">
                    {salespeople.map((s) => {
                      const pct = quotasState[s.id] ?? (s.distributionPercent || 0);
                      const count = totalQuotaSum > 0 ? Math.round((autoScopeCount * pct) / totalQuotaSum) : 0;
                      return (
                        <div key={s.id} className="flex items-center justify-between">
                          <span className="font-semibold text-neutral-800 flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                            {s.name} ({pct}%)
                          </span>
                          <strong className="text-emerald-700 font-mono">~{count} leads</strong>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100">
                  <button
                    type="button"
                    onClick={() => setShowAutoDistributeConfirmModal(false)}
                    className="px-4 py-2 text-xs font-semibold text-neutral-600 hover:text-neutral-900 rounded-xl hover:bg-neutral-100 transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleAutoDistributeByQuotas}
                    disabled={autoDistributing}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition"
                  >
                    <Check className="w-4 h-4" />
                    <span>{autoDistributing ? 'Distribuindo...' : 'Confirmar e Executar'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Quota Sliders Card */}
          <div className="bg-white rounded-2xl p-6 border border-neutral-200 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
                  <Percent className="w-4 h-4 text-emerald-600" />
                  <span>Configuração de Quota (%) por Vendedora</span>
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Ajuste a fatia de novos leads que cada membro da equipe deve receber. (Total atual: <strong className={totalQuotaSum === 100 ? 'text-emerald-600' : 'text-amber-600'}>{totalQuotaSum}%</strong>)
                </p>
              </div>

              <button
                onClick={handleSaveQuotas}
                disabled={savingQuotas}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-2xs flex items-center gap-1.5 transition self-start sm:self-auto"
              >
                <Check className="w-4 h-4" />
                <span>{savingQuotas ? 'Salvando...' : 'Salvar Porcentagens'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {salespeople.map((s) => {
                const currentPercent = quotasState[s.id] ?? (s.distributionPercent || 0);
                const estimatedLeads = totalQuotaSum > 0 ? Math.round((autoScopeCount * currentPercent) / totalQuotaSum) : 0;

                return (
                  <div
                    key={s.id}
                    className="p-4 rounded-xl border border-neutral-200 bg-neutral-50/50 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />
                        <span className="text-xs font-bold text-neutral-900 truncate">{s.name}</span>
                      </div>
                      <span className="text-sm font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        {currentPercent}%
                      </span>
                    </div>

                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={currentPercent}
                      onChange={(e) => setQuotasState({ ...quotasState, [s.id]: Number(e.target.value) })}
                      className="w-full accent-emerald-600 cursor-pointer h-2 bg-neutral-200 rounded-lg"
                    />

                    <div className="flex items-center justify-between text-[11px] text-neutral-500 pt-1 border-t border-neutral-200/60">
                      <span>Estimativa no grupo selecionado:</span>
                      <strong className="text-neutral-900">{estimatedLeads} leads</strong>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Manual Batch Transfer Card */}
          <div className="bg-white rounded-2xl p-6 border border-neutral-200 shadow-xs space-y-5">
            <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
              <ArrowRight className="w-4 h-4 text-blue-600" />
              <span>Transferência Manual de Leads em Lote</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Origin filter */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1.5">
                  1. Origem dos Leads
                </label>
                <select
                  value={distSourceFilter}
                  onChange={(e: any) => setDistSourceFilter(e.target.value)}
                  className="w-full text-xs p-2.5 bg-white border border-neutral-300 rounded-xl font-medium focus:outline-hidden focus:border-blue-500"
                >
                  <option value="new_only">Apenas Leads Novos não abordados ({newLeads.length})</option>
                  <option value="all_unattempted">Todos os Leads sem ligação ({unattemptedLeads.length})</option>
                  <option value="all">Toda a base de leads ({leads.length})</option>
                </select>
              </div>

              {/* Destination seller */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1.5">
                  2. Vendedora de Destino
                </label>
                <select
                  value={distTargetId}
                  onChange={(e) => setDistTargetId(e.target.value)}
                  className="w-full text-xs p-2.5 bg-white border border-neutral-300 rounded-xl font-medium focus:outline-hidden focus:border-blue-500"
                >
                  {salespeople.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.distributionPercent || (s.isDefault ? 50 : 0)}% quota)
                    </option>
                  ))}
                </select>
              </div>

              {/* Mode & Value */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-neutral-700">
                    3. Quantidade / Porcentagem
                  </label>
                  <div className="flex items-center p-0.5 bg-neutral-100 rounded-lg border border-neutral-200 text-[10px]">
                    <button
                      type="button"
                      onClick={() => setDistMode('percent')}
                      className={`px-2 py-0.5 rounded font-bold ${distMode === 'percent' ? 'bg-white shadow-2xs text-blue-700' : 'text-neutral-600'}`}
                    >
                      %
                    </button>
                    <button
                      type="button"
                      onClick={() => setDistMode('count')}
                      className={`px-2 py-0.5 rounded font-bold ${distMode === 'count' ? 'bg-white shadow-2xs text-blue-700' : 'text-neutral-600'}`}
                    >
                      Qtd
                    </button>
                  </div>
                </div>

                {distMode === 'percent' ? (
                  <div className="space-y-1.5">
                    <input
                      type="range"
                      min="5"
                      max="100"
                      step="5"
                      value={distPercentage}
                      onChange={(e) => setDistPercentage(Number(e.target.value))}
                      className="w-full accent-blue-600 cursor-pointer h-2 bg-neutral-200 rounded-lg"
                    />
                    <div className="flex justify-between text-[11px] font-semibold text-neutral-600">
                      <span>{distPercentage}%</span>
                      <span>= {calculatedLeadsToDistribute} leads</span>
                    </div>
                  </div>
                ) : (
                  <input
                    type="number"
                    min="1"
                    max={totalEligibleCount}
                    value={distCount}
                    onChange={(e) => setDistCount(Number(e.target.value))}
                    className="w-full text-xs p-2 bg-white border border-neutral-300 rounded-xl font-bold"
                  />
                )}
              </div>
            </div>

            <div className="pt-2 border-t border-neutral-100 flex items-center justify-between">
              <span className="text-xs text-neutral-600">
                Serão transferidos <strong>{calculatedLeadsToDistribute} leads</strong> para a vendedora selecionada.
              </span>
              <button
                onClick={handleManualDistribute}
                disabled={distributing || calculatedLeadsToDistribute === 0}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-2 transition"
              >
                <ArrowRight className="w-4 h-4" />
                <span>{distributing ? 'Transferindo...' : 'Transferir Leads Agora'}</span>
              </button>
            </div>
          </div>

          {/* Export JSON Card (Only Names of Uncontacted Leads in Entire CRM) */}
          <div className="bg-amber-50/70 rounded-2xl p-6 border border-amber-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1 max-w-xl">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-600 text-white flex items-center justify-center shadow-2xs">
                  <FileJson className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-amber-950">
                  Exportar Arquivo JSON (Apenas Nomes dos Leads Não Abordados)
                </h3>
              </div>
              <p className="text-xs text-amber-800 leading-relaxed">
                Baixa um arquivo <code>.json</code> contendo <strong>apenas o nome</strong> de todos os <strong>{unattemptedLeads.length} leads</strong> que ainda não foram ligados em todo o CRM (sistema inteiro, independente de vendedor).
              </p>
            </div>

            <button
              type="button"
              onClick={handleDownloadUncontactedNames}
              disabled={downloadingNamesJson || unattemptedLeads.length === 0}
              className="px-5 py-3 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-2 transition shrink-0"
            >
              <Download className="w-4 h-4" />
              <span>{downloadingNamesJson ? 'Gerando JSON...' : `Baixar JSON (${unattemptedLeads.length} Nomes)`}</span>
            </button>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: PERFORMANCE / RANKING */}
      {activeSubTab === 'performance' && (
        <div className="bg-white rounded-2xl p-6 border border-neutral-200 shadow-xs space-y-6">
          <div>
            <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-500" />
              <span>Ranking & Métricas por Vendedora</span>
            </h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              Acompanhamento de conversão, ligações realizadas e tempo total falado.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 text-neutral-600 font-bold uppercase tracking-wider border-b border-neutral-200">
                <tr>
                  <th className="py-3 px-4">Vendedora</th>
                  <th className="py-3 px-4">WhatsApp / Login</th>
                  <th className="py-3 px-4 text-center">Leads na Carteira</th>
                  <th className="py-3 px-4 text-center">Ligações Feitas</th>
                  <th className="py-3 px-4 text-center">Fechamentos</th>
                  <th className="py-3 px-4 text-center">Taxa de Conversão</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {salespeople.map((s, idx) => {
                  const sLeads = leads.filter((l) => (l.salespersonId || 'seller-thomas') === s.id);
                  const calls = sLeads.reduce((acc, l) => acc + (l.callHistory?.length || 0), 0);
                  const closed = sLeads.filter((l) => l.columnStatus === 'fechamento').length;
                  const convRate = sLeads.length > 0 ? ((closed / sLeads.length) * 100).toFixed(1) : '0.0';

                  return (
                    <tr key={s.id} className="hover:bg-neutral-50/60 transition">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <span className="w-6 h-6 rounded-full flex items-center justify-center font-bold text-[11px]" style={{ backgroundColor: s.bgColor, color: s.color }}>
                            {idx + 1}
                          </span>
                          <span className="font-bold text-neutral-900">{s.name}</span>
                          {s.isDefault && <span className="text-[9px] bg-neutral-900 text-white font-bold px-1.5 py-0.5 rounded">Master</span>}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-neutral-600 font-semibold">
                        {s.phone || '-'}
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-neutral-800">
                        {sLeads.length}
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-blue-700">
                        {calls}
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-emerald-700">
                        {closed}
                      </td>
                      <td className="py-3 px-4 text-center font-bold">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                          {convRate}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
