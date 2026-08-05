import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import multer from 'multer';
import JSZip from 'jszip';
import pg from 'pg';
import { Lead, CallLog, ColumnStatus, PIPELINE_COLUMNS, CustomTag } from './src/types.js';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

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

// Database Connection setup
let pgPool: pg.Pool | null = null;
let usePostgres = false;

// Default in-memory database store
const memoryLeadsMap = new Map<string, Lead>();
const memoryCallLogsMap = new Map<string, CallLog[]>();
const memoryTagsMap = new Map<string, CustomTag>(
  DEFAULT_CUSTOM_TAGS.map(t => [t.id, t])
);

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
          CREATE TABLE IF NOT EXISTS leads (
            id VARCHAR(255) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            phone_number VARCHAR(100) NOT NULL,
            public_url TEXT,
            column_status VARCHAR(100) NOT NULL DEFAULT 'Leads',
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

          CREATE TABLE IF NOT EXISTS custom_tags (
            id VARCHAR(255) PRIMARY KEY,
            name VARCHAR(255) UNIQUE NOT NULL,
            color VARCHAR(100) NOT NULL,
            bg_color VARCHAR(100) NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          );
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

// 1. Get all leads with call stats & last call tag
app.get('/api/leads', async (req, res) => {
  try {
    if (usePostgres && pgPool) {
      const result = await pgPool.query(`
        SELECT 
          l.id,
          l.name,
          l.phone_number AS "phoneNumber",
          l.public_url AS "publicUrl",
          COALESCE(l.column_status, 'Leads') AS "columnStatus",
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
        GROUP BY l.id, l.name, l.phone_number, l.public_url, l.column_status, l.next_follow_up_at, l.created_at, l.updated_at
        ORDER BY l.created_at DESC
      `);
      return res.json(result.rows);
    } else {
      const leadsList = Array.from(memoryLeadsMap.values()).map(lead => {
        const calls = memoryCallLogsMap.get(lead.id) || [];
        const sortedCalls = [...calls].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        const lastCall = sortedCalls.length > 0 ? sortedCalls[0] : undefined;
        return {
          ...lead,
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

    if (usePostgres && pgPool) {
      const checkRes = await pgPool.query('SELECT id FROM leads WHERE id = $1', [leadId]);
      const isExisting = checkRes.rows.length > 0;

      await pgPool.query(
        `INSERT INTO leads (id, name, phone_number, public_url, column_status)
         VALUES ($1, $2, $3, $4, 'Leads')
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           phone_number = EXCLUDED.phone_number,
           public_url = EXCLUDED.public_url,
           updated_at = CURRENT_TIMESTAMP`,
        [leadId, name, phoneNumber, publicUrl]
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

// Endpoint to fetch ALL call logs across all leads (for Metrics & Reports)
app.get('/api/calls', async (req, res) => {
  try {
    if (usePostgres && pgPool) {
      const result = await pgPool.query(
        `SELECT c.id, c.lead_id AS "leadId", l.name AS "leadName", l.phone_number AS "phoneNumber",
                l.column_status AS "columnStatus", c.tag, c.comment, c.duration_seconds AS "durationSeconds",
                c.follow_up_at AS "followUpAt", c.created_at AS "createdAt"
         FROM calls c
         JOIN leads l ON c.lead_id = l.id
         ORDER BY c.created_at DESC`
      );
      return res.json(result.rows);
    } else {
      const allCalls: any[] = [];
      memoryCallLogsMap.forEach((calls, leadId) => {
        const lead = memoryLeadsMap.get(leadId);
        calls.forEach((c) => {
          allCalls.push({
            ...c,
            leadName: lead?.name || 'Lead Excluído',
            phoneNumber: lead?.phoneNumber || '',
            columnStatus: lead?.columnStatus || 'Leads'
          });
        });
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

// Static assets & SPA fallback (Production)
const distPath = path.resolve(process.cwd(), 'dist');
if (process.env.NODE_ENV === 'production' && fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// 404 Handler for API routes (returns JSON instead of falling through to HTML SPA fallback)
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
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 CRM Server running on http://0.0.0.0:${PORT}`);
    
    // Connect to database in the background without holding up server startup or healthchecks
    initDatabase().catch((err) => {
      console.error('Background initDatabase error:', err);
    });
  });

  // Dual-port binding to guarantee Railway public domain routing works whether Railway maps PORT or 3000
  if (PORT !== 3000) {
    try {
      const fallbackServer = app.listen(3000, '0.0.0.0', () => {
        console.log(`🚀 CRM Server also listening on fallback port http://0.0.0.0:3000`);
      });
      fallbackServer.on('error', () => {
        // Silently ignore if port 3000 is already bound
      });
    } catch {
      // Ignore if port 3000 is already in use
    }
  }
}

main();
