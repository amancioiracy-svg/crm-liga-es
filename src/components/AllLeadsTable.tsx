import React, { useState, useMemo, useDeferredValue } from 'react';
import { Lead, PIPELINE_COLUMNS, ColumnStatus, CustomTag } from '../types';
import { Search, Phone, ExternalLink, QrCode, Copy, Trash2, Eye, MessageCircle, Check, CalendarClock, AlertTriangle, Clock, FileCode, ChevronLeft, ChevronRight } from 'lucide-react';
import { getWhatsAppUrl, getStoredWhatsAppTemplate, formatWhatsAppMessage } from '../lib/phone';
import { QrCodeModal } from './QrCodeModal';
import { getFollowUpInfo } from '../lib/followUp';
import { getLeadNiche } from '../lib/niche';

interface AllLeadsTableProps {
  leads: Lead[];
  tags?: CustomTag[];
  onOpenDetails: (lead: Lead) => void;
  onUpdateColumn: (leadId: string, newColumn: ColumnStatus) => void;
  onDeleteLead: (leadId: string) => void;
  onShowToast: (msg: string) => void;
  onOpenJsonBatchModal?: () => void;
}

export const AllLeadsTable: React.FC<AllLeadsTableProps> = ({
  leads,
  tags = [],
  onOpenDetails,
  onUpdateColumn,
  onDeleteLead,
  onShowToast,
  onOpenJsonBatchModal
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedColumnFilter, setSelectedColumnFilter] = useState<string>('ALL');
  const [selectedFollowUpFilter, setSelectedFollowUpFilter] = useState<string>('ALL');
  const [selectedQrLead, setSelectedQrLead] = useState<Lead | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(50);

  const deferredSearch = useDeferredValue(searchQuery);

  const getTagStyle = (tagName: string) => {
    const found = tags.find(t => t.name.toLowerCase() === tagName.toLowerCase());
    if (found) {
      return { color: found.color, backgroundColor: found.bgColor };
    }
    return { color: '#374151', backgroundColor: '#f3f4f6' };
  };

  const filteredLeads = useMemo(() => {
    const cleanSearch = deferredSearch.trim().toLowerCase();

    return leads.filter((l) => {
      const matchesSearch = 
        !cleanSearch ||
        l.name.toLowerCase().includes(cleanSearch) ||
        l.phoneNumber.includes(cleanSearch) ||
        getLeadNiche(l).toLowerCase().includes(cleanSearch) ||
        (l.publicUrl && l.publicUrl.toLowerCase().includes(cleanSearch));

      const matchesCol = selectedColumnFilter === 'ALL' || l.columnStatus === selectedColumnFilter;

      const fInfo = getFollowUpInfo(l.nextFollowUpAt);
      let matchesFollowUp = true;
      if (selectedFollowUpFilter === 'OVERDUE') matchesFollowUp = fInfo.status === 'OVERDUE';
      if (selectedFollowUpFilter === 'TODAY') matchesFollowUp = fInfo.status === 'TODAY';
      if (selectedFollowUpFilter === 'SCHEDULED') matchesFollowUp = fInfo.status === 'SCHEDULED' || fInfo.status === 'TODAY' || fInfo.status === 'OVERDUE';
      if (selectedFollowUpFilter === 'NONE') matchesFollowUp = fInfo.status === 'NONE';

      return matchesSearch && matchesCol && matchesFollowUp;
    });
  }, [leads, deferredSearch, selectedColumnFilter, selectedFollowUpFilter]);

  // Reset page to 1 when filters or search change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [deferredSearch, selectedColumnFilter, selectedFollowUpFilter, pageSize]);

  const totalPages = pageSize === -1 ? 1 : Math.max(1, Math.ceil(filteredLeads.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);

  const paginatedLeads = useMemo(() => {
    if (pageSize === -1) return filteredLeads;
    const start = (safePage - 1) * pageSize;
    return filteredLeads.slice(start, start + pageSize);
  }, [filteredLeads, safePage, pageSize]);

  const startRecord = filteredLeads.length === 0 ? 0 : (safePage - 1) * (pageSize === -1 ? filteredLeads.length : pageSize) + 1;
  const endRecord = pageSize === -1 ? filteredLeads.length : Math.min(safePage * pageSize, filteredLeads.length);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    onShowToast(`${label} copiado!`);
  };

  return (
    <div className="bg-white border border-neutral-200 rounded-xl p-4 shadow-2xs">
      {/* Search & Filter Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nome, telefone ou URL..."
            className="w-full text-xs pl-9 pr-3 py-2 bg-neutral-50 border border-neutral-200 rounded-md focus:outline-none focus:ring-1 focus:ring-neutral-400"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Filter Retorno / Follow Up */}
          <div className="flex items-center gap-1.5">
            <label className="text-xs text-neutral-500 font-medium">Retorno:</label>
            <select
              value={selectedFollowUpFilter}
              onChange={(e) => setSelectedFollowUpFilter(e.target.value)}
              className="text-xs bg-neutral-50 border border-neutral-200 rounded-md px-2.5 py-2 text-neutral-800 font-medium"
            >
              <option value="ALL">Todos os retornos</option>
              <option value="OVERDUE">🚨 Retornos Atrasados</option>
              <option value="TODAY">🔔 Retornos de Hoje</option>
              <option value="SCHEDULED">📅 Todos Agendados</option>
              <option value="NONE">Sem Agendamento</option>
            </select>
          </div>

          {/* Filter Colunas */}
          <div className="flex items-center gap-1.5">
            <label className="text-xs text-neutral-500 font-medium">Coluna:</label>
            <select
              value={selectedColumnFilter}
              onChange={(e) => setSelectedColumnFilter(e.target.value)}
              className="text-xs bg-neutral-50 border border-neutral-200 rounded-md px-2.5 py-2 text-neutral-800 font-medium"
            >
              <option value="ALL">Todas as colunas ({leads.length})</option>
              {PIPELINE_COLUMNS.map((col) => (
                <option key={col} value={col}>
                  {col} ({leads.filter((l) => l.columnStatus === col).length})
                </option>
              ))}
            </select>
          </div>

          {onOpenJsonBatchModal && (
            <button
              type="button"
              onClick={onOpenJsonBatchModal}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md transition-colors"
              title="Colar JSON para atualização rápida em lote"
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>Atualizar via JSON</span>
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-neutral-200 text-neutral-500 font-medium bg-neutral-50/50">
              <th className="py-2.5 px-3">Nome do Lead</th>
              <th className="py-2.5 px-3">Nicho</th>
              <th className="py-2.5 px-3">Telefone (Bruto)</th>
              <th className="py-2.5 px-3">URL do Site</th>
              <th className="py-2.5 px-3">Estágio do Pipeline</th>
              <th className="py-2.5 px-3">Última Etiqueta</th>
              <th className="py-2.5 px-3">Próximo Retorno</th>
              <th className="py-2.5 px-3">Ligações</th>
              <th className="py-2.5 px-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 text-neutral-800">
            {filteredLeads.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-8 text-center text-neutral-400 italic">
                  Nenhum lead encontrado com os filtros atuais.
                </td>
              </tr>
            ) : (
              paginatedLeads.map((lead) => {
                const fInfo = getFollowUpInfo(lead.nextFollowUpAt);
                return (
                  <tr key={lead.id} className="hover:bg-neutral-50/80 transition-colors">
                    <td className="py-3 px-3 font-semibold text-neutral-900">
                      <button
                        onClick={() => onOpenDetails(lead)}
                        className="text-left hover:text-blue-600 transition-colors"
                      >
                        {lead.name}
                      </button>
                      <span className="block text-[10px] font-mono text-neutral-400 font-normal">
                        ID: {lead.id}
                      </span>
                    </td>

                    <td className="py-3 px-3">
                      <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-neutral-100 text-neutral-700 border border-neutral-200/60">
                        {getLeadNiche(lead)}
                      </span>
                    </td>

                    <td className="py-3 px-3 font-mono text-neutral-600">
                      <div className="flex items-center gap-1.5">
                        <span>{lead.phoneNumber}</span>
                        <button
                          onClick={() => handleCopy(lead.phoneNumber, 'Número bruto')}
                          className="p-1 text-neutral-400 hover:text-neutral-700 transition-colors"
                          title="Copiar Número Bruto (sem 0)"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      {lead.publicUrl ? (
                        <div className="flex items-center gap-1.5">
                          <a
                            href={lead.publicUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-600 hover:underline max-w-[180px] truncate block"
                          >
                            {lead.publicUrl.replace(/^https?:\/\//, '')}
                          </a>
                          <button
                            onClick={() => handleCopy(lead.publicUrl!, 'URL')}
                            className="p-1 text-neutral-400 hover:text-neutral-700"
                            title="Copiar URL"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-neutral-300 italic">—</span>
                      )}
                    </td>

                    <td className="py-3 px-3">
                      <select
                        value={lead.columnStatus}
                        onChange={(e) => onUpdateColumn(lead.id, e.target.value as ColumnStatus)}
                        className="text-[11px] bg-white border border-neutral-200 rounded px-2 py-1 text-neutral-700 focus:outline-none"
                      >
                        {PIPELINE_COLUMNS.map((col) => (
                          <option key={col} value={col}>
                            {col}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td className="py-3 px-3">
                      {lead.lastCallTag ? (
                        <div className="flex flex-wrap items-center gap-1">
                          {lead.lastCallTag.split(',').map((tName, i) => {
                            const trimmed = tName.trim();
                            if (!trimmed) return null;
                            return (
                              <span
                                key={i}
                                style={getTagStyle(trimmed)}
                                className="px-2 py-0.5 rounded text-[10px] font-semibold border border-black/5"
                              >
                                {trimmed}
                              </span>
                            );
                          })}
                        </div>
                      ) : (
                        <span className="text-neutral-300 italic text-[11px]">—</span>
                      )}
                    </td>

                    <td className="py-3 px-3">
                      {fInfo.status === 'OVERDUE' && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-800 bg-rose-100 px-2 py-0.5 rounded border border-rose-200">
                          <AlertTriangle className="w-3 h-3 text-rose-600 shrink-0" />
                          {fInfo.label}
                        </span>
                      )}
                      {fInfo.status === 'TODAY' && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded border border-amber-200">
                          <Clock className="w-3 h-3 text-amber-600 shrink-0" />
                          {fInfo.label}
                        </span>
                      )}
                      {fInfo.status === 'SCHEDULED' && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                          <CalendarClock className="w-3 h-3 text-blue-600 shrink-0" />
                          {fInfo.label}
                        </span>
                      )}
                      {fInfo.status === 'NONE' && (
                        <span className="text-neutral-300 italic text-[11px]">—</span>
                      )}
                    </td>

                    <td className="py-3 px-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-neutral-100 text-neutral-600">
                        {lead.callCount || 0} registro(s)
                      </span>
                    </td>

                  <td className="py-3 px-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {/* WhatsApp */}
                      <button
                        onClick={() => {
                          const template = getStoredWhatsAppTemplate();
                          const msgText = formatWhatsAppMessage(template, {
                            name: lead.name,
                            site: lead.publicUrl || '',
                            salesperson: lead.salespersonName || 'Thomas'
                          });
                          window.open(getWhatsAppUrl(lead.phoneNumber, msgText), 'whatsapp');
                        }}
                        className="p-1.5 rounded text-emerald-600 hover:bg-emerald-50 transition-colors"
                        title="Abrir no WhatsApp Web (reaproveita aba)"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                      </button>

                      {/* QR Code */}
                      <button
                        onClick={() => setSelectedQrLead(lead)}
                        className="p-1.5 rounded text-neutral-600 hover:bg-neutral-100 transition-colors"
                        title="Abrir QR Code de Discagem (tel:0...)"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                      </button>

                      {/* Detalhes */}
                      <button
                        onClick={() => onOpenDetails(lead)}
                        className="p-1.5 rounded text-neutral-600 hover:bg-neutral-100 transition-colors"
                        title="Ver Detalhes e Registrar Ligação"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      {/* Excluir */}
                      <button
                        onClick={() => onDeleteLead(lead.id)}
                        className="p-1.5 rounded text-rose-500 hover:bg-rose-50 transition-colors"
                        title="Excluir Lead"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })
          )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {filteredLeads.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 mt-3 border-t border-neutral-200 text-xs text-neutral-600">
          <div className="flex items-center gap-2">
            <span>
              Mostrando <strong className="font-semibold text-neutral-900">{startRecord}</strong> a{' '}
              <strong className="font-semibold text-neutral-900">{endRecord}</strong> de{' '}
              <strong className="font-semibold text-neutral-900">{filteredLeads.length}</strong> leads
            </span>

            <div className="flex items-center gap-1.5 ml-2 pl-2 border-l border-neutral-200">
              <span className="text-[11px] text-neutral-500">Por página:</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="text-xs bg-neutral-50 border border-neutral-200 rounded px-2 py-1 text-neutral-800 font-medium"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={200}>200</option>
                <option value={-1}>Todos</option>
              </select>
            </div>
          </div>

          {pageSize !== -1 && totalPages > 1 && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-xs font-medium"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Anterior</span>
              </button>

              <span className="px-2 text-xs font-medium text-neutral-700">
                Página <strong className="font-semibold text-neutral-900">{safePage}</strong> de {totalPages}
              </span>

              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-xs font-medium"
              >
                <span>Próxima</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}

      {selectedQrLead && (
        <QrCodeModal
          isOpen={!!selectedQrLead}
          onClose={() => setSelectedQrLead(null)}
          leadName={selectedQrLead.name}
          phoneNumber={selectedQrLead.phoneNumber}
        />
      )}
    </div>
  );
};
