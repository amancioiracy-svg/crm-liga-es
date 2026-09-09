import { Lead } from '../types';

export function getLeadNiche(lead: Lead | { name?: string; categories?: any; publicUrl?: string; niche?: string }): string {
  if (lead.niche && lead.niche !== 'Outros' && lead.niche !== 'Geral / Outros') {
    return lead.niche;
  }

  const name = (lead.name || '').toLowerCase();
  const url = (lead.publicUrl || '').toLowerCase();
  const rawCats = (lead as any).categories;
  const categories = Array.isArray(rawCats) 
    ? rawCats.join(' ').toLowerCase() 
    : String(rawCats || '').toLowerCase();
  const fullText = `${name} ${categories} ${url}`;

  if (/arquit|design.*interior|decor|urbanis/.test(fullText)) return 'Arquitetura & Design';
  if (/odont|dentis|implante|ortodon|sorriso|dental/.test(fullText)) return 'Odontologia';
  if (/advog|jurid|advocac|direito|oab/.test(fullText)) return 'Advocacia & Jurídico';
  if (/mecanic|auto|oficina|pneu|veicul|carro|martelinho|funilaria|moto/.test(fullText)) return 'Oficina & Automotivo';
  if (/pizz|restauran|lanch|bar|burger|hamburg|café|cafe|bistr|churrasc|gastronom|acai|açaí|sushi|delivery/.test(fullText)) return 'Restaurante & Gastronomia';
  if (/estet|estét|beleza|salao|salão|cabel|barber|barbearia|sobrancelh|manicur|unha|spa|massag/.test(fullText)) return 'Estética & Beleza';
  if (/imobili|imove|corretor.*imove|construt|locac.*imove/.test(fullText)) return 'Imobiliária & Construção';
  if (/contab|fiscal|tribut|pericia.*contabil|auditor/.test(fullText)) return 'Contabilidade & Finanças';
  if (/medic|clinic|clínic|saude|saúde|psicol|fisioter|oftalmo|laborat|pediatr|dermatol|nutri/.test(fullText)) return 'Saúde & Clínicas';
  if (/veterin|pet|petshop|banho.*tosa|animal|cao|cachorro/.test(fullText)) return 'Pet & Veterinária';
  if (/academ|crossfit|fitness|treino|pilates|personal|ginastic/.test(fullText)) return 'Fitness & Academia';
  if (/escol|colegio|colégio|curso|faculd|idioma|educac|bercar/.test(fullText)) return 'Educação & Cursos';
  if (/energi.*solar|fotovolt|placa.*solar/.test(fullText)) return 'Energia Solar';
  if (/hotel|pousada|resort|hostel|turism/.test(fullText)) return 'Hotel & Pousada';
  if (/grafic|impress|comunic.*visual|brinde/.test(fullText)) return 'Gráfica & Comunicação';
  if (/seguran.*eletron|alarme|cftv|portaria/.test(fullText)) return 'Segurança Eletrônica';
  if (/sorvet|doceri|confeit|bolo|padar/.test(fullText)) return 'Confeitaria & Doces';
  if (/moda|roupa|calcado|calçado|vestu|boutique|loja/.test(fullText)) return 'Moda & Varejo';
  if (/seguro|corretor.*seguro|previdenc/.test(fullText)) return 'Seguros & Benefícios';
  if (/festas|eventos|buffet|casamento|decorac.*festa/.test(fullText)) return 'Eventos & Festas';

  if (categories && !categories.includes('point_of_interest') && !categories.includes('establishment')) {
    const firstWord = categories.split(/[\s,]+/)[0];
    if (firstWord && firstWord.length > 3) return firstWord.charAt(0).toUpperCase() + firstWord.slice(1);
  }

  return 'Geral / Outros';
}
