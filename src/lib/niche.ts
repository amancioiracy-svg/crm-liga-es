import { Lead } from '../types';

/**
 * Retorna ESTRITAMENTE as palavras literais que estão no JSON de cada cliente.
 * Sem agrupamentos forçados, sem dicionários inventados e sem adivinhações por nome.
 * Se no JSON estiver "general_contractor", retornará exatamente "general_contractor".
 * Se no JSON estiver "architect", retornará exatamente "architect".
 * Se tiver 10.000 categorias diferentes no JSON, serão 10.000 opções fiéis no filtro.
 */
export function getLeadNiche(
  lead: Lead | { name?: string; categories?: any; publicUrl?: string; niche?: string; types?: any; category?: any; primaryType?: any }
): string {
  if (!lead) return '(Sem categoria no JSON)';

  const anyLead = lead as any;

  // 1. Se o lead já possui o nicho literal salvo do JSON e não é um dos termos genéricos antigos
  if (
    typeof anyLead.niche === 'string' &&
    anyLead.niche.trim() &&
    anyLead.niche !== 'Comércio & Serviços Gerais' &&
    anyLead.niche !== 'Geral / Outros' &&
    anyLead.niche !== 'Outros' &&
    anyLead.niche !== 'general'
  ) {
    return anyLead.niche.trim();
  }

  // 2. Extrai de todos os campos possíveis do JSON onde a categoria foi informada
  const candidates = [
    anyLead.categories,
    anyLead.category,
    anyLead.types,
    anyLead.type,
    anyLead.primaryType,
    anyLead.segmento,
    anyLead.ramo
  ];

  const rawValues: string[] = [];

  for (const item of candidates) {
    if (item === undefined || item === null) continue;

    if (Array.isArray(item)) {
      item.forEach((sub) => {
        if (typeof sub === 'string' && sub.trim()) {
          rawValues.push(sub.trim());
        }
      });
    } else if (typeof item === 'string' && item.trim()) {
      const trimmed = item.trim();
      // Trata array serializado em string como '["general_contractor"]'
      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        try {
          const parsed = JSON.parse(trimmed);
          if (Array.isArray(parsed)) {
            parsed.forEach((p) => {
              if (typeof p === 'string' && p.trim()) rawValues.push(p.trim());
            });
            continue;
          }
        } catch {
          // Mantém string original
        }
      }

      if (trimmed.includes(',')) {
        trimmed.split(',').forEach((p) => {
          if (p.trim()) rawValues.push(p.trim());
        });
      } else {
        rawValues.push(trimmed);
      }
    }
  }

  // Se não foi informada nenhuma categoria no JSON
  if (rawValues.length === 0) {
    return '(Sem categoria no JSON)';
  }

  // Remove duplicatas preservando a grafia literal exata
  const uniqueValues = Array.from(new Set(rawValues));

  // Se o JSON mandou uma categoria real e também tags genéricas do Google (point_of_interest / establishment),
  // exibe a categoria real específica para não poluir
  const specificValues = uniqueValues.filter((val) => {
    const lower = val.toLowerCase().trim();
    return (
      lower !== 'point_of_interest' &&
      lower !== 'establishment' &&
      lower !== 'premise' &&
      lower !== 'subpremise'
    );
  });

  if (specificValues.length > 0) {
    return specificValues.join(', ');
  }

  // Se no JSON só tinha literalmente "point_of_interest", mostra exatamente "point_of_interest"
  return uniqueValues.join(', ');
}
