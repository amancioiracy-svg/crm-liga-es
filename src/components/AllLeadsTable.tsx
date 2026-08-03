import React, { useState } from 'react';
import { Lead, PIPELINE_COLUMNS, ColumnStatus } from '../types';
import { Search, Phone, ExternalLink, QrCode, Copy, Trash2, Eye, MessageCircle, Check } from 'lucide-react';
import { getWhatsAppUrl } from '../lib/phone';
import { QrCodeModal } from './QrCodeModal';

interface AllLeadsTableProps {
  leads: Lead[];
  onOpenDetails: (lead: Lead) => void;
  onUpdateColumn: (leadId: string, newColumn: ColumnStatus) => void;
  onDeleteLead: (leadId: string) => void;
  onShowToast: (msg: string) => void;
}

export const AllLeadsTable: React.FC<AllLeadsTableProps> = ({
  leads,
  onOpenDetails,
  onUpdateColumn,
  onDeleteLead,
  onShowToast
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedColumnFilter, setSelectedColumnFilter] = useState<string>('ALL');
  const [selectedQrLead, setSelectedQrLead] = useState<Lead | null>(null);

  const filteredLeads = leads.filter((l) => {
    const matchesSearch = 
      l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.phoneNumber.includes(searchQuery) ||
      (l.publicUrl && l.publicUrl.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCol = selectedColumnFilter === 'ALL' || l.columnStatus === selectedColumnFilter;

    return matchesSearch && matchesCol;
  });

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

        <div className="flex items-center gap-2">
          <label className="text-xs text-neutral-500">Coluna:</label>
          <select
            value={selectedColumnFilter}
            onChange={(e) => setSelectedColumnFilter(e.target.value)}
            className="text-xs bg-neutral-50 border border-neutral-200 rounded-md px-2.5 py-2 text-neutral-800"
          >
            <option value="ALL">Todas as colunas ({leads.length})</option>
            {PIPELINE_COLUMNS.map((col) => (
              <option key={col} value={col}>
                {col} ({leads.filter((l) => l.columnStatus === col).length})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-neutral-200 text-neutral-500 font-medium bg-neutral-50/50">
              <th className="py-2.5 px-3">Nome do Lead</th>
              <th className="py-2.5 px-3">Telefone (Bruto)</th>
              <th className="py-2.5 px-3">URL do Site</th>
              <th className="py-2.5 px-3">Estágio do Pipeline</th>
              <th className="py-2.5 px-3">Ligações</th>
              <th className="py-2.5 px-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 text-neutral-800">
            {filteredLeads.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-neutral-400 italic">
                  Nenhum lead encontrado com os filtros atuais.
                </td>
              </tr>
            ) : (
              filteredLeads.map((lead) => (
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
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-neutral-100 text-neutral-600">
                      {lead.callCount || 0} registro(s)
                    </span>
                  </td>

                  <td className="py-3 px-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {/* WhatsApp */}
                      <button
                        onClick={() => window.open(getWhatsAppUrl(lead.phoneNumber), '_blank')}
                        className="p-1.5 rounded text-emerald-600 hover:bg-emerald-50 transition-colors"
                        title="Abrir no WhatsApp Web"
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
              ))
            )}
          </tbody>
        </table>
      </div>

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
