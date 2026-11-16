/* Administrace: termíny, hráči, nastavení. */
(function () {
  'use strict';
  const { esc, pct, avatar, displayName, fmtDate, plural, api } = window.UI;
  const $ = (s, r = document) => r.querySelector(s);
  const view = $('#view');
  const dlg = $('#sessionDlg');
  let DATA = null, ST = null;
  let STATIC = null; // statický režim (web bez serverové části) – viz static-api.js
  const call = (path, opts) => (STATIC ? STATIC.request(path, opts) : api(path, opts));

  // ---------- statický režim ----------
  function renderStaticBar() {
    if (!STATIC) return;
    const bar = $('#staticBar');
    const changed = STATIC.hasChanges();
    bar.hidden = false;
    bar.className = 'static-bar' + (changed ? ' changed' : '');
    bar.innerHTML = `<div class="wrap">
      <div class="txt">${changed
        ? '<b>Máte nezveřejněné změny.</b> Stáhněte <code>data.json</code>, nahraďte jím stejnojmenný soubor ve složce webu a složku znovu nahrajte na Netlify.'
        : '<b>Verze bez serveru</b> (web nahraný jako složka). Změny se ukládají jen v tomto prohlížeči, dokud je nezveřejníte novým <code>data.json</code>.'}</div>
      <div class="acts">
        <button class="btn sm primary" id="dlData">⬇ Stáhnout data.json</button>
        ${changed ? '<button class="btn sm" id="discard">Zahodit změny</button>' : ''}
      </div></div>`;
    $('#dlData').onclick = () => { UI.download('data.json', STATIC.exportJson()); toast('data.json stažen – nahraďte jím soubor ve složce webu'); };
    const d = $('#discard');
    if (d) d.onclick = () => guard(async () => {
      if (!confirm('Zahodit všechny nezveřejněné změny a vrátit se k datům, která jsou na webu?')) return;
      STATIC.discard(); await reload(); route(); toast('Změny zahozeny');
    });
  }
  function toCsv(data) {
    const sessions = [...data.sessions].sort((a, b) => a.date.localeCompare(b.date));
    const head = ['Hráč', ...sessions.flatMap((s) => [`${s.date} výhry`, `${s.date} prohry`])];
    const rows = data.players.map((p) => [p.name, ...sessions.flatMap((s) => { const r = s.results[p.id]; return r ? [r.w, r.l] : ['', '']; })]);
    rows.unshift(['Počet zápasů', ...sessions.flatMap((s) => [s.games, ''])]);
    const q = (v) => (/[;"\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
    return '﻿' + [head, ...rows].map((r) => r.map(q).join(';')).join('\r\n');
  }

  // ---------- pomocné ----------
  let toastTimer;
  function toast(msg, error = false) {
    const t = $('#toast');
    t.textContent = msg; t.className = 'toast show' + (error ? ' error' : '');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.className = 'toast'; }, 2800);
  }
  async function reload() {
    DATA = await call('api/data');
    ST = window.FlorbalStats.compute(DATA);
    renderStaticBar();
  }
  function addDays(iso, n) {
    const d = UI.parseDate(iso); d.setDate(d.getDate() + n);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  function todayIso() { return addDays(new Date().toISOString().slice(0, 10), 0); }
  function stepper(name, value, max) {
    return `<span class="stepper"><button type="button" data-step="-1" aria-label="Méně">−</button><input type="number" name="${name}" value="${value}" min="0" max="${max}" inputmode="numeric"><button type="button" data-step="1" aria-label="Více">+</button></span>`;
  }
  async function guard(fn) {
    try { await fn(); } catch (e) {
      if (e.status === 401) { showLogin(); return; }
      toast(e.message, true);
    }
  }

  // ---------- přihlášení ----------
  function showLogin() { $('#panel').hidden = true; $('#login').hidden = false; $('#loginForm [name=password]').focus(); }
  async function showPanel() {
    $('#login').hidden = true; $('#panel').hidden = false;
    await reload();
    route();
  }
  $('#loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    $('#loginError').textContent = '';
    try {
      await call('api/login', { method: 'POST', body: { username: f.get('username'), password: f.get('password') } });
      e.target.reset();
      showPanel();
    } catch (err) { $('#loginError').textContent = err.message; }
  });
  $('#logoutBtn').addEventListener('click', async () => { await call('api/logout', { method: 'POST' }); showLogin(); });

  // ---------- TERMÍNY ----------
  function viewSessions() {
    const rows = [...ST.sessions].reverse().map((s) => `
      <tr>
        <td><b>${fmtDate(s.date)}</b><div class="muted" style="font-size:12px">${UI.dayName(s.date)}</div></td>
        <td class="num">${s.games}</td>
        <td class="num">${s.playerCount}</td>
        <td class="wl"><span class="w">${s.totalW}</span> / <span class="l">${s.totalL}</span></td>
        <td class="muted" style="max-width:260px">${esc(s.note || '')}</td>
        <td><div class="actions">
          <button class="btn sm" data-edit="${s.id}">Upravit</button>
          <button class="btn sm danger" data-del="${s.id}" aria-label="Smazat termín">Smazat</button>
        </div></td>
      </tr>`).join('');
    view.innerHTML = `
      <div class="page-head">
        <div><h2>Termíny</h2><p>${ST.sessions.length} ${plural(ST.sessions.length, 'hrací den', 'hrací dny', 'hracích dnů')} · ${ST.totalGames} zápasů · ${DATA.players.length} hráčů</p></div>
        <button class="btn primary" id="newSession">+ Nový termín</button>
      </div>
      <div class="card table-wrap">
        <table class="admin-table">
          <thead><tr><th>Datum</th><th>Zápasů</th><th>Hráčů</th><th>Σ výher / proher</th><th>Poznámka</th><th></th></tr></thead>
          <tbody>${rows || '<tr><td colspan="6" class="empty">Zatím žádné termíny. Začněte tlačítkem „Nový termín“.</td></tr>'}</tbody>
        </table>
      </div>`;
    $('#newSession').addEventListener('click', () => openSession(null));
    view.querySelectorAll('[data-edit]').forEach((b) => b.addEventListener('click', () => openSession(b.dataset.edit)));
    view.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', () => guard(async () => {
      const s = DATA.sessions.find((x) => x.id === b.dataset.del);
      if (!confirm(`Opravdu smazat termín ${fmtDate(s.date)}? Výsledky všech hráčů z tohoto dne se odstraní.`)) return;
      await api(`/api/sessions/${s.id}`, { method: 'DELETE' });
      await reload(); viewSessions(); toast('Termín smazán');
    })));
  }

  function openSession(id) {
    const existing = id ? DATA.sessions.find((s) => s.id === id) : null;
    const last = ST.sessions[ST.sessions.length - 1];
    const date = existing ? existing.date : (last ? addDays(last.date, 7) : todayIso());
    const games = existing ? existing.games : (last ? last.games : 3);
    const results = existing ? existing.results : {};
    const form = $('#sessionForm');
    let showInactive = false;

    function playerRows() {
      const list = DATA.players.filter((p) => p.active !== false || results[p.id] || showInactive);
      list.sort((a, b) => a.name.localeCompare(b.name, 'cs'));
      return list.map((p) => {
        const r = results[p.id];
        return `<div class="pe-row ${r ? 'on' : ''}" data-pid="${p.id}">
          <input type="checkbox" ${r ? 'checked' : ''} aria-label="Přítomen: ${esc(p.name)}">
          <span class="nm">${avatar(p.name)}<span>${esc(displayName(p.name))}${p.active === false ? ' <span class="pill warn">neaktivní</span>' : ''}</span></span>
          <span class="c">${stepper('w', r ? r.w : 0, 50)}</span>
          <span class="c">${stepper('l', r ? r.l : 0, 50)}</span>
        </div>`;
      }).join('');
    }

    form.innerHTML = `
      <div class="dlg-head"><h3>${existing ? 'Upravit termín' : 'Nový termín'}</h3><button type="button" class="btn icon" data-close aria-label="Zavřít">✕</button></div>
      <div class="dlg-body">
        <div class="row-3">
          <label class="field">Datum<input type="date" name="date" value="${date}" required></label>
          <label class="field">Počet zápasů<span>${stepper('games', games, 50)}</span></label>
          <label class="field">Poznámka (nepovinné)<input type="text" name="note" value="${esc(existing ? existing.note : '')}" maxlength="300" placeholder="např. hrálo se jen 40 minut"></label>
        </div>
        <p class="muted" style="font-size:13px;margin:16px 0 0">Zaškrtněte, kdo přišel, a zadejte jeho výhry. Prohry se dopočítají automaticky (zápasy − výhry), ale můžete je upravit, pokud hráč neodehrál všechno.</p>
        <div class="players-entry">
          <div class="pe-head"><span></span><span>Hráč</span><span class="c">Výhry</span><span class="c">Prohry</span></div>
          <div id="peRows">${playerRows()}</div>
        </div>
        <div style="display:flex;gap:14px;align-items:center;flex-wrap:wrap;margin-top:14px">
          <div class="add-player" style="flex:1;min-width:240px"><input type="text" id="quickName" placeholder="Nový hráč – Příjmení Jméno"><button type="button" class="btn" id="quickAdd">Přidat</button></div>
          <label class="check"><input type="checkbox" id="showInactive"> zobrazit neaktivní hráče</label>
        </div>
      </div>
      <div class="dlg-foot">
        <div class="summary-bar" id="summary"></div>
        <div class="right">
          ${existing ? '<button type="button" class="btn danger" id="dlgDelete">Smazat</button>' : ''}
          <button type="button" class="btn" data-close>Zrušit</button>
          <button type="submit" class="btn primary">${existing ? 'Uložit změny' : 'Uložit termín'}</button>
        </div>
      </div>`;

    const rowsEl = $('#peRows', form);
    const gamesInput = form.querySelector('[name=games]');
    const getGames = () => Math.max(1, Number(gamesInput.value) || 1);

    function collect() {
      const out = {};
      rowsEl.querySelectorAll('.pe-row.on').forEach((row) => {
        out[row.dataset.pid] = { w: Number(row.querySelector('[name=w]').value) || 0, l: Number(row.querySelector('[name=l]').value) || 0 };
      });
      return out;
    }
    function summarize() {
      const g = getGames();
      const res = collect();
      const vals = Object.values(res);
      const sw = vals.reduce((a, r) => a + r.w, 0), sl = vals.reduce((a, r) => a + r.l, 0);
      let bad = 0, partial = 0;
      rowsEl.querySelectorAll('.pe-row').forEach((row) => {
        const r = res[row.dataset.pid];
        const over = r && r.w + r.l > g;
        row.classList.toggle('bad', !!over);
        if (over) bad++;
        else if (r && r.w + r.l < g) partial++;
      });
      const pills = [`<span class="pill neutral">👥 ${vals.length} ${plural(vals.length, 'hráč', 'hráči', 'hráčů')}</span>`,
        `<span class="pill neutral">Σ výher <b>${sw}</b> · Σ proher <b>${sl}</b></span>`];
      if (bad) pills.push(`<span class="pill bad">${bad}× víc výsledků než zápasů</span>`);
      if (partial) pills.push(`<span class="pill warn">${partial}× neodehrál vše</span>`);
      if (vals.length && vals.length % 2 === 0 && !partial && sw !== sl) pills.push('<span class="pill warn">Σ výher ≠ Σ proher – zkontrolujte</span>');
      $('#summary', form).innerHTML = pills.join('');
      form.querySelector('[type=submit]').disabled = !!bad || !vals.length;
    }

    form.onclick = (e) => {
      const stepBtn = e.target.closest('[data-step]');
      if (stepBtn) {
        const inp = stepBtn.parentElement.querySelector('input');
        const max = inp.name === 'games' ? 50 : getGames();
        inp.value = Math.max(inp.name === 'games' ? 1 : 0, Math.min(max, (Number(inp.value) || 0) + Number(stepBtn.dataset.step)));
        inp.dispatchEvent(new Event('input', { bubbles: true }));
        return;
      }
      if (e.target.closest('[data-close]')) { dlg.close(); return; }
      const nm = e.target.closest('.pe-row .nm');
      if (nm) { const cb = nm.parentElement.querySelector('input[type=checkbox]'); cb.checked = !cb.checked; cb.dispatchEvent(new Event('change', { bubbles: true })); }
    };
    form.oninput = (e) => {
      const inp = e.target;
      const row = inp.closest('.pe-row');
      if (inp.name === 'w' && row) {
        const g = getGames();
        const w = Math.min(g, Math.max(0, Number(inp.value) || 0));
        if (String(w) !== inp.value) inp.value = w;
        row.querySelector('[name=l]').value = g - w;
      }
      if (inp.name === 'games') {
        const g = getGames();
        rowsEl.querySelectorAll('.pe-row.on').forEach((r) => {
          const wI = r.querySelector('[name=w]'), lI = r.querySelector('[name=l]');
          if (Number(wI.value) > g) wI.value = g;
          lI.value = g - Number(wI.value);
        });
      }
      summarize();
    };
    form.onchange = (e) => {
      if (e.target.id === 'showInactive') {
        Object.assign(results, collect());
        Object.keys(results).forEach((k) => { if (!rowsEl.querySelector(`[data-pid="${k}"].on`) && rowsEl.querySelector(`[data-pid="${k}"]`)) delete results[k]; });
        showInactive = e.target.checked; rowsEl.innerHTML = playerRows(); summarize(); return;
      }
      const row = e.target.closest('.pe-row');
      if (row && e.target.type === 'checkbox') {
        row.classList.toggle('on', e.target.checked);
        if (e.target.checked && Number(row.querySelector('[name=w]').value) + Number(row.querySelector('[name=l]').value) === 0) {
          row.querySelector('[name=l]').value = getGames();
        }
        summarize();
      }
    };
    $('#quickAdd', form).onclick = () => guard(async () => {
      const name = $('#quickName', form).value.trim();
      if (!name) return;
      Object.assign(results, collect());
      const p = await call('api/players', { method: 'POST', body: { name } });
      DATA.players.push(p);
      results[p.id] = { w: 0, l: getGames() };
      rowsEl.innerHTML = playerRows(); $('#quickName', form).value = '';
      summarize(); toast(`Hráč ${displayName(p.name)} přidán`);
    });
    $('#quickName', form).onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); $('#quickAdd', form).click(); } };
    if (existing) {
      $('#dlgDelete', form).onclick = () => guard(async () => {
        if (!confirm(`Opravdu smazat termín ${fmtDate(existing.date)}?`)) return;
        await api(`/api/sessions/${existing.id}`, { method: 'DELETE' });
        dlg.close(); await reload(); viewSessions(); toast('Termín smazán');
      });
    }
    form.onsubmit = (e) => {
      e.preventDefault();
      guard(async () => {
        const body = { date: form.querySelector('[name=date]').value, games: getGames(), note: form.querySelector('[name=note]').value, results: collect() };
        const clash = DATA.sessions.find((s) => s.date === body.date && s.id !== id);
        if (clash && !confirm(`Na ${fmtDate(body.date)} už termín existuje. Uložit i tak jako další termín?`)) return;
        if (existing) await api(`/api/sessions/${id}`, { method: 'PUT', body });
        else await call('api/sessions', { method: 'POST', body });
        dlg.close(); await reload(); viewSessions();
        toast(existing ? 'Termín uložen' : 'Nový termín přidán');
      });
    };
    summarize();
    dlg.showModal();
  }

  // ---------- HRÁČI ----------
  function viewPlayers() {
    const byId = Object.fromEntries(ST.players.map((p) => [p.id, p]));
    const list = [...DATA.players].sort((a, b) => (b.active !== false) - (a.active !== false) || a.name.localeCompare(b.name, 'cs'));
    view.innerHTML = `
      <div class="page-head">
        <div><h2>Hráči</h2><p>Jména zapisujte ve tvaru „Příjmení Jméno“ (jako v původní tabulce). Neaktivní hráči se nenabízí při zadávání termínu, ale jejich statistiky zůstávají.</p></div>
      </div>
      <div class="card pad" style="margin-bottom:16px">
        <form class="add-player" id="addPlayer"><input type="text" name="name" placeholder="Příjmení Jméno" required maxlength="60"><button class="btn primary">+ Přidat hráče</button></form>
      </div>
      <div class="card table-wrap">
        <table class="admin-table">
          <thead><tr><th>Hráč</th><th>Odehráno</th><th>Výhry</th><th>Účast</th><th>Stav</th><th></th></tr></thead>
          <tbody>${list.map((p) => {
            const s = byId[p.id] || {};
            return `<tr class="${p.active === false ? 'off' : ''}" data-pid="${p.id}">
              <td><div class="player-cell">${avatar(p.name)}<input type="text" value="${esc(p.name)}" data-name maxlength="60" aria-label="Jméno"></div></td>
              <td class="num">${s.played || 0}</td>
              <td class="num">${pct(s.winPct)}</td>
              <td class="num">${pct(s.attendance)}</td>
              <td><label class="check"><input type="checkbox" data-active ${p.active !== false ? 'checked' : ''}> aktivní</label></td>
              <td><div class="actions"><button class="btn sm danger" data-del>Smazat</button></div></td>
            </tr>`;
          }).join('')}</tbody>
        </table>
      </div>`;

    $('#addPlayer').addEventListener('submit', (e) => {
      e.preventDefault();
      guard(async () => {
        const name = e.target.name.value;
        await call('api/players', { method: 'POST', body: { name } });
        await reload(); viewPlayers(); toast('Hráč přidán');
      });
    });
    view.querySelectorAll('tr[data-pid]').forEach((tr) => {
      const id = tr.dataset.pid;
      const nameInput = tr.querySelector('[data-name]');
      nameInput.addEventListener('change', () => guard(async () => {
        await api(`/api/players/${id}`, { method: 'PUT', body: { name: nameInput.value } });
        await reload(); toast('Jméno uloženo');
      }));
      nameInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') nameInput.blur(); });
      tr.querySelector('[data-active]').addEventListener('change', (e) => guard(async () => {
        await api(`/api/players/${id}`, { method: 'PUT', body: { active: e.target.checked } });
        await reload(); viewPlayers(); toast(e.target.checked ? 'Hráč aktivován' : 'Hráč deaktivován');
      }));
      tr.querySelector('[data-del]').addEventListener('click', () => guard(async () => {
        const p = DATA.players.find((x) => x.id === id);
        if (!confirm(`Smazat hráče ${displayName(p.name)}?`)) return;
        try {
          await api(`/api/players/${id}`, { method: 'DELETE', body: {} });
        } catch (err) {
          if (err.status !== 409) throw err;
          if (!confirm(`${err.message}\n\nSmazat i se všemi výsledky? (Nelze vrátit.)`)) return;
          await api(`/api/players/${id}`, { method: 'DELETE', body: { force: true } });
        }
        await reload(); viewPlayers(); toast('Hráč smazán');
      }));
    });
  }

  // ---------- NASTAVENÍ ----------
  function viewSettings() {
    const s = DATA.settings;
    view.innerHTML = `
      <div class="page-head"><div><h2>Nastavení</h2><p>Vzhled webu, pravidla pořadí, heslo a zálohy.</p></div></div>
      <div class="settings-grid">
        <form class="card pad" id="siteForm">
          <h3>Web</h3>
          <label class="field">Název<input type="text" name="title" value="${esc(s.title)}" maxlength="60"></label>
          <label class="field">Sezóna<input type="text" name="season" value="${esc(s.season)}" maxlength="20" placeholder="2026/27"></label>
          <label class="field">Podtitulek<input type="text" name="subtitle" value="${esc(s.subtitle)}" maxlength="120"></label>
          <div><button class="btn primary">Uložit</button></div>
        </form>

        <form class="card pad" id="rankForm">
          <h3>Pravidla pořadí</h3>
          <p class="muted" style="margin:0">Minimální účast, od které se hráč započítá do pořadí. 0 % = jako v Excelu (všichni). Doporučujeme kolem 25–30 %, aby hráč se 2–4 zápasy nebyl první jen díky náhodě.</p>
          <div class="range-row"><input type="range" name="minAttendance" min="0" max="80" step="5" value="${s.minAttendance || 0}"><output id="minOut">${s.minAttendance || 0} %</output></div>
          <div class="preview-list" id="minPreview"></div>
          <div><button class="btn primary">Uložit</button></div>
        </form>

        ${STATIC ? `
        <div class="card pad">
          <h3>Jak zveřejnit změny</h3>
          <ol class="muted" style="margin:0;padding-left:20px;display:grid;gap:6px">
            <li>Zapište termíny, hráče nebo nastavení – ukládají se v tomto prohlížeči.</li>
            <li>Klikněte na <b>Stáhnout data.json</b> (nahoře v liště).</li>
            <li>Staženým souborem nahraďte <code>data.json</code> ve složce webu.</li>
            <li>Na Netlify otevřete projekt → <b>Deploys</b> a přetáhněte tam celou složku znovu.</li>
          </ol>
          <p class="muted" style="margin:0">Tato verze nemá přihlášení – změny ale vidí jen ten, kdo je zapsal, dokud nenahraje novou složku na Netlify (k tomu je potřeba účet na Netlify).</p>
        </div>` : `
        <form class="card pad" id="pwdForm" autocomplete="off">
          <h3>Změna hesla</h3>
          <label class="field">Současné heslo<input type="password" name="current" required autocomplete="current-password"></label>
          <label class="field">Nové heslo (min. 8 znaků)<input type="password" name="next" required minlength="8" autocomplete="new-password"></label>
          <label class="field">Nové heslo znovu<input type="password" name="next2" required minlength="8" autocomplete="new-password"></label>
          <div><button class="btn primary">Změnit heslo</button></div>
        </form>`}

        <div class="card pad">
          <h3>Záloha a export</h3>
          <p class="muted" style="margin:0">${STATIC ? 'Zálohu i tabulku pro Excel stáhnete z dat v tomto prohlížeči.' : 'Data jsou uložena na serveru. Pravidelně si stahujte zálohu.'}</p>
          <div style="display:flex;gap:10px;flex-wrap:wrap">
            ${STATIC
              ? '<button class="btn dark" id="expJson">⬇ Záloha (JSON)</button><button class="btn" id="expCsv">⬇ Tabulka pro Excel (CSV)</button>'
              : '<a class="btn dark" href="api/export.json">⬇ Záloha (JSON)</a><a class="btn" href="api/export.csv">⬇ Tabulka pro Excel (CSV)</a>'}
          </div>
          <h3 style="margin-top:8px">Obnova ze zálohy</h3>
          <p class="muted" style="margin:0">Nahraje dříve stažený soubor zálohy (JSON) a <b>nahradí jím všechny současné hráče, termíny i nastavení</b>.${STATIC ? '' : ' Současný stav se předtím automaticky uloží.'}</p>
          <div><label class="btn danger" style="cursor:pointer">⬆ Obnovit ze zálohy…<input type="file" id="restoreFile" accept=".json,application/json" hidden></label></div>
        </div>
      </div>`;

    $('#siteForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const f = e.target;
      guard(async () => {
        await call('api/settings', { method: 'PUT', body: { title: f.title.value, season: f.season.value, subtitle: f.subtitle.value } });
        await reload(); toast('Nastavení uloženo');
      });
    });
    const range = $('#rankForm [name=minAttendance]');
    const preview = () => {
      const v = Number(range.value);
      $('#minOut').textContent = v + ' %';
      const st = window.FlorbalStats.compute({ ...DATA, settings: { ...DATA.settings, minAttendance: v } });
      const out = st.players.filter((p) => p.played > 0 && p.rank === null);
      const leader = st.players.find((p) => p.rank === 1);
      $('#minPreview').innerHTML = (out.length
        ? `Mimo pořadí: ${out.map((p) => `<b>${esc(displayName(p.name))}</b> (${pct(p.attendance)})`).join(', ')}.`
        : 'Do pořadí se započítají všichni hráči.') + (leader ? ` Na 1. místě: <b>${esc(displayName(leader.name))}</b>.` : '');
    };
    range.addEventListener('input', preview); preview();
    $('#rankForm').addEventListener('submit', (e) => {
      e.preventDefault();
      guard(async () => { await call('api/settings', { method: 'PUT', body: { minAttendance: Number(range.value) } }); await reload(); toast('Pravidla uložena'); });
    });
    $('#restoreFile').addEventListener('change', (e) => {
      const file = e.target.files[0];
      e.target.value = '';
      if (!file) return;
      guard(async () => {
        let backup;
        try { backup = JSON.parse(await file.text()); } catch (_) { throw new Error('Soubor není platný JSON.'); }
        const np = Array.isArray(backup.players) ? backup.players.length : '?';
        const ns = Array.isArray(backup.sessions) ? backup.sessions.length : '?';
        if (!confirm(`Obnovit ze zálohy „${file.name}“?\n\nZáloha obsahuje ${np} hráčů a ${ns} termínů.\nSoučasná data (${DATA.players.length} hráčů, ${DATA.sessions.length} termínů) budou nahrazena.`)) return;
        const r = await call('api/restore', { method: 'POST', body: backup });
        await reload(); viewSettings();
        toast(`Obnoveno: ${r.players} hráčů, ${r.sessions} termínů`);
      });
    });
    if (STATIC) {
      const day = new Date().toISOString().slice(0, 10);
      $('#expJson').onclick = () => UI.download(`florbal-zaloha-${day}.json`, STATIC.exportJson());
      $('#expCsv').onclick = () => UI.download(`florbal-${day}.csv`, toCsv(DATA), 'text/csv');
      return;
    }
    $('#pwdForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const f = e.target;
      if (f.next.value !== f.next2.value) { toast('Nová hesla se neshodují', true); return; }
      guard(async () => {
        await call('api/password', { method: 'POST', body: { current: f.current.value, next: f.next.value } });
        f.reset(); toast('Heslo změněno');
      });
    });
  }

  // ---------- router ----------
  function route() {
    const tab = (location.hash || '#terminy').slice(1);
    document.querySelectorAll('#tabs a[data-tab]').forEach((a) => a.classList.toggle('active', a.dataset.tab === tab));
    if (tab === 'hraci') viewPlayers();
    else if (tab === 'nastaveni') viewSettings();
    else viewSessions();
  }
  window.addEventListener('hashchange', () => { if (!$('#panel').hidden) route(); });

  const themeBtn = $('#themeBtn');
  themeBtn.innerHTML = UI.SUN;
  themeBtn.addEventListener('click', UI.toggleTheme);

  // Start: se serverovou částí → přihlášení; bez ní (web nahraný jako složka) → statický režim.
  (async () => {
    let res = null, me = null;
    try { res = await fetch('api/me', { credentials: 'same-origin', cache: 'no-store' }); } catch (_) { res = null; }
    if (res && res.ok) { try { me = await res.json(); } catch (_) { me = null; } }

    if (me && typeof me.admin === 'boolean') {
      if (me.admin) return showPanel();
      showLogin();
      if (me.adminConfigured === false) {
        $('#loginError').textContent = 'Administrátor zatím není nastaven. Na Netlify přidejte proměnnou prostředí ADMIN_PASSWORD (Project configuration → Environment variables) a web znovu nasaďte.';
      }
      return;
    }
    if (res && res.status >= 500) {
      showLogin();
      $('#loginError').textContent = `Server hlásí chybu (${res.status}). Zkuste to prosím později.`;
      return;
    }
    try {
      STATIC = window.StaticApi.create(await UI.fetchPublished());
      $('#logoutBtn').hidden = true;
      await showPanel();
    } catch (e) {
      showLogin();
      $('#loginError').textContent = `Nenašel jsem serverovou část ani soubor data.json (${e.message}).`;
    }
  })();
})();
