import React, { useState, useEffect } from 'react';
import { X, MessageSquare, Check, RotateCcw, Sparkles, Send, Info } from 'lucide-react';
import { DEFAULT_WHATSAPP_TEMPLATE, getStoredWhatsAppTemplate, formatWhatsAppMessage } from '../lib/phone';

interface WhatsAppSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowToast: (msg: string) => void;
}

export const WhatsAppSettingsModal: React.FC<WhatsAppSettingsModalProps> = ({
  isOpen,
  onClose,
  onShowToast
}) => {
  const [template, setTemplate] = useState<string>(getStoredWhatsAppTemplate());

  useEffect(() => {
    if (isOpen) {
      setTemplate(getStoredWhatsAppTemplate());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    localStorage.setItem('crm_whatsapp_template', template.trim() || DEFAULT_WHATSAPP_TEMPLATE);
    onShowToast('Modelo de mensagem do WhatsApp salvo com sucesso!');
    onClose();
  };

  const handleReset = () => {
    setTemplate(DEFAULT_WHATSAPP_TEMPLATE);
    localStorage.setItem('crm_whatsapp_template', DEFAULT_WHATSAPP_TEMPLATE);
    onShowToast('Modelo restaurado para o padrão.');
  };

  const insertVariable = (tag: string) => {
    setTemplate(prev => prev + ' ' + tag);
  };

  const previewText = formatWhatsAppMessage(template, {
    name: 'João Silva',
    site: 'https://seusiteexemplo.com.br',
    salesperson: 'Thomas'
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl border border-neutral-200 max-w-lg w-full p-6 relative max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-600 p-1 rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 mb-1">
          <div className="p-2 rounded-lg bg-emerald-100 text-emerald-800">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-neutral-900">
              Mensagem Automática do WhatsApp
            </h3>
            <p className="text-xs text-neutral-500">
              Personalize o texto enviado quando clicar no botão WhatsApp
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-4">
          {/* Template Input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-neutral-700">
                Texto do Modelo de Mensagem:
              </label>
              <button
                type="button"
                onClick={handleReset}
                className="text-[11px] text-neutral-500 hover:text-neutral-800 flex items-center gap-1 hover:underline font-medium"
              >
                <RotateCcw className="w-3 h-3" />
                Restaurar Padrão
              </button>
            </div>

            <textarea
              rows={3}
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              placeholder="Aqui, o site que te falei: {site}"
              className="w-full text-xs font-mono p-3 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent leading-relaxed"
            />

            {/* Quick insert variables */}
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              <span className="text-[10px] text-neutral-400 font-semibold uppercase">Variáveis dinâmicas:</span>
              <button
                type="button"
                onClick={() => insertVariable('{site}')}
                className="px-2 py-0.5 text-[11px] font-mono bg-blue-50 text-blue-700 hover:bg-blue-100 rounded border border-blue-200 font-semibold transition-colors"
                title="Insere o link do site do lead"
              >
                + &#123;site&#125;
              </button>
              <button
                type="button"
                onClick={() => insertVariable('{nome}')}
                className="px-2 py-0.5 text-[11px] font-mono bg-purple-50 text-purple-700 hover:bg-purple-100 rounded border border-purple-200 font-semibold transition-colors"
                title="Insere o nome da empresa ou lead"
              >
                + &#123;nome&#125;
              </button>
              <button
                type="button"
                onClick={() => insertVariable('{vendedor}')}
                className="px-2 py-0.5 text-[11px] font-mono bg-amber-50 text-amber-800 hover:bg-amber-100 rounded border border-amber-200 font-semibold transition-colors"
                title="Insere o nome do vendedor responsável"
              >
                + &#123;vendedor&#125;
              </button>
            </div>
          </div>

          {/* Live Preview Box */}
          <div className="bg-neutral-50 p-3.5 rounded-xl border border-neutral-200 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-neutral-600">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                Pré-visualização da Mensagem no WhatsApp:
              </span>
            </div>

            <div className="bg-emerald-50/80 p-3 rounded-lg border border-emerald-200 text-xs text-neutral-800 font-sans leading-relaxed relative">
              <div className="flex items-start gap-2">
                <Send className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <p className="whitespace-pre-wrap">{previewText || <span className="text-neutral-400 italic">Mensagem vazia</span>}</p>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-2 text-[11px] text-neutral-500 bg-neutral-100/70 p-2.5 rounded-lg border border-neutral-200">
            <Info className="w-3.5 h-3.5 text-neutral-500 shrink-0 mt-0.5" />
            <span>
              Ao clicar no botão <strong>WhatsApp</strong> em qualquer lead ou cartão, o WhatsApp Web ou aplicativo móvel abrirá com essa mensagem pronta para envio imediato.
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-md transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md transition-colors shadow-2xs"
          >
            <Check className="w-3.5 h-3.5" />
            Salvar Modelo
          </button>
        </div>
      </div>
    </div>
  );
};
