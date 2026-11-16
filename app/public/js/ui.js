/* Sdílené pomocné funkce pro veřejný web i administraci. */
(function () {
  'use strict';

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pct = (v, digits = 0) => (v === null || v === undefined ? '–' : (v * 100).toFixed(digits).replace('.', ',') + ' %');

  /** barevná škála jako podmíněné formátování v Excelu: červená → žlutá → zelená */
  function pctColor(v) {
    if (v === null || v === undefined) return '#94a3b8';
    const t = Math.max(0, Math.min(1, (v - 0.25) / 0.45));
    const hue = Math.round(t * 128);
    return `hsl(${hue} 78% ${t > .4 && t < .7 ? 44 : 48}%)`;
  }

  function hashHue(str) {
    let h = 0;
    for (const ch of str) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return h % 360;
  }
  function initials(name) {
    const parts = name.trim().split(/\s+/);
    // jména jsou ve formátu "Příjmení Jméno" → iniciály Jméno+Příjmení
    return ((parts[1] || '')[0] || '') + ((parts[0] || '')[0] || '');
  }
  function avatar(name, cls = '') {
    const h = hashHue(name);
    return `<span class="avatar ${cls}" style="background:linear-gradient(135deg,hsl(${h} 65% 46%),hsl(${(h + 40) % 360} 70% 32%))">${esc(initials(name).toUpperCase())}</span>`;
  }
  function displayName(name) {
    // "Dymák Petr" → "Petr Dymák"
    const p = name.trim().split(/\s+/);
    return p.length >= 2 ? `${p.slice(1).join(' ')} ${p[0]}` : name;
  }

  const MONTHS = ['led', 'úno', 'bře', 'dub', 'kvě', 'čvn', 'čvc', 'srp', 'zář', 'říj', 'lis', 'pro'];
  const DAYS = ['neděle', 'pondělí', 'úterý', 'středa', 'čtvrtek', 'pátek', 'sobota'];
  const parseDate = (iso) => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d); };
  const fmtDate = (iso, withYear = true) => { const d = parseDate(iso); return `${d.getDate()}. ${d.getMonth() + 1}.${withYear ? ' ' + d.getFullYear() : ''}`; };
  const monthShort = (iso) => MONTHS[parseDate(iso).getMonth()];
  const dayName = (iso) => DAYS[parseDate(iso).getDay()];

  function plural(n, one, few, many) {
    return n === 1 ? one : n >= 2 && n <= 4 ? few : many;
  }

  async function api(path, opts = {}) {
    const res = await fetch(path, {
      credentials: 'same-origin',
      ...opts,
      headers: { ...(opts.body || (opts.method && opts.method !== 'GET') ? { 'Content-Type': 'application/json' } : {}), ...(opts.headers || {}) },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { const e = new Error(data.error || `Chyba ${res.status}`); e.status = res.status; e.data = data; throw e; }
    return data;
  }

  /** zveřejněná data ze souboru data.json vedle stránky (statická verze bez serveru) */
  async function fetchPublished() {
    const res = await fetch('data.json', { cache: 'no-store' });
    if (!res.ok) throw new Error('Soubor data.json nebyl nalezen.');
    const d = await res.json();
    if (!d || !Array.isArray(d.players) || !Array.isArray(d.sessions)) throw new Error('Soubor data.json má neplatný formát.');
    return d;
  }

  /**
   * Načte data: ze serverového API, a když neexistuje (web nahraný jen jako složka), z data.json.
   * Vrací { data, isStatic }. Při chybě serveru (5xx) statický režim nezapíná.
   */
  async function loadData() {
    let res = null;
    try { res = await fetch('api/data', { credentials: 'same-origin', cache: 'no-store' }); } catch (_) { res = null; }
    if (res && res.ok) {
      try {
        const d = await res.json();
        if (d && Array.isArray(d.players)) return { data: d, isStatic: false };
      } catch (_) { /* není JSON → statická verze */ }
    }
    if (res && res.status >= 500) throw new Error(`Chyba serveru ${res.status}`);
    return { data: await fetchPublished(), isStatic: true };
  }

  /** nabídne soubor ke stažení */
  function download(filename, text, type = 'application/json') {
    const url = URL.createObjectURL(new Blob([text], { type: type + ';charset=utf-8' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: filename });
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // ---- motiv (světlý / tmavý) ----
  const THEME_KEY = 'florbal-theme';
  function applyTheme(t) {
    if (t) document.documentElement.setAttribute('data-theme', t);
    else document.documentElement.removeAttribute('data-theme');
  }
  try { applyTheme(localStorage.getItem(THEME_KEY)); } catch (_) { /* ignore */ }
  function toggleTheme() {
    const cur = document.documentElement.getAttribute('data-theme')
      || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    const next = cur === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    try { localStorage.setItem(THEME_KEY, next); } catch (_) { /* ignore */ }
  }

  const SUN = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';

  function credits() {
    return `Fotografie: Wikimedia Commons, licence <a href="https://creativecommons.org/licenses/by-sa/4.0/deed.cs" target="_blank" rel="noopener">CC BY-SA 4.0</a> –
      <a href="https://commons.wikimedia.org/wiki/File:Marli_areena_TPS_salibandy_(cropped).jpg" target="_blank" rel="noopener">aréna</a> (kallerna),
      <a href="https://commons.wikimedia.org/wiki/File:Floorball_Champions_Cup_2025_Finals_Florbal_MB_-_Pixbo.jpg" target="_blank" rel="noopener">zápas</a> (Prikryl),
      <a href="https://commons.wikimedia.org/wiki/File:WFC2018_Czech_Republic_vs_Finland_Adam_Delong_9.jpg" target="_blank" rel="noopener">hráč</a> (Rolandhino1),
      <a href="https://commons.wikimedia.org/wiki/File:Floorball_goal.jpg" target="_blank" rel="noopener">branka</a> (Santeri Viinamäki).`;
  }

  window.UI = { esc, pct, pctColor, avatar, initials, displayName, fmtDate, monthShort, dayName, parseDate, plural, api, loadData, fetchPublished, download, toggleTheme, SUN, credits };
})();
