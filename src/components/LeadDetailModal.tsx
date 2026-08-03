import React, { useState, useEffect } from 'react';
import { Lead, CallLog, CALL_TAGS, CallTag, PIPELINE_COLUMNS, ColumnStatus } from '../types';
import { X, Phone, ExternalLink, Calendar, MessageSquare, Plus, CheckCircle2, QrCode } from 'lucide-react';
import { getWhatsAppUrl, getQrTelLink } from '../lib/phone';
import { QrCodeModal } from './QrCodeModal';

interface LeadDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead | null;
  onAddCallLog: (leadId: string, tag: CallTag, comment: string) => Promise<void>;
  onUpdateColumn: (leadId: string, newColumn: ColumnStatus) => Promise<void>;
  onShowToast: (msg: string) => void;
}

export const LeadDetailModal: React.FC<LeadDetailModalProps> = ({
  isOpen,
  onClose,
  lead,
  onAddCallLog,
  onUpdateColumn,
  onShowToast
}) => {
  const [tag, setTag] = useState<CallTag>('Atendeu');
  const [comment, setComment] = useState('');
  const [selectedColumn, setSelectedColumn] = useState<ColumnStatus>('Leads');
  const [calls, setCalls] = useState<CallLog[]>([]);
  const [loadingCalls, setLoadingCalls] = useState(false);
  const [submittingCall, setSubmittingCall] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);

  useEffect(() => {
    if (lead) {
      setSelectedColumn(lead.columnStatus);
      fetchCallHistory(lead.id);
    }
  }, [lead]);

  const fetchCallHistory = async (leadId: string) => {
    setLoadingCalls(true);
    try {
      const res = await fetch(`/api/leads/${leadId}/calls`);
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        setCalls(data);
      }
    } catch (err) {
      console.error('Erro ao buscar ligações:', err);
    } finally {
      setLoadingCalls(false);
    }
  };

  if (!isOpen || !lead) return null;

  const handleSubmitCall = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lead) return;

    setSubmittingCall(true);
    try {
      await onAddCallLog(lead.id, tag, comment);
      setComment('');
      onShowToast('Ligação registrada com sucesso!');
      
      // Atualiza lista local
      await fetchCallHistory(lead.id);

      // Atualiza estágio da coluna se alterado
      if (selectedColumn !== lead.columnStatus) {
        await onUpdateColumn(lead.id, selectedColumn);
      }
    } catch (err) {
      console.error(err);
      onShowToast('Erro ao salvar ligação.');
    } finally {
      setSubmittingCall(false);
    }
  };

  const handleColumnChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCol = e.target.value as ColumnStatus;
    setSelectedColumn(newCol);
    if (lead && newCol !== lead.columnStatus) {
      await onUpdateColumn(lead.id, newCol);
      onShowToast(`Estágio alterado para "${newCol}"`);
    }
  };

  const getTagBadgeColor = (t: CallTag) => {
    switch (t) {
      case 'Atendeu':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Não Atendeu':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Caixa Postal':
        return 'bg-neutral-100 text-neutral-700 border-neutral-200';
      case 'Ocupado':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'Pediu para retornar':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      default:
        return 'bg-neutral-100 text-neutral-600 border-neutral-200';
    }
  };

  return (
    <>
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/40 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-150"
        onClick={onClose}
      >
        <div 
          className="bg-white rounded-xl shadow-xl border border-neutral-200 max-w-2xl w-full p-6 relative my-8 max-h-[90vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top Bar / Header */}
          <div className="flex items-start justify-between pb-4 border-b border-neutral-100">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-lg font-semibold text-neutral-900">{lead.name}</h2>
                <span className="text-[10px] font-mono text-neutral-400 bg-neutral-100 px-1.5 py-0.5 rounded">
                  ID: {lead.id}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-600">
                <span className="flex items-center gap-1 font-mono">
                  <Phone className="w-3.5 h-3.5 text-neutral-400" />
                  {lead.phoneNumber}
                </span>

                {lead.publicUrl && (
                  <a
                    href={lead.publicUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-blue-600 hover:underline"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Abrir Site
                  </a>
                )}

                <button
                  onClick={() => {
                    const wa = getWhatsAppUrl(lead.phoneNumber);
                    window.open(wa, '_blank');
                  }}
                  className="text-emerald-600 hover:underline font-medium"
                >
                  WhatsApp
                </button>

                <button
                  onClick={() => setShowQrModal(true)}
                  className="inline-flex items-center gap-1 text-neutral-600 hover:text-neutral-900"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  QR Code Discagem
                </button>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1 rounded-md text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body Content */}
          <div className="overflow-y-auto space-y-6 pt-4 pr-1">
            {/* Status do Lead & Seletor de Coluna */}
            <div className="bg-neutral-50 rounded-lg p-3 border border-neutral-200/80 flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs">
                <span className="text-neutral-500">Estágio Atual do Pipeline:</span>
                <span className="ml-2 font-medium text-neutral-800">{lead.columnStatus}</span>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-xs text-neutral-500 font-medium">Mover para:</label>
                <select
                  value={selectedColumn}
                  onChange={handleColumnChange}
                  className="text-xs bg-white border border-neutral-300 rounded-md px-2.5 py-1 text-neutral-800 font-medium focus:outline-none focus:ring-1 focus:ring-neutral-400"
                >
                  {PIPELINE_COLUMNS.map((col) => (
                    <option key={col} value={col}>
                      {col}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Form de Nova Ligação */}
            <div className="bg-white border border-neutral-200 rounded-lg p-4 shadow-2xs">
              <h3 className="text-sm font-semibold text-neutral-800 mb-3 flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-neutral-600" />
                Registrar Nova Ligação
              </h3>

              <form onSubmit={handleSubmitCall} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Resultado / Etiqueta da Ligação *
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {CALL_TAGS.map((t) => (
                      <button
                        type="button"
                        key={t}
                        onClick={() => setTag(t)}
                        className={`text-xs px-2.5 py-1 rounded-md border transition-all ${
                          tag === t
                            ? 'bg-neutral-900 text-white border-neutral-900 font-medium'
                            : 'bg-neutral-50 text-neutral-700 border-neutral-200 hover:bg-neutral-100'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Comentários / Observações
                  </label>
                  <textarea
                    rows={2}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Ex: Cliente atendeu, gostou do site de demonstração e pediu para enviar mensagem por WhatsApp..."
                    className="w-full text-xs p-2.5 bg-white border border-neutral-200 rounded-md focus:outline-none focus:ring-1 focus:ring-neutral-400 placeholder:text-neutral-400"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={submittingCall}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium text-white bg-neutral-900 hover:bg-neutral-800 rounded-md transition-colors disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {submittingCall ? 'Salvando...' : 'Salvar Registro de Ligação'}
                  </button>
                </div>
              </form>
            </div>

            {/* Histórico Cronológico de Ligações */}
            <div>
              <h3 className="text-sm font-semibold text-neutral-800 mb-3 flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-neutral-600" />
                Histórico Cronológico de Ligações
              </h3>

              {loadingCalls ? (
                <div className="text-xs text-neutral-400 py-4 text-center">
                  Carregando histórico...
                </div>
              ) : calls.length === 0 ? (
                <div className="text-xs text-neutral-400 py-6 text-center border border-dashed border-neutral-200 rounded-lg bg-neutral-50/50">
                  Nenhuma ligação registrada para este lead até o momento.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {calls.map((c) => (
                    <div
                      key={c.id}
                      className="p-3 bg-neutral-50 rounded-lg border border-neutral-200/70 text-xs"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${getTagBadgeColor(c.tag)}`}>
                          {c.tag}
                        </span>

                        <span className="flex items-center gap-1 text-[10px] text-neutral-400 font-mono">
                          <Calendar className="w-3 h-3" />
                          {new Date(c.createdAt).toLocaleString('pt-BR')}
                        </span>
                      </div>

                      {c.comment ? (
                        <p className="text-neutral-700 text-xs leading-relaxed mt-1">
                          {c.comment}
                        </p>
                      ) : (
                        <p className="text-neutral-400 italic text-[11px] mt-1">
                          Sem observações gravadas.
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="pt-4 mt-4 border-t border-neutral-100 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-1.5 text-xs font-medium text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-md transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>

      {/* QR Code Modal Auxiliar */}
      <QrCodeModal
        isOpen={showQrModal}
        onClose={() => setShowQrModal(false)}
        leadName={lead.name}
        phoneNumber={lead.phoneNumber}
      />
    </>
  );
};
