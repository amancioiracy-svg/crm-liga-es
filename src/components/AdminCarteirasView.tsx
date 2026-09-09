import React, { useState } from 'react';
import { Salesperson, Lead } from '../types';
import {
  Share2,
  RefreshCw,
  ChevronRight,
  Plus
} from 'lucide-react';

interface AdminCarteirasViewProps {
  salespeople: Salesperson[];
  leads: Lead[];
  onOpenCreateSellerModal: () => void;
  onNavigateToKanban: (sellerId?: string) => void;
  onRefreshData: () => void;
  onShowToast: (msg: string) => void;
}

export const AdminCarteirasView: React.FC<AdminCarteirasViewProps> = ({
  salespeople,
  leads,
  onOpenCreateSellerModal,
  onNavigateToKanban,
  onRefreshData,
  onShowToast
}) => {
  const [targetId, setTargetId] = useState<string>(salespeople[0]?.id || '');
  const [sourceId, setSourceId] = useState<string>('ALL');
  const [count, setCount] = useState<number>(15);
  const [distributing, setDistributing] = useState(false);

  const handleDistribute = async () => {
    if (!targetId) {
      onShowToast('Selecione o vendedor de destino.');
      return;
    }
    if (count <= 0) {
      onShowToast('Informe uma quantidade válida maior que zero.');
      return;
    }

    setDistributing(true);
    try {
      const res = await fetch('/api/leads/distribute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetSalespersonId: targetId,
          sourceSalespersonId: sourceId === 'ALL' ? undefined : sourceId,
          mode: 'count',
          value: count
        })
      });

      const data = await res.json();
      if (res.ok) {
        onShowToast(data.message || `${count} leads distribuídos com sucesso!`);
        onRefreshData();
      } else {
        onShowToast(data.error || 'Erro ao distribuir leads.');
      }
    } catch (err) {
      onShowToast('Erro de conexão ao distribuir.');
    } finally {
      setDistributing(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f8f9fa] overflow-y-auto p-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-neutral-200 shadow-2xs">
        <div>
          <h1 className="text-lg font-bold text-neutral-900 tracking-tight flex items-center gap-2">
            <Share2 className="w-5 h-5 text-blue-600" />
            <span>Central de Divisão de Carteiras & Balanceamento</span>
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Gerenciamento completo das carteiras individuais, redistribuição em lote de leads virgens e inclusão de closers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenCreateSellerModal}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-neutral-900 hover:bg-black text-white text-xs font-bold shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Novo Vendedor</span>
          </button>

          <button
            onClick={onRefreshData}
            className="p-2 rounded-xl border border-neutral-200 text-neutral-600 hover:bg-neutral-50 transition-colors"
            title="Atualizar dados"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Grid de Vendedores Reais do Banco de Dados */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-neutral-800">
            Carteiras Ativas ({salespeople.length})
          </h2>
          <span className="text-xs text-neutral-400 font-mono">
            Dados dinâmicos do PostgreSQL
          </span>
        </div>

        {salespeople.length === 0 ? (
          <div className="bg-white rounded-2xl border border-neutral-200 p-8 text-center text-neutral-400 text-xs">
            Nenhum vendedor cadastrado ainda no PostgreSQL. Clique em "Novo Vendedor" acima para cadastrar a equipe.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {salespeople.map((seller) => {
              const sellerLeads = leads.filter(l => (l.salespersonId || '').toLowerCase() === seller.id.toLowerCase());
              const total = sellerLeads.length;
              const uncontacted = sellerLeads.filter(l => l.columnStatus === 'Leads' && (!l.callCount || l.callCount === 0)).length;
              const closed = sellerLeads.filter(l => l.columnStatus === 'Fechado').length;
              const rate = total > 0 ? ((closed / total) * 100).toFixed(1) : '0.0';

              return (
                <div
                  key={seller.id}
                  className="bg-white rounded-2xl border border-neutral-200 p-4 shadow-2xs hover:shadow-sm transition-all"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs text-white"
                        style={{ backgroundColor: seller.color || '#0284c7' }}
                      >
                        {seller.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-bold text-neutral-900 text-sm">
                          {seller.name}
                        </div>
                        <div className="text-[10px] text-neutral-400 font-mono">
                          Rota: /v/{seller.slug || seller.id.replace(/^seller-/, '')}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => onNavigateToKanban(seller.id)}
                      className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                      title="Abrir o Kanban"
                    >
                      <span>Ver Kanban</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-2 my-3 text-center">
                    <div className="p-2 bg-neutral-50 rounded-xl">
                      <span className="text-[10px] text-neutral-400 block font-medium">Total</span>
                      <span className="text-base font-bold text-neutral-900">{total}</span>
                    </div>
                    <div className="p-2 bg-neutral-50 rounded-xl">
                      <span className="text-[10px] text-neutral-400 block font-medium">Virgens</span>
                      <span className="text-base font-bold text-amber-600">{uncontacted}</span>
                    </div>
                    <div className="p-2 bg-neutral-50 rounded-xl">
                      <span className="text-[10px] text-neutral-400 block font-medium">Fechados</span>
                      <span className="text-base font-bold text-emerald-600">{closed}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-neutral-100 flex items-center justify-between text-xs text-neutral-500">
                    <span>Taxa de Conversão:</span>
                    <span className="font-bold text-neutral-900 font-mono">{rate}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Ferramenta Executiva de Injeção & Redistribuição */}
      <div className="bg-white rounded-2xl border border-neutral-200 p-5 shadow-2xs">
        <div className="flex items-center gap-2 mb-1">
          <Share2 className="w-4 h-4 text-blue-600" />
          <h3 className="text-sm font-bold text-neutral-900">
            Ferramenta Executiva de Injeção e Redistribuição de Leads
          </h3>
        </div>
        <p className="text-xs text-neutral-500 mb-4">
          Transfira lotes de novos leads virgens para quem tem maior capacidade de conversão ou equilibre a operação.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-neutral-600 uppercase tracking-wider mb-1">
              Origem dos Leads
            </label>
            <select
              value={sourceId}
              onChange={(e) => setSourceId(e.target.value)}
              className="w-full text-xs bg-neutral-50 border border-neutral-200 rounded-xl p-2.5 font-medium text-neutral-800 focus:outline-none"
            >
              <option value="ALL">Qualquer Carteira com Leads Novos</option>
              {salespeople.map((s) => (
                <option key={s.id} value={s.id}>
                  Apenas de {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-neutral-600 uppercase tracking-wider mb-1">
              Destino dos Leads
            </label>
            <select
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              className="w-full text-xs bg-neutral-50 border border-neutral-200 rounded-xl p-2.5 font-medium text-neutral-800 focus:outline-none"
            >
              {salespeople.map((s) => (
                <option key={s.id} value={s.id}>
                  Transferir para {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-neutral-600 uppercase tracking-wider mb-1">
              Quantidade de Leads
            </label>
            <input
              type="number"
              min={1}
              max={500}
              value={count}
              onChange={(e) => setCount(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full text-xs bg-neutral-50 border border-neutral-200 rounded-xl p-2.5 font-medium text-neutral-800 focus:outline-none"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={handleDistribute}
              disabled={distributing}
              className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>{distributing ? 'Distribuindo...' : 'Executar Distribuição'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
