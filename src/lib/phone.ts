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
 * O zero na frente do DDD deve ser adicionado APENAS no link do QR Code.
 * O botão "Copiar Número" deve manter o número bruto sem o zero.
 * Exemplo: "(31) 99150-3721" -> Digitos: "31991503721" -> QR Link: "tel:031991503721"
 */
export function getQrTelLink(phone: string): string {
  const digits = extractDigits(phone);
  return `tel:0${digits}`;
}

/**
 * URL do WhatsApp Web limpando caracteres especiais e adicionando DDI 55
 */
export function getWhatsAppUrl(phone: string): string {
  const digits = extractDigits(phone);
  return `https://web.whatsapp.com/send?phone=55${digits}`;
}
