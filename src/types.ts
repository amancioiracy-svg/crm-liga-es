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

export interface CustomTag {
  id: string;
  name: string;
  color: string;
  bgColor: string;
  createdAt?: string;
}

export type CallTag = string;

export interface CallLog {
  id: string;
  leadId: string;
  tag: string;
  comment: string;
  durationSeconds?: number;
  followUpAt?: string;
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
  lastCallTag?: string;
  nextFollowUpAt?: string;
  calls?: CallLog[];
}

export interface ImportResult {
  totalProcessed: number;
  insertedCount: number;
  skippedDuplicates: number;
  errors: string[];
}

