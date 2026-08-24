/**
 * Utilidades para tratamento de números de telefone e URLs
 */

// Extrai somente os dígitos numéricos
export function extractDigits(phone: string): string {
  if (!phone) return '';
  return phone.replace(/\D/g, '');
}

/**
 * Gera um slug limpo para o site da Nyroh (ex: "Thamiris Decorações" -> "thamiris-decoracoes")
 */
export function slugify(text: string): string {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos
    .replace(/&/g, '-e-')
    .replace(/[^a-z0-9\s-]/g, '') // remove caracteres especiais
    .trim()
    .replace(/\s+/g, '-') // substitui espaços por hífens
    .replace(/-+/g, '-'); // remove múltiplos hífens
}

/**
 * Retorna o link oficial do site da Nyroh do cliente (ex: https://www.nyroh.com.br/#/site/thamiris-decoracoes)
 * Ignora links de Google Maps ou outros que não sejam o site da Nyroh criado para o cliente.
 */
export function getNyrohSiteUrl(leadOrUrl?: { name?: string; publicUrl?: string } | string, leadName?: string): string {
  if (!leadOrUrl) return '';

  let rawUrl = '';
  let name = '';

  if (typeof leadOrUrl === 'string') {
    rawUrl = leadOrUrl.trim();
    name = (leadName || '').trim();
  } else {
    rawUrl = (leadOrUrl.publicUrl || '').trim();
    name = (leadOrUrl.name || leadName || '').trim();
  }

  // Se já for uma URL direta da Nyroh
  if (rawUrl && (rawUrl.includes('nyroh.com.br') || rawUrl.includes('nyroh.com'))) {
    if (!rawUrl.startsWith('http://') && !rawUrl.startsWith('https://')) {
      rawUrl = `https://${rawUrl}`;
    }
    return rawUrl;
  }

  // Se a URL salva for Google Maps ou rede social, descartamos para usar o site da Nyroh
  const isGoogleMapsOrSocial = 
    rawUrl.includes('maps.google.com') ||
    rawUrl.includes('google.com/maps') ||
    rawUrl.includes('goo.gl') ||
    rawUrl.includes('instagram.com') ||
    rawUrl.includes('facebook.com');

  // Se temos o nome da empresa/lead, geramos o link no formato oficial da Nyroh
  if (name && (isGoogleMapsOrSocial || !rawUrl || !rawUrl.startsWith('http'))) {
    const slug = slugify(name);
    if (slug) {
      return `https://www.nyroh.com.br/#/site/${slug}`;
    }
  }

  // Se for um link de site normal não-maps
  if (rawUrl && !isGoogleMapsOrSocial) {
    if (!rawUrl.startsWith('http://') && !rawUrl.startsWith('https://')) {
      return `https://${rawUrl}`;
    }
    return rawUrl;
  }

  // Fallback com o nome
  if (name) {
    return `https://www.nyroh.com.br/#/site/${slugify(name)}`;
  }

  return rawUrl || '';
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
  const siteUrl = getNyrohSiteUrl(params.site || '', params.name || '');
  msg = msg.replace(/\{site\}/gi, siteUrl || '');
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

