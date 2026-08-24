import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import multer from 'multer';
import JSZip from 'jszip';
import pg from 'pg';
import { Lead, CallLog, ColumnStatus, PIPELINE_COLUMNS, CustomTag, Salesperson, DistributeLeadsParams } from './src/types.js';

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health check endpoints for Railway / Render / Cloud Run
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Multer memory storage for zip uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB limit
});

// Default seed tags
const DEFAULT_CUSTOM_TAGS: CustomTag[] = [
  { id: 'tag-atendeu', name: 'Atendeu', color: '#15803d', bgColor: '#dcfce7' },
  { id: 'tag-nao-atendeu', name: 'Não Atendeu', color: '#b91c1c', bgColor: '#fee2e2' },
  { id: 'tag-caixa-postal', name: 'Caixa Postal', color: '#b45309', bgColor: '#fef3c7' },
  { id: 'tag-secretaria', name: 'Secretária barrou', color: '#c2410c', bgColor: '#ffedd5' },
  { id: 'tag-whatsapp', name: 'WhatsApp enviado', color: '#4338ca', bgColor: '#e0e7ff' },
  { id: 'tag-retornar', name: 'Pediu para retornar', color: '#7e22ce', bgColor: '#f3e8ff' },
  { id: 'tag-ligar-14h', name: 'Ligar após 14h', color: '#0369a1', bgColor: '#e0f2fe' },
  { id: 'tag-ocupado', name: 'Ocupado', color: '#be123c', bgColor: '#ffe4e6' },
];

// Default Salesperson: Thomas (Vendedor Principal)
const DEFAULT_SALESPERSON: Salesperson = {
  id: 'seller-thomas',
  name: 'Thomas',
  email: 'thomas@empresa.com',
  phone: '(31) 99150-3721',
  color: '#0284c7',
  bgColor: '#e0f2fe',
  isDefault: true,
  distributionPercent: 50,
  createdAt: new Date().toISOString()
};

// Database Connection setup
let pgPool: pg.Pool | null = null;
let usePostgres = false;

// Default in-memory database store
const memoryLeadsMap = new Map<string, Lead>();
const memoryCallLogsMap = new Map<string, CallLog[]>();
const memoryTagsMap = new Map<string, CustomTag>(
  DEFAULT_CUSTOM_TAGS.map(t => [t.id, t])
);
const memorySalespeopleMap = new Map<string, Salesperson>([
  [DEFAULT_SALESPERSON.id, DEFAULT_SALESPERSON]
]);

async function initDatabase(retries = 5, delayMs = 3000) {
  const dbUrl = (
    process.env.DATABASE_URL ||
    process.env.DATABASE_PRIVATE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRESQL_URL ||
    process.env.DATABASE_PUBLIC_URL ||
    ''
  ).trim();

  if (!dbUrl) {
    console.log('ℹ️ Nenhuma variável de banco PostgreSQL encontrada (DATABASE_URL, POSTGRES_URL, etc.). Executando em modo in-memory.');
    usePostgres = false;
    return;
  }

  for (let attempt = 1; attempt <= retries; attempt++) {
    // Try SSL configs: first with rejectUnauthorized: false, then ssl: false if internal
    const sslConfigs = dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1')
      ? [false]
      : [{ rejectUnauthorized: false }, false];

    for (const sslConfig of sslConfigs) {
      try {
        console.log(`[Database] Tentando conexão ao PostgreSQL (${attempt}/${retries}, ssl: ${JSON.stringify(sslConfig)})...`);

        const pool = new pg.Pool({
          connectionString: dbUrl,
          ssl: sslConfig,
          connectionTimeoutMillis: 8000,
        });

        pool.on('error', (err) => {
          console.error('Erro no cliente PostgreSQL idle:', err);
        });

        const client = await pool.connect();

        // Auto-create tables if they don't exist & run migrations
        await client.query(`
          CREATE TABLE IF NOT EXISTS salespeople (
            id VARCHAR(255) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            email VARCHAR(255),
            phone VARCHAR(100),
            color VARCHAR(100) NOT NULL DEFAULT '#0284c7',
            bg_color VARCHAR(100) NOT NULL DEFAULT '#e0f2fe',
            is_default BOOLEAN DEFAULT FALSE,
            distribution_percent INT DEFAULT 0,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          );

          ALTER TABLE salespeople ADD COLUMN IF NOT EXISTS phone VARCHAR(100);
          ALTER TABLE salespeople ADD COLUMN IF NOT EXISTS distribution_percent INT DEFAULT 0;

          CREATE TABLE IF NOT EXISTS leads (
            id VARCHAR(255) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            phone_number VARCHAR(100) NOT NULL,
            public_url TEXT,
            column_status VARCHAR(100) NOT NULL DEFAULT 'Leads',
            salesperson_id VARCHAR(255) DEFAULT 'seller-thomas',
            salesperson_name VARCHAR(255) DEFAULT 'Thomas',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          );

          CREATE TABLE IF NOT EXISTS calls (
            id VARCHAR(255) PRIMARY KEY,
            lead_id VARCHAR(255) NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
            tag VARCHAR(100) NOT NULL,
            comment TEXT,
            duration_seconds INT DEFAULT 0,
            follow_up_at TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          );

          ALTER TABLE calls ADD COLUMN IF NOT EXISTS duration_seconds INT DEFAULT 0;
          ALTER TABLE calls ADD COLUMN IF NOT EXISTS follow_up_at TIMESTAMP WITH TIME ZONE;
          ALTER TABLE leads ADD COLUMN IF NOT EXISTS next_follow_up_at TIMESTAMP WITH TIME ZONE;
          ALTER TABLE leads ADD COLUMN IF NOT EXISTS salesperson_id VARCHAR(255) DEFAULT 'seller-thomas';
          ALTER TABLE leads ADD COLUMN IF NOT EXISTS salesperson_name VARCHAR(255) DEFAULT 'Thomas';

          CREATE TABLE IF NOT EXISTS custom_tags (
            id VARCHAR(255) PRIMARY KEY,
            name VARCHAR(255) UNIQUE NOT NULL,
            color VARCHAR(100) NOT NULL,
            bg_color VARCHAR(100) NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          );

          -- Seed default primary salesperson (Thomas)
          INSERT INTO salespeople (id, name, email, color, bg_color, is_default)
          VALUES ('seller-thomas', 'Thomas', 'thomas@empresa.com', '#0284c7', '#e0f2fe', TRUE)
          ON CONFLICT (id) DO NOTHING;

          -- Backfill any leads without a salesperson
          UPDATE leads 
          SET salesperson_id = 'seller-thomas', salesperson_name = 'Thomas'
          WHERE salesperson_id IS NULL OR salesperson_id = '';
        `);

        // Seed default tags if table is empty
        const tagCountRes = await client.query(`SELECT COUNT(*)::int AS count FROM custom_tags`);
        if (tagCountRes.rows[0].count === 0) {
          for (const t of DEFAULT_CUSTOM_TAGS) {
            await client.query(
              `INSERT INTO custom_tags (id, name, color, bg_color) VALUES ($1, $2, $3, $4) ON CONFLICT (name) DO NOTHING`,
              [t.id, t.name, t.color, t.bgColor]
            );
          }
        }

        client.release();
        pgPool = pool;
        usePostgres = true;
        console.log('✅ PostgreSQL conectado com sucesso e tabelas verificadas.');
        return;
      } catch (err: any) {
        console.warn(`⚠️ Tentativa de conexão ao PostgreSQL falhou com SSL ${JSON.stringify(sslConfig)}:`, err.message);
      }
    }

    if (attempt < retries) {
      await new Promise((res) => setTimeout(res, delayMs));
    }
  }

  console.warn('⚠️ Todas as tentativas de conexão ao PostgreSQL falharam. Operando em modo in-memory.');
  usePostgres = false;
}

// HEALTHCHECK ROUTE (Fast response for Railway & Docker health checks)
app.get(['/health', '/api/health', '/healthz', '/ping'], (req, res) => {
  res.status(200).json({
    status: 'ok',
    uptime: Math.floor(process.uptime()),
    database: usePostgres ? 'postgresql' : 'in-memory',
    timestamp: new Date().toISOString()
  });
});

// API ROUTES

// 1. Get all leads with call stats & salesperson info (optionally filtered by salesperson)
app.get('/api/leads', async (req, res) => {
  const { salespersonId } = req.query;

  try {
    if (usePostgres && pgPool) {
      let query = `
        SELECT 
          l.id,
          l.name,
          l.phone_number AS "phoneNumber",
          l.public_url AS "publicUrl",
          COALESCE(l.column_status, 'Leads') AS "columnStatus",
          COALESCE(l.salesperson_id, 'seller-thomas') AS "salespersonId",
          COALESCE(l.salesperson_name, 'Thomas') AS "salespersonName",
          l.next_follow_up_at AS "nextFollowUpAt",
          l.created_at AS "createdAt",
          l.updated_at AS "updatedAt",
          COUNT(c.id)::int AS "callCount",
          MAX(c.created_at) AS "lastCallAt",
          (
            SELECT tag FROM calls 
            WHERE lead_id = l.id 
            ORDER BY created_at DESC LIMIT 1
          ) AS "lastCallTag"
        FROM leads l
        LEFT JOIN calls c ON l.id = c.lead_id
      `;
      const params: any[] = [];
      if (salespersonId && salespersonId !== 'ALL') {
        params.push(salespersonId);
        query += ` WHERE l.salesperson_id = $1`;
      }
      query += `
        GROUP BY l.id, l.name, l.phone_number, l.public_url, l.column_status, l.salesperson_id, l.salesperson_name, l.next_follow_up_at, l.created_at, l.updated_at
        ORDER BY l.created_at DESC
      `;

      const result = await pgPool.query(query, params);
      return res.json(result.rows);
    } else {
      let allLeads = Array.from(memoryLeadsMap.values());
      if (salespersonId && salespersonId !== 'ALL') {
        allLeads = allLeads.filter(l => (l.salespersonId || 'seller-thomas') === salespersonId);
      }

      const leadsList = allLeads.map(lead => {
        const calls = memoryCallLogsMap.get(lead.id) || [];
        const sortedCalls = [...calls].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        const lastCall = sortedCalls.length > 0 ? sortedCalls[0] : undefined;
        return {
          ...lead,
          salespersonId: lead.salespersonId || 'seller-thomas',
          salespersonName: lead.salespersonName || 'Thomas',
          callCount: calls.length,
          lastCallAt: lastCall?.createdAt,
          lastCallTag: lastCall?.tag
        };
      });
      return res.json(leadsList);
    }
  } catch (error) {
    console.error('Error fetching leads:', error);
    res.status(500).json({ error: 'Erro ao buscar leads do banco de dados.' });
  }
});

// Tags Endpoints: GET, POST, DELETE
app.get('/api/tags', async (req, res) => {
  try {
    if (usePostgres && pgPool) {
      const result = await pgPool.query(
        `SELECT id, name, color, bg_color AS "bgColor", created_at AS "createdAt"
         FROM custom_tags
         ORDER BY created_at ASC`
      );
      return res.json(result.rows);
    } else {
      return res.json(Array.from(memoryTagsMap.values()));
    }
  } catch (error) {
    console.error('Error fetching custom tags:', error);
    res.status(500).json({ error: 'Erro ao buscar etiquetas customizadas.' });
  }
});

app.post('/api/tags', async (req, res) => {
  const { name, color, bgColor } = req.body;
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'Nome da etiqueta é obrigatório.' });
  }

  const nameTrim = name.trim();
  const tagColor = color || '#15803d';
  const tagBgColor = bgColor || '#dcfce7';
  const tagId = `tag-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

  try {
    if (usePostgres && pgPool) {
      const result = await pgPool.query(
        `INSERT INTO custom_tags (id, name, color, bg_color)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (name) DO UPDATE SET color = EXCLUDED.color, bg_color = EXCLUDED.bg_color
         RETURNING id, name, color, bg_color AS "bgColor", created_at AS "createdAt"`,
        [tagId, nameTrim, tagColor, tagBgColor]
      );
      return res.status(201).json(result.rows[0]);
    } else {
      const existingTag = Array.from(memoryTagsMap.values()).find(t => t.name.toLowerCase() === nameTrim.toLowerCase());
      if (existingTag) {
        existingTag.color = tagColor;
        existingTag.bgColor = tagBgColor;
        return res.json(existingTag);
      }
      const newTag: CustomTag = {
        id: tagId,
        name: nameTrim,
        color: tagColor,
        bgColor: tagBgColor,
        createdAt: new Date().toISOString()
      };
      memoryTagsMap.set(tagId, newTag);
      return res.status(201).json(newTag);
    }
  } catch (error: any) {
    console.error('Error creating tag:', error);
    res.status(500).json({ error: `Erro ao criar etiqueta: ${error.message}` });
  }
});

app.delete('/api/tags/:id', async (req, res) => {
  const { id } = req.params;
  try {
    if (usePostgres && pgPool) {
      await pgPool.query(`DELETE FROM custom_tags WHERE id = $1`, [id]);
      return res.json({ success: true });
    } else {
      memoryTagsMap.delete(id);
      return res.json({ success: true });
    }
  } catch (error) {
    console.error('Error deleting tag:', error);
    res.status(500).json({ error: 'Erro ao deletar etiqueta.' });
  }
});

// SALESPEOPLE (VENDEDORES) ENDPOINTS

// 1. Get all salespeople with their lead stats & quotas
app.get('/api/salespeople', async (req, res) => {
  try {
    if (usePostgres && pgPool) {
      const spRes = await pgPool.query(`
        SELECT 
          s.id, 
          s.name, 
          s.email, 
          s.phone, 
          s.color, 
          s.bg_color AS "bgColor", 
          s.is_default AS "isDefault", 
          COALESCE(s.distribution_percent, 0) AS "distributionPercent",
          s.created_at AS "createdAt",
          COUNT(l.id)::int AS "totalLeads",
          COUNT(CASE WHEN l.column_status = 'Leads' AND (SELECT COUNT(*) FROM calls WHERE lead_id = l.id) = 0 THEN 1 END)::int AS "uncontactedLeads",
          COUNT(CASE WHEN l.column_status IN ('Ligação 1', 'Ligação 2', 'Ligação 3', 'Ligação 4', 'Interessado') THEN 1 END)::int AS "inProgressLeads",
          COUNT(CASE WHEN l.column_status = 'Fechado' THEN 1 END)::int AS "closedLeads",
          COUNT(CASE WHEN l.column_status = 'Recusado' THEN 1 END)::int AS "refusedLeads"
        FROM salespeople s
        LEFT JOIN leads l ON (l.salesperson_id = s.id OR (s.is_default = TRUE AND l.salesperson_id IS NULL))
        GROUP BY s.id, s.name, s.email, s.phone, s.color, s.bg_color, s.is_default, s.distribution_percent, s.created_at
        ORDER BY s.is_default DESC, s.created_at ASC
      `);
      return res.json(spRes.rows);
    } else {
      const allLeads = Array.from(memoryLeadsMap.values());
      const sellers = Array.from(memorySalespeopleMap.values()).map(s => {
        const myLeads = allLeads.filter(l => (l.salespersonId || 'seller-thomas') === s.id);
        const uncontacted = myLeads.filter(l => {
          if (l.columnStatus !== 'Leads') return false;
          const calls = memoryCallLogsMap.get(l.id) || [];
          return calls.length === 0;
        }).length;
        const inProgress = myLeads.filter(l => ['Ligação 1', 'Ligação 2', 'Ligação 3', 'Ligação 4', 'Interessado'].includes(l.columnStatus)).length;
        const closed = myLeads.filter(l => l.columnStatus === 'Fechado').length;
        const refused = myLeads.filter(l => l.columnStatus === 'Recusado').length;

        return {
          ...s,
          distributionPercent: s.distributionPercent || (s.isDefault ? 50 : 0),
          totalLeads: myLeads.length,
          uncontactedLeads: uncontacted,
          inProgressLeads: inProgress,
          closedLeads: closed,
          refusedLeads: refused
        };
      });
      return res.json(sellers);
    }
  } catch (error) {
    console.error('Error fetching salespeople:', error);
    res.status(500).json({ error: 'Erro ao buscar vendedores.' });
  }
});

// 2. Create new salesperson
app.post('/api/salespeople', async (req, res) => {
  const { name, email, phone, color, bgColor, distributionPercent } = req.body;
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'Nome do vendedor(a) é obrigatório.' });
  }

  const nameTrim = name.trim();
  const sellerId = `seller-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const sellerColor = color || '#0284c7';
  const sellerBgColor = bgColor || '#e0f2fe';
  const sellerEmail = email ? email.trim() : '';
  const sellerPhone = phone ? phone.trim() : '';
  const quotaPercent = Number(distributionPercent) || 0;
  const createdAt = new Date().toISOString();

  try {
    if (usePostgres && pgPool) {
      const result = await pgPool.query(
        `INSERT INTO salespeople (id, name, email, phone, color, bg_color, is_default, distribution_percent, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, FALSE, $7, CURRENT_TIMESTAMP)
         RETURNING id, name, email, phone, color, bg_color AS "bgColor", is_default AS "isDefault", distribution_percent AS "distributionPercent", created_at AS "createdAt"`,
        [sellerId, nameTrim, sellerEmail, sellerPhone, sellerColor, sellerBgColor, quotaPercent]
      );
      return res.status(201).json({
        ...result.rows[0],
        totalLeads: 0,
        uncontactedLeads: 0,
        inProgressLeads: 0,
        closedLeads: 0,
        refusedLeads: 0
      });
    } else {
      const newSeller: Salesperson = {
        id: sellerId,
        name: nameTrim,
        email: sellerEmail,
        phone: sellerPhone,
        color: sellerColor,
        bgColor: sellerBgColor,
        isDefault: false,
        distributionPercent: quotaPercent,
        createdAt
      };
      memorySalespeopleMap.set(sellerId, newSeller);
      return res.status(201).json({
        ...newSeller,
        totalLeads: 0,
        uncontactedLeads: 0,
        inProgressLeads: 0,
        closedLeads: 0,
        refusedLeads: 0
      });
    }
  } catch (error: any) {
    console.error('Error creating salesperson:', error);
    res.status(500).json({ error: `Erro ao cadastrar vendedor: ${error.message}` });
  }
});

// 3. Update salesperson
app.put('/api/salespeople/:id', async (req, res) => {
  const { id } = req.params;
  const { name, email, phone, color, bgColor, distributionPercent } = req.body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'Nome do vendedor(a) é obrigatório.' });
  }

  const nameTrim = name.trim();
  const sellerColor = color || '#0284c7';
  const sellerBgColor = bgColor || '#e0f2fe';
  const sellerEmail = email ? email.trim() : '';
  const sellerPhone = phone ? phone.trim() : '';
  const quotaPercent = distributionPercent !== undefined ? Number(distributionPercent) : undefined;

  try {
    if (usePostgres && pgPool) {
      let query = `UPDATE salespeople SET name = $1, email = $2, phone = $3, color = $4, bg_color = $5`;
      const params: any[] = [nameTrim, sellerEmail, sellerPhone, sellerColor, sellerBgColor];

      if (quotaPercent !== undefined) {
        params.push(quotaPercent);
        query += `, distribution_percent = $${params.length}`;
      }

      params.push(id);
      query += ` WHERE id = $${params.length} RETURNING id, name, email, phone, color, bg_color AS "bgColor", is_default AS "isDefault", distribution_percent AS "distributionPercent", created_at AS "createdAt"`;

      const result = await pgPool.query(query, params);
      if (result.rowCount === 0) {
        return res.status(404).json({ error: 'Vendedor não encontrado.' });
      }

      // Update salesperson_name in leads table
      await pgPool.query(`UPDATE leads SET salesperson_name = $1 WHERE salesperson_id = $2`, [nameTrim, id]);

      return res.json(result.rows[0]);
    } else {
      const seller = memorySalespeopleMap.get(id);
      if (!seller) {
        return res.status(404).json({ error: 'Vendedor não encontrado.' });
      }
      seller.name = nameTrim;
      seller.email = sellerEmail;
      seller.phone = sellerPhone;
      seller.color = sellerColor;
      seller.bgColor = sellerBgColor;
      if (quotaPercent !== undefined) {
        seller.distributionPercent = quotaPercent;
      }
      memorySalespeopleMap.set(id, seller);

      // Update leads in memory
      for (const lead of memoryLeadsMap.values()) {
        if (lead.salespersonId === id) {
          lead.salespersonName = nameTrim;
        }
      }

      return res.json(seller);
    }
  } catch (error: any) {
    console.error('Error updating salesperson:', error);
    res.status(500).json({ error: 'Erro ao atualizar vendedor.' });
  }
});

// 3.1 Batch update distribution quotas (% por vendedor)
app.put('/api/salespeople/quotas/batch', async (req, res) => {
  const { quotas } = req.body; // { [sellerId: string]: number }

  if (!quotas || typeof quotas !== 'object') {
    return res.status(400).json({ error: 'Quotas de distribuição inválidas.' });
  }

  try {
    if (usePostgres && pgPool) {
      for (const [sellerId, percent] of Object.entries(quotas)) {
        await pgPool.query(`UPDATE salespeople SET distribution_percent = $1 WHERE id = $2`, [Number(percent) || 0, sellerId]);
      }
      return res.json({ success: true, message: 'Porcentagens de distribuição salvas com sucesso.' });
    } else {
      for (const [sellerId, percent] of Object.entries(quotas)) {
        const seller = memorySalespeopleMap.get(sellerId);
        if (seller) {
          seller.distributionPercent = Number(percent) || 0;
          memorySalespeopleMap.set(sellerId, seller);
        }
      }
      return res.json({ success: true, message: 'Porcentagens de distribuição salvas com sucesso.' });
    }
  } catch (err: any) {
    console.error('Error updating quotas:', err);
    res.status(500).json({ error: 'Erro ao atualizar porcentagens de distribuição.' });
  }
});

// 3.2 AUTH LOGIN ENDPOINT (Vendedora por WhatsApp/Telefone ou Gestor Master)
app.post('/api/auth/login', async (req, res) => {
  const { phone, role, password } = req.body;

  try {
    // 1. Admin Master login
    if (role === 'admin') {
      if (password !== 'thomas3249') {
        return res.status(401).json({ error: 'Senha incorreta para o Acesso Gestor Master.' });
      }
      return res.json({
        success: true,
        user: {
          role: 'admin',
          salespersonName: 'Thomas (Gestor Master)'
        }
      });
    }

    // 2. Salesperson Login by Phone
    if (!phone || typeof phone !== 'string' || !phone.trim()) {
      return res.status(400).json({ error: 'Informe o número de telefone/WhatsApp cadastrado.' });
    }

    const cleanPhoneDigits = phone.replace(/\D/g, '');
    if (cleanPhoneDigits.length < 8) {
      return res.status(400).json({ error: 'Informe um número de telefone válido com DDD (ex: 31 99150-3721).' });
    }

    let allSellers: Salesperson[] = [];

    if (usePostgres && pgPool) {
      const spRes = await pgPool.query(`SELECT id, name, email, phone, color, bg_color AS "bgColor", is_default AS "isDefault", distribution_percent AS "distributionPercent" FROM salespeople`);
      allSellers = spRes.rows;
    } else {
      allSellers = Array.from(memorySalespeopleMap.values());
    }

    // Match salesperson by digits
    const matched = allSellers.find((s) => {
      if (!s.phone) return false;
      const sDigits = s.phone.replace(/\D/g, '');
      return sDigits.endsWith(cleanPhoneDigits) || cleanPhoneDigits.endsWith(sDigits);
    });

    if (!matched) {
      return res.status(404).json({
        error: `Nenhuma vendedora encontrada com o telefone "${phone}". Verifique com o gestor se seu número está cadastrado na equipe.`,
        registeredCount: allSellers.length
      });
    }

    return res.json({
      success: true,
      user: {
        role: 'salesperson',
        salespersonId: matched.id,
        salespersonName: matched.name,
        salespersonPhone: matched.phone,
        salesperson: matched
      }
    });
  } catch (error: any) {
    console.error('Error logging in:', error);
    res.status(500).json({ error: 'Erro ao autenticar usuário.' });
  }
});

// 4. Delete salesperson (Reassigns their leads back to Thomas / primary)
app.delete('/api/salespeople/:id', async (req, res) => {
  const { id } = req.params;

  if (id === 'seller-thomas') {
    return res.status(400).json({ error: 'Não é permitido excluir o vendedor principal (Thomas).' });
  }

  try {
    if (usePostgres && pgPool) {
      // Reassign leads to Thomas
      await pgPool.query(
        `UPDATE leads SET salesperson_id = 'seller-thomas', salesperson_name = 'Thomas' WHERE salesperson_id = $1`,
        [id]
      );
      // Delete salesperson
      await pgPool.query(`DELETE FROM salespeople WHERE id = $1`, [id]);
      return res.json({ success: true, message: 'Vendedor excluído e seus leads foram transferidos para Thomas.' });
    } else {
      for (const lead of memoryLeadsMap.values()) {
        if (lead.salespersonId === id) {
          lead.salespersonId = 'seller-thomas';
          lead.salespersonName = 'Thomas';
        }
      }
      memorySalespeopleMap.delete(id);
      return res.json({ success: true, message: 'Vendedor excluído e seus leads foram transferidos para Thomas.' });
    }
  } catch (error) {
    console.error('Error deleting salesperson:', error);
    res.status(500).json({ error: 'Erro ao excluir vendedor.' });
  }
});

// 5. Assign a single lead to a salesperson
app.put('/api/leads/:id/assign', async (req, res) => {
  const { id } = req.params;
  const { salespersonId, salespersonName } = req.body;

  if (!salespersonId) {
    return res.status(400).json({ error: 'ID do vendedor é obrigatório.' });
  }

  try {
    let resolvedName = salespersonName;
    if (!resolvedName) {
      if (usePostgres && pgPool) {
        const spRes = await pgPool.query('SELECT name FROM salespeople WHERE id = $1', [salespersonId]);
        if (spRes.rows.length > 0) resolvedName = spRes.rows[0].name;
      } else {
        const sp = memorySalespeopleMap.get(salespersonId);
        if (sp) resolvedName = sp.name;
      }
    }
    resolvedName = resolvedName || 'Thomas';

    if (usePostgres && pgPool) {
      const result = await pgPool.query(
        `UPDATE leads SET salesperson_id = $1, salesperson_name = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *`,
        [salespersonId, resolvedName, id]
      );
      if (result.rowCount === 0) {
        return res.status(404).json({ error: 'Lead não encontrado.' });
      }
      return res.json({ success: true, lead: result.rows[0] });
    } else {
      const lead = memoryLeadsMap.get(id);
      if (!lead) {
        return res.status(404).json({ error: 'Lead não encontrado.' });
      }
      lead.salespersonId = salespersonId;
      lead.salespersonName = resolvedName;
      lead.updatedAt = new Date().toISOString();
      memoryLeadsMap.set(id, lead);
      return res.json({ success: true, lead });
    }
  } catch (error) {
    console.error('Error assigning lead:', error);
    res.status(500).json({ error: 'Erro ao atribuir lead ao vendedor.' });
  }
});

// 6. DISTRIBUTE UNCONTACTED LEADS (DIVISÃO DE LEADS)
// RULE: ONLY leads in column 'Leads' with 0 calls are eligible. Leads in progress are NEVER moved.
app.post('/api/leads/distribute', async (req, res) => {
  const { targetSalespersonId, mode = 'percentage', value, sourceSalespersonId } = req.body;

  if (!targetSalespersonId) {
    return res.status(400).json({ error: 'Vendedor(a) de destino é obrigatório.' });
  }

  const numValue = Number(value);
  if (isNaN(numValue) || numValue <= 0) {
    return res.status(400).json({ error: 'Informe um valor numérico válido (porcentagem ou quantidade).' });
  }

  try {
    let targetSalesperson: Salesperson | undefined;

    if (usePostgres && pgPool) {
      const spRes = await pgPool.query(`SELECT id, name, color, bg_color AS "bgColor" FROM salespeople WHERE id = $1`, [targetSalespersonId]);
      if (spRes.rows.length > 0) {
        targetSalesperson = spRes.rows[0];
      }
    } else {
      targetSalesperson = memorySalespeopleMap.get(targetSalespersonId);
    }

    if (!targetSalesperson) {
      return res.status(404).json({ error: 'Vendedor(a) de destino não encontrado(a).' });
    }

    let eligibleLeadIds: string[] = [];

    if (usePostgres && pgPool) {
      let query = `
        SELECT l.id
        FROM leads l
        LEFT JOIN calls c ON l.id = c.lead_id
        WHERE l.column_status = 'Leads'
      `;
      const params: any[] = [];

      if (sourceSalespersonId && sourceSalespersonId !== 'ALL') {
        params.push(sourceSalespersonId);
        query += ` AND l.salesperson_id = $${params.length}`;
      }

      query += `
        GROUP BY l.id, l.created_at
        HAVING COUNT(c.id) = 0
        ORDER BY l.created_at DESC
      `;

      const eligibleRes = await pgPool.query(query, params);
      eligibleLeadIds = eligibleRes.rows.map(r => r.id);
    } else {
      const allLeads = Array.from(memoryLeadsMap.values());
      eligibleLeadIds = allLeads
        .filter(lead => {
          if (lead.columnStatus !== 'Leads') return false;
          const calls = memoryCallLogsMap.get(lead.id) || [];
          if (calls.length > 0) return false;
          if (sourceSalespersonId && sourceSalespersonId !== 'ALL') {
            return (lead.salespersonId || 'seller-thomas') === sourceSalespersonId;
          }
          return true;
        })
        .map(l => l.id);
    }

    if (eligibleLeadIds.length === 0) {
      return res.status(400).json({
        error: 'Nenhum lead novo não abordado (coluna "Leads" com 0 ligações) está disponível para distribuição.'
      });
    }

    // Calculate count to transfer
    let countToTransfer = 0;
    if (mode === 'percentage') {
      const pct = Math.min(100, Math.max(1, numValue));
      countToTransfer = Math.round((eligibleLeadIds.length * pct) / 100);
      if (countToTransfer < 1 && eligibleLeadIds.length > 0) countToTransfer = 1;
    } else {
      countToTransfer = Math.min(eligibleLeadIds.length, Math.max(1, Math.floor(numValue)));
    }

    const idsToTransfer = eligibleLeadIds.slice(0, countToTransfer);

    if (usePostgres && pgPool) {
      await pgPool.query(
        `UPDATE leads 
         SET salesperson_id = $1, salesperson_name = $2, updated_at = CURRENT_TIMESTAMP
         WHERE id = ANY($3::text[])`,
        [targetSalesperson.id, targetSalesperson.name, idsToTransfer]
      );
    } else {
      for (const id of idsToTransfer) {
        const lead = memoryLeadsMap.get(id);
        if (lead) {
          lead.salespersonId = targetSalesperson.id;
          lead.salespersonName = targetSalesperson.name;
          lead.updatedAt = new Date().toISOString();
          memoryLeadsMap.set(id, lead);
        }
      }
    }

    return res.json({
      success: true,
      transferredCount: idsToTransfer.length,
      targetSalespersonName: targetSalesperson.name,
      totalEligibleBefore: eligibleLeadIds.length,
      remainingEligible: eligibleLeadIds.length - idsToTransfer.length
    });
  } catch (error: any) {
    console.error('Error distributing leads:', error);
    res.status(500).json({ error: `Erro ao distribuir leads: ${error.message}` });
  }
});

// 6.1 AUTOMATIC QUOTA-BASED LEAD DISTRIBUTION
// Distributes selected scope of leads across salespeople according to their configured % quotas
app.post('/api/leads/distribute-by-quotas', async (req, res) => {
  const { targetScope = 'new_only', sourceSalespersonId } = req.body || {};
  try {
    let allSellers: Salesperson[] = [];
    if (usePostgres && pgPool) {
      const spRes = await pgPool.query(`SELECT id, name, distribution_percent AS "distributionPercent" FROM salespeople ORDER BY is_default DESC, created_at ASC`);
      allSellers = spRes.rows;
    } else {
      allSellers = Array.from(memorySalespeopleMap.values());
    }

    if (allSellers.length === 0) {
      return res.status(400).json({ error: 'Nenhum vendedor cadastrado na equipe.' });
    }

    // Get eligible leads based on targetScope
    // 'new_only': Column 'Leads' and 0 calls
    // 'all_unattempted': Any column with 0 calls
    // 'all': Entire base of leads (re-split existing and new)
    // 'unconverted': Leads that are NOT in 'fechamento' (e.g. tentativa 1, 2, 3, sem_interesse, etc.)
    let eligibleLeads: { id: string }[] = [];
    
    if (usePostgres && pgPool) {
      let query = '';
      const params: any[] = [];

      if (targetScope === 'new_only') {
        query = `
          SELECT l.id
          FROM leads l
          LEFT JOIN calls c ON l.id = c.lead_id
          WHERE l.column_status = 'Leads'
        `;
        if (sourceSalespersonId && sourceSalespersonId !== 'ALL') {
          params.push(sourceSalespersonId);
          query += ` AND l.salesperson_id = $${params.length}`;
        }
        query += `
          GROUP BY l.id, l.created_at
          HAVING COUNT(c.id) = 0
          ORDER BY l.created_at DESC
        `;
      } else if (targetScope === 'all_unattempted') {
        query = `
          SELECT l.id
          FROM leads l
          LEFT JOIN calls c ON l.id = c.lead_id
        `;
        if (sourceSalespersonId && sourceSalespersonId !== 'ALL') {
          params.push(sourceSalespersonId);
          query += ` WHERE l.salesperson_id = $${params.length}`;
        }
        query += `
          GROUP BY l.id, l.created_at
          HAVING COUNT(c.id) = 0
          ORDER BY l.created_at DESC
        `;
      } else if (targetScope === 'unconverted') {
        query = `
          SELECT l.id
          FROM leads l
          WHERE l.column_status != 'fechamento'
        `;
        if (sourceSalespersonId && sourceSalespersonId !== 'ALL') {
          params.push(sourceSalespersonId);
          query += ` AND l.salesperson_id = $${params.length}`;
        }
        query += ` ORDER BY l.created_at DESC`;
      } else {
        // 'all' - Entire base
        query = `SELECT l.id FROM leads l`;
        if (sourceSalespersonId && sourceSalespersonId !== 'ALL') {
          params.push(sourceSalespersonId);
          query += ` WHERE l.salesperson_id = $${params.length}`;
        }
        query += ` ORDER BY l.created_at DESC`;
      }

      const elRes = await pgPool.query(query, params);
      eligibleLeads = elRes.rows;
    } else {
      const allLeads = Array.from(memoryLeadsMap.values());
      eligibleLeads = allLeads
        .filter(l => {
          if (sourceSalespersonId && sourceSalespersonId !== 'ALL') {
            if ((l.salespersonId || 'seller-thomas') !== sourceSalespersonId) return false;
          }
          const calls = memoryCallLogsMap.get(l.id) || [];
          if (targetScope === 'new_only') {
            return l.columnStatus === 'Leads' && calls.length === 0;
          } else if (targetScope === 'all_unattempted') {
            return calls.length === 0;
          } else if (targetScope === 'unconverted') {
            return l.columnStatus !== 'fechamento';
          }
          return true; // 'all'
        })
        .map(l => ({ id: l.id }));
    }

    if (eligibleLeads.length === 0) {
      const scopeLabel = targetScope === 'new_only' 
        ? 'leads novos não abordados (coluna "Leads" com 0 ligações)'
        : targetScope === 'all_unattempted'
          ? 'leads sem ligação registrada'
          : 'leads no filtro selecionado';
      return res.status(400).json({ error: `Não há ${scopeLabel} para distribuir.` });
    }

    // Calculate distribution quota proportions
    const totalPercentage = allSellers.reduce((sum, s) => sum + (Number(s.distributionPercent) || 0), 0);
    const totalLeadsCount = eligibleLeads.length;

    // Determine target count for each seller
    const allocations: { seller: Salesperson; targetCount: number; leadIds: string[] }[] = [];
    let allocatedSoFar = 0;

    for (let i = 0; i < allSellers.length; i++) {
      const seller = allSellers[i];
      const quotaPct = totalPercentage > 0 
        ? ((Number(seller.distributionPercent) || 0) / totalPercentage) 
        : (1 / allSellers.length);

      let targetCount = 0;
      if (i === allSellers.length - 1) {
        // Last seller gets the remainder
        targetCount = Math.max(0, totalLeadsCount - allocatedSoFar);
      } else {
        targetCount = Math.round(totalLeadsCount * quotaPct);
        allocatedSoFar += targetCount;
      }

      allocations.push({
        seller,
        targetCount,
        leadIds: []
      });
    }

    // Distribute lead IDs
    let cursor = 0;
    for (const alloc of allocations) {
      const slice = eligibleLeads.slice(cursor, cursor + alloc.targetCount);
      alloc.leadIds = slice.map(l => l.id);
      cursor += alloc.targetCount;
    }

    // Apply updates
    const summary: Record<string, { count: number; percent: number }> = {};

    if (usePostgres && pgPool) {
      for (const alloc of allocations) {
        if (alloc.leadIds.length > 0) {
          await pgPool.query(
            `UPDATE leads 
             SET salesperson_id = $1, salesperson_name = $2, updated_at = CURRENT_TIMESTAMP
             WHERE id = ANY($3::text[])`,
            [alloc.seller.id, alloc.seller.name, alloc.leadIds]
          );
        }
        summary[alloc.seller.name] = {
          count: alloc.leadIds.length,
          percent: Number(alloc.seller.distributionPercent) || 0
        };
      }
    } else {
      for (const alloc of allocations) {
        for (const id of alloc.leadIds) {
          const lead = memoryLeadsMap.get(id);
          if (lead) {
            lead.salespersonId = alloc.seller.id;
            lead.salespersonName = alloc.seller.name;
            lead.updatedAt = new Date().toISOString();
            memoryLeadsMap.set(id, lead);
          }
        }
        summary[alloc.seller.name] = {
          count: alloc.leadIds.length,
          percent: Number(alloc.seller.distributionPercent) || 0
        };
      }
    }

    return res.json({
      success: true,
      totalDistributed: totalLeadsCount,
      summary,
      message: `${totalLeadsCount} leads foram redistribuídos conforme as porcentagens configuradas da equipe!`
    });
  } catch (error: any) {
    console.error('Error distributing leads by quotas:', error);
    res.status(500).json({ error: `Erro ao distribuir leads por porcentagem: ${error.message}` });
  }
});

// 6.2 EXPORT UNCONTACTED LEADS NAMES ONLY AS JSON
app.get('/api/export/uncontacted-names', async (req, res) => {
  try {
    let uncontactedNames: { nome: string }[] = [];

    if (usePostgres && pgPool) {
      const qRes = await pgPool.query(`
        SELECT l.name as nome
        FROM leads l
        LEFT JOIN calls c ON l.id = c.lead_id
        GROUP BY l.id, l.name, l.created_at
        HAVING COUNT(c.id) = 0
        ORDER BY l.created_at DESC
      `);
      uncontactedNames = qRes.rows.map(r => ({ nome: r.nome || 'Sem Nome' }));
    } else {
      const allLeads = Array.from(memoryLeadsMap.values());
      uncontactedNames = allLeads
        .filter(l => {
          const calls = memoryCallLogsMap.get(l.id) || [];
          return calls.length === 0;
        })
        .map(l => ({ nome: l.name || 'Sem Nome' }));
    }

    const download = req.query.download === 'true';
    if (download) {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="leads_nao_abordados_nomes.json"');
    }

    return res.json(uncontactedNames);
  } catch (error: any) {
    console.error('Error exporting uncontacted names:', error);
    res.status(500).json({ error: `Erro ao exportar nomes dos leads não abordados: ${error.message}` });
  }
});

// Helper function to process lead items (shared between zip upload and batch JSON API)
async function processLeadItems(items: any[]) {
  let totalProcessed = 0;
  let insertedCount = 0;
  let skippedDuplicates = 0;

  for (const data of items) {
    if (!data || typeof data !== 'object') continue;

    totalProcessed++;

    const leadId = String(
      data.id ||
      data.placeId ||
      data.place_id ||
      data.username ||
      data.pin ||
      data.targetId ||
      data._id ||
      `lead_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
    ).trim();

    const name = String(
      data.name ||
      data.title ||
      data.companyName ||
      data.company_name ||
      data.businessName ||
      data.username ||
      'Lead sem nome'
    ).trim();

    const phoneNumber = String(
      data.phoneNumber ||
      data.phone_number ||
      data.phone ||
      data.telephone ||
      data.tel ||
      data.contactPhone ||
      data.whatsapp ||
      '(Sem telefone)'
    ).trim();

    let publicUrl = '';
    if (data.dithoSitesMetadata && typeof data.dithoSitesMetadata === 'object') {
      publicUrl = String(data.dithoSitesMetadata.publicUrl || data.dithoSitesMetadata.url || '').trim();
    }
    if (!publicUrl) {
      publicUrl = String(data.publicUrl || data.public_url || data.website || data.url || data.siteUrl || data.site || '').trim();
    }

    const salespersonId = String(data.salespersonId || data.salesperson_id || 'seller-thomas').trim();
    const salespersonName = String(data.salespersonName || data.salesperson_name || 'Thomas').trim();

    if (usePostgres && pgPool) {
      const checkRes = await pgPool.query('SELECT id FROM leads WHERE id = $1', [leadId]);
      const isExisting = checkRes.rows.length > 0;

      await pgPool.query(
        `INSERT INTO leads (id, name, phone_number, public_url, column_status, salesperson_id, salesperson_name)
         VALUES ($1, $2, $3, $4, 'Leads', $5, $6)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           phone_number = EXCLUDED.phone_number,
           public_url = EXCLUDED.public_url,
           updated_at = CURRENT_TIMESTAMP`,
        [leadId, name, phoneNumber, publicUrl, salespersonId, salespersonName]
      );

      if (isExisting) {
        skippedDuplicates++;
      } else {
        insertedCount++;
      }
    } else {
      if (memoryLeadsMap.has(leadId)) {
        const existing = memoryLeadsMap.get(leadId)!;
        existing.name = name;
        existing.phoneNumber = phoneNumber;
        if (publicUrl) existing.publicUrl = publicUrl;
        existing.updatedAt = new Date().toISOString();
        skippedDuplicates++;
      } else {
        const newLead: Lead = {
          id: leadId,
          name,
          phoneNumber,
          publicUrl,
          columnStatus: 'Leads',
          salespersonId,
          salespersonName,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          callCount: 0
        };
        memoryLeadsMap.set(leadId, newLead);
        insertedCount++;
      }
    }
  }

  return { totalProcessed, insertedCount, skippedDuplicates };
}

// 2. Upload ZIP recursively and parse JSONs
app.post('/api/upload-zip', upload.single('zipFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo .ZIP enviado.' });
    }

    const zip = new JSZip();
    const contents = await zip.loadAsync(req.file.buffer);

    let totalProcessed = 0;
    let insertedCount = 0;
    let skippedDuplicates = 0;
    const errors: string[] = [];

    const jsonEntries: { relativePath: string; content: string }[] = [];

    // Recursively iterate over all files in ZIP subfolders
    for (const [relativePath, fileObj] of Object.entries(contents.files)) {
      const normPath = relativePath.replace(/\\/g, '/');
      const fileName = normPath.split('/').pop() || '';

      if (
        !fileObj.dir &&
        !normPath.includes('__MACOSX') &&
        !fileName.startsWith('.') &&
        !fileName.startsWith('._')
      ) {
        try {
          const rawContent = await fileObj.async('string');
          const cleanContent = rawContent.replace(/^\uFEFF/, '').trim();
          
          const isJsonExt = normPath.toLowerCase().endsWith('.json');
          const isJsonContent = cleanContent.startsWith('{') || cleanContent.startsWith('[');

          if (cleanContent && (isJsonExt || isJsonContent)) {
            jsonEntries.push({ relativePath: normPath, content: cleanContent });
          }
        } catch (e: any) {
          errors.push(`Erro ao ler ${normPath}: ${e.message}`);
        }
      }
    }

    const allItems: any[] = [];
    for (const entry of jsonEntries) {
      try {
        let parsed: any;
        try {
          parsed = JSON.parse(entry.content);
        } catch (err1) {
          try {
            const stripped = entry.content
              .replace(/\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*/g, '$1')
              .replace(/,\s*([}\]])/g, '$1');
            parsed = JSON.parse(stripped);
          } catch (err2: any) {
            errors.push(`Erro ao processar JSON em ${entry.relativePath}: ${err2.message}`);
            continue;
          }
        }

        if (Array.isArray(parsed)) {
          allItems.push(...parsed);
        } else if (parsed && typeof parsed === 'object') {
          if (Array.isArray(parsed.leads)) allItems.push(...parsed.leads);
          else if (Array.isArray(parsed.data)) allItems.push(...parsed.data);
          else if (Array.isArray(parsed.clients)) allItems.push(...parsed.clients);
          else if (Array.isArray(parsed.items)) allItems.push(...parsed.items);
          else if (Array.isArray(parsed.results)) allItems.push(...parsed.results);
          else allItems.push(parsed);
        }
      } catch (err: any) {
        errors.push(`Erro ao ler ${entry.relativePath}: ${err.message}`);
      }
    }

    const stats = await processLeadItems(allItems);

    return res.json({
      totalProcessed: stats.totalProcessed,
      insertedCount: stats.insertedCount,
      skippedDuplicates: stats.skippedDuplicates,
      errors
    });
  } catch (error: any) {
    console.error('Error handling zip upload:', error);
    res.status(500).json({ error: `Erro no servidor ao processar o arquivo ZIP: ${error.message}` });
  }
});

// Helper to map flexible status names to official ColumnStatus
function mapToColumnStatus(rawStatus: any, defaultFallback: ColumnStatus = 'Recusado'): ColumnStatus {
  if (!rawStatus || typeof rawStatus !== 'string') return defaultFallback;
  const clean = rawStatus.toLowerCase().trim();

  if (
    clean.includes('nao fechado') ||
    clean.includes('não fechado') ||
    clean.includes('nao_fechado') ||
    clean.includes('recusad') ||
    clean.includes('desist') ||
    clean.includes('perdido') ||
    clean.includes('fora')
  ) {
    return 'Recusado';
  }
  if (
    clean.includes('fechad') ||
    clean.includes('ganho') ||
    clean.includes('venda') ||
    clean.includes('cliente')
  ) {
    return 'Fechado';
  }
  if (
    clean.includes('interessad') ||
    clean.includes('proposta') ||
    clean.includes('quente') ||
    clean.includes('oportunidade')
  ) {
    return 'Interessado';
  }
  if (
    clean.includes('abordad') ||
    clean.includes('contatad') ||
    clean.includes('conversad') ||
    clean.includes('ligacao 1') ||
    clean.includes('ligação 1') ||
    clean === '1'
  ) {
    return 'Ligação 1';
  }
  if (clean.includes('ligacao 2') || clean.includes('ligação 2') || clean === '2') {
    return 'Ligação 2';
  }
  if (clean.includes('ligacao 3') || clean.includes('ligação 3') || clean === '3') {
    return 'Ligação 3';
  }
  if (clean.includes('ligacao 4') || clean.includes('ligação 4') || clean === '4') {
    return 'Ligação 4';
  }
  if (clean.includes('lead') || clean.includes('novo') || clean.includes('triagem')) {
    return 'Leads';
  }

  // Check exact column match
  const exact = PIPELINE_COLUMNS.find((col) => col.toLowerCase() === clean);
  if (exact) return exact;

  return defaultFallback;
}

// Helper to strip non-digits for phone matching
function getOnlyDigits(str: string): string {
  return str.replace(/\D/g, '');
}

// Flexible Batch Lead Status Update Endpoint via JSON
app.post('/api/leads/batch-update', async (req, res) => {
  try {
    const { jsonPayload, defaultStatus = 'Recusado', addCallLog = true } = req.body;

    if (!jsonPayload) {
      return res.status(400).json({ error: 'Payload JSON é obrigatório.' });
    }

    let parsed: any = jsonPayload;
    if (typeof jsonPayload === 'string') {
      try {
        parsed = JSON.parse(jsonPayload);
      } catch (e: any) {
        // Try stripping comments or trailing commas
        try {
          const cleanStr = jsonPayload
            .replace(/\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*/g, '$1')
            .replace(/,\s*([}\]])/g, '$1');
          parsed = JSON.parse(cleanStr);
        } catch (e2: any) {
          return res.status(400).json({ error: `JSON inválido: ${e.message}` });
        }
      }
    }

    const fallbackCol = mapToColumnStatus(defaultStatus, 'Recusado');
    const updateTasks: {
      identifier: string;
      targetStatus: ColumnStatus;
      comment?: string;
      tag?: string;
    }[] = [];

    // Parse various JSON schemas into standardized updateTasks array
    if (Array.isArray(parsed)) {
      for (const item of parsed) {
        if (typeof item === 'string') {
          updateTasks.push({
            identifier: item.trim(),
            targetStatus: fallbackCol
          });
        } else if (item && typeof item === 'object') {
          const identifier = String(
            item.nome ||
            item.name ||
            item.lead ||
            item.telefone ||
            item.phone ||
            item.phoneNumber ||
            item.id ||
            ''
          ).trim();

          if (identifier) {
            const rawStat = item.status || item.estagio || item.coluna || item.state || item.situacao || item.situacaoWhatsApp;
            const targetStatus = mapToColumnStatus(rawStat, fallbackCol);
            const comment = String(item.observacao || item.comment || item.comentario || item.nota || '').trim();
            const tag = String(item.tag || item.etiqueta || 'WhatsApp abordado').trim();
            updateTasks.push({ identifier, targetStatus, comment, tag });
          }
        }
      }
    } else if (parsed && typeof parsed === 'object') {
      // Check if it's an object with keys mapped to arrays e.g. { "não fechado": ["Lead 1", "Lead 2"], "interessado": ["Lead 3"] }
      // Or object with a "leads" or "items" property
      let targetArray = parsed.leads || parsed.data || parsed.items || parsed.clients;

      if (Array.isArray(targetArray)) {
        for (const item of targetArray) {
          if (typeof item === 'string') {
            updateTasks.push({ identifier: item.trim(), targetStatus: fallbackCol });
          } else if (item && typeof item === 'object') {
            const identifier = String(item.nome || item.name || item.lead || item.telefone || item.phone || item.id || '').trim();
            if (identifier) {
              const targetStatus = mapToColumnStatus(item.status || item.estagio || item.coluna, fallbackCol);
              const comment = String(item.observacao || item.comment || item.comentario || item.nota || '').trim();
              const tag = String(item.tag || item.etiqueta || 'WhatsApp abordado').trim();
              updateTasks.push({ identifier, targetStatus, comment, tag });
            }
          }
        }
      } else {
        // Treat keys of object as status names
        for (const [key, val] of Object.entries(parsed)) {
          const statusForKey = mapToColumnStatus(key, fallbackCol);
          if (Array.isArray(val)) {
            for (const subItem of val) {
              if (typeof subItem === 'string') {
                updateTasks.push({ identifier: subItem.trim(), targetStatus: statusForKey });
              } else if (subItem && typeof subItem === 'object') {
                const identifier = String(subItem.nome || subItem.name || subItem.telefone || subItem.phone || subItem.id || '').trim();
                if (identifier) {
                  const comment = String(subItem.observacao || subItem.comment || subItem.comentario || '').trim();
                  updateTasks.push({ identifier, targetStatus: statusForKey, comment });
                }
              }
            }
          } else if (typeof val === 'string') {
            // Key could be lead name and val status, or key status and val lead name
            // Let's check if key looks like a status
            const keyAsStatus = mapToColumnStatus(key, '' as any);
            if (keyAsStatus) {
              updateTasks.push({ identifier: val.trim(), targetStatus: keyAsStatus });
            } else {
              const valAsStatus = mapToColumnStatus(val, fallbackCol);
              updateTasks.push({ identifier: key.trim(), targetStatus: valAsStatus });
            }
          }
        }
      }
    }

    if (updateTasks.length === 0) {
      return res.status(400).json({ error: 'Nenhum lead ou identificador válido foi encontrado no JSON.' });
    }

    // Load existing leads from DB/memory to perform matching
    let allLeads: Lead[] = [];
    if (usePostgres && pgPool) {
      const dbRes = await pgPool.query(`SELECT id, name, phone_number AS "phoneNumber", column_status AS "columnStatus" FROM leads`);
      allLeads = dbRes.rows;
    } else {
      allLeads = Array.from(memoryLeadsMap.values());
    }

    const updatedLeadsList: { id: string; name: string; oldStatus: string; newStatus: string }[] = [];
    const notFoundIdentifiers: string[] = [];

    for (const task of updateTasks) {
      const cleanIdent = task.identifier.toLowerCase().trim();
      const digitsIdent = getOnlyDigits(task.identifier);

      // Find matching lead
      let matched = allLeads.find((l) => l.id.toLowerCase() === cleanIdent);

      if (!matched && digitsIdent.length >= 8) {
        matched = allLeads.find((l) => getOnlyDigits(l.phoneNumber).includes(digitsIdent) || digitsIdent.includes(getOnlyDigits(l.phoneNumber)));
      }

      if (!matched) {
        matched = allLeads.find((l) => l.name.toLowerCase().trim() === cleanIdent);
      }

      if (!matched && cleanIdent.length >= 3) {
        matched = allLeads.find((l) => {
          const lName = l.name.toLowerCase().trim();
          return lName.includes(cleanIdent) || cleanIdent.includes(lName);
        });
      }

      if (matched) {
        const oldStatus = matched.columnStatus;
        const newStatus = task.targetStatus;

        // Perform DB update
        if (usePostgres && pgPool) {
          await pgPool.query(`UPDATE leads SET column_status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`, [newStatus, matched.id]);

          if (addCallLog) {
            const callId = `call-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
            const commentText = task.comment || `Atualizado em lote para "${newStatus}" via JSON.`;
            const tagText = task.tag || 'Atualização via JSON';
            await pgPool.query(
              `INSERT INTO calls (id, lead_id, tag, comment, duration_seconds, created_at)
               VALUES ($1, $2, $3, $4, 0, CURRENT_TIMESTAMP)`,
              [callId, matched.id, tagText, commentText]
            );
          }
        } else {
          const memLead = memoryLeadsMap.get(matched.id);
          if (memLead) {
            memLead.columnStatus = newStatus;
            memLead.updatedAt = new Date().toISOString();
            memoryLeadsMap.set(matched.id, memLead);

            if (addCallLog) {
              const callId = `call-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
              const existingCalls = memoryCallLogsMap.get(matched.id) || [];
              const newCall: CallLog = {
                id: callId,
                leadId: matched.id,
                tag: task.tag || 'Atualização via JSON',
                comment: task.comment || `Atualizado em lote para "${newStatus}" via JSON.`,
                durationSeconds: 0,
                createdAt: new Date().toISOString()
              };
              existingCalls.push(newCall);
              memoryCallLogsMap.set(matched.id, existingCalls);
              memLead.callCount = existingCalls.length;
              memLead.lastCallAt = newCall.createdAt;
              memLead.lastCallTag = newCall.tag;
            }
          }
        }

        updatedLeadsList.push({
          id: matched.id,
          name: matched.name,
          oldStatus,
          newStatus
        });
      } else {
        notFoundIdentifiers.push(task.identifier);
      }
    }

    return res.json({
      totalProcessed: updateTasks.length,
      updatedCount: updatedLeadsList.length,
      notFoundCount: notFoundIdentifiers.length,
      updatedLeads: updatedLeadsList,
      notFoundIdentifiers
    });
  } catch (error: any) {
    console.error('Error in batch update:', error);
    res.status(500).json({ error: `Erro ao processar atualização via JSON: ${error.message}` });
  }
});

// Batch API to import parsed leads array directly (avoiding payload size limits on huge ZIP uploads)
app.post('/api/leads/batch', async (req, res) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items)) {
      return res.status(400).json({ error: 'Formato inválido. Esperado array de items.' });
    }

    const stats = await processLeadItems(items);
    return res.json(stats);
  } catch (error: any) {
    console.error('Error handling batch leads:', error);
    res.status(500).json({ error: `Erro ao salvar lote de leads: ${error.message}` });
  }
});

// 3. Update lead column status
app.put('/api/leads/:id/status', async (req, res) => {
  const { id } = req.params;
  const { columnStatus } = req.body;

  if (!PIPELINE_COLUMNS.includes(columnStatus as ColumnStatus)) {
    return res.status(400).json({ error: 'Status de coluna inválido.' });
  }

  try {
    if (usePostgres && pgPool) {
      const result = await pgPool.query(
        `UPDATE leads SET column_status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`,
        [columnStatus, id]
      );
      if (result.rowCount === 0) {
        return res.status(404).json({ error: 'Lead não encontrado.' });
      }
      return res.json({ success: true, lead: result.rows[0] });
    } else {
      const lead = memoryLeadsMap.get(id);
      if (!lead) {
        return res.status(404).json({ error: 'Lead não encontrado.' });
      }
      lead.columnStatus = columnStatus as ColumnStatus;
      lead.updatedAt = new Date().toISOString();
      memoryLeadsMap.set(id, lead);
      return res.json({ success: true, lead });
    }
  } catch (error) {
    console.error('Error updating lead status:', error);
    res.status(500).json({ error: 'Erro ao atualizar coluna do lead.' });
  }
});

// 4. Get calls for a specific lead
app.get('/api/leads/:id/calls', async (req, res) => {
  const { id } = req.params;

  try {
    if (usePostgres && pgPool) {
      const result = await pgPool.query(
        `SELECT id, lead_id AS "leadId", tag, comment, duration_seconds AS "durationSeconds", follow_up_at AS "followUpAt", created_at AS "createdAt"
         FROM calls
         WHERE lead_id = $1
         ORDER BY created_at DESC`,
        [id]
      );
      return res.json(result.rows);
    } else {
      const calls = memoryCallLogsMap.get(id) || [];
      return res.json(calls.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    }
  } catch (error) {
    console.error('Error fetching call logs:', error);
    res.status(500).json({ error: 'Erro ao buscar histórico de ligações.' });
  }
});

// 5. Add call log entry
app.post('/api/leads/:id/calls', async (req, res) => {
  const { id } = req.params;
  const { tag, comment, durationSeconds, followUpAt } = req.body;

  if (!tag) {
    return res.status(400).json({ error: 'A etiqueta da ligação é obrigatória.' });
  }

  const callId = `call-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const createdAt = new Date().toISOString();
  const duration = typeof durationSeconds === 'number' && durationSeconds >= 0 ? Math.floor(durationSeconds) : 0;
  const followUp = followUpAt && typeof followUpAt === 'string' && followUpAt.trim() ? followUpAt : null;

  try {
    if (usePostgres && pgPool) {
      await pgPool.query(
        `INSERT INTO calls (id, lead_id, tag, comment, duration_seconds, follow_up_at, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [callId, id, tag, comment || '', duration, followUp, createdAt]
      );

      // Touch lead updated_at and update next_follow_up_at
      if (followUp) {
        await pgPool.query(`UPDATE leads SET updated_at = CURRENT_TIMESTAMP, next_follow_up_at = $2 WHERE id = $1`, [id, followUp]);
      } else {
        await pgPool.query(`UPDATE leads SET updated_at = CURRENT_TIMESTAMP WHERE id = $1`, [id]);
      }

      return res.json({
        id: callId,
        leadId: id,
        tag,
        comment,
        durationSeconds: duration,
        followUpAt: followUp || undefined,
        createdAt
      });
    } else {
      const lead = memoryLeadsMap.get(id);
      if (!lead) {
        return res.status(404).json({ error: 'Lead não encontrado.' });
      }

      const existingCalls = memoryCallLogsMap.get(id) || [];
      const newCallLog: CallLog = {
        id: callId,
        leadId: id,
        tag,
        comment: comment || '',
        durationSeconds: duration,
        followUpAt: followUp || undefined,
        createdAt
      };

      existingCalls.push(newCallLog);
      memoryCallLogsMap.set(id, existingCalls);

      lead.callCount = existingCalls.length;
      lead.lastCallAt = createdAt;
      lead.lastCallTag = tag;
      if (followUp) {
        lead.nextFollowUpAt = followUp;
      }
      lead.updatedAt = createdAt;
      memoryLeadsMap.set(id, lead);

      return res.json(newCallLog);
    }
  } catch (error) {
    console.error('Error adding call log:', error);
    res.status(500).json({ error: 'Erro ao registrar ligação.' });
  }
});

// 6. Delete a lead
app.delete('/api/leads/:id', async (req, res) => {
  const { id } = req.params;
  try {
    if (usePostgres && pgPool) {
      await pgPool.query(`DELETE FROM leads WHERE id = $1`, [id]);
      return res.json({ success: true });
    } else {
      memoryLeadsMap.delete(id);
      memoryCallLogsMap.delete(id);
      return res.json({ success: true });
    }
  } catch (error) {
    console.error('Error deleting lead:', error);
    res.status(500).json({ error: 'Erro ao excluir lead.' });
  }
});

// Endpoint to fetch call logs (for Metrics & Reports, optionally filtered by salesperson)
app.get('/api/calls', async (req, res) => {
  const { salespersonId } = req.query;

  try {
    if (usePostgres && pgPool) {
      let query = `
        SELECT c.id, c.lead_id AS "leadId", l.name AS "leadName", l.phone_number AS "phoneNumber",
               l.column_status AS "columnStatus", COALESCE(l.salesperson_id, 'seller-thomas') AS "salespersonId",
               COALESCE(l.salesperson_name, 'Thomas') AS "salespersonName",
               c.tag, c.comment, c.duration_seconds AS "durationSeconds",
               c.follow_up_at AS "followUpAt", c.created_at AS "createdAt"
        FROM calls c
        JOIN leads l ON c.lead_id = l.id
      `;
      const params: any[] = [];
      if (salespersonId && salespersonId !== 'ALL') {
        params.push(salespersonId);
        query += ` WHERE l.salesperson_id = $1`;
      }
      query += ` ORDER BY c.created_at DESC`;

      const result = await pgPool.query(query, params);
      return res.json(result.rows);
    } else {
      const allCalls: any[] = [];
      memoryCallLogsMap.forEach((calls, leadId) => {
        const lead = memoryLeadsMap.get(leadId);
        const sellerId = lead?.salespersonId || 'seller-thomas';
        const sellerName = lead?.salespersonName || 'Thomas';

        if (!salespersonId || salespersonId === 'ALL' || sellerId === salespersonId) {
          calls.forEach((c) => {
            allCalls.push({
              ...c,
              leadName: lead?.name || 'Lead Excluído',
              phoneNumber: lead?.phoneNumber || '',
              columnStatus: lead?.columnStatus || 'Leads',
              salespersonId: sellerId,
              salespersonName: sellerName
            });
          });
        }
      });
      allCalls.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return res.json(allCalls);
    }
  } catch (error) {
    console.error('Error fetching all calls:', error);
    res.status(500).json({ error: 'Erro ao buscar chamadas.' });
  }
});

// CSV Export Endpoint
app.get('/api/export/csv', async (req, res) => {
  try {
    let rows: any[] = [];
    if (usePostgres && pgPool) {
      const query = `
        SELECT 
          l.id AS "lead_id",
          l.name AS "lead_name",
          l.phone_number AS "phone_number",
          l.public_url AS "public_url",
          l.column_status AS "column_status",
          COALESCE(l.salesperson_name, 'Thomas') AS "salesperson_name",
          l.next_follow_up_at AS "next_follow_up_at",
          l.created_at AS "lead_created_at",
          c.id AS "call_id",
          c.tag AS "call_tag",
          c.comment AS "call_comment",
          c.duration_seconds AS "duration_seconds",
          c.follow_up_at AS "call_follow_up_at",
          c.created_at AS "call_created_at"
        FROM leads l
        LEFT JOIN calls c ON l.id = c.lead_id
        ORDER BY l.created_at DESC, c.created_at DESC
      `;
      const result = await pgPool.query(query);
      rows = result.rows;
    } else {
      memoryLeadsMap.forEach((lead) => {
        const calls = memoryCallLogsMap.get(lead.id) || [];
        if (calls.length === 0) {
          rows.push({
            lead_id: lead.id,
            lead_name: lead.name,
            phone_number: lead.phoneNumber,
            public_url: lead.publicUrl || '',
            column_status: lead.columnStatus,
            salesperson_name: lead.salespersonName || 'Thomas',
            next_follow_up_at: lead.nextFollowUpAt || '',
            lead_created_at: lead.createdAt,
            call_id: '',
            call_tag: '',
            call_comment: '',
            duration_seconds: 0,
            call_follow_up_at: '',
            call_created_at: ''
          });
        } else {
          calls.forEach((c) => {
            rows.push({
              lead_id: lead.id,
              lead_name: lead.name,
              phone_number: lead.phoneNumber,
              public_url: lead.publicUrl || '',
              column_status: lead.columnStatus,
              salesperson_name: lead.salespersonName || 'Thomas',
              next_follow_up_at: lead.nextFollowUpAt || '',
              lead_created_at: lead.createdAt,
              call_id: c.id,
              call_tag: c.tag,
              call_comment: c.comment,
              duration_seconds: c.durationSeconds || 0,
              call_follow_up_at: c.followUpAt || '',
              call_created_at: c.createdAt
            });
          });
        }
      });
    }

    // Generate CSV string with BOM for Excel compatibility in UTF-8
    const headers = [
      'ID Lead',
      'Nome do Lead',
      'Telefone',
      'URL do Site',
      'Vendedor Responsável',
      'Estágio no Pipeline',
      'ID da Ligação',
      'Etiqueta / Resultado',
      'Duração (Segundos)',
      'Duração Formatada',
      'Comentário / Observação',
      'Retorno Agendado na Ligação',
      'Próximo Retorno do Lead',
      'Data da Ligação',
      'Data de Criação do Lead'
    ];

    const escapeCsvField = (val: any) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const formatSeconds = (sec: number) => {
      if (!sec || sec <= 0) return '00:00';
      const m = Math.floor(sec / 60);
      const s = sec % 60;
      return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };

    const csvLines = [headers.map(escapeCsvField).join(';')];

    rows.forEach((r) => {
      const line = [
        r.lead_id,
        r.lead_name,
        r.phone_number,
        r.public_url,
        r.salesperson_name || 'Thomas',
        r.column_status,
        r.call_id,
        r.call_tag,
        r.duration_seconds || 0,
        formatSeconds(r.duration_seconds || 0),
        r.call_comment,
        r.call_follow_up_at ? new Date(r.call_follow_up_at).toLocaleString('pt-BR') : '',
        r.next_follow_up_at ? new Date(r.next_follow_up_at).toLocaleString('pt-BR') : '',
        r.call_created_at ? new Date(r.call_created_at).toLocaleString('pt-BR') : '',
        r.lead_created_at ? new Date(r.lead_created_at).toLocaleString('pt-BR') : ''
      ].map(escapeCsvField).join(';');
      csvLines.push(line);
    });

    const csvBuffer = '\uFEFF' + csvLines.join('\n'); // UTF-8 BOM
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="relatorio_vendas_ligacoes_${new Date().toISOString().slice(0, 10)}.csv"`);
    res.status(200).send(csvBuffer);
  } catch (error) {
    console.error('Error exporting CSV:', error);
    res.status(500).json({ error: 'Erro ao gerar relatório CSV.' });
  }
});

// 7. Seed sample leads endpoint
app.post('/api/seed-samples', async (req, res) => {
  const samples = [
    { id: 'lead-sample-101', name: 'Dr. Roberto Campos', phoneNumber: '(31) 99881-2233', publicUrl: 'https://nyroh.com.br/dr-roberto' },
    { id: 'lead-sample-102', name: 'Boutique Flor de Lis', phoneNumber: '(11) 97722-4455', publicUrl: 'https://nyroh.com.br/flor-de-lis' },
    { id: 'lead-sample-103', name: 'Oficina Mecânica Precision', phoneNumber: '(41) 99111-8899', publicUrl: 'https://nyroh.com.br/precision' },
    { id: 'lead-sample-104', name: 'Clínica Odonto Riso', phoneNumber: '(31) 98844-3322', publicUrl: 'https://nyroh.com.br/odontoriso' },
    { id: 'lead-sample-105', name: 'Restaurante Sabor Mineiro', phoneNumber: '(31) 99150-3721', publicUrl: 'https://nyroh.com.br/sabor-mineiro' }
  ];

  let insertedCount = 0;

  for (const s of samples) {
    if (usePostgres && pgPool) {
      const res = await pgPool.query(
        `INSERT INTO leads (id, name, phone_number, public_url, column_status)
         VALUES ($1, $2, $3, $4, 'Leads')
         ON CONFLICT (id) DO NOTHING`,
        [s.id, s.name, s.phoneNumber, s.publicUrl]
      );
      if (res.rowCount && res.rowCount > 0) insertedCount++;
    } else {
      if (!memoryLeadsMap.has(s.id)) {
        memoryLeadsMap.set(s.id, {
          id: s.id,
          name: s.name,
          phoneNumber: s.phoneNumber,
          publicUrl: s.publicUrl,
          columnStatus: 'Leads',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          callCount: 0
        });
        insertedCount++;
      }
    }
  }

  res.json({ message: `${insertedCount} leads de exemplo adicionados com sucesso!` });
});

// 404 Handler for unhandled API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: `Rota de API não encontrada: ${req.originalUrl}` });
});

// Global Express Error Handler for API errors and Multer limits
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Express API Error:', err);
  if (res.headersSent) {
    return next(err);
  }
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    error: err.message || 'Erro interno no servidor.'
  });
});

// START SERVER & VITE INTEGRATION
async function main() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 CRM Server running on http://0.0.0.0:${PORT}`);
    
    // Connect to database in the background without holding up server startup or healthchecks
    initDatabase().catch((err) => {
      console.error('Background initDatabase error:', err);
    });
  });
}

main();
