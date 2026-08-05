import React, { useState, useEffect, useRef } from 'react';
import { Lead, CustomTag } from '../types';
import { PhoneCall, Clock, TrendingUp, AlertCircle, Download, Tag as TagIcon, Filter, RefreshCw, ChevronDown, Check, X } from 'lucide-react';

interface CallLogItem {
  id: string;
  leadId: string;
  tag: string;
  durationSeconds?: number;
  createdAt: string;
}

interface MetricsBarProps {
  leads: Lead[];
  tags: CustomTag[];
  selectedTagFilters: string[];
  onTagFilterChange: (tags: string[]) => void;
  onShowToast: (msg: string) => void;
}

export const MetricsBar: React.FC<MetricsBarProps> = ({
  leads,
  tags,
  selectedTagFilters,
  onTagFilterChange,
  onShowToast
}) => {
  const [calls, setCalls] = useState<CallLogItem[]>([]);
  const [loadingCalls, setLoadingCalls] = useState(false);
  const [exportingCsv, setExportingCsv] = useState(false);
  const [isTagDropdownOpen, setIsTagDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchCalls();
  }, [leads]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsTagDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchCalls = async () => {
    setLoadingCalls(true);
    try {
      const res = await fetch('/api/calls');
      if (res.ok) {
        const data = await res.json();
        setCalls(data);
      }
    } catch (err) {
      console.error('Erro ao buscar chamadas para métricas:', err);
    } finally {
      setLoadingCalls(false);
    }
  };

  // 1. Ligações Hoje
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayCalls = calls.filter((c) => {
    if (!c.createdAt) return false;
    return c.createdAt.slice(0, 10) === todayStr;
  });

  // 2. Tempo Médio por Chamada
  const validDurations = calls.map((c) => c.durationSeconds || 0).filter((d) => d > 0);
  const totalDuration = validDurations.reduce((acc, curr) => acc + curr, 0);
  const avgDuration = validDurations.length > 0 ? Math.round(totalDuration / validDurations.length) : 0;

  const formatAvgTime = (totalSec: number) => {
    if (totalSec <= 0) return '00m 00s';
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
  };

  // 3. Taxa de Conversão (% de Leads em 'Ganha / Fechado')
  const totalLeads = leads.length;
  const closedLeads = leads.filter((l) => l.columnStatus === 'Ganha / Fechado').length;
  const conversionRate = totalLeads > 0 ? ((closedLeads / totalLeads) * 100).toFixed(1) : '0.0';

  // 4. Leads Estagnados (sem ligações ou sem contato nos últimos 3 dias)
  const threeDaysAgoMs = Date.now() - 3 * 24 * 60 * 60 * 1000;
  const stagnantLeads = leads.filter((l) => {
    if (!l.lastCallAt) return true; // Nunca contatado
    const lastCallDateMs = new Date(l.lastCallAt).getTime();
    return lastCallDateMs < threeDaysAgoMs;
  });

  const handleExportCsv = async () => {
    setExportingCsv(true);
    try {
      const res = await fetch('/api/export/csv');
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `relatorio_vendas_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        onShowToast('Relatório CSV baixado com sucesso!');
      } else {
        onShowToast('Erro ao gerar CSV.');
      }
    } catch (err) {
      console.error(err);
      onShowToast('Erro ao exportar CSV.');
    } finally {
      setExportingCsv(false);
    }
  };

  return (
    <div className="bg-white border-b border-neutral-200 px-6 py-3.5 space-y-3 shrink-0 shadow-2xs">
      {/* Cards de Métricas Principais */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Card 1: Ligações Hoje */}
        <div className="bg-neutral-50 border border-neutral-200/80 rounded-xl p-3 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider block">
              Ligações Hoje
            </span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-xl font-bold text-neutral-900 leading-tight">
                {todayCalls.length}
              </span>
              <span className="text-[10px] text-neutral-500">
                ({calls.length} no total)
              </span>
            </div>
          </div>
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg shrink-0">
            <PhoneCall className="w-5 h-5" />
          </div>
        </div>

        {/* Card 2: Tempo Médio por Chamada */}
        <div className="bg-neutral-50 border border-neutral-200/80 rounded-xl p-3 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider block">
              Tempo Médio
            </span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-xl font-bold text-neutral-900 leading-tight">
                {formatAvgTime(avgDuration)}
              </span>
            </div>
          </div>
          <div className="p-2.5 bg-purple-50 text-purple-600 rounded-lg shrink-0">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        {/* Card 3: Taxa de Conversão */}
        <div className="bg-neutral-50 border border-neutral-200/80 rounded-xl p-3 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider block">
              Taxa de Conversão
            </span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-xl font-bold text-emerald-700 leading-tight">
                {conversionRate}%
              </span>
              <span className="text-[10px] text-neutral-500">
                ({closedLeads}/{totalLeads} fechados)
              </span>
            </div>
          </div>
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        {/* Card 4: Leads Estagnados */}
        <div className="bg-neutral-50 border border-neutral-200/80 rounded-xl p-3 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider block">
              Leads Estagnados
            </span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className={`text-xl font-bold leading-tight ${stagnantLeads.length > 0 ? 'text-amber-700' : 'text-neutral-900'}`}>
                {stagnantLeads.length}
              </span>
              <span className="text-[10px] text-neutral-500">
                (sem contato &gt; 3 dias)
              </span>
            </div>
          </div>
          <div className="p-2.5 bg-amber-50 text-amber-600 rounded-lg shrink-0">
            <AlertCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Barra de Filtros por Múltiplas Etiquetas & Exportação CSV */}
      <div className="flex items-center justify-between gap-3 pt-2 border-t border-neutral-100">
        {/* Menu Dropdown de Seleção Múltipla de Etiquetas */}
        <div className="relative" ref={dropdownRef}>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsTagDropdownOpen(!isTagDropdownOpen)}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-neutral-800 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-50 shadow-2xs transition-all"
            >
              <Filter className="w-3.5 h-3.5 text-neutral-500" />
              <span>
                {selectedTagFilters.length === 0
                  ? `Todas as Etiquetas (${leads.length} leads)`
                  : `${selectedTagFilters.length} etiqueta(s) selecionada(s)`}
              </span>
              <ChevronDown className={`w-3.5 h-3.5 text-neutral-400 transition-transform ${isTagDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {selectedTagFilters.length > 0 && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onTagFilterChange([])}
                  className="text-[11px] text-rose-600 hover:text-rose-700 hover:underline font-semibold flex items-center gap-0.5"
                >
                  <X className="w-3 h-3" />
                  Limpar filtro
                </button>
              </div>
            )}
          </div>

          {/* Menu Popover com Caixas de Seleção (Checkboxes) */}
          {isTagDropdownOpen && (
            <div className="absolute top-full left-0 mt-1.5 w-72 bg-white border border-neutral-200 rounded-xl shadow-xl z-50 p-2 space-y-1 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-2 py-1.5 border-b border-neutral-100 flex items-center justify-between">
                <span className="text-[11px] font-bold text-neutral-600 uppercase tracking-wider">
                  Filtrar por Etiqueta
                </span>
                {selectedTagFilters.length > 0 && (
                  <button
                    type="button"
                    onClick={() => onTagFilterChange([])}
                    className="text-[10px] text-rose-600 hover:underline font-semibold"
                  >
                    Desmarcar todas
                  </button>
                )}
              </div>

              <div className="max-h-60 overflow-y-auto space-y-0.5 py-1">
                {/* Opção "Todas" */}
                <label
                  onClick={() => onTagFilterChange([])}
                  className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs cursor-pointer transition-colors ${
                    selectedTagFilters.length === 0
                      ? 'bg-neutral-100 text-neutral-900 font-semibold'
                      : 'hover:bg-neutral-50 text-neutral-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedTagFilters.length === 0}
                      onChange={() => onTagFilterChange([])}
                      className="rounded border-neutral-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                    />
                    <span>Todas as Etiquetas</span>
                  </div>
                  <span className="text-[10px] bg-neutral-200 text-neutral-600 px-1.5 py-0.2 rounded-full font-mono">
                    {leads.length}
                  </span>
                </label>

                <div className="border-t border-neutral-100 my-1"></div>

                {/* Lista de Tags Cadastradas com Caixas de Seleção */}
                {tags.map((t) => {
                  const isChecked = selectedTagFilters.includes(t.name);
                  const count = leads.filter((l) => {
                    if (!l.lastCallTag) return false;
                    return l.lastCallTag.split(',').map((x) => x.trim()).includes(t.name);
                  }).length;

                  const toggleTag = () => {
                    if (isChecked) {
                      onTagFilterChange(selectedTagFilters.filter((name) => name !== t.name));
                    } else {
                      onTagFilterChange([...selectedTagFilters, t.name]);
                    }
                  };

                  return (
                    <label
                      key={t.id}
                      className="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs cursor-pointer hover:bg-neutral-50 transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={toggleTag}
                          className="rounded border-neutral-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 shrink-0"
                        />
                        <span
                          style={{ backgroundColor: t.bgColor, color: t.color }}
                          className="px-2 py-0.5 rounded text-[11px] font-semibold border border-black/5 truncate max-w-[150px]"
                        >
                          {t.name}
                        </span>
                      </div>
                      <span className="text-[10px] text-neutral-400 font-mono shrink-0 ml-1">
                        {count} {count === 1 ? 'lead' : 'leads'}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Botão de Exportação para CSV */}
        <button
          onClick={handleExportCsv}
          disabled={exportingCsv}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-2xs transition-all disabled:opacity-50"
        >
          {exportingCsv ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Download className="w-3.5 h-3.5" />
          )}
          <span>Exportar Relatório (CSV)</span>
        </button>
      </div>
    </div>
  );
};
