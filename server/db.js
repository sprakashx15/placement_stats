const path = require('path');

let tursoClient = null;
let db = null;

function cleanEnv(val) {
  if (!val) return '';
  return val.trim().replace(/^["']|["']$/g, '');
}

function getClient() {
  if (tursoClient) return tursoClient;
  const rawUrl = cleanEnv(process.env.TURSO_DATABASE_URL);
  const rawToken = cleanEnv(process.env.TURSO_AUTH_TOKEN);
  if (rawUrl) {
    try {
      const { createClient } = require('@libsql/client');
      tursoClient = createClient({
        url: rawUrl,
        authToken: rawToken
      });
      console.log('Connected to Turso Cloud SQLite Database');
      return tursoClient;
    } catch (err) {
      console.error('Failed to initialize Turso client:', err.message);
    }
  }
  return null;
}

function getLocalDb() {
  if (db) return db;
  try {
    const sqlite3 = require('sqlite3').verbose();
    const dbPath = path.resolve(__dirname, 'placement_stats.db');
    db = new sqlite3.Database(dbPath);
    return db;
  } catch (err) {
    return null;
  }
}

function run(sql, params = []) {
  const tc = getClient();
  if (tc) {
    return tc.execute({ sql, args: params }).then(res => ({
      id: res.lastInsertRowid !== undefined ? Number(res.lastInsertRowid) : 0,
      changes: res.rowsAffected || 0
    }));
  }
  const ldb = getLocalDb();
  if (!ldb) {
    return Promise.reject(new Error('No database configured. Please add TURSO_DATABASE_URL and TURSO_AUTH_TOKEN in Vercel settings.'));
  }
  return new Promise((resolve, reject) => {
    ldb.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
}

function get(sql, params = []) {
  const tc = getClient();
  if (tc) {
    return tc.execute({ sql, args: params }).then(res => res.rows[0] || null);
  }
  const ldb = getLocalDb();
  if (!ldb) {
    return Promise.reject(new Error('No database configured. Please add TURSO_DATABASE_URL and TURSO_AUTH_TOKEN in Vercel settings.'));
  }
  return new Promise((resolve, reject) => {
    ldb.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function all(sql, params = []) {
  const tc = getClient();
  if (tc) {
    return tc.execute({ sql, args: params }).then(res => res.rows || []);
  }
  const ldb = getLocalDb();
  if (!ldb) {
    return Promise.reject(new Error('No database configured. Please add TURSO_DATABASE_URL and TURSO_AUTH_TOKEN in Vercel settings.'));
  }
  return new Promise((resolve, reject) => {
    ldb.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
}

function calculateMedian(numbers) {
  if (!numbers || numbers.length === 0) return 0;
  const sorted = [...numbers].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 !== 0) return sorted[mid];
  return Number(((sorted[mid - 1] + sorted[mid]) / 2).toFixed(2));
}

async function initDb() {
  await run(`
    CREATE TABLE IF NOT EXISTS batches (
      academic_year TEXT PRIMARY KEY,
      total_eligible INTEGER NOT NULL,
      branch_capacities TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS placement_drives (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      academic_year TEXT NOT NULL,
      company_name TEXT NOT NULL,
      role TEXT NOT NULL,
      offer_type TEXT DEFAULT 'FTE',
      category TEXT DEFAULT 'Dream',
      ctc REAL NOT NULL,
      total_hires INTEGER NOT NULL,
      branch_hires TEXT NOT NULL,
      drive_date TEXT DEFAULT CURRENT_TIMESTAMP,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS admin_auth (
      id INTEGER PRIMARY KEY,
      passcode TEXT NOT NULL
    )
  `);

  try {
    await run(`ALTER TABLE placement_drives ADD COLUMN offer_type TEXT DEFAULT 'FTE'`);
  } catch (e) {}

  const authRow = await get(`SELECT * FROM admin_auth WHERE id = 1`);
  if (!authRow) {
    await run(`INSERT INTO admin_auth (id, passcode) VALUES (1, 'admin123')`);
  }
}

async function resetCleanDb() {
  console.log('Resetting whole database to 0...');
  await run(`DELETE FROM placement_drives`);
  await run(`DELETE FROM batches`);
  try {
    await run(`DELETE FROM sqlite_sequence WHERE name = 'placement_drives'`);
  } catch (e) {}
  console.log('Database reset complete. All batches and placement records cleared to 0.');
}

async function getPlacementAnalytics(academicYear) {
  let batchQuery = `SELECT * FROM batches`;
  let drivesQuery = `SELECT * FROM placement_drives`;
  const params = [];

  if (academicYear && academicYear !== 'ALL') {
    batchQuery += ` WHERE academic_year = ?`;
    drivesQuery += ` WHERE academic_year = ?`;
    params.push(academicYear);
  }

  const batches = await all(batchQuery, params);
  const drives = await all(drivesQuery, params);

  let totalEligible = 0;
  const branchCapacities = {};

  batches.forEach(b => {
    totalEligible += b.total_eligible;
    try {
      const caps = JSON.parse(b.branch_capacities);
      for (const [branch, count] of Object.entries(caps)) {
        branchCapacities[branch] = (branchCapacities[branch] || 0) + Number(count);
      }
    } catch (e) {}
  });

  let totalOffers = 0;
  let highestCTC = 0;
  let lowestCTC = drives.length > 0 ? 999999 : 0;
  const allHiredCTCs = [];

  const branchStats = {};
  for (const branch of Object.keys(branchCapacities)) {
    branchStats[branch] = {
      branch,
      eligible: branchCapacities[branch] || 0,
      offers: 0,
      highest_ctc: 0,
      ctcList: []
    };
  }

  const tiers = {
    'Below 6 LPA': { count: 0, label: '< 6 LPA', color: '#94a3b8' },
    '6 - 10 LPA': { count: 0, label: '6 - 10 LPA', color: '#38bdf8' },
    '10 - 18 LPA': { count: 0, label: '10 - 18 LPA', color: '#6366f1' },
    '18 - 30 LPA': { count: 0, label: '18 - 30 LPA', color: '#a855f7' },
    '30+ LPA': { count: 0, label: '30+ LPA (Super Dream)', color: '#ec4899' }
  };

  const offerTypes = { FTE: 0, PPO: 0, '6M+PPO': 0 };

  drives.forEach(drive => {
    const ctc = Number(drive.ctc);
    const hires = Number(drive.total_hires);
    const offerType = drive.offer_type || 'FTE';
    totalOffers += hires;

    if (ctc > highestCTC) highestCTC = ctc;
    if (ctc < lowestCTC) lowestCTC = ctc;

    for (let i = 0; i < hires; i++) allHiredCTCs.push(ctc);

    offerTypes[offerType] = (offerTypes[offerType] || 0) + hires;

    if (ctc < 6) tiers['Below 6 LPA'].count += hires;
    else if (ctc < 10) tiers['6 - 10 LPA'].count += hires;
    else if (ctc < 18) tiers['10 - 18 LPA'].count += hires;
    else if (ctc < 30) tiers['18 - 30 LPA'].count += hires;
    else tiers['30+ LPA'].count += hires;

    try {
      const bHires = JSON.parse(drive.branch_hires || '{}');
      for (const [branch, count] of Object.entries(bHires)) {
        const hireCount = Number(count) || 0;
        if (hireCount > 0) {
          if (!branchStats[branch]) {
            branchStats[branch] = { branch, eligible: branchCapacities[branch] || hireCount, offers: 0, highest_ctc: 0, ctcList: [] };
          }
          branchStats[branch].offers += hireCount;
          if (ctc > branchStats[branch].highest_ctc) branchStats[branch].highest_ctc = ctc;
          for (let i = 0; i < hireCount; i++) branchStats[branch].ctcList.push(ctc);
        }
      }
    } catch (e) {}
  });

  const averageCTC = allHiredCTCs.length > 0
    ? Number((allHiredCTCs.reduce((a, v) => a + v, 0) / allHiredCTCs.length).toFixed(2))
    : 0;
  const medianCTC = calculateMedian(allHiredCTCs);

  let totalPlaced = 0;
  const branchList = Object.values(branchStats).map(b => {
    const placed = Math.min(b.eligible, Math.round(b.offers * 0.9) || b.offers);
    const placementRate = b.eligible > 0
      ? Math.min(100, Number(((placed / b.eligible) * 100).toFixed(1)))
      : 0;
    const bAvg = b.ctcList.length > 0
      ? Number((b.ctcList.reduce((a, v) => a + v, 0) / b.ctcList.length).toFixed(2))
      : 0;
    const bMedian = calculateMedian(b.ctcList);
    totalPlaced += placed;

    return {
      branch: b.branch,
      eligible: b.eligible,
      offers: b.offers,
      placed,
      placement_percentage: placementRate,
      average_ctc: bAvg,
      median_ctc: bMedian,
      highest_ctc: b.highest_ctc
    };
  });

  const overallPlacementRate = totalEligible > 0
    ? Math.min(100, Number(((totalPlaced / totalEligible) * 100).toFixed(1)))
    : 0;

  const tierDistribution = Object.entries(tiers).map(([key, val]) => ({
    tier: key,
    label: val.label,
    count: val.count,
    percentage: totalOffers > 0 ? Number(((val.count / totalOffers) * 100).toFixed(1)) : 0,
    color: val.color
  }));

  const offerTypeBreakdown = Object.entries(offerTypes).map(([type, count]) => ({
    type,
    label: type === 'FTE' ? 'Full-Time (FTE)' : type === 'PPO' ? 'Pre-Placement Offer (PPO)' : '6-Month Intern + PPO',
    count,
    percentage: totalOffers > 0 ? Number(((count / totalOffers) * 100).toFixed(1)) : 0,
    color: type === 'FTE' ? '#6366f1' : type === 'PPO' ? '#10b981' : '#f59e0b'
  }));

  return {
    academic_year: academicYear || 'ALL',
    kpis: {
      total_eligible: totalEligible,
      total_placed: totalPlaced,
      total_offers: totalOffers,
      placement_rate: overallPlacementRate,
      highest_ctc: highestCTC,
      average_ctc: averageCTC,
      median_ctc: medianCTC,
      lowest_ctc: lowestCTC === 999999 ? 0 : lowestCTC,
      total_companies: new Set(drives.map(d => d.company_name.trim().toLowerCase())).size,
      fte_count: offerTypes.FTE || 0,
      ppo_count: offerTypes.PPO || 0,
      sixm_ppo_count: offerTypes['6M+PPO'] || 0
    },
    branch_statistics: branchList,
    tier_distribution: tierDistribution,
    offer_type_breakdown: offerTypeBreakdown,
    all_drives: drives.map(d => ({
      ...d,
      branch_hires: JSON.parse(d.branch_hires || '{}')
    }))
  };
}

module.exports = { db, run, get, all, initDb, resetCleanDb, getPlacementAnalytics, getClient, getLocalDb };
