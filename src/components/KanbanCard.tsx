import React, { useState } from 'react';
import { Lead, PIPELINE_COLUMNS, ColumnStatus } from '../types';
import { Copy, QrCode, Phone, ExternalLink, MessageCircle, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { getWhatsAppUrl } from '../lib/phone';
import { QrCodeModal } from './QrCodeModal';

interface KanbanCardProps {
  lead: Lead;
  onOpenDetails: (lead: Lead) => void;
  onMoveColumn: (leadId: string, newColumn: ColumnStatus) => void;
  onShowToast: (message: string) => void;
}

export const KanbanCard: React.FC<KanbanCardProps> = ({
  lead,
  onOpenDetails,
  onMoveColumn,
  onShowToast
}) => {
  const [showQrModal, setShowQrModal] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);

  const currentColumnIndex = PIPELINE_COLUMNS.indexOf(lead.columnStatus);

  // 1. Copiar URL (dithoSitesMetadata.publicUrl)
  const handleCopyUrl = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!lead.publicUrl) {
      onShowToast('Este lead não possui URL cadastrada.');
      return;
    }
    navigator.clipboard.writeText(lead.publicUrl);
    setCopiedUrl(true);
    onShowToast('URL copiada para a área de transferência!');
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  // 2. Copiar Número (Número Bruto exatamente como veio no JSON, ex: (31) 99150-3721)
  const handleCopyPhone = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(lead.phoneNumber);
    setCopiedPhone(true);
    onShowToast(`Número ${lead.phoneNumber} copiado!`);
    setTimeout(() => setCopiedPhone(false), 2000);
  };

  // 3. WhatsApp Web (Abre WhatsApp Web sem caracteres especiais)
  const handleOpenWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation();
    const waUrl = getWhatsAppUrl(lead.phoneNumber);
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  const handleMoveLeft = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentColumnIndex > 0) {
      onMoveColumn(lead.id, PIPELINE_COLUMNS[currentColumnIndex - 1]);
    }
  };

  const handleMoveRight = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentColumnIndex < PIPELINE_COLUMNS.length - 1) {
      onMoveColumn(lead.id, PIPELINE_COLUMNS[currentColumnIndex + 1]);
    }
  };

  return (
    <>
      <div 
        onClick={() => onOpenDetails(lead)}
        className="group relative bg-white border border-neutral-200 hover:border-neutral-300 hover:shadow-xs rounded-lg p-3 transition-all duration-150 cursor-pointer select-none"
      >
        {/* Header do Card: Nome em negrito sutil & Ações de movimento */}
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <h4 className="text-xs font-semibold text-neutral-800 leading-snug group-hover:text-blue-600 transition-colors line-clamp-2">
            {lead.name}
          </h4>

          {/* Botão QR Code muito pequeno conforme especificação */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowQrModal(true);
            }}
            className="p-1 rounded bg-neutral-100 hover:bg-neutral-200 text-neutral-600 transition-colors shrink-0"
            title="Abrir QR Code de Discagem (tel:0...)"
          >
            <QrCode className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Número de Telefone Bruto */}
        <p className="text-[11px] font-mono text-neutral-500 mb-2.5 flex items-center gap-1">
          <Phone className="w-3 h-3 text-neutral-400 shrink-0" />
          <span>{lead.phoneNumber}</span>
        </p>

        {/* Tag do site se houver */}
        {lead.publicUrl && (
          <div className="mb-3">
            <span className="inline-flex items-center gap-1 text-[10px] text-neutral-500 bg-neutral-50 px-1.5 py-0.5 rounded border border-neutral-200/60 max-w-full truncate">
              <ExternalLink className="w-2.5 h-2.5 text-neutral-400 shrink-0" />
              <span className="truncate">{lead.publicUrl.replace(/^https?:\/\//, '')}</span>
            </span>
          </div>
        )}

        {/* Botões de Ação do Card */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-neutral-100">
          {/* 1. Copiar URL */}
          <button
            onClick={handleCopyUrl}
            className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded transition-colors"
            title="Copiar URL gerada"
          >
            {copiedUrl ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-neutral-500" />}
            <span>Copiar URL</span>
          </button>

          {/* 2. WhatsApp */}
          <button
            onClick={handleOpenWhatsApp}
            className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded transition-colors"
            title="Abrir no WhatsApp Web"
          >
            <MessageCircle className="w-3 h-3 text-emerald-600" />
            <span>WhatsApp</span>
          </button>

          {/* 3. Copiar Número Bruto */}
          <button
            onClick={handleCopyPhone}
            className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded transition-colors"
            title="Copiar Número Bruto (sem 0 adicional)"
          >
            {copiedPhone ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-neutral-500" />}
            <span>Copiar Número</span>
          </button>
        </div>

        {/* Rodapé do Card: Contagem de ligações e Avanço de Coluna */}
        <div className="mt-2.5 pt-2 border-t border-neutral-100 flex items-center justify-between text-[10px] text-neutral-400">
          <span>
            {lead.callCount && lead.callCount > 0 ? (
              <span className="text-neutral-600 font-medium">{lead.callCount} ligação(ões)</span>
            ) : (
              'Sem ligações'
            )}
          </span>

          <div className="flex items-center gap-1">
            <button
              onClick={handleMoveLeft}
              disabled={currentColumnIndex === 0}
              className="p-1 rounded text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
              title="Voltar Coluna"
            >
              <ChevronLeft className="w-3 h-3" />
            </button>
            <button
              onClick={handleMoveRight}
              disabled={currentColumnIndex === PIPELINE_COLUMNS.length - 1}
              className="p-1 rounded text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
              title="Avançar Coluna"
            >
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Popover / Modal do QR Code */}
      <QrCodeModal
        isOpen={showQrModal}
        onClose={() => setShowQrModal(false)}
        leadName={lead.name}
        phoneNumber={lead.phoneNumber}
      />
    </>
  );
};
