import React, { useState, useEffect } from 'react';
import { Lead, CallLog, CustomTag, PIPELINE_COLUMNS, ColumnStatus } from '../types';
import { 
  X, Phone, ExternalLink, Calendar, MessageSquare, Plus, CheckCircle2, 
  QrCode, Tag as TagIcon, Play, Pause, RotateCcw, Clock, ArrowRight, PhoneCall,
  CalendarClock, AlertTriangle, Bell
} from 'lucide-react';
import { getWhatsAppUrl } from '../lib/phone';
import { QrCodeModal } from './QrCodeModal';
import { getFollowUpInfo } from '../lib/followUp';

interface LeadDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead | null;
  allLeads?: Lead[];
  onSelectLead?: (lead: Lead) => void;
  tags: CustomTag[];
  onOpenTagsModal: () => void;
  onAddCallLog: (leadId: string, tag: string, comment: string, durationSeconds?: number, followUpAt?: string) => Promise<void>;
  onUpdateColumn: (leadId: string, newColumn: ColumnStatus) => Promise<void>;
  onShowToast: (msg: string) => void;
}

export const formatDuration = (seconds?: number): string => {
  if (!seconds || seconds <= 0) return '00s';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins > 0) {
    return `${String(mins).padStart(2, '0')}m ${String(secs).padStart(2, '0')}s`;
  }
  return `${String(secs).padStart(2, '0')}s`;
};

export const LeadDetailModal: React.FC<LeadDetailModalProps> = ({
  isOpen,
  onClose,
  lead,
  allLeads = [],
  onSelectLead,
  tags,
  onOpenTagsModal,
  onAddCallLog,
  onUpdateColumn,
  onShowToast
}) => {
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [comment, setComment] = useState('');
  const [selectedColumn, setSelectedColumn] = useState<ColumnStatus>('Leads');
  const [calls, setCalls] = useState<CallLog[]>([]);
  const [loadingCalls, setLoadingCalls] = useState(false);
  const [submittingCall, setSubmittingCall] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);

  // Timer states
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  // Follow-up state
  const [followUpDateTime, setFollowUpDateTime] = useState<string>('');

  useEffect(() => {
    if (tags.length > 0 && selectedTags.length === 0) {
      setSelectedTags([tags[0].name]);
    }
  }, [tags]);

  // Reset states when lead changes
  useEffect(() => {
    if (lead) {
      setSelectedColumn(lead.columnStatus);
      fetchCallHistory(lead.id);
      setTimerSeconds(0);
      setIsTimerRunning(false);
      setComment('');
      setFollowUpDateTime('');
      // Clean reset tags for THIS lead
      if (tags.length > 0) {
        setSelectedTags([tags[0].name]);
      } else {
        setSelectedTags([]);
      }
    }
  }, [lead]);

  // Timer interval effect
  useEffect(() => {
    let interval: any = null;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev + 1);
      }, 1000);
    } else if (!isTimerRunning && timerSeconds !== 0) {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timerSeconds]);

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

  // Compute next lead in queue
  const currentLeadIndex = allLeads.findIndex((l) => l.id === lead.id);
  const nextLead = currentLeadIndex >= 0 && currentLeadIndex < allLeads.length - 1 ? allLeads[currentLeadIndex + 1] : null;

  const getNextColumnForStartCall = (currentCol: ColumnStatus): ColumnStatus => {
    if (currentCol === 'Leads') return 'Ligação 1';
    if (currentCol === 'Ligação 1') return 'Ligação 2';
    if (currentCol === 'Ligação 2') return 'Ligação 3';
    if (currentCol === 'Ligação 3') return 'Ligação 4';
    return currentCol;
  };

  const handleStartCall = () => {
    setIsTimerRunning(true);
    const nextCol = getNextColumnForStartCall(selectedColumn);
    if (nextCol !== selectedColumn) {
      setSelectedColumn(nextCol);
      onShowToast(`Ligação iniciada! Etapa avançada automaticamente para "${nextCol}".`);
    } else {
      onShowToast('Cronômetro de ligação iniciado!');
    }
  };

  const handlePauseTimer = () => {
    setIsTimerRunning(false);
  };

  const handleResetTimer = () => {
    setIsTimerRunning(false);
    setTimerSeconds(0);
  };

  const setPresetFollowUp = (preset: '1h' | '1d' | '2d' | '1w' | 'today17' | 'tomorrow9') => {
    const d = new Date();
    if (preset === '1h') {
      d.setHours(d.getHours() + 1);
    } else if (preset === 'today17') {
      d.setHours(17, 0, 0, 0);
    } else if (preset === '1d') {
      d.setDate(d.getDate() + 1);
    } else if (preset === 'tomorrow9') {
      d.setDate(d.getDate() + 1);
      d.setHours(9, 0, 0, 0);
    } else if (preset === '2d') {
      d.setDate(d.getDate() + 2);
    } else if (preset === '1w') {
      d.setDate(d.getDate() + 7);
    }
    
    const tzOffset = d.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(d.getTime() - tzOffset)).toISOString().slice(0, 16);
    setFollowUpDateTime(localISOTime);
  };

  const handleToggleTag = (tagName: string) => {
    if (selectedTags.includes(tagName)) {
      if (selectedTags.length > 1) {
        setSelectedTags(selectedTags.filter((t) => t !== tagName));
      } else {
        onShowToast('Selecione pelo menos uma etiqueta para a ligação.');
      }
    } else {
      setSelectedTags([...selectedTags, tagName]);
    }
  };

  const saveCallLog = async (closeModalAfter = true, advanceToNext = false) => {
    if (!lead) return;

    const tagToUse = selectedTags.length > 0 ? selectedTags.join(', ') : (tags[0]?.name || 'Atendeu');
    const finalDuration = timerSeconds;
    const finalFollowUp = followUpDateTime ? new Date(followUpDateTime).toISOString() : undefined;

    setSubmittingCall(true);
    try {
      await onAddCallLog(lead.id, tagToUse, comment, finalDuration, finalFollowUp);
      
      // Update pipeline column if changed
      if (selectedColumn !== lead.columnStatus) {
        await onUpdateColumn(lead.id, selectedColumn);
      }

      const formattedTime = formatDuration(finalDuration);

      if (advanceToNext && nextLead && onSelectLead) {
        onShowToast(`Ligação salva (${formattedTime})! Avançando para "${nextLead.name}"...`);
        setTimerSeconds(0);
        setFollowUpDateTime('');
        setComment('');
        setIsTimerRunning(true); // Auto-start timer for next lead!
        onSelectLead(nextLead);
      } else {
        onShowToast(`Ligação registrada com sucesso! Duração: ${formattedTime}`);
        await fetchCallHistory(lead.id);
        setIsTimerRunning(false);
        setTimerSeconds(0);
        setComment('');
        setFollowUpDateTime('');
        if (closeModalAfter) {
          onClose();
        }
      }
    } catch (err) {
      console.error(err);
      onShowToast('Erro ao salvar ligação.');
    } finally {
      setSubmittingCall(false);
    }
  };

  const handleSubmitCallForm = (e: React.FormEvent) => {
    e.preventDefault();
    saveCallLog(false, false);
  };

  const handleColumnChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCol = e.target.value as ColumnStatus;
    setSelectedColumn(newCol);
    if (lead && newCol !== lead.columnStatus) {
      await onUpdateColumn(lead.id, newCol);
      onShowToast(`Estágio alterado para "${newCol}"`);
    }
  };

  const getTagStyle = (tagName: string) => {
    const found = tags.find((t) => t.name.toLowerCase() === tagName.toLowerCase());
    if (found) {
      return { color: found.color, backgroundColor: found.bgColor };
    }
    return { color: '#374151', backgroundColor: '#f3f4f6' };
  };

  // Format MM:SS for display
  const displayMins = Math.floor(timerSeconds / 60);
  const displaySecs = timerSeconds % 60;
  const formattedClock = `${String(displayMins).padStart(2, '0')}:${String(displaySecs).padStart(2, '0')}`;

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
                {allLeads.length > 0 && (
                  <span className="text-[10px] font-medium text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded-full">
                    Lead {currentLeadIndex + 1} de {allLeads.length}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-600">
                <span className="flex items-center gap-1 font-mono font-medium text-neutral-800">
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
                    handleStartCall();
                    const msgText = lead.publicUrl ? `Olá! Vi seu site: ${lead.publicUrl}` : undefined;
                    const wa = getWhatsAppUrl(lead.phoneNumber, msgText);
                    window.open(wa, 'crm_whatsapp_web');
                  }}
                  className="text-emerald-600 hover:underline font-medium"
                >
                  WhatsApp
                </button>

                <button
                  onClick={() => {
                    handleStartCall();
                    setShowQrModal(true);
                  }}
                  className="inline-flex items-center gap-1 text-neutral-700 hover:text-neutral-900 bg-neutral-100 hover:bg-neutral-200 px-2 py-0.5 rounded font-medium transition-colors"
                >
                  <QrCode className="w-3.5 h-3.5 text-neutral-600" />
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
          <div className="overflow-y-auto space-y-5 pt-4 pr-1">
            {/* Widget de Cronômetro de Ligação */}
            <div className="bg-neutral-900 text-white rounded-xl p-4 shadow-sm border border-neutral-800 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
                  isTimerRunning ? 'bg-emerald-500/20 text-emerald-400 animate-pulse' : 'bg-neutral-800 text-neutral-400'
                }`}>
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
                      Cronômetro de Chamada
                    </span>
                    {isTimerRunning ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-400 bg-emerald-950/80 px-2 py-0.2 rounded-full border border-emerald-500/30">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                        Em Ligação...
                      </span>
                    ) : timerSeconds > 0 ? (
                      <span className="text-[10px] font-medium text-amber-400 bg-amber-950/80 px-2 py-0.2 rounded-full border border-amber-500/30">
                        Pausado
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium text-neutral-400">
                        Aguardando início
                      </span>
                    )}
                  </div>
                  <div className="text-2xl font-mono font-bold tracking-tight text-white mt-0.5">
                    {formattedClock} <span className="text-xs text-neutral-400 font-sans font-normal">({formatDuration(timerSeconds)})</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {!isTimerRunning ? (
                  <button
                    type="button"
                    onClick={handleStartCall}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors shadow-2xs"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    {timerSeconds > 0 ? 'Continuar' : 'Iniciar Chamada'}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handlePauseTimer}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors shadow-2xs"
                  >
                    <Pause className="w-3.5 h-3.5 fill-current" />
                    Pausar
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleResetTimer}
                  disabled={timerSeconds === 0 && !isTimerRunning}
                  className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors disabled:opacity-30"
                  title="Zerar Cronômetro"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Destaque de Agendamento Ativo de Follow-Up */}
            {lead.nextFollowUpAt && (() => {
              const info = getFollowUpInfo(lead.nextFollowUpAt);
              if (info.status === 'NONE') return null;
              return (
                <div className={`p-3 rounded-lg border flex items-center justify-between gap-3 text-xs ${
                  info.status === 'OVERDUE'
                    ? 'bg-rose-50 border-rose-200 text-rose-900'
                    : info.status === 'TODAY'
                    ? 'bg-amber-50 border-amber-200 text-amber-900'
                    : 'bg-blue-50 border-blue-200 text-blue-900'
                }`}>
                  <div className="flex items-center gap-2">
                    {info.status === 'OVERDUE' ? (
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    ) : (
                      <CalendarClock className="w-4 h-4 text-amber-600 shrink-0" />
                    )}
                    <div>
                      <span className="font-bold block text-[11px] uppercase tracking-wide">
                        {info.status === 'OVERDUE' ? '⚠️ Retorno Atrasado!' : info.status === 'TODAY' ? '🔔 Retorno Agendado para Hoje!' : '📅 Lembrete de Retorno Futuro'}
                      </span>
                      <span className="font-medium">{info.label}</span>
                    </div>
                  </div>
                </div>
              );
            })()}

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
            <div className="bg-white border border-neutral-200 rounded-lg p-4 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-neutral-800 flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-neutral-600" />
                  Registrar Resultado da Ligação
                </h3>

                <button
                  type="button"
                  onClick={onOpenTagsModal}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 hover:text-blue-700 hover:underline"
                >
                  <TagIcon className="w-3 h-3" />
                  + Gerenciar Tags
                </button>
              </div>

              <form onSubmit={handleSubmitCallForm} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1.5">
                    Resultado / Etiqueta da Ligação * <span className="text-[10px] text-neutral-400 font-normal">(Você pode selecionar mais de uma tag)</span>
                  </label>
                  
                  <div className="flex flex-wrap gap-1.5">
                    {tags.map((t) => {
                      const isSelected = selectedTags.includes(t.name);
                      return (
                        <button
                          type="button"
                          key={t.id}
                          onClick={() => handleToggleTag(t.name)}
                          style={
                            isSelected
                              ? { backgroundColor: t.bgColor, color: t.color, borderColor: t.color }
                              : undefined
                          }
                          className={`text-xs px-2.5 py-1 rounded-md border transition-all inline-flex items-center gap-1 ${
                            isSelected
                              ? 'font-bold shadow-2xs scale-102 ring-2 ring-black/10'
                              : 'bg-neutral-50 text-neutral-700 border-neutral-200 hover:bg-neutral-100'
                          }`}
                        >
                          {isSelected ? '✓ ' : '+ '}
                          {t.name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Agendamento de Follow-Up (Data e Hora de Retorno) */}
                <div className="bg-neutral-50 p-3 rounded-lg border border-neutral-200/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-neutral-800 flex items-center gap-1.5">
                      <CalendarClock className="w-3.5 h-3.5 text-blue-600" />
                      Agendar Retorno / Follow-Up (Data e Hora)
                    </label>

                    {followUpDateTime && (
                      <button
                        type="button"
                        onClick={() => setFollowUpDateTime('')}
                        className="text-[10px] text-rose-600 hover:underline font-medium"
                      >
                        Limpar Agendamento
                      </button>
                    )}
                  </div>

                  <input
                    type="datetime-local"
                    value={followUpDateTime}
                    onChange={(e) => setFollowUpDateTime(e.target.value)}
                    className="w-full text-xs p-2 bg-white border border-neutral-300 rounded-md text-neutral-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />

                  {/* Atalhos Rápidos de Agendamento */}
                  <div className="flex flex-wrap items-center gap-1 pt-1">
                    <span className="text-[10px] text-neutral-400 font-medium mr-1">Atalhos:</span>
                    <button
                      type="button"
                      onClick={() => setPresetFollowUp('1h')}
                      className="text-[10px] bg-white hover:bg-neutral-100 border border-neutral-200 px-2 py-0.5 rounded text-neutral-700"
                    >
                      +1 Hora
                    </button>
                    <button
                      type="button"
                      onClick={() => setPresetFollowUp('today17')}
                      className="text-[10px] bg-white hover:bg-neutral-100 border border-neutral-200 px-2 py-0.5 rounded text-neutral-700"
                    >
                      Hoje 17:00
                    </button>
                    <button
                      type="button"
                      onClick={() => setPresetFollowUp('1d')}
                      className="text-[10px] bg-white hover:bg-neutral-100 border border-neutral-200 px-2 py-0.5 rounded text-neutral-700"
                    >
                      +1 Dia
                    </button>
                    <button
                      type="button"
                      onClick={() => setPresetFollowUp('tomorrow9')}
                      className="text-[10px] bg-white hover:bg-neutral-100 border border-neutral-200 px-2 py-0.5 rounded text-neutral-700"
                    >
                      Amanhã 09:00
                    </button>
                    <button
                      type="button"
                      onClick={() => setPresetFollowUp('2d')}
                      className="text-[10px] bg-white hover:bg-neutral-100 border border-neutral-200 px-2 py-0.5 rounded text-neutral-700"
                    >
                      +2 Dias
                    </button>
                    <button
                      type="button"
                      onClick={() => setPresetFollowUp('1w')}
                      className="text-[10px] bg-white hover:bg-neutral-100 border border-neutral-200 px-2 py-0.5 rounded text-neutral-700"
                    >
                      +1 Semana
                    </button>
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

                {/* Botões de Ação na Ligação */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-neutral-100">
                  <button
                    type="submit"
                    disabled={submittingCall}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-neutral-600" />
                    Salvar Registro (Manter Aberto)
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={submittingCall}
                      onClick={() => saveCallLog(true, false)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg transition-colors shadow-2xs disabled:opacity-50"
                    >
                      <PhoneCall className="w-3.5 h-3.5" />
                      Finalizar
                    </button>

                    {nextLead && onSelectLead && (
                      <button
                        type="button"
                        disabled={submittingCall}
                        onClick={() => saveCallLog(true, true)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-2xs disabled:opacity-50"
                        title={`Salvar e ir para o próximo lead: ${nextLead.name}`}
                      >
                        <span>Próximo Lead</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
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
                  {calls.map((c) => {
                    const cTags = c.tag ? c.tag.split(',').map((t) => t.trim()).filter(Boolean) : [];
                    return (
                      <div
                        key={c.id}
                        className="p-3 bg-neutral-50 rounded-lg border border-neutral-200/70 text-xs"
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {cTags.map((tName, idx) => (
                              <span
                                key={idx}
                                style={getTagStyle(tName)}
                                className="px-2 py-0.5 rounded text-[10px] font-semibold border border-black/5"
                              >
                                {tName}
                              </span>
                            ))}

                            {c.durationSeconds ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-neutral-600 bg-neutral-200/80 px-1.5 py-0.2 rounded font-mono">
                                <Clock className="w-3 h-3 text-neutral-500" />
                                {formatDuration(c.durationSeconds)}
                              </span>
                            ) : null}

                            {c.followUpAt ? (() => {
                              const fInfo = getFollowUpInfo(c.followUpAt);
                              return (
                                <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.2 rounded border ${
                                  fInfo.status === 'OVERDUE'
                                    ? 'bg-rose-100 text-rose-800 border-rose-200'
                                    : fInfo.status === 'TODAY'
                                    ? 'bg-amber-100 text-amber-800 border-amber-200'
                                    : 'bg-blue-100 text-blue-800 border-blue-200'
                                }`}>
                                  <CalendarClock className="w-3 h-3" />
                                  {fInfo.label}
                                </span>
                              );
                            })() : null}
                          </div>

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
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="pt-3 mt-3 border-t border-neutral-100 flex items-center justify-between">
            <div className="text-xs text-neutral-400 font-medium">
              {nextLead ? (
                <span>Próximo lead na fila: <strong className="text-neutral-700">{nextLead.name}</strong></span>
              ) : (
                <span>Fim da lista de leads.</span>
              )}
            </div>

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

