const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const {
  initDb, run, get, all, resetCleanDb, getPlacementAnalytics, getClient, getLocalDb
} = require('./db');

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

// Normalize trailing slashes
app.use((req, res, next) => {
  if (req.url && req.url.length > 1 && req.url.endsWith('/')) {
    req.url = req.url.slice(0, -1);
  }
  next();
});

// Admin authentication middleware
async function verifyAdmin(req, res, next) {
  const authHeader = req.headers['x-admin-token'] || req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ error: 'Admin authentication required' });

  const token = authHeader.replace('Bearer ', '').trim();
  const authRow = await get(`SELECT passcode FROM admin_auth WHERE id = 1`).catch(() => null);
  const currentPass = authRow ? authRow.passcode : 'admin123';
  if (token !== currentPass) return res.status(403).json({ error: 'Invalid admin passcode' });
  next();
}

// Router for all API routes (mounted at BOTH /api and root /)
const apiRouter = express.Router();

// Ensure DB is initialized before processing API queries
let isDbReady = false;
let dbInitPromise = null;

async function ensureDbReady() {
  if (isDbReady) return true;
  if (!dbInitPromise) {
    dbInitPromise = initDb()
      .then(() => {
        isDbReady = true;
      })
      .catch(err => {
        console.error('Failed to init DB:', err.message);
        dbInitPromise = null;
        throw err;
      });
  }
  return dbInitPromise;
}

apiRouter.use(async (req, res, next) => {
  try {
    await ensureDbReady();
  } catch (err) {
    // If not health check, return error
    if (!req.path.includes('/health')) {
      return res.status(503).json({
        error: `Database unavailable: ${err.message}. Check TURSO_DATABASE_URL and TURSO_AUTH_TOKEN in Vercel settings.`
      });
    }
  }
  next();
});

// -------- HEALTH CHECK (Public Diagnostic) --------
apiRouter.get('/health', async (req, res) => {
  let dbStatus = 'disconnected';
  let dbError = null;
  let adminReady = false;
  let batchesCount = 0;
  let placementsCount = 0;

  try {
    const tc = getClient();
    if (tc) {
      await tc.execute('SELECT 1');
      dbStatus = 'turso_cloud_connected';
    } else {
      const ldb = getLocalDb();
      if (ldb) {
        dbStatus = 'local_sqlite_connected';
      } else {
        dbStatus = 'no_database_configured';
        dbError = 'Neither TURSO_DATABASE_URL nor local SQLite is available. Add TURSO_DATABASE_URL and TURSO_AUTH_TOKEN in Vercel settings.';
      }
    }

    if (dbStatus.includes('connected')) {
      const authRow = await get(`SELECT passcode FROM admin_auth WHERE id = 1`).catch(() => null);
      adminReady = Boolean(authRow);
      const bRow = await get(`SELECT count(*) as count FROM batches`).catch(() => null);
      if (bRow) batchesCount = bRow.count || 0;
      const pRow = await get(`SELECT count(*) as count FROM placement_drives`).catch(() => null);
      if (pRow) placementsCount = pRow.count || 0;
    }
  } catch (err) {
    dbStatus = 'connection_error';
    dbError = err.message;
  }

  const isOk = dbStatus.includes('connected');
  res.status(isOk ? 200 : 503).json({
    status: isOk ? 'ok' : 'degraded',
    message: isOk ? 'Backend and Database connected successfully' : 'Database connection error',
    database: {
      type: dbStatus,
      turso_configured: Boolean(process.env.TURSO_DATABASE_URL),
      turso_token_configured: Boolean(process.env.TURSO_AUTH_TOKEN),
      turso_url_preview: process.env.TURSO_DATABASE_URL
        ? process.env.TURSO_DATABASE_URL.trim().replace(/^["']|["']$/g, '').substring(0, 32) + '...'
        : null,
      error: dbError
    },
    admin_auth: {
      ready: adminReady,
      default_passcode: 'admin123'
    },
    data_summary: {
      batches: batchesCount,
      placement_drives: placementsCount
    },
    timestamp: new Date().toISOString()
  });
});

// -------- ADMIN AUTH --------
apiRouter.post('/admin/login', async (req, res) => {
  try {
    const passcode = (req.body?.passcode || '').trim();
    if (!passcode) return res.status(400).json({ error: 'Passcode is required' });

    let authRow = await get(`SELECT passcode FROM admin_auth WHERE id = 1`).catch(() => null);
    if (!authRow) {
      try {
        await run(`INSERT INTO admin_auth (id, passcode) VALUES (1, 'admin123')`);
        authRow = { passcode: 'admin123' };
      } catch (e) {
        console.warn('Could not auto-seed admin_auth:', e.message);
      }
    }

    const currentPass = authRow ? authRow.passcode : 'admin123';
    if (passcode === currentPass) {
      return res.json({ success: true, token: currentPass, message: 'Admin authenticated' });
    }
    return res.status(401).json({ success: false, error: 'Incorrect passcode' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/admin/change-password', verifyAdmin, async (req, res) => {
  try {
    const current_passcode = (req.body?.current_passcode || '').trim();
    const new_passcode = (req.body?.new_passcode || '').trim();
    if (!current_passcode || !new_passcode) {
      return res.status(400).json({ error: 'Both current passcode and new passcode are required' });
    }
    if (new_passcode.length < 4) {
      return res.status(400).json({ error: 'New passcode must be at least 4 characters long' });
    }
    const authRow = await get(`SELECT passcode FROM admin_auth WHERE id = 1`).catch(() => null);
    const currentPass = authRow ? authRow.passcode : 'admin123';
    if (currentPass !== current_passcode) {
      return res.status(400).json({ error: 'Current passcode is incorrect' });
    }
    await run(`UPDATE admin_auth SET passcode = ? WHERE id = 1`, [new_passcode]);
    res.json({ success: true, message: 'Admin passcode updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------- BATCHES --------
apiRouter.get('/batches', async (req, res) => {
  try {
    const batches = await all(`SELECT academic_year, total_eligible, branch_capacities FROM batches ORDER BY academic_year DESC`);
    const formatted = batches.map(b => ({
      academic_year: b.academic_year,
      total_eligible: b.total_eligible,
      branches: JSON.parse(b.branch_capacities || '{}')
    }));
    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/batches', verifyAdmin, async (req, res) => {
  try {
    const { academic_year, branches } = req.body;
    if (!academic_year || !branches) return res.status(400).json({ error: 'academic_year and branches required' });
    const totalEligible = Object.values(branches).reduce((a, b) => a + Number(b || 0), 0);
    await run(`INSERT OR REPLACE INTO batches (academic_year, total_eligible, branch_capacities) VALUES (?, ?, ?)`,
      [academic_year, totalEligible, JSON.stringify(branches)]);
    res.json({ success: true, academic_year, totalEligible, branches });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.delete('/batches/:year', verifyAdmin, async (req, res) => {
  try {
    const year = req.params.year;
    await run(`DELETE FROM batches WHERE academic_year = ?`, [year]);
    await run(`DELETE FROM placement_drives WHERE academic_year = ?`, [year]);
    res.json({ success: true, message: `Batch ${year} deleted successfully` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------- PLACEMENT STATS --------
apiRouter.get('/placements/stats', async (req, res) => {
  try {
    const year = req.query.year || '2025-26';
    const stats = await getPlacementAnalytics(year);
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------- PLACEMENT DRIVES --------
apiRouter.post('/placements', verifyAdmin, async (req, res) => {
  try {
    const { academic_year, company_name, role, offer_type, category, ctc, total_hires, branch_hires, drive_date, notes } = req.body;
    if (!academic_year || !company_name || !role || ctc === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    let bHiresObj = typeof branch_hires === 'string' ? JSON.parse(branch_hires) : (branch_hires || {});
    let calculatedHires = Number(total_hires) || 0;
    if (bHiresObj && Object.keys(bHiresObj).length > 0) {
      const sum = Object.values(bHiresObj).reduce((acc, v) => acc + (Number(v) || 0), 0);
      if (sum > 0) calculatedHires = sum;
    }

    let derivedCategory = category;
    if (!derivedCategory) {
      if (ctc >= 20) derivedCategory = 'Super Dream';
      else if (ctc >= 10) derivedCategory = 'Dream';
      else derivedCategory = 'Regular';
    }

    // Auto-create batch or auto-add new branches to batch if not exist
    const existingBatch = await get(`SELECT * FROM batches WHERE academic_year = ?`, [academic_year]);
    if (!existingBatch) {
      const initialBranches = {};
      Object.keys(bHiresObj).forEach(b => { initialBranches[b] = Math.max(50, (Number(bHiresObj[b]) || 0) * 2); });
      const totalElig = Object.values(initialBranches).reduce((a, b) => a + Number(b || 0), 0) || 100;
      await run(`INSERT INTO batches (academic_year, total_eligible, branch_capacities) VALUES (?, ?, ?)`,
        [academic_year, totalElig, JSON.stringify(initialBranches)]);
    } else {
      try {
        const caps = JSON.parse(existingBatch.branch_capacities || '{}');
        let updated = false;
        Object.keys(bHiresObj).forEach(b => {
          if (caps[b] === undefined) {
            caps[b] = Math.max(50, (Number(bHiresObj[b]) || 0) * 2);
            updated = true;
          }
        });
        if (updated) {
          const newTotal = Object.values(caps).reduce((a, b) => a + Number(b || 0), 0);
          await run(`UPDATE batches SET total_eligible = ?, branch_capacities = ? WHERE academic_year = ?`,
            [newTotal, JSON.stringify(caps), academic_year]);
        }
      } catch (e) {}
    }

    const result = await run(
      `INSERT INTO placement_drives (academic_year, company_name, role, offer_type, category, ctc, total_hires, branch_hires, drive_date, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [academic_year, company_name, role, offer_type || 'FTE', derivedCategory, Number(ctc), calculatedHires,
       JSON.stringify(bHiresObj), drive_date || new Date().toISOString().substring(0, 10), notes || '']);

    res.status(201).json({ success: true, id: result.id, message: 'Drive added' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.put('/placements/:id', verifyAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    const { academic_year, company_name, role, offer_type, category, ctc, total_hires, branch_hires, drive_date, notes } = req.body;
    let bHiresObj = typeof branch_hires === 'string' ? JSON.parse(branch_hires) : branch_hires;
    let calculatedHires = Number(total_hires) || 0;
    if (bHiresObj && Object.keys(bHiresObj).length > 0) {
      calculatedHires = Object.values(bHiresObj).reduce((a, b) => a + Number(b || 0), 0);
    }

    await run(
      `UPDATE placement_drives SET academic_year=?, company_name=?, role=?, offer_type=?, category=?, ctc=?, total_hires=?, branch_hires=?, drive_date=?, notes=? WHERE id=?`,
      [academic_year, company_name, role, offer_type || 'FTE', category, Number(ctc), calculatedHires,
       JSON.stringify(bHiresObj || {}), drive_date || new Date().toISOString().substring(0, 10), notes, id]);

    res.json({ success: true, message: 'Drive updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.delete('/placements/:id', verifyAdmin, async (req, res) => {
  try {
    await run(`DELETE FROM placement_drives WHERE id = ?`, [req.params.id]);
    res.json({ success: true, message: 'Drive deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Reset entire database to 0
apiRouter.post('/seed', verifyAdmin, async (req, res) => {
  try {
    await resetCleanDb();
    res.json({ success: true, message: 'Database reset to 0' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mount the API router at BOTH /api and at root / (handles all routing variations on Vercel)
app.use('/api', apiRouter);
app.use(apiRouter);

// Serve frontend production build when running locally or standalone
const distPath = fs.existsSync(path.resolve(__dirname, '../dist'))
  ? path.resolve(__dirname, '../dist')
  : path.resolve(__dirname, '../client/dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('{*path}', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path === '/health') return next();
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

const HOST = process.env.HOST || '0.0.0.0';

async function startServer() {
  await initDb();
  const server = app.listen(PORT, HOST, () => {
    console.log(`Placement Stats API running on http://${HOST}:${PORT}`);
  });
  server.on('error', (err) => {
    console.error(`Server error on port ${PORT}:`, err.message);
  });
}

module.exports = app;

if (!process.env.VERCEL) {
  startServer().catch(err => { console.error('Failed to start server:', err); });
}
