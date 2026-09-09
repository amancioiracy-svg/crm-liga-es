import { Lead } from '../types';

// Dicionário completo de tradução de tipos e categorias do Google Maps / Places API
const GOOGLE_PLACES_TRANSLATION_MAP: Record<string, string> = {
  // Construção, Reformas & Manutenção
  general_contractor: 'Construção & Reformas (Empreiteiro / Marido de Aluguel)',
  roofing_contractor: 'Telhados & Coberturas',
  plumber: 'Encanador & Hidráulica',
  electrician: 'Eletricista & Instalações',
  painter: 'Pintor & Acabamentos',
  carpenter: 'Marcenaria & Carpintaria',
  locksmith: 'Chaveiro & Aberturas',
  hvac_contractor: 'Ar-Condicionado & Climatização',
  air_conditioning_contractor: 'Ar-Condicionado & Climatização',
  air_conditioning_repair_service: 'Conserto de Ar-Condicionado',
  masonry_contractor: 'Alvenaria & Obras',
  paving_contractor: 'Pavimentação & Asfalto',
  fence_contractor: 'Cercas & Mourões',
  swimming_pool_contractor: 'Piscinas & Manutenção',
  glass_repair_service: 'Vidraçaria & Reparos de Vidro',
  glazier: 'Vidraçaria & Esquadrias',
  iron_works: 'Serralheria & Estruturas Metálicas',
  welder: 'Solda & Serralheria',
  appliance_repair_service: 'Conserto de Eletrodomésticos',
  handyman: 'Marido de Aluguel & Reparos',

  // Arquitetura, Engenharia & Design
  architect: 'Arquitetura & Projetos',
  architectural_designer: 'Arquitetura & Design',
  interior_designer: 'Design de Interiores & Decoração',
  landscape_architect: 'Paisagismo & Jardinagem',
  engineering_consultant: 'Engenharia & Projetos',

  // Saúde, Clínicas & Odontologia
  dentist: 'Odontologia & Clínicas Dentárias',
  dental_clinic: 'Odontologia & Clínicas Dentárias',
  doctor: 'Saúde & Clínicas Médicas',
  physician: 'Saúde & Clínicas Médicas',
  medical_clinic: 'Clínica Médica & Saúde',
  hospital: 'Hospital & Saúde',
  physiotherapist: 'Fisioterapia & Reabilitação',
  psychologist: 'Psicologia & Saúde Mental',
  mental_health_clinic: 'Psicologia & Saúde Mental',
  chiropractor: 'Quiropraxia',
  podiatrist: 'Podologia',
  nutritionist: 'Nutrição & Saúde',
  pharmacy: 'Farmácia & Drogaria',
  drugstore: 'Drogaria & Farmácia',
  optician: 'Ótica & Armações',
  optometrist: 'Ótica & Exames de Vista',

  // Jurídico, Financeiro & Consultoria
  lawyer: 'Advocacia & Jurídico',
  attorney: 'Advocacia & Jurídico',
  law_firm: 'Escritório de Advocacia',
  legal_services: 'Serviços Jurídicos & Advocacia',
  accounting: 'Contabilidade & Assessoria Fiscal',
  accountant: 'Contabilidade & Finanças',
  bookkeeping: 'Contabilidade & Escrituração',
  finance: 'Finanças & Crédito',
  financial_planner: 'Planejamento Financeiro & Investimentos',
  insurance_agency: 'Seguros & Benefícios',
  consultant: 'Consultoria Empresarial',
  business_management_consultant: 'Consultoria de Negócios',

  // Automotivo & Transportes
  car_repair: 'Oficina Mecânica & Auto Center',
  auto_repair: 'Oficina Mecânica & Auto Center',
  auto_body_shop: 'Funilaria & Pintura Automotiva',
  car_dealer: 'Concessionária & Revenda de Veículos',
  used_car_dealer: 'Revenda de Carros Usados',
  car_wash: 'Lava-Rápido & Estética Automotiva',
  auto_parts_store: 'Autopeças & Acessórios',
  tire_shop: 'Pneus & Borracharia',
  motorcycle_repair_shop: 'Oficina de Motos',
  car_rental: 'Locadora de Veículos',
  gas_station: 'Posto de Combustíveis',
  moving_company: 'Mudanças & Fretes',
  towing_service: 'Guincho & Auto Socorro',

  // Beleza, Estética & Bem-Estar
  beauty_salon: 'Salão de Beleza & Estética',
  hair_care: 'Cabeleireiro & Salão de Beleza',
  hair_salon: 'Cabeleireiro & Salão de Beleza',
  barber_shop: 'Barbearia',
  spa: 'Spa & Estética',
  day_spa: 'Spa & Relaxamento',
  nail_salon: 'Manicure & Esmalteria',
  skin_care_clinic: 'Clínica de Estética & Pele',
  massage_therapist: 'Massoterapia & Spa',
  tattoo_shop: 'Estúdio de Tatuagem & Piercing',

  // Gastronomia, Bares & Restaurantes
  restaurant: 'Restaurante & Gastronomia',
  pizza_restaurant: 'Pizzaria',
  bar: 'Bar & Chopperia',
  pub: 'Bar & Pub',
  hamburger_restaurant: 'Hamburgueria Artesanal',
  fast_food_restaurant: 'Lanchonete & Fast Food',
  cafe: 'Cafeteria & Bistrô',
  coffee_shop: 'Cafeteria & Bistrô',
  bakery: 'Padaria & Confeitaria',
  ice_cream_shop: 'Sorveteria & Açaí',
  meal_delivery: 'Delivery de Comida',
  meal_takeaway: 'Comida para Viagem / Marmitaria',
  barbecue_restaurant: 'Churrascaria',
  sushi_restaurant: 'Culinária Japonesa & Sushi',

  // Fitness, Esportes & Lazer
  gym: 'Academia & Fitness',
  fitness_center: 'Academia & Treinamento',
  pilates_studio: 'Studio de Pilates',
  yoga_studio: 'Studio de Yoga',
  martial_arts_school: 'Artes Marciais & Lutas',
  dance_school: 'Escola de Dança',
  swimming_school: 'Natação & Esportes Aquáticos',

  // Pets & Veterinária
  veterinary_care: 'Clínica Veterinária',
  veterinarian: 'Clínica Veterinária',
  pet_store: 'Pet Shop & Acessórios',
  pet_grooming: 'Banho e Tosa & Estética Pet',

  // Imobiliária & Habitação
  real_estate_agency: 'Imobiliária & Venda de Imóveis',
  real_estate_agent: 'Corretor de Imóveis',
  housing_development: 'Construtora & Incorporadora',
  property_management: 'Administração de Condomínios e Imóveis',

  // Educação & Ensino
  school: 'Escola & Educação',
  primary_school: 'Ensino Fundamental',
  secondary_school: 'Colégio & Ensino Médio',
  university: 'Universidade & Ensino Superior',
  college: 'Faculdade & Ensino Superior',
  language_school: 'Escola de Idiomas',
  preschool: 'Creche & Educação Infantil',
  daycare: 'Creche & Berçário',
  music_school: 'Escola de Música',
  tutoring_service: 'Aulas Particulares & Reforço',

  // Hotelaria, Viagens & Turismo
  hotel: 'Hotel & Hospedagem',
  motel: 'Motel & Hospedagem',
  resort_hotel: 'Resort & Hotel de Lazer',
  guest_house: 'Pousada & Hospedagem',
  travel_agency: 'Agência de Viagens & Turismo',

  // Limpeza, Dedetização & Serviços Patrimoniais
  cleaning_service: 'Limpeza & Conservação',
  house_cleaning_service: 'Limpeza Residencial & Diaristas',
  pest_control_service: 'Dedetização & Controle de Pragas',
  security_system_supplier: 'Segurança Eletrônica & Alarmes',
  security_guard_service: 'Segurança Patrimonial & Portaria',
  solar_energy_company: 'Energia Solar Fotovoltaica',

  // Gráfica, Comunicação & Marketing
  graphic_designer: 'Design Gráfico & Comunicação Visual',
  print_shop: 'Gráfica & Impressão Rápida',
  commercial_printer: 'Gráfica & Comunicação Visual',
  marketing_agency: 'Marketing & Publicidade',
  advertising_agency: 'Agência de Publicidade',
  photography_studio: 'Estúdio Fotográfico & Vídeo',
  photographer: 'Fotografia & Filmagem',

  // Eventos & Festas
  event_planner: 'Assessoria & Organização de Eventos',
  event_venue: 'Espaço de Eventos & Festas',
  banquet_hall: 'Buffet & Salão de Festas',
  wedding_venue: 'Espaço para Casamentos',

  // Comércio & Varejo
  clothing_store: 'Moda & Roupas',
  shoe_store: 'Calçados',
  fashion_accessories_store: 'Acessórios & Moda',
  furniture_store: 'Móveis & Decoração',
  home_goods_store: 'Utilidades Domésticas & Decoração',
  supermarket: 'Supermercado',
  grocery_store: 'Mercearia & Mercado',
  hardware_store: 'Material de Construção & Ferramentas',
  building_materials_store: 'Materiais de Construção',
  jewelry_store: 'Joalheria & Ótica',
  watch_repair: 'Relojoaria',
  florist: 'Floricultura & Plantas',
  dry_cleaner: 'Lavanderia a Seco',
  laundry: 'Lavanderia',
  tailor: 'Alfaiataria & Costura',

  // TI & Tecnologia
  it_services: 'TI & Serviços de Tecnologia',
  software_company: 'Software & Tecnologia',
  computer_repair: 'Assistência Técnica de Computadores'
};

// Termos coringa neutros do Google Maps que não dizem qual é o nicho
const GENERIC_GOOGLE_TAGS = new Set([
  'point_of_interest',
  'establishment',
  'premise',
  'subpremise',
  'geocode',
  'political',
  'route',
  'street_address',
  'neighborhood',
  'locality',
  'general',
  'outros',
  'other'
]);

/**
 * Converte qualquer categoria desconhecida vinda do JSON (ex: 'auto_pecas_usadas' ou 'refrigeracao_comercial')
 * em um título formatado e legível, garantindo que NENHUM nicho do JSON seja perdido.
 */
function formatDynamicCategory(raw: string): string {
  if (!raw) return '';
  const cleaned = raw.replace(/[_-]+/g, ' ').trim();
  return cleaned
    .split(/\s+/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Identifica com precisão o nicho de mercado de um Lead.
 * Prioridade:
 * 1. Campo de categoria oficial vindo do JSON (categories, category, types, type, primaryType)
 * 2. Análise profunda de palavras-chave no Nome do estabelecimento e URL do site
 * 3. Formatação dinâmica direta da string da categoria
 */
export function getLeadNiche(lead: Lead | { name?: string; categories?: any; publicUrl?: string; niche?: string; types?: any; category?: any }): string {
  // Se o lead já possui um nicho definido e não é genérico, preserva
  if (lead.niche && lead.niche !== 'Outros' && lead.niche !== 'Geral / Outros' && lead.niche !== 'general') {
    return lead.niche;
  }

  // 1. Extração dos termos brutos de categoria do JSON
  const rawList: string[] = [];
  const anyLead = lead as any;

  const candidateSources = [
    anyLead.categories,
    anyLead.category,
    anyLead.types,
    anyLead.type,
    anyLead.primaryType,
    anyLead.segmento,
    anyLead.ramo
  ];

  for (const src of candidateSources) {
    if (Array.isArray(src)) {
      src.forEach(item => {
        if (typeof item === 'string' && item.trim()) rawList.push(item.trim());
      });
    } else if (typeof src === 'string' && src.trim()) {
      // Pode vir separado por vírgula ou espaço
      if (src.includes(',')) {
        src.split(',').forEach(part => {
          if (part.trim()) rawList.push(part.trim());
        });
      } else {
        rawList.push(src.trim());
      }
    }
  }

  // Filtra tags genéricas do Google Maps (point_of_interest, establishment, etc)
  const specificCategories = rawList.filter(cat => {
    const lower = cat.toLowerCase().trim();
    return !GENERIC_GOOGLE_TAGS.has(lower);
  });

  // 2. Se temos uma categoria específica do JSON, traduz ou formata na hora!
  for (const cat of specificCategories) {
    const lowerCat = cat.toLowerCase().replace(/\s+/g, '_');
    
    // Busca exata no dicionário de traduções do Google Places
    if (GOOGLE_PLACES_TRANSLATION_MAP[lowerCat]) {
      return GOOGLE_PLACES_TRANSLATION_MAP[lowerCat];
    }

    // Busca parcial no dicionário
    for (const [key, translated] of Object.entries(GOOGLE_PLACES_TRANSLATION_MAP)) {
      if (lowerCat.includes(key) || key.includes(lowerCat)) {
        return translated;
      }
    }

    // Se é uma categoria própria do cliente no JSON (ex: "Arquitetura", "Vidraçaria", "Engenharia"), usa ela formatada!
    if (cat.length >= 3) {
      return formatDynamicCategory(cat);
    }
  }

  // 3. Fallback inteligente: análise de palavras-chave no Nome da empresa e URL
  const name = (lead.name || '').toLowerCase();
  const url = (lead.publicUrl || '').toLowerCase();
  const fullText = `${name} ${url}`;

  // Termos de Construção & Reformas / Marido de Aluguel
  if (/marido.*aluguel|pequenos.*reparos|consertos.*gerais/.test(fullText)) {
    return 'Construção & Reformas (Marido de Aluguel)';
  }
  if (/pedreir|reform|empreiteir|alvenaria|mestre.*obras|construc|construç/.test(fullText)) {
    return 'Construção & Reformas';
  }
  if (/vidra[çc]|box.*banheir|esquadri/.test(fullText)) {
    return 'Vidraçaria & Esquadrias';
  }
  if (/serralh|solda|grade|portao|portão/.test(fullText)) {
    return 'Serralheria & Estruturas';
  }
  if (/marcenar|moveis.*planejad|móveis.*planejad/.test(fullText)) {
    return 'Marcenaria & Móveis Planejados';
  }
  if (/chaveir/.test(fullText)) {
    return 'Chaveiro & Aberturas';
  }
  if (/desentup|encanad|hidraul|hidrául/.test(fullText)) {
    return 'Encanador & Desentupidora';
  }
  if (/pintur|pintor/.test(fullText)) {
    return 'Pintura & Acabamentos';
  }
  if (/gesso|drywall/.test(fullText)) {
    return 'Gesso & Drywall';
  }
  if (/calha|rufo|telhad/.test(fullText)) {
    return 'Telhados & Calhas';
  }
  if (/refrigera|ar.*condicionad|climatiza/.test(fullText)) {
    return 'Ar-Condicionado & Climatização';
  }
  if (/dedetiz|pragas/.test(fullText)) {
    return 'Dedetização & Pragas';
  }
  if (/guincho|auto.*socorro/.test(fullText)) {
    return 'Guincho & Auto Socorro';
  }
  if (/despachante/.test(fullText)) {
    return 'Despachante Documentalista';
  }
  if (/cartorio|cartório|tabelio|tabelião/.test(fullText)) {
    return 'Cartório & Registro';
  }
  if (/otica|ótica|relojoar/.test(fullText)) {
    return 'Ótica & Relojoaria';
  }
  if (/lava.*rapido|lava.*jato|estetica.*auto|estética.*auto/.test(fullText)) {
    return 'Lava-Rápido & Estética Automotiva';
  }
  if (/papelar/.test(fullText)) {
    return 'Papelaria & Bazar';
  }
  if (/bebida|adega|chopp|cervej/.test(fullText)) {
    return 'Adega & Bebidas';
  }
  if (/acougue|açougue|carnes/.test(fullText)) {
    return 'Açougue & Carnes';
  }
  if (/floric|flores/.test(fullText)) {
    return 'Floricultura & Paisagismo';
  }
  if (/tatuag|tattoo/.test(fullText)) {
    return 'Tatuagem & Piercing';
  }
  if (/lavander/.test(fullText)) {
    return 'Lavanderia';
  }
  if (/arquit|design.*interior|decor|urbanis/.test(fullText)) {
    return 'Arquitetura & Design';
  }
  if (/odont|dentis|implante|ortodon|sorriso|dental/.test(fullText)) {
    return 'Odontologia';
  }
  if (/advog|jurid|advocac|direito|oab/.test(fullText)) {
    return 'Advocacia & Jurídico';
  }
  if (/mecanic|auto|oficina|pneu|veicul|carro|martelinho|funilaria|moto/.test(fullText)) {
    return 'Oficina & Automotivo';
  }
  if (/pizz|restauran|lanch|bar|burger|hamburg|café|cafe|bistr|churrasc|gastronom|acai|açaí|sushi|delivery/.test(fullText)) {
    return 'Restaurante & Gastronomia';
  }
  if (/estet|estét|beleza|salao|salão|cabel|barber|barbearia|sobrancelh|manicur|unha|spa|massag/.test(fullText)) {
    return 'Estética & Beleza';
  }
  if (/imobili|imove|corretor.*imove|construt|locac.*imove/.test(fullText)) {
    return 'Imobiliária & Construção';
  }
  if (/contab|fiscal|tribut|pericia.*contabil|auditor/.test(fullText)) {
    return 'Contabilidade & Finanças';
  }
  if (/medic|clinic|clínic|saude|saúde|psicol|fisioter|oftalmo|laborat|pediatr|dermatol|nutri/.test(fullText)) {
    return 'Saúde & Clínicas';
  }
  if (/veterin|pet|petshop|banho.*tosa|animal|cao|cachorro/.test(fullText)) {
    return 'Pet & Veterinária';
  }
  if (/academ|crossfit|fitness|treino|pilates|personal|ginastic/.test(fullText)) {
    return 'Fitness & Academia';
  }
  if (/escol|colegio|colégio|curso|faculd|idioma|educac|bercar/.test(fullText)) {
    return 'Educação & Cursos';
  }
  if (/energi.*solar|fotovolt|placa.*solar/.test(fullText)) {
    return 'Energia Solar';
  }
  if (/hotel|pousada|resort|hostel|turism/.test(fullText)) {
    return 'Hotel & Pousada';
  }
  if (/grafic|impress|comunic.*visual|brinde/.test(fullText)) {
    return 'Gráfica & Comunicação';
  }
  if (/seguran.*eletron|alarme|cftv|portaria/.test(fullText)) {
    return 'Segurança Eletrônica';
  }
  if (/sorvet|doceri|confeit|bolo|padar/.test(fullText)) {
    return 'Confeitaria & Doces';
  }
  if (/moda|roupa|calcado|calçado|vestu|boutique|loja/.test(fullText)) {
    return 'Moda & Varejo';
  }
  if (/seguro|corretor.*seguro|previdenc/.test(fullText)) {
    return 'Seguros & Benefícios';
  }
  if (/festas|eventos|buffet|casamento|decorac.*festa/.test(fullText)) {
    return 'Eventos & Festas';
  }

  // 4. Se havia qualquer termo na lista bruta (mesmo que não filtrado anteriormente)
  if (rawList.length > 0) {
    const candidate = rawList.find(c => !GENERIC_GOOGLE_TAGS.has(c.toLowerCase()));
    if (candidate) {
      return formatDynamicCategory(candidate);
    }
  }

  return 'Comércio & Serviços Gerais';
}
