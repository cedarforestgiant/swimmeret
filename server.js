const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');
const { DatabaseSync } = require('node:sqlite');

const PORT = process.env.PORT || 3000;
const DATA_PATH = path.join(__dirname, 'data', 'db.json');
const PUBLIC_DIR = path.join(__dirname, 'public');

const DEFAULT_PROVIDER = 'Claude';
const FORMS_DB_PATH = path.join(__dirname, 'data', 'forms.db');
let formsDb = null;

function ensureDataDir() {
  const dir = path.dirname(DATA_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function initFormsDb() {
  if (formsDb) return;
  ensureDataDir();
  formsDb = new DatabaseSync(FORMS_DB_PATH);
  formsDb.exec(`
    CREATE TABLE IF NOT EXISTS webforms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      fields_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
  formsDb.exec(`CREATE INDEX IF NOT EXISTS idx_webforms_created_at ON webforms(created_at);`);
}

function readDb() {
  if (!fs.existsSync(DATA_PATH)) {
    seedDb();
  }
  return JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
}

function writeDb(db) {
  fs.writeFileSync(DATA_PATH, JSON.stringify(db, null, 2));
}

function nowIso() {
  return new Date().toISOString();
}

function normalizeFormRow(row) {
  if (!row) return null;
  let fields = [];
  try {
    fields = JSON.parse(row.fields_json || '[]');
  } catch (err) {
    fields = [];
  }
  return {
    id: row.id,
    name: row.name,
    description: row.description || '',
    fields,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

function validateFormPayload(payload, { requireName }) {
  const hasName = Object.prototype.hasOwnProperty.call(payload, 'name');
  const hasFields = Object.prototype.hasOwnProperty.call(payload, 'fields');
  const hasDescription = Object.prototype.hasOwnProperty.call(payload, 'description');

  const name = typeof payload.name === 'string' ? payload.name.trim() : '';
  if ((requireName && !name) || (hasName && !name)) {
    return { error: 'name is required' };
  }

  if (hasFields && !Array.isArray(payload.fields)) {
    return { error: 'fields must be an array' };
  }

  const description = typeof payload.description === 'string' ? payload.description.trim() : undefined;
  const fields = hasFields ? payload.fields : undefined;

  return { name, description, fields, hasName, hasFields, hasDescription };
}

function createId(prefix) {
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${Date.now().toString(36)}_${rand}`;
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function seedDb() {
  ensureDataDir();
  const poolId = 'pool_1';
  const poolName = 'Heavy Agent Builders - Stable Lane';
  const pool = {
    id: poolId,
    pool_type: 'code_agents',
    provider: DEFAULT_PROVIDER,
    name: poolName,
    slug: slugify(poolName),
    threshold_seats: 50,
    next_threshold_seats: 100,
    target_terms: [
      'Throughput floor with priority lane during peak',
      'Policy notice window before enforcement changes',
      'Clear acceptable-use envelope for automation',
      'Dedicated escalation path for verified builders'
    ],
    status: 'forming',
    created_at: nowIso()
  };

  const users = [
    { id: 'user_seed_1', email: 'seed-one@example.com', workspace_id: 'ws_seed', created_at: nowIso() },
    { id: 'user_seed_2', email: 'seed-two@example.com', workspace_id: 'ws_seed', created_at: nowIso() },
    { id: 'user_seed_3', email: 'seed-three@example.com', workspace_id: 'ws_seed', created_at: nowIso() }
  ];

  const incidents = [
    {
      id: 'inc_seed_1',
      user_id: 'user_seed_1',
      incident_type: 'throttled',
      provider: DEFAULT_PROVIDER,
      seats_band: '4-12',
      agents_band: '50-200',
      urgency: 'today',
      consent_telemetry: true,
      created_at: nowIso()
    },
    {
      id: 'inc_seed_2',
      user_id: 'user_seed_2',
      incident_type: 'warned',
      provider: DEFAULT_PROVIDER,
      seats_band: '2-3',
      agents_band: '10-50',
      urgency: 'this week',
      consent_telemetry: true,
      created_at: nowIso()
    },
    {
      id: 'inc_seed_3',
      user_id: 'user_seed_3',
      incident_type: 'canceled',
      provider: DEFAULT_PROVIDER,
      seats_band: '13+',
      agents_band: '200+',
      urgency: 'this month',
      consent_telemetry: true,
      created_at: nowIso()
    }
  ];

  const usageSnapshots = [
    {
      id: 'snap_seed_1',
      user_id: 'user_seed_1',
      window_days: 30,
      run_count: 7200,
      peak_concurrency: 90,
      provider_usage: { [DEFAULT_PROVIDER]: 0.78, Other: 0.22 },
      token_proxy: 1800000,
      retry_rate: 0.06,
      generated_at: nowIso()
    },
    {
      id: 'snap_seed_2',
      user_id: 'user_seed_2',
      window_days: 30,
      run_count: 2100,
      peak_concurrency: 28,
      provider_usage: { [DEFAULT_PROVIDER]: 0.64, Other: 0.36 },
      token_proxy: 540000,
      retry_rate: 0.04,
      generated_at: nowIso()
    },
    {
      id: 'snap_seed_3',
      user_id: 'user_seed_3',
      window_days: 30,
      run_count: 14200,
      peak_concurrency: 210,
      provider_usage: { [DEFAULT_PROVIDER]: 0.82, Other: 0.18 },
      token_proxy: 3400000,
      retry_rate: 0.08,
      generated_at: nowIso()
    }
  ];

  const verificationScores = [
    {
      user_id: 'user_seed_1',
      score: 92,
      tier: 'power',
      reasons: ['Run volume over 5,000 in 30 days', 'Peak concurrency over 60', 'High provider usage'],
      created_at: nowIso()
    },
    {
      user_id: 'user_seed_2',
      score: 74,
      tier: 'verified',
      reasons: ['Run volume over 1,000 in 30 days', 'Peak concurrency over 20'],
      created_at: nowIso()
    },
    {
      user_id: 'user_seed_3',
      score: 98,
      tier: 'power',
      reasons: ['Run volume over 10,000 in 30 days', 'Peak concurrency over 200'],
      created_at: nowIso()
    }
  ];

  const pledges = [
    {
      id: 'pledge_seed_1',
      pool_id: poolId,
      user_id: 'user_seed_1',
      seats_intended: 12,
      wtp_band: 'mid',
      contact: 'seed-one@example.com',
      referral_code_used: null,
      created_at: nowIso(),
      is_verified: true
    },
    {
      id: 'pledge_seed_2',
      pool_id: poolId,
      user_id: 'user_seed_2',
      seats_intended: 8,
      wtp_band: 'low',
      contact: 'seed-two@example.com',
      referral_code_used: null,
      created_at: nowIso(),
      is_verified: true
    },
    {
      id: 'pledge_seed_3',
      pool_id: poolId,
      user_id: 'user_seed_3',
      seats_intended: 7,
      wtp_band: 'high',
      contact: 'seed-three@example.com',
      referral_code_used: null,
      created_at: nowIso(),
      is_verified: true
    }
  ];

  const guardrails = [
    {
      id: 'guard_seed_1',
      user_id: 'user_seed_1',
      applied: true,
      settings: {
        cap_concurrency: true,
        jitter_backoff: true,
        loop_limiter: true,
        cache_dedupe: false
      },
      created_at: nowIso()
    },
    {
      id: 'guard_seed_2',
      user_id: 'user_seed_2',
      applied: true,
      settings: {
        cap_concurrency: true,
        jitter_backoff: false,
        loop_limiter: true,
        cache_dedupe: true
      },
      created_at: nowIso()
    }
  ];

  const db = {
    users,
    incidents,
    usageSnapshots,
    verificationScores,
    pools: [pool],
    pledges,
    guardrails
  };

  writeDb(db);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => {
      data += chunk;
      if (data.length > 1e6) {
        req.destroy();
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      if (!data) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(data));
      } catch (err) {
        reject(err);
      }
    });
  });
}

function sendJson(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload));
}

function sendText(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'text/plain' });
  res.end(payload);
}

function sendFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const typeMap = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.svg': 'image/svg+xml',
    '.png': 'image/png'
  };
  const contentType = typeMap[ext] || 'application/octet-stream';
  fs.readFile(filePath, (err, data) => {
    if (err) {
      sendText(res, 404, 'Not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
}

function findLatestIncident(db, userId) {
  const incidents = db.incidents
    .filter(item => item.user_id === userId)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  return incidents[0] || null;
}

function findLatestSnapshot(db, userId) {
  const snapshots = db.usageSnapshots
    .filter(item => item.user_id === userId)
    .sort((a, b) => new Date(b.generated_at) - new Date(a.generated_at));
  return snapshots[0] || null;
}

function findLatestVerification(db, userId) {
  const scores = db.verificationScores
    .filter(item => item.user_id === userId)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  return scores[0] || null;
}

function mapAgentsToTelemetry(agentsBand) {
  const mapping = {
    '1-10': { run_count: 300, peak_concurrency: 6 },
    '10-50': { run_count: 1200, peak_concurrency: 20 },
    '50-200': { run_count: 6000, peak_concurrency: 80 },
    '200+': { run_count: 14000, peak_concurrency: 220 }
  };
  return mapping[agentsBand] || mapping['1-10'];
}

function scoreVerification(snapshot) {
  if (!snapshot || snapshot.run_count === 0) {
    return {
      score: 18,
      tier: 'unverified',
      reasons: ['Telemetry consent missing or too little usage data']
    };
  }

  const runCount = snapshot.run_count || 0;
  const peak = snapshot.peak_concurrency || 0;
  const providerBonus = snapshot.provider_usage && snapshot.provider_usage[DEFAULT_PROVIDER] ? 8 : 0;
  const retryPenalty = snapshot.retry_rate && snapshot.retry_rate > 0.12 ? 8 : 0;
  const score = Math.min(100, Math.round(runCount / 120 + peak + providerBonus - retryPenalty));

  let tier = 'unverified';
  if (runCount >= 5000 && peak >= 60) {
    tier = 'power';
  } else if (runCount >= 1000 || peak >= 20) {
    tier = 'verified';
  }

  const reasons = [];
  if (runCount >= 1000) reasons.push('Run volume over 1,000 in 30 days');
  if (runCount >= 5000) reasons.push('Run volume over 5,000 in 30 days');
  if (peak >= 20) reasons.push('Peak concurrency over 20');
  if (peak >= 60) reasons.push('Peak concurrency over 60');
  if (providerBonus) reasons.push('Consistent provider usage in telemetry');
  if (retryPenalty) reasons.push('High retry rate detected');

  return { score, tier, reasons: reasons.length ? reasons : ['Usage profile below verification thresholds'] };
}

function getPoolByKey(db, provider, poolType) {
  return db.pools.find(pool => pool.provider === provider && pool.pool_type === poolType);
}

function wtpBandToPrice(band) {
  const mapping = { low: 300, mid: 600, high: 1000 };
  return mapping[band] || 400;
}

function bucketSeatCount(seats) {
  if (seats <= 3) return '1-3';
  if (seats <= 12) return '4-12';
  return '13+';
}

function buildPoolAggregate(db, poolId) {
  const pool = db.pools.find(item => item.id === poolId);
  if (!pool) return null;

  const pledges = db.pledges.filter(item => item.pool_id === poolId);
  const totalSeats = pledges.reduce((sum, pledge) => sum + pledge.seats_intended, 0);
  const verifiedSeats = pledges
    .filter(pledge => pledge.is_verified)
    .reduce((sum, pledge) => sum + pledge.seats_intended, 0);

  const seatHistogram = { '1-3': 0, '4-12': 0, '13+': 0 };
  const wtpDistribution = { low: 0, mid: 0, high: 0 };
  const urgencyDistribution = { today: 0, 'this week': 0, 'this month': 0, unknown: 0 };

  const userIds = [...new Set(pledges.map(pledge => pledge.user_id))];
  const snapshots = userIds.map(userId => findLatestSnapshot(db, userId)).filter(Boolean);

  let impliedMonthly = 0;
  pledges.forEach(pledge => {
    const bucket = bucketSeatCount(pledge.seats_intended);
    seatHistogram[bucket] = (seatHistogram[bucket] || 0) + 1;
    wtpDistribution[pledge.wtp_band] = (wtpDistribution[pledge.wtp_band] || 0) + 1;
    impliedMonthly += pledge.seats_intended * wtpBandToPrice(pledge.wtp_band);

    const incident = findLatestIncident(db, pledge.user_id);
    if (incident && urgencyDistribution[incident.urgency] !== undefined) {
      urgencyDistribution[incident.urgency] += 1;
    } else {
      urgencyDistribution.unknown += 1;
    }
  });

  let avgRunCount = 0;
  let avgPeakConcurrency = 0;
  let providerUsage = 0;

  if (snapshots.length) {
    avgRunCount = Math.round(snapshots.reduce((sum, snap) => sum + (snap.run_count || 0), 0) / snapshots.length);
    avgPeakConcurrency = Math.round(
      snapshots.reduce((sum, snap) => sum + (snap.peak_concurrency || 0), 0) / snapshots.length
    );
    providerUsage = Math.round(
      (snapshots.reduce((sum, snap) => sum + ((snap.provider_usage || {})[pool.provider] || 0), 0) /
        snapshots.length) * 100
    );
  }

  const guardrailMap = db.guardrails.reduce((acc, entry) => {
    acc[entry.user_id] = entry;
    return acc;
  }, {});
  const guardrailUsers = userIds.filter(userId => guardrailMap[userId] && guardrailMap[userId].applied);
  const guardrailAdoption = userIds.length ? Math.round((guardrailUsers.length / userIds.length) * 100) : 0;

  return {
    pool,
    totals: {
      pledged_seats: totalSeats,
      verified_seats: verifiedSeats,
      pledge_count: pledges.length
    },
    histogram: seatHistogram,
    wtp_distribution: wtpDistribution,
    urgency_distribution: urgencyDistribution,
    implied_monthly: impliedMonthly,
    workload_profile: {
      avg_run_count: avgRunCount,
      avg_peak_concurrency: avgPeakConcurrency,
      provider_usage_percent: providerUsage
    },
    guardrail_adoption: guardrailAdoption,
    target_terms: pool.target_terms,
    counterparty: 'Buyer-of-record: TBD (Swimmeret / partner / SPV)'
  };
}

async function handleApi(req, res, pathname, parsedUrl) {
  initFormsDb();
  const db = readDb();

  const pathParts = pathname.split('/').filter(Boolean);
  if (pathParts[0] === 'api' && pathParts[1] === 'forms') {
    const formId = pathParts.length === 3 ? Number(pathParts[2]) : null;

    if (req.method === 'POST' && pathParts.length === 2) {
      const body = await readBody(req);
      const validated = validateFormPayload(body, { requireName: true });
      if (validated.error) return sendJson(res, 400, { error: validated.error });

      const now = nowIso();
      const fieldsJson = JSON.stringify(validated.fields ?? []);
      const stmt = formsDb.prepare(
        'INSERT INTO webforms (name, description, fields_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
      );
      const result = stmt.run(validated.name, validated.description || '', fieldsJson, now, now);
      const row = formsDb.prepare('SELECT * FROM webforms WHERE id = ?').get(result.lastInsertRowid);
      return sendJson(res, 201, normalizeFormRow(row));
    }

    if (req.method === 'GET' && pathParts.length === 2) {
      const limitParam = parsedUrl?.searchParams?.get('limit') || '50';
      const offsetParam = parsedUrl?.searchParams?.get('offset') || '0';
      const limit = Math.min(100, Math.max(1, Number(limitParam)));
      const offset = Math.max(0, Number(offsetParam));
      const stmt = formsDb.prepare(
        'SELECT * FROM webforms ORDER BY created_at DESC LIMIT ? OFFSET ?'
      );
      const rows = stmt.all(limit, offset).map(normalizeFormRow);
      return sendJson(res, 200, { data: rows, limit, offset });
    }

    if (!formId || Number.isNaN(formId)) {
      return sendJson(res, 400, { error: 'invalid form id' });
    }

    if (req.method === 'GET' && pathParts.length === 3) {
      const row = formsDb.prepare('SELECT * FROM webforms WHERE id = ?').get(formId);
      if (!row) return sendJson(res, 404, { error: 'form not found' });
      return sendJson(res, 200, normalizeFormRow(row));
    }

    if (req.method === 'PUT' && pathParts.length === 3) {
      const row = formsDb.prepare('SELECT * FROM webforms WHERE id = ?').get(formId);
      if (!row) return sendJson(res, 404, { error: 'form not found' });

      const body = await readBody(req);
      const validated = validateFormPayload(body, { requireName: false });
      if (validated.error) return sendJson(res, 400, { error: validated.error });

      const existing = normalizeFormRow(row);
      const updated = {
        name: validated.hasName ? validated.name : existing.name,
        description: validated.hasDescription ? validated.description : existing.description,
        fields: validated.hasFields ? validated.fields : existing.fields
      };

      const now = nowIso();
      const stmt = formsDb.prepare(
        'UPDATE webforms SET name = ?, description = ?, fields_json = ?, updated_at = ? WHERE id = ?'
      );
      stmt.run(updated.name, updated.description || '', JSON.stringify(updated.fields || []), now, formId);
      const nextRow = formsDb.prepare('SELECT * FROM webforms WHERE id = ?').get(formId);
      return sendJson(res, 200, normalizeFormRow(nextRow));
    }

    if (req.method === 'DELETE' && pathParts.length === 3) {
      const row = formsDb.prepare('SELECT * FROM webforms WHERE id = ?').get(formId);
      if (!row) return sendJson(res, 404, { error: 'form not found' });
      formsDb.prepare('DELETE FROM webforms WHERE id = ?').run(formId);
      return sendJson(res, 200, { deleted: true, id: formId });
    }

    return sendJson(res, 405, { error: 'method not allowed' });
  }

  if (req.method === 'POST' && pathname === '/api/stability/incidents') {
    const body = await readBody(req);
    let user = db.users.find(item => item.id === body.userId);
    if (!user) {
      user = {
        id: createId('user'),
        email: body.email || '',
        workspace_id: body.workspace_id || 'ws_demo',
        created_at: nowIso()
      };
      db.users.push(user);
    }

    if (body.email && body.email !== user.email) {
      user.email = body.email;
    }

    const incident = {
      id: createId('inc'),
      user_id: user.id,
      incident_type: body.incident_type,
      provider: body.provider || DEFAULT_PROVIDER,
      seats_band: body.seats_band,
      agents_band: body.agents_band,
      urgency: body.urgency,
      consent_telemetry: !!body.consent_telemetry,
      created_at: nowIso()
    };
    db.incidents.push(incident);
    writeDb(db);
    return sendJson(res, 200, { userId: user.id, incidentId: incident.id });
  }

  if (req.method === 'POST' && pathname === '/api/stability/usage-snapshot') {
    const body = await readBody(req);
    const userId = body.userId;
    const latestIncident = findLatestIncident(db, userId);
    const agentsBand = latestIncident ? latestIncident.agents_band : '1-10';
    const baseTelemetry = mapAgentsToTelemetry(agentsBand);

    const consent = body.consent_telemetry !== false;
    const runCount = consent ? baseTelemetry.run_count + Math.floor(Math.random() * 300) : 0;
    const peakConcurrency = consent ? baseTelemetry.peak_concurrency + Math.floor(Math.random() * 6) : 0;

    const snapshot = {
      id: createId('snap'),
      user_id: userId,
      window_days: body.window_days || 30,
      run_count: runCount,
      peak_concurrency: peakConcurrency,
      provider_usage: consent
        ? { [body.provider || DEFAULT_PROVIDER]: 0.72, Other: 0.28 }
        : {},
      token_proxy: consent ? runCount * 250 : 0,
      retry_rate: consent ? Math.round((0.04 + Math.random() * 0.08) * 100) / 100 : null,
      generated_at: nowIso()
    };
    db.usageSnapshots.push(snapshot);
    writeDb(db);
    return sendJson(res, 200, snapshot);
  }

  if (req.method === 'POST' && pathname === '/api/stability/verify') {
    const body = await readBody(req);
    const userId = body.userId;
    const snapshot = findLatestSnapshot(db, userId);
    const result = scoreVerification(snapshot);
    const score = {
      user_id: userId,
      score: result.score,
      tier: result.tier,
      reasons: result.reasons,
      created_at: nowIso()
    };
    db.verificationScores.push(score);
    writeDb(db);
    return sendJson(res, 200, score);
  }

  if (req.method === 'POST' && pathname === '/api/guardrails/apply') {
    const body = await readBody(req);
    const userId = body.userId;
    let entry = db.guardrails.find(item => item.user_id === userId);
    if (!entry) {
      entry = { id: createId('guard'), user_id: userId, applied: false, settings: {}, created_at: nowIso() };
      db.guardrails.push(entry);
    }
    entry.applied = true;
    entry.settings = body.guardrails || {};
    entry.created_at = nowIso();
    writeDb(db);
    return sendJson(res, 200, entry);
  }

  if (req.method === 'POST' && pathname === '/api/pools/join') {
    const body = await readBody(req);
    const provider = body.provider || DEFAULT_PROVIDER;
    const poolType = body.pool_type || 'code_agents';
    let pool = getPoolByKey(db, provider, poolType);
    if (!pool) {
      const poolName = 'Heavy Agent Builders - Stable Lane';
      pool = {
        id: createId('pool'),
        pool_type: poolType,
        provider,
        name: poolName,
        slug: slugify(poolName),
        threshold_seats: 50,
        next_threshold_seats: 100,
        target_terms: [
          'Throughput floor with priority lane during peak',
          'Policy notice window before enforcement changes',
          'Clear acceptable-use envelope for automation',
          'Dedicated escalation path for verified builders'
        ],
        status: 'forming',
        created_at: nowIso()
      };
      db.pools.push(pool);
    }

    const pledge = db.pledges.find(item => item.pool_id === pool.id && item.user_id === body.userId) || null;
    writeDb(db);

    return sendJson(res, 200, {
      pool,
      pledge,
      shareLink: `/p/${pool.slug}`
    });
  }

  if (req.method === 'POST' && pathname.startsWith('/api/pools/') && pathname.endsWith('/pledge')) {
    const body = await readBody(req);
    const poolId = pathname.split('/')[3];
    const pool = db.pools.find(item => item.id === poolId);
    if (!pool) return sendJson(res, 404, { error: 'Pool not found' });

    let pledge = db.pledges.find(item => item.pool_id === poolId && item.user_id === body.userId);
    const verification = findLatestVerification(db, body.userId);
    const isVerified = verification && (verification.tier === 'verified' || verification.tier === 'power');

    if (!pledge) {
      pledge = {
        id: createId('pledge'),
        pool_id: poolId,
        user_id: body.userId,
        seats_intended: body.seats_intended,
        wtp_band: body.wtp_band,
        contact: body.contact || '',
        referral_code_used: body.referral_code_used || null,
        created_at: nowIso(),
        is_verified: !!isVerified
      };
      db.pledges.push(pledge);
    } else {
      pledge.seats_intended = body.seats_intended;
      pledge.wtp_band = body.wtp_band;
      pledge.contact = body.contact || pledge.contact;
      pledge.referral_code_used = body.referral_code_used || pledge.referral_code_used;
      pledge.is_verified = !!isVerified;
      pledge.created_at = nowIso();
    }

    const user = db.users.find(item => item.id === body.userId);
    if (user && body.contact) {
      user.email = body.contact;
    }

    writeDb(db);
    const aggregate = buildPoolAggregate(db, poolId);
    return sendJson(res, 200, { pledge, aggregate });
  }

  if (req.method === 'GET' && pathname.startsWith('/api/pools/slug/')) {
    const slug = pathname.replace('/api/pools/slug/', '');
    const pool = db.pools.find(item => item.slug === slug);
    if (!pool) return sendJson(res, 404, { error: 'Pool not found' });
    const aggregate = buildPoolAggregate(db, pool.id);
    return sendJson(res, 200, aggregate);
  }

  if (req.method === 'GET' && pathname.startsWith('/api/pools/')) {
    const poolId = pathname.replace('/api/pools/', '').split('/')[0];
    const aggregate = buildPoolAggregate(db, poolId);
    if (!aggregate) return sendJson(res, 404, { error: 'Pool not found' });
    return sendJson(res, 200, aggregate);
  }

  if (req.method === 'GET' && pathname.startsWith('/api/lab/pools/')) {
    const poolId = pathname.replace('/api/lab/pools/', '').split('/')[0];
    const aggregate = buildPoolAggregate(db, poolId);
    if (!aggregate) return sendJson(res, 404, { error: 'Pool not found' });
    return sendJson(res, 200, aggregate);
  }

  return sendJson(res, 404, { error: 'Not found' });
}

const server = http.createServer(async (req, res) => {
  try {
    const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
    const pathname = parsedUrl.pathname;

    if (pathname.startsWith('/api/')) {
      return await handleApi(req, res, pathname, parsedUrl);
    }

    if (pathname.startsWith('/p/')) {
      return sendFile(res, path.join(PUBLIC_DIR, 'pool.html'));
    }

    if (pathname.startsWith('/lab/pools/')) {
      return sendFile(res, path.join(PUBLIC_DIR, 'lab.html'));
    }

    if (pathname === '/' || pathname === '/index.html') {
      return sendFile(res, path.join(PUBLIC_DIR, 'index.html'));
    }

    const safePath = path.normalize(path.join(PUBLIC_DIR, pathname));
    if (!safePath.startsWith(PUBLIC_DIR)) {
      return sendText(res, 403, 'Forbidden');
    }

    if (fs.existsSync(safePath) && fs.statSync(safePath).isFile()) {
      return sendFile(res, safePath);
    }

    return sendText(res, 404, 'Not found');
  } catch (err) {
    return sendJson(res, 500, { error: 'Server error', detail: err.message });
  }
});

server.listen(PORT, () => {
  console.log(`Swimmeret Stability Help running at http://localhost:${PORT}`);
});
