'use strict';
/**
 * Logika API nezávislá na úložišti a serveru.
 * Používá ji lokální server (server.js, data v souboru) i Netlify Function (data v Netlify Blobs).
 *
 * storage = {
 *   load(): Promise<object|null>        – načte celou databázi
 *   save(db): Promise<void>             – uloží celou databázi
 *   initialPassword(): Promise<string|null> – heslo pro první vytvoření admina
 *   onPasswordChanged?(): Promise<void>
 * }
 * req = { method, pathname, headers (malými písmeny), ip, bodyText, secure }
 * vrací { status, headers, body }
 */
const crypto = require('crypto');

const SESSION_HOURS = 12;

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${hash}`;
}
function verifyPassword(password, stored) {
  if (!stored || typeof password !== 'string') return false;
  const [, salt, hash] = stored.split('$');
  const test = crypto.scryptSync(password, salt, 64);
  const ref = Buffer.from(hash, 'hex');
  return ref.length === test.length && crypto.timingSafeEqual(ref, test);
}

function normalize(raw) {
  const base = {
    settings: { title: 'Florbal', season: '2026/27', subtitle: 'Pondělní florbal – statistiky hráčů', minAttendance: 0 },
    admin: null, players: [], sessions: [],
  };
  if (!raw) return base;
  return { ...base, ...raw, settings: { ...base.settings, ...(raw.settings || {}) } };
}

const isDate = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s));
const toInt = (v) => { const n = Math.round(Number(v)); return Number.isFinite(n) && n >= 0 ? n : 0; };
const newId = (prefix) => prefix + crypto.randomBytes(5).toString('hex');

class HttpError extends Error { constructor(status, msg, extra) { super(msg); this.status = status; this.extra = extra; } }

// pokusy o přihlášení (v paměti; v serverless prostředí platí pro jednu instanci)
const failed = new Map();
const rateLimited = (ip) => { const f = failed.get(ip); return f && f.count >= 5 && f.until > Date.now(); };
function noteFailure(ip) {
  const f = failed.get(ip) || { count: 0, until: 0 };
  if (f.until < Date.now()) f.count = 0;
  f.count++; f.until = Date.now() + 60e3;
  failed.set(ip, f);
}

function parseCookies(header) {
  const out = {};
  (header || '').split(';').forEach((p) => {
    const i = p.indexOf('='); if (i > 0) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
  });
  return out;
}

function createApi(storage) {
  const json = (status, obj, headers = {}) => ({
    status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers }, body: JSON.stringify(obj),
  });

  return async function handle(req) {
    try {
      return await route(req);
    } catch (e) {
      if (e instanceof HttpError) return json(e.status, { error: e.message, ...(e.extra || {}) });
      if (e && e.userError) return json(400, { error: e.message });
      console.error(e);
      return json(500, { error: 'Chyba serveru.' });
    }
  };

  async function route(req) {
    let db = normalize(await storage.load());
    let changed = false;
    if (!db.secret) { db.secret = crypto.randomBytes(32).toString('hex'); changed = true; }
    if (!db.admin) {
      const pw = await storage.initialPassword();
      if (pw) { db.admin = { username: 'admin', passwordHash: hashPassword(pw) }; changed = true; }
    }
    if (changed) await storage.save(db);

    const sign = (payload) => crypto.createHmac('sha256', db.secret).update(payload).digest('base64url');
    const cookie = (value, maxAge) => `fb_session=${value}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAge}${req.secure ? '; Secure' : ''}`;
    const makeToken = () => {
      const payload = `${db.admin.username}.${Date.now() + SESSION_HOURS * 3600e3}`;
      return `${payload}.${sign(payload)}`;
    };
    const isAdmin = () => {
      const t = parseCookies(req.headers.cookie).fb_session;
      if (!t || !db.admin) return false;
      const i = t.lastIndexOf('.');
      const payload = t.slice(0, i), sig = t.slice(i + 1), expected = sign(payload);
      if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return false;
      const [user, exp] = payload.split('.');
      return user === db.admin.username && Number(exp) > Date.now();
    };
    const body = () => {
      if (!req.bodyText) return {};
      if (req.bodyText.length > 2e6) throw new HttpError(413, 'Příliš velký požadavek.');
      try { return JSON.parse(req.bodyText); } catch (_) { throw new HttpError(400, 'Neplatný JSON.'); }
    };
    const save = async () => { await storage.save(db); };
    const err = (msg) => { const e = new Error(msg); e.userError = true; return e; };

    const publicData = () => ({
      settings: db.settings, players: db.players,
      sessions: [...db.sessions].sort((a, b) => a.date.localeCompare(b.date)),
    });

    const r = `${req.method} ${req.pathname}`;
    if (r === 'GET /api/data') return json(200, publicData());
    if (r === 'GET /api/me') return json(200, { admin: isAdmin() });

    if (r === 'POST /api/login') {
      if (!db.admin) return json(503, { error: 'Administrátor zatím není nastaven (chybí počáteční heslo).' });
      if (rateLimited(req.ip)) return json(429, { error: 'Příliš mnoho pokusů, zkuste to za minutu.' });
      const b = body();
      if ((b.username || 'admin') !== db.admin.username || !verifyPassword(b.password, db.admin.passwordHash)) {
        noteFailure(req.ip);
        return json(401, { error: 'Nesprávné jméno nebo heslo.' });
      }
      failed.delete(req.ip);
      return json(200, { ok: true }, { 'Set-Cookie': cookie(makeToken(), SESSION_HOURS * 3600) });
    }
    if (r === 'POST /api/logout') return json(200, { ok: true }, { 'Set-Cookie': cookie('', 0) });

    // ---- vše níže jen pro admina ----
    if (!isAdmin()) return json(401, { error: 'Nejste přihlášen(a).' });
    if (req.method !== 'GET' && !(req.headers['content-type'] || '').includes('application/json')) {
      return json(415, { error: 'Očekáván JSON.' });
    }

    const today = new Date().toISOString().slice(0, 10);
    if (r === 'GET /api/export.json') {
      const { settings, players, sessions } = db;
      return {
        status: 200,
        headers: { 'Content-Type': 'application/json; charset=utf-8', 'Content-Disposition': `attachment; filename="florbal-zaloha-${today}.json"` },
        body: JSON.stringify({ settings, players, sessions }, null, 2),
      };
    }
    if (r === 'GET /api/export.csv') {
      return {
        status: 200,
        headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="florbal-${today}.csv"` },
        body: toCsv(db, publicData().sessions),
      };
    }

    const b = req.method === 'GET' ? {} : body();
    const [, , kind, id] = req.pathname.split('/');

    function validateSession(x) {
      if (!isDate(x.date)) throw err('Zadejte platné datum.');
      const games = toInt(x.games);
      if (games < 1 || games > 50) throw err('Počet zápasů musí být 1–50.');
      const results = {};
      for (const [pid, res] of Object.entries(x.results || {})) {
        if (!db.players.some((p) => p.id === pid)) continue;
        const w = toInt(res && res.w), l = toInt(res && res.l);
        if (w + l > games) throw err('Hráč nemůže mít víc výher + proher, než bylo zápasů.');
        if (w + l > 0) results[pid] = { w, l };
      }
      if (!Object.keys(results).length) throw err('Vyplňte výsledky alespoň jednoho hráče.');
      return { date: x.date, games, note: String(x.note || '').slice(0, 300), results };
    }

    // --- termíny ---
    if (kind === 'sessions') {
      if (req.method === 'POST' && !id) {
        const s = { id: newId('s'), ...validateSession(b) };
        db.sessions.push(s); await save();
        return json(201, s);
      }
      const idx = db.sessions.findIndex((s) => s.id === id);
      if (idx < 0) return json(404, { error: 'Termín nenalezen.' });
      if (req.method === 'PUT') {
        db.sessions[idx] = { id, ...validateSession(b) }; await save();
        return json(200, db.sessions[idx]);
      }
      if (req.method === 'DELETE') {
        db.sessions.splice(idx, 1); await save();
        return json(200, { ok: true });
      }
    }

    // --- hráči ---
    if (kind === 'players') {
      const name = String(b.name || '').trim().replace(/\s+/g, ' ').slice(0, 60);
      if (req.method === 'POST' && !id) {
        if (!name) throw err('Zadejte jméno hráče.');
        if (db.players.some((p) => p.name.toLowerCase() === name.toLowerCase())) throw err('Hráč s tímto jménem už existuje.');
        const p = { id: newId('p'), name, active: true };
        db.players.push(p); await save();
        return json(201, p);
      }
      const p = db.players.find((x) => x.id === id);
      if (!p) return json(404, { error: 'Hráč nenalezen.' });
      if (req.method === 'PUT') {
        if (b.name !== undefined) {
          if (!name) throw err('Jméno nesmí být prázdné.');
          if (db.players.some((x) => x.id !== id && x.name.toLowerCase() === name.toLowerCase())) throw err('Hráč s tímto jménem už existuje.');
          p.name = name;
        }
        if (b.active !== undefined) p.active = !!b.active;
        await save();
        return json(200, p);
      }
      if (req.method === 'DELETE') {
        const used = db.sessions.filter((s) => s.results[id]).length;
        if (used && !b.force) {
          return json(409, { error: `Hráč má výsledky ve ${used} termínech. Raději ho deaktivujte, nebo smazání potvrďte.`, used });
        }
        db.sessions.forEach((s) => { delete s.results[id]; });
        db.sessions = db.sessions.filter((s) => Object.keys(s.results).length);
        db.players = db.players.filter((x) => x.id !== id);
        await save();
        return json(200, { ok: true });
      }
    }

    // --- nastavení ---
    if (r === 'PUT /api/settings') {
      const s = db.settings;
      if (b.title !== undefined) s.title = String(b.title).trim().slice(0, 60) || 'Florbal';
      if (b.season !== undefined) s.season = String(b.season).trim().slice(0, 20);
      if (b.subtitle !== undefined) s.subtitle = String(b.subtitle).trim().slice(0, 120);
      if (b.minAttendance !== undefined) s.minAttendance = Math.min(100, toInt(b.minAttendance));
      await save();
      return json(200, s);
    }
    if (r === 'POST /api/restore') {
      const restored = validateBackup(b, db.settings);
      if (storage.backup) {
        const { settings, players, sessions } = db;
        await storage.backup({ settings, players, sessions });
      }
      Object.assign(db, restored);
      await save();
      return json(200, { ok: true, players: restored.players.length, sessions: restored.sessions.length });
    }
    if (r === 'POST /api/password') {
      if (!verifyPassword(b.current, db.admin.passwordHash)) return json(400, { error: 'Současné heslo nesouhlasí.' });
      if (typeof b.next !== 'string' || b.next.length < 8) return json(400, { error: 'Nové heslo musí mít alespoň 8 znaků.' });
      db.admin.passwordHash = hashPassword(b.next);
      db.secret = crypto.randomBytes(32).toString('hex'); // odhlásí ostatní relace
      await save();
      if (storage.onPasswordChanged) await storage.onPasswordChanged();
      return json(200, { ok: true }, { 'Set-Cookie': cookie(makeToken(), SESSION_HOURS * 3600) });
    }

    return json(404, { error: 'Neznámý požadavek.' });
  }
}

/** Kontrola souboru zálohy (formát z /api/export.json) před obnovou. */
function validateBackup(b, currentSettings) {
  const err = (msg) => { const e = new Error(msg); e.userError = true; return e; };
  if (!b || !Array.isArray(b.players) || !Array.isArray(b.sessions)) throw err('Soubor není záloha této aplikace.');
  const ids = new Set();
  const players = b.players.map((p) => {
    const id = String(p.id || '');
    const name = String(p.name || '').trim().slice(0, 60);
    if (!/^[\w-]{1,40}$/.test(id) || !name || ids.has(id)) throw err('Záloha obsahuje neplatného hráče.');
    ids.add(id);
    return { id, name, active: p.active !== false };
  });
  const sids = new Set();
  const sessions = b.sessions.map((s) => {
    const id = String(s.id || '');
    if (!/^[\w-]{1,40}$/.test(id) || sids.has(id)) throw err('Záloha obsahuje neplatný termín.');
    sids.add(id);
    if (!isDate(s.date)) throw err(`Termín ${id} má neplatné datum.`);
    const games = toInt(s.games);
    if (games < 1 || games > 50) throw err(`Termín ${s.date} má neplatný počet zápasů.`);
    const results = {};
    for (const [pid, r] of Object.entries(s.results || {})) {
      if (!ids.has(pid)) throw err(`Termín ${s.date} odkazuje na neznámého hráče.`);
      const w = toInt(r && r.w), l = toInt(r && r.l);
      if (w + l > games) throw err(`Termín ${s.date}: víc výsledků než zápasů.`);
      if (w + l > 0) results[pid] = { w, l };
    }
    return { id, date: s.date, games, note: String(s.note || '').slice(0, 300), results };
  });
  const settings = { ...currentSettings };
  if (b.settings && typeof b.settings === 'object') {
    if (b.settings.title) settings.title = String(b.settings.title).slice(0, 60);
    if (b.settings.season !== undefined) settings.season = String(b.settings.season).slice(0, 20);
    if (b.settings.subtitle !== undefined) settings.subtitle = String(b.settings.subtitle).slice(0, 120);
    if (b.settings.minAttendance !== undefined) settings.minAttendance = Math.min(100, toInt(b.settings.minAttendance));
  }
  return { settings, players, sessions };
}

function toCsv(db, sessions) {
  const head = ['Hráč', ...sessions.flatMap((s) => [`${s.date} výhry`, `${s.date} prohry`])];
  const rows = db.players.map((p) => [p.name, ...sessions.flatMap((s) => {
    const r = s.results[p.id]; return r ? [r.w, r.l] : ['', ''];
  })]);
  rows.unshift(['Počet zápasů', ...sessions.flatMap((s) => [s.games, ''])]);
  const esc = (v) => /[;"\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v);
  return '﻿' + [head, ...rows].map((r) => r.map(esc).join(';')).join('\r\n');
}

module.exports = { createApi, normalize, hashPassword, verifyPassword };
