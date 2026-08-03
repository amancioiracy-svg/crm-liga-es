export type ColumnStatus = 
  | 'Leads'
  | 'Ligação 1'
  | 'Ligação 2'
  | 'Ligação 3'
  | 'Ligação 4'
  | 'Interessado'
  | 'Fechado'
  | 'Recusado';

export const PIPELINE_COLUMNS: ColumnStatus[] = [
  'Leads',
  'Ligação 1',
  'Ligação 2',
  'Ligação 3',
  'Ligação 4',
  'Interessado',
  'Fechado',
  'Recusado'
];

export type CallTag = 
  | 'Atendeu'
  | 'Não Atendeu'
  | 'Caixa Postal'
  | 'Ocupado'
  | 'Pediu para retornar';

export const CALL_TAGS: CallTag[] = [
  'Atendeu',
  'Não Atendeu',
  'Caixa Postal',
  'Ocupado',
  'Pediu para retornar'
];

export interface CallLog {
  id: string;
  leadId: string;
  tag: CallTag;
  comment: string;
  createdAt: string;
}

export interface Lead {
  id: string;
  name: string;
  phoneNumber: string;
  publicUrl?: string;
  columnStatus: ColumnStatus;
  createdAt: string;
  updatedAt: string;
  callCount?: number;
  lastCallAt?: string;
  calls?: CallLog[];
}

export interface ImportResult {
  totalProcessed: number;
  insertedCount: number;
  skippedDuplicates: number;
  errors: string[];
}
