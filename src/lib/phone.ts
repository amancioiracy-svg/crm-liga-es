/**
 * Utilidades para tratamento de números de telefone e URLs
 */

// Extrai somente os dígitos numéricos
export function extractDigits(phone: string): string {
  if (!phone) return '';
  return phone.replace(/\D/g, '');
}

/**
 * REGRA CRUCIAL DE NEGÓCIO:
 * Na discagem do celular e no link do QR Code, o número deve ter SEMPRE o ZERO na frente do DDD (ex: 031991503721).
 * O botão de copiar número mantém a visualização legível.
 */
export function getDialerTelLink(phone: string): string {
  const digits = extractDigits(phone);
  if (!digits) return 'tel:';
  const dialDigits = digits.startsWith('0') ? digits : `0${digits}`;
  return `tel:${dialDigits}`;
}

export function getQrTelLink(phone: string): string {
  return getDialerTelLink(phone);
}

/**
 * URL do WhatsApp Web/API limpando caracteres especiais, adicionando DDI 55 e mensagem opcional
 */
export const DEFAULT_WHATSAPP_TEMPLATE = "Aqui, o site que te falei: {site}";

export function getStoredWhatsAppTemplate(): string {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('crm_whatsapp_template') || DEFAULT_WHATSAPP_TEMPLATE;
  }
  return DEFAULT_WHATSAPP_TEMPLATE;
}

export function formatWhatsAppMessage(
  template: string,
  params: { name?: string; site?: string; salesperson?: string }
): string {
  let msg = template || DEFAULT_WHATSAPP_TEMPLATE;
  msg = msg.replace(/\{site\}/gi, params.site || '');
  msg = msg.replace(/\{nome\}/gi, params.name || '');
  msg = msg.replace(/\{lead\}/gi, params.name || '');
  msg = msg.replace(/\{vendedor\}/gi, params.salesperson || '');
  return msg.trim();
}

export function getWhatsAppUrl(phone: string, text?: string): string {
  let digits = extractDigits(phone);
  // Se começar com 0 (ex: 031...), remove para o formato internacional do WhatsApp (5531...)
  if (digits.startsWith('0')) {
    digits = digits.substring(1);
  }
  let url = `https://api.whatsapp.com/send?phone=55${digits}`;
  if (text) {
    url += `&text=${encodeURIComponent(text)}`;
  }
  return url;
}

