/**
 * Statický režim – když web běží bez serverové části (např. složka ručně nahraná na Netlify).
 * Administrace pak pracuje s daty v prohlížeči (koncept v localStorage) a výsledek se zveřejní
 * stažením souboru data.json, jeho nahrazením ve složce a novým nahráním složky.
 * Obsluhuje stejné adresy jako serverové API (lib/core.js), aby admin.js nemusel nic rozlišovat.
 */
(function () {
  'use strict';
  const DRAFT_KEY = 'florbal-draft';

  const isDate = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s));
  const toInt = (v) => { const n = Math.round(Number(v)); return Number.isFinite(n) && n >= 0 ? n : 0; };
  const newId = (p) => p + Array.from(crypto.getRandomValues(new Uint8Array(5)), (b) => b.toString(16).padStart(2, '0')).join('');
  const clone = (o) => JSON.parse(JSON.stringify(o));
  function fail(msg, status = 400, extra) { const e = new Error(msg); e.status = status; e.data = { error: msg, ...(extra || {}) }; throw e; }

  function create(published) {
    let db = null;
    try { db = JSON.parse(localStorage.getItem(DRAFT_KEY)); } catch (_) { db = null; }
    if (!db || !Array.isArray(db.players)) db = clone(published);
    const persist = () => { try { localStorage.setItem(DRAFT_KEY, JSON.stringify(db)); } catch (_) { /* ignore */ } };
    const sorted = () => ({ settings: db.settings, players: db.players, sessions: [...db.sessions].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id)) });

    function validateSession(x) {
      if (!isDate(x.date)) fail('Zadejte platné datum.');
      const games = toInt(x.games);
      if (games < 1 || games > 50) fail('Počet zápasů musí být 1–50.');
      const results = {};
      for (const [pid, r] of Object.entries(x.results || {})) {
        if (!db.players.some((p) => p.id === pid)) continue;
        const w = toInt(r && r.w), l = toInt(r && r.l);
        if (w + l > games) fail('Hráč nemůže mít víc výher + proher, než bylo zápasů.');
        if (w + l > 0) results[pid] = { w, l };
      }
      if (!Object.keys(results).length) fail('Vyplňte výsledky alespoň jednoho hráče.');
      return { date: x.date, games, note: String(x.note || '').slice(0, 300), results };
    }

    function validateBackup(b) {
      if (!b || !Array.isArray(b.players) || !Array.isArray(b.sessions)) fail('Soubor není záloha této aplikace.');
      const ids = new Set(b.players.map((p) => String(p.id)));
      for (const s of b.sessions) {
        if (!isDate(s.date)) fail(`Termín ${s.id} má neplatné datum.`);
        for (const pid of Object.keys(s.results || {})) if (!ids.has(pid)) fail(`Termín ${s.date} odkazuje na neznámého hráče.`);
      }
      return { settings: { ...db.settings, ...(b.settings || {}) }, players: clone(b.players), sessions: clone(b.sessions) };
    }

    async function request(path, opts = {}) {
      const method = (opts.method || 'GET').toUpperCase();
      const parts = path.replace(/^\/?api\//, '').split('/');
      const [kind, id] = parts;
      const b = opts.body || {};

      if (kind === 'data') return sorted();
      if (kind === 'me') return { admin: true, static: true };

      if (kind === 'sessions') {
        if (method === 'POST' && !id) { const s = { id: newId('s'), ...validateSession(b) }; db.sessions.push(s); persist(); return s; }
        const i = db.sessions.findIndex((s) => s.id === id);
        if (i < 0) fail('Termín nenalezen.', 404);
        if (method === 'PUT') { db.sessions[i] = { id, ...validateSession(b) }; persist(); return db.sessions[i]; }
        if (method === 'DELETE') { db.sessions.splice(i, 1); persist(); return { ok: true }; }
      }

      if (kind === 'players') {
        const name = String(b.name || '').trim().replace(/\s+/g, ' ').slice(0, 60);
        const taken = (n, except) => db.players.some((p) => p.id !== except && p.name.toLowerCase() === n.toLowerCase());
        if (method === 'POST' && !id) {
          if (!name) fail('Zadejte jméno hráče.');
          if (taken(name)) fail('Hráč s tímto jménem už existuje.');
          const p = { id: newId('p'), name, active: true }; db.players.push(p); persist(); return p;
        }
        const p = db.players.find((x) => x.id === id);
        if (!p) fail('Hráč nenalezen.', 404);
        if (method === 'PUT') {
          if (b.name !== undefined) { if (!name) fail('Jméno nesmí být prázdné.'); if (taken(name, id)) fail('Hráč s tímto jménem už existuje.'); p.name = name; }
          if (b.active !== undefined) p.active = !!b.active;
          persist(); return p;
        }
        if (method === 'DELETE') {
          const used = db.sessions.filter((s) => s.results[id]).length;
          if (used && !b.force) fail(`Hráč má výsledky ve ${used} termínech. Raději ho deaktivujte, nebo smazání potvrďte.`, 409, { used });
          db.sessions.forEach((s) => { delete s.results[id]; });
          db.sessions = db.sessions.filter((s) => Object.keys(s.results).length);
          db.players = db.players.filter((x) => x.id !== id);
          persist(); return { ok: true };
        }
      }

      if (kind === 'settings' && method === 'PUT') {
        const s = db.settings;
        if (b.title !== undefined) s.title = String(b.title).trim().slice(0, 60) || 'Florbal';
        if (b.season !== undefined) s.season = String(b.season).trim().slice(0, 20);
        if (b.subtitle !== undefined) s.subtitle = String(b.subtitle).trim().slice(0, 120);
        if (b.minAttendance !== undefined) s.minAttendance = Math.min(100, toInt(b.minAttendance));
        persist(); return s;
      }

      if (kind === 'restore' && method === 'POST') {
        const r = validateBackup(b); db = r; persist();
        return { ok: true, players: r.players.length, sessions: r.sessions.length };
      }

      fail('Tato akce není ve statické verzi dostupná.', 404);
    }

    return {
      request,
      /** obsah pro data.json (stejný formát jako záloha) */
      exportJson: () => JSON.stringify(sorted(), null, 2) + '\n',
      hasChanges: () => JSON.stringify(sorted()) !== JSON.stringify({
        settings: published.settings, players: published.players,
        sessions: [...published.sessions].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id)),
      }),
      discard() { try { localStorage.removeItem(DRAFT_KEY); } catch (_) { /* ignore */ } db = clone(published); },
    };
  }

  window.StaticApi = { create };
})();
