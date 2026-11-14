const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const {
  initDb, run, get, all, resetCleanDb, getPlacementAnalytics
} = require('./db');

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

// Admin authentication middleware
async function verifyAdmin(req, res, next) {
  const authHeader = req.headers['x-admin-token'] || req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ error: 'Admin authentication required' });

  const token = authHeader.replace('Bearer ', '').trim();
  const authRow = await get(`SELECT passcode FROM admin_auth WHERE id = 1`);
  if (!authRow || authRow.passcode !== token) return res.status(403).json({ error: 'Invalid admin passcode' });
  next();
}

// -------- PUBLIC ENDPOINTS --------

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.post('/api/admin/login', async (req, res) => {
  try {
    const { passcode } = req.body;
    if (!passcode) return res.status(400).json({ error: 'Passcode is required' });
    const authRow = await get(`SELECT passcode FROM admin_auth WHERE id = 1`);
    if (authRow && authRow.passcode === passcode) {
      return res.json({ success: true, token: passcode, message: 'Admin authenticated' });
    }
    return res.status(401).json({ success: false, error: 'Incorrect passcode' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/admin/change-password', verifyAdmin, async (req, res) => {
  try {
    const { current_passcode, new_passcode } = req.body;
    if (!current_passcode || !new_passcode) {
      return res.status(400).json({ error: 'Both current passcode and new passcode are required' });
    }
    if (new_passcode.trim().length < 4) {
      return res.status(400).json({ error: 'New passcode must be at least 4 characters long' });
    }
    const authRow = await get(`SELECT passcode FROM admin_auth WHERE id = 1`);
    if (!authRow || authRow.passcode !== current_passcode) {
      return res.status(400).json({ error: 'Current passcode is incorrect' });
    }
    await run(`UPDATE admin_auth SET passcode = ? WHERE id = 1`, [new_passcode.trim()]);
    res.json({ success: true, message: 'Admin passcode updated successfully' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/batches', async (req, res) => {
  try {
    const batches = await all(`SELECT academic_year, total_eligible, branch_capacities FROM batches ORDER BY academic_year DESC`);
    const formatted = batches.map(b => ({
      academic_year: b.academic_year,
      total_eligible: b.total_eligible,
      branches: JSON.parse(b.branch_capacities || '{}')
    }));
    res.json(formatted);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/batches', verifyAdmin, async (req, res) => {
  try {
    const { academic_year, branches } = req.body;
    if (!academic_year || !branches) return res.status(400).json({ error: 'academic_year and branches required' });
    const totalEligible = Object.values(branches).reduce((a, b) => a + Number(b || 0), 0);
    await run(`INSERT OR REPLACE INTO batches (academic_year, total_eligible, branch_capacities) VALUES (?, ?, ?)`,
      [academic_year, totalEligible, JSON.stringify(branches)]);
    res.json({ success: true, academic_year, totalEligible, branches });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/batches/:year', verifyAdmin, async (req, res) => {
  try {
    const year = req.params.year;
    await run(`DELETE FROM batches WHERE academic_year = ?`, [year]);
    await run(`DELETE FROM placement_drives WHERE academic_year = ?`, [year]);
    res.json({ success: true, message: `Batch ${year} deleted successfully` });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/placements/stats', async (req, res) => {
  try {
    const year = req.query.year || '2025-26';
    const stats = await getPlacementAnalytics(year);
    res.json(stats);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// -------- ADMIN ENDPOINTS --------

app.post('/api/placements', verifyAdmin, async (req, res) => {
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
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/placements/:id', verifyAdmin, async (req, res) => {
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
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/placements/:id', verifyAdmin, async (req, res) => {
  try {
    await run(`DELETE FROM placement_drives WHERE id = ?`, [req.params.id]);
    res.json({ success: true, message: 'Drive deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Reset entire database to 0
app.post('/api/seed', verifyAdmin, async (req, res) => {
  try {
    await resetCleanDb();
    res.json({ success: true, message: 'Database reset to 0' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Serve frontend production build
const distPath = path.resolve(__dirname, '../client/dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('{*path}', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
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
