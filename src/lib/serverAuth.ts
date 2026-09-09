import crypto from 'crypto';
import { User, AuditLog } from '../types';

export interface StoredUser extends User {
  passwordHash: string;
  passwordSalt: string;
}

export function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const usedSalt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, usedSalt, 64).toString('hex');
  return { hash, salt: usedSalt };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  try {
    const computed = crypto.scryptSync(password, salt, 64).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(hash));
  } catch {
    return false;
  }
}

export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Usuários padrão pré-configurados
const adminCreds = hashPassword('admin123', 'crm_salt_admin');
const thomasCreds = hashPassword('123', 'crm_salt_thomas');
const laraCreds = hashPassword('123', 'crm_salt_lara');
const pollyCreds = hashPassword('123', 'crm_salt_polly');

export const DEFAULT_USERS: StoredUser[] = [
  {
    id: 'user-admin',
    name: 'Super Admin (Dono)',
    email: 'admin@crm.com',
    role: 'admin',
    active: true,
    passwordHash: adminCreds.hash,
    passwordSalt: adminCreds.salt,
    createdAt: new Date().toISOString()
  },
  {
    id: 'user-thomas',
    name: 'Thomas',
    email: 'thomas@empresa.com',
    role: 'salesperson',
    salespersonId: 'seller-thomas',
    active: true,
    passwordHash: thomasCreds.hash,
    passwordSalt: thomasCreds.salt,
    createdAt: new Date().toISOString()
  },
  {
    id: 'user-lara',
    name: 'Lara Luiza',
    email: 'lara@empresa.com',
    role: 'salesperson',
    salespersonId: 'seller-lara',
    active: true,
    passwordHash: laraCreds.hash,
    passwordSalt: laraCreds.salt,
    createdAt: new Date().toISOString()
  },
  {
    id: 'user-polly',
    name: 'Pollyanna',
    email: 'pollyanna@empresa.com',
    role: 'salesperson',
    salespersonId: 'seller-polly',
    active: true,
    passwordHash: pollyCreds.hash,
    passwordSalt: pollyCreds.salt,
    createdAt: new Date().toISOString()
  }
];
