import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import multer from 'multer';
import JSZip from 'jszip';
import pg from 'pg';
import { Lead, CallLog, ColumnStatus, PIPELINE_COLUMNS } from './src/types.js';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Multer memory storage for zip uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB limit
});

// Database Connection setup
let pgPool: pg.Pool | null = null;
let usePostgres = false;

// Default in-memory database store (starts empty, zero mock data)
const memoryLeadsMap = new Map<string, Lead>();
const memoryCallLogsMap = new Map<string, CallLog[]>();

async function initDatabase() {
  const dbUrl = process.env.DATABASE_URL?.trim();
  if (dbUrl) {
    try {
      console.log('Connecting to PostgreSQL database...');
      pgPool = new pg.Pool({
        connectionString: dbUrl,
        ssl: process.env.NODE_ENV === 'production' && !dbUrl.includes('localhost') 
          ? { rejectUnauthorized: false } 
          : false,
        connectionTimeoutMillis: 10000,
      });

      // Prevent uncaught errors on idle clients from crashing process
      pgPool.on('error', (err) => {
        console.error('Unexpected error on idle PostgreSQL client:', err);
      });

      // Test connection
      const client = await pgPool.connect();
      
      // Auto-create tables if they don't exist
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
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);

      client.release();
      usePostgres = true;
      console.log('✅ PostgreSQL connected and schema verified successfully.');
    } catch (err) {
      console.warn('⚠️ Could not connect to PostgreSQL (DATABASE_URL provided). Falling back to in-memory store:', err);
      usePostgres = false;
    }
  } else {
    console.log('ℹ️ No DATABASE_URL environment variable set. Operating in in-memory mode.');
    usePostgres = false;
  }
}

// HEALTHCHECK ROUTE (Fast response for Railway & Docker health checks)
app.get(['/health', '/api/health'], (req, res) => {
  res.status(200).json({
    status: 'ok',
    uptime: Math.floor(process.uptime()),
    database: usePostgres ? 'postgresql' : 'in-memory',
    timestamp: new Date().toISOString()
  });
});

// API ROUTES

// 1. Get all leads with call stats
app.get('/api/leads', async (req, res) => {
  try {
    if (usePostgres && pgPool) {
      const result = await pgPool.query(`
        SELECT 
          l.id,
          l.name,
          l.phone_number AS "phoneNumber",
          l.public_url AS "publicUrl",
          l.column_status AS "columnStatus",
          l.created_at AS "createdAt",
          l.updated_at AS "updatedAt",
          COUNT(c.id)::int AS "callCount",
          MAX(c.created_at) AS "lastCallAt"
        FROM leads l
        LEFT JOIN calls c ON l.id = c.lead_id
        GROUP BY l.id
        ORDER BY l.created_at DESC
      `);
      return res.json(result.rows);
    } else {
      const leadsList = Array.from(memoryLeadsMap.values()).map(lead => {
        const calls = memoryCallLogsMap.get(lead.id) || [];
        const lastCall = calls.length > 0 ? calls[calls.length - 1].createdAt : undefined;
        return {
          ...lead,
          callCount: calls.length,
          lastCallAt: lastCall
        };
      });
      return res.json(leadsList);
    }
  } catch (error) {
    console.error('Error fetching leads:', error);
    res.status(500).json({ error: 'Erro ao buscar leads do banco de dados.' });
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
        `SELECT id, lead_id AS "leadId", tag, comment, created_at AS "createdAt"
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
  const { tag, comment } = req.body;

  if (!tag) {
    return res.status(400).json({ error: 'A etiqueta da ligação é obrigatória.' });
  }

  const callId = `call-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const createdAt = new Date().toISOString();

  try {
    if (usePostgres && pgPool) {
      await pgPool.query(
        `INSERT INTO calls (id, lead_id, tag, comment, created_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [callId, id, tag, comment || '', createdAt]
      );

      // Touch lead updated_at
      await pgPool.query(`UPDATE leads SET updated_at = CURRENT_TIMESTAMP WHERE id = $1`, [id]);

      return res.json({
        id: callId,
        leadId: id,
        tag,
        comment,
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
        createdAt
      };

      existingCalls.push(newCallLog);
      memoryCallLogsMap.set(id, existingCalls);

      lead.callCount = existingCalls.length;
      lead.lastCallAt = createdAt;
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
  await initDatabase();

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 CRM Server running on http://0.0.0.0:${PORT}`);
  });
}

main();
