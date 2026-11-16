/* Veřejná část: přehled, detail hráče, termíny, vysvětlení výpočtů. */
(function () {
  'use strict';
  const { esc, pct, pctColor, avatar, displayName, fmtDate, monthShort, dayName, plural, api } = window.UI;
  const app = document.getElementById('app');
  let ST = null; // vypočtené statistiky
  let sort = { key: 'rank', dir: 1 };

  const BALL = '<img class="ball-deco" src="/img/logo.svg" alt="">';
  const CHEV = '<svg class="chev" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="m6 9 6 6 6-6"/></svg>';

  function bar(v) {
    const w = v === null ? 0 : Math.round(v * 1000) / 10;
    return `<div class="bar" style="--c:${pctColor(v)}"><div class="track"><div class="fill" style="width:${w}%;background:${pctColor(v)}"></div></div><span class="val">${pct(v)}</span></div>`;
  }
  function formDots(form) {
    if (!form.length) return '<span class="muted">–</span>';
    const t = { W: 'V', L: 'P', D: 'R' };
    const title = { W: 'Více výher než proher', L: 'Více proher než výher', D: 'Vyrovnaný den' };
    return `<div class="form">${form.map((f) => `<i class="${f}" title="${title[f]}">${t[f]}</i>`).join('')}</div>`;
  }
  function rankBadge(p) {
    if (p.rank === null) return '<span class="rank none" title="Mimo pořadí">–</span>';
    return `<span class="rank ${p.rank <= 3 ? 'r' + p.rank : ''}">${p.rank}</span>`;
  }

  // ---------------- PŘEHLED ----------------
  function viewHome() {
    const s = ST.settings;
    const last = ST.lastSession;
    const top = ST.players.filter((p) => p.rank !== null).slice(0, 3);
    const order = [top[1], top[0], top[2]].filter(Boolean);

    return `
    <header class="hero">
      <div class="hero-bg" style="background-image:url('/img/hero-arena.jpg')"></div>
      <div class="wrap fade-in">
        <span class="kicker">Sezóna ${esc(s.season)}</span>
        <h1>${esc(s.title)} <span>${esc((s.season || '').replace(/^20(\d\d)/, '$1'))}</span></h1>
        <p class="lead">${esc(s.subtitle)}. Kdo vyhrává nejvíc, kdo chodí nejpravidelněji a jak se komu daří den po dni.</p>
      </div>
    </header>

    <div class="wrap">
      <div class="kpis fade-in">
        <div class="kpi accent"><div class="v num">${ST.sessions.length}</div><div class="l">${plural(ST.sessions.length, 'hrací den', 'hrací dny', 'hracích dnů')}</div></div>
        <div class="kpi"><div class="v num">${ST.totalGames}</div><div class="l">odehraných zápasů</div></div>
        <div class="kpi"><div class="v num">${ST.players.filter((p) => p.played > 0).length}</div><div class="l">hráčů v sezóně</div></div>
        <div class="kpi"><div class="v num">${ST.avgPlayers.toFixed(1).replace('.', ',')}</div><div class="l">Ø hráčů na termín</div></div>
        <div class="kpi"><div class="v num">${last ? fmtDate(last.date, false) : '–'}</div><div class="l">poslední termín</div></div>
      </div>
    </div>

    ${top.length ? `
    <section class="block wrap">
      <div class="section-head"><div><h2>Nejlepší trojice</h2><p>Podle procenta vyhraných zápasů${s.minAttendance ? ` (jen hráči s účastí alespoň ${s.minAttendance} %)` : ''}.</p></div></div>
      <div class="podium">
        ${order.map((p) => `
          <a class="p ${p.rank === 1 ? 'first' : ''} fade-in" href="#/hrac/${p.id}">
            ${BALL}
            <div class="medal m${Math.min(p.rank, 3)}">${p.rank}</div>
            <div class="name">${esc(displayName(p.name))}</div>
            <div class="big num">${pct(p.winPct)}</div>
            <div class="meta"><span>${p.wins} V · ${p.losses} P</span><span>Účast ${pct(p.attendance)}</span><span>${p.played} ${plural(p.played, 'zápas', 'zápasy', 'zápasů')}</span></div>
          </a>`).join('')}
      </div>
    </section>` : ''}

    <section class="block wrap">
      <div class="section-head">
        <div><h2>Tabulka hráčů</h2><p>Kliknutím na hráče zobrazíte jeho vývoj. Řadit lze kliknutím na záhlaví sloupce.</p></div>
      </div>
      <div class="card table-wrap" id="boardWrap">${boardTable()}</div>
    </section>

    <section class="block wrap">
      <div class="grid-2">
        <div class="card pad chart-card">
          <h3>Výhry × účast</h3>
          <p class="sub">Každá tečka je hráč. Vpravo nahoře jsou ti, kdo chodí pravidelně a zároveň vyhrávají.</p>
          ${window.Charts.scatter(ST.players)}
        </div>
        <div class="card pad chart-card">
          <h3>Kolik nás chodí</h3>
          <p class="sub">Počet hráčů a odehraných zápasů na jednotlivých termínech.</p>
          ${window.Charts.sessionBars(ST.sessions)}
        </div>
      </div>
    </section>`;
  }

  function boardTable() {
    const cols = [
      ['rank', '#', ''], ['name', 'Hráč', ''], ['winPct', 'Výhry', ''], ['attendance', 'Účast', ''],
      ['played', 'Odehráno', 'hide-sm'], ['wins', 'V', 'hide-sm'], ['losses', 'P', 'hide-sm'], ['form', 'Forma', 'hide-sm'],
    ];
    const ranked = ST.players.filter((p) => p.rank !== null);
    const others = ST.players.filter((p) => p.rank === null);
    const cmp = (a, b) => {
      const k = sort.key;
      if (k === 'name') return a.name.localeCompare(b.name, 'cs') * sort.dir;
      if (k === 'rank') return ((a.rank ?? 999) - (b.rank ?? 999)) * sort.dir || b.attendance - a.attendance;
      return (((b[k] ?? -1) - (a[k] ?? -1)) * sort.dir) || (a.rank ?? 999) - (b.rank ?? 999);
    };
    const row = (p) => `
      <tr data-id="${p.id}" class="${p.active ? '' : 'inactive'}">
        <td>${rankBadge(p)}</td>
        <td><div class="player-cell">${avatar(p.name)}<div><div class="n">${esc(displayName(p.name))}</div>
          <div class="s">${p.days} ${plural(p.days, 'termín', 'termíny', 'termínů')}${p.firstDate && ST.sessions[0] && p.firstDate !== ST.sessions[0].date ? ` · od ${fmtDate(p.firstDate, false)}` : ''}</div></div></div></td>
        <td class="bar-cell">${bar(p.winPct)}</td>
        <td class="bar-cell">${bar(p.attendance)}</td>
        <td class="hide-sm num"><b>${p.played}</b></td>
        <td class="hide-sm wl"><span class="w">${p.wins}</span></td>
        <td class="hide-sm wl"><span class="l">${p.losses}</span></td>
        <td class="hide-sm">${formDots(p.form)}</td>
      </tr>`;
    let body;
    if (sort.key === 'rank' || !others.length) {
      body = [...ranked].sort(cmp).map(row).join('');
      if (others.length) {
        body += `<tr class="divider"><td colspan="8">Mimo pořadí${ST.settings.minAttendance ? ` – účast pod ${ST.settings.minAttendance} %` : ''}</td></tr>`;
        body += others.map(row).join('');
      }
    } else {
      body = [...ST.players].sort(cmp).map(row).join('');
    }
    return `<table class="board">
      <thead><tr>${cols.map(([k, l, c]) => `<th class="sortable ${c} ${sort.key === k ? 'sorted' : ''}" data-sort="${k}">${l}<span class="arrow">${sort.key === k ? (sort.dir === 1 ? '↓' : '↑') : '↕'}</span></th>`).join('')}</tr></thead>
      <tbody>${body || '<tr><td colspan="8" class="empty">Zatím žádná data.</td></tr>'}</tbody></table>`;
  }

  function bindHome() {
    const wrap = document.getElementById('boardWrap');
    wrap.addEventListener('click', (e) => {
      const th = e.target.closest('th[data-sort]');
      if (th) {
        const k = th.dataset.sort;
        if (k === 'form') return;
        sort = sort.key === k ? { key: k, dir: -sort.dir } : { key: k, dir: 1 };
        wrap.innerHTML = boardTable();
        return;
      }
      const tr = e.target.closest('tr[data-id]');
      if (tr) location.hash = `#/hrac/${tr.dataset.id}`;
    });
  }

  // ---------------- HRÁČ ----------------
  function viewPlayer(id) {
    const p = ST.players.find((x) => x.id === id);
    if (!p) return `<div class="wrap empty"><img src="/img/logo.svg" alt="">Hráč nenalezen. <a href="#/">Zpět na přehled</a></div>`;
    const attended = p.history.filter((h) => h.w !== null);
    const best = attended.reduce((b, h) => (!b || h.w / (h.w + h.l) > b.w / (b.w + b.l) ? h : b), null);
    const rows = [...p.history].reverse().map((h) => {
      if (h.w === null) return `<tr><td>${fmtDate(h.date)}</td><td class="muted" colspan="4">nehrál(a) · ${h.games} ${plural(h.games, 'zápas', 'zápasy', 'zápasů')}</td></tr>`;
      const d = h.w / (h.w + h.l);
      return `<tr><td><b>${fmtDate(h.date)}</b></td><td class="wl"><span class="w">${h.w}</span> : <span class="l">${h.l}</span></td>
        <td class="bar-cell">${bar(d)}</td><td class="num">${pct(h.cumWinPct, 1)}</td></tr>`;
    }).join('');
    const idx = ST.players.indexOf(p);
    const prev = ST.players[idx - 1], next = ST.players[idx + 1];

    let status;
    if (p.rank === null) status = `<span class="pill neutral">Mimo pořadí</span>`;
    else if (p.rank <= 3) status = `<span class="pill ok">${p.rank}. místo</span>`;
    else status = `<span class="pill neutral">${p.rank}. místo</span>`;

    return `
    <header class="banner">
      <div class="hero-bg" style="background-image:url('/img/player.jpg');background-position:center 25%"></div>
      <div class="wrap fade-in">
        <a class="back" href="#/">← Zpět na přehled</a>
        <div class="player-head" style="margin-top:18px">
          ${avatar(p.name)}
          <div><h1 style="margin:0">${esc(displayName(p.name))}</h1>
          <p>${status} &nbsp; ${p.active ? '' : '<span class="pill warn">neaktivní</span>'} Hraje od ${p.firstDate ? fmtDate(p.firstDate) : '–'}</p></div>
        </div>
      </div>
    </header>
    <div class="wrap">
      <div class="stat-grid fade-in">
        <div class="kpi accent"><div class="v num">${pct(p.winPct, 1)}</div><div class="l">výher</div></div>
        <div class="kpi"><div class="v num">${pct(p.attendance)}</div><div class="l">účast</div></div>
        <div class="kpi"><div class="v num">${p.played}</div><div class="l">odehráno</div></div>
        <div class="kpi"><div class="v num" style="color:var(--green)">${p.wins}</div><div class="l">výher</div></div>
        <div class="kpi"><div class="v num" style="color:var(--coral)">${p.losses}</div><div class="l">proher</div></div>
        <div class="kpi"><div class="v num">${p.days}/${ST.sessions.length}</div><div class="l">termínů</div></div>
      </div>

      <section class="block">
        <div class="card pad chart-card">
          <h3>Vývoj během sezóny</h3>
          <p class="sub">Sloupce = úspěšnost v daný den, čára = celková úspěšnost k danému dni. Přerušovaná čára je průměr týmu (${pct(ST.avgWinPct)}).</p>
          ${window.Charts.playerTrend(p, ST.avgWinPct)}
          <div class="legend"><span><i style="background:var(--text)"></i>Celkové výhry %</span><span><i style="background:${pctColor(.7)};opacity:.5"></i>Den – výhry %</span>${best ? `<span>Nejlepší den: <b>${fmtDate(best.date)}</b> (${best.w}:${best.l})</span>` : ''}</div>
        </div>
      </section>

      <section class="block">
        <div class="section-head"><h2>Termín po termínu</h2></div>
        <div class="card table-wrap"><table class="board"><thead><tr><th>Datum</th><th>V : P</th><th>Úspěšnost dne</th><th>Celkem</th></tr></thead>
          <tbody>${rows}</tbody></table></div>
        <div style="display:flex;justify-content:space-between;gap:12px;margin-top:18px;flex-wrap:wrap">
          ${prev ? `<a class="btn" href="#/hrac/${prev.id}">← ${esc(displayName(prev.name))}</a>` : '<span></span>'}
          ${next ? `<a class="btn" href="#/hrac/${next.id}">${esc(displayName(next.name))} →</a>` : ''}
        </div>
      </section>
    </div>`;
  }

  // ---------------- TERMÍNY ----------------
  function viewSessions() {
    const names = Object.fromEntries(ST.players.map((p) => [p.id, p.name]));
    const list = [...ST.sessions].reverse().map((s, i) => {
      const res = Object.entries(s.results).sort((a, b) => b[1].w - a[1].w || a[1].l - b[1].l);
      return `
      <details class="session card fade-in" ${i === 0 ? 'open' : ''}>
        <summary>
          <div class="date-chip"><div class="d">${UI.parseDate(s.date).getDate()}</div><div class="m">${monthShort(s.date)}</div></div>
          <div><div class="title">${dayName(s.date)[0].toUpperCase() + dayName(s.date).slice(1)} ${fmtDate(s.date)}</div>
            <div class="info"><span>🏑 ${s.games} ${plural(s.games, 'zápas', 'zápasy', 'zápasů')}</span><span>👥 ${s.playerCount} ${plural(s.playerCount, 'hráč', 'hráči', 'hráčů')}</span>
            ${s.note ? `<span title="${esc(s.note)}">📝 ${esc(s.note.length > 60 ? s.note.slice(0, 60) + '…' : s.note)}</span>` : ''}</div></div>
          ${CHEV}
        </summary>
        <div class="body"><div class="result-grid">
          ${res.map(([pid, r]) => `<a class="result-item" href="#/hrac/${pid}"><span class="left">${avatar(names[pid] || '?')}<span class="nm">${esc(displayName(names[pid] || 'Neznámý hráč'))}</span></span>
            <span class="wl"><span class="w">${r.w}</span> : <span class="l">${r.l}</span></span></a>`).join('')}
        </div></div>
      </details>`;
    }).join('');
    return `
    <header class="banner">
      <div class="hero-bg" style="background-image:url('/img/goal.jpg');background-position:center 60%"></div>
      <div class="wrap fade-in"><span class="kicker">Sezóna ${esc(ST.settings.season)}</span><h1>Termíny</h1>
      <p>${ST.sessions.length} ${plural(ST.sessions.length, 'hrací den', 'hrací dny', 'hracích dnů')} · ${ST.totalGames} zápasů. U každého hráče je počet výher : proher.</p></div>
    </header>
    <section class="block wrap"><div class="sessions">${list || '<div class="card empty">Zatím žádné termíny.</div>'}</div></section>`;
  }

  // ---------------- INFO ----------------
  function viewInfo() {
    const min = ST.settings.minAttendance;
    return `
    <header class="banner">
      <div class="hero-bg" style="background-image:url('/img/match.jpg');background-position:center 70%"></div>
      <div class="wrap fade-in"><span class="kicker">Vysvětlivky</span><h1>Jak počítáme</h1><p>Stejné vzorce jako v původní Excelové tabulce.</p></div>
    </header>
    <section class="block wrap">
      <div class="info-grid">
        <div class="card pad"><div class="icon">V</div><h3>Výhry %</h3><p class="muted">Podíl vyhraných zápasů ze všech, které hráč odehrál.</p><code class="formula">výhry ÷ (výhry + prohry)</code></div>
        <div class="card pad"><div class="icon">Ú</div><h3>Účast %</h3><p class="muted">Kolik ze všech zápasů sezóny hráč odehrál. Počítá se po zápasech, ne po dnech.</p><code class="formula">odehráno ÷ ${ST.totalGames} zápasů celkem</code></div>
        <div class="card pad"><div class="icon">#</div><h3>Pořadí</h3><p class="muted">Řadí se podle Výhry %. Stejné procento = stejné místo (např. dvě 3. místa, pak hned 5.).</p><code class="formula">RANK(Výhry %)</code></div>
      </div>
      <div class="prose" style="margin-top:36px">
        <h3>Jak vypadají data</h3>
        <p>Každý hrací den (obvykle pondělí) se odehraje několik krátkých zápasů – v sezóně zatím 2 až 4. Týmy se mezi zápasy promíchávají, proto se u každého hráče zapisuje, <b>kolik zápasů ten den vyhrál a kolik prohrál</b>. Kdo přišel na celý termín, má součet výher a proher rovný počtu zápasů daného dne.</p>
        <p>Když přijde lichý počet hráčů, týmy nejsou stejně velké, a tak se součet všech výher za den nemusí rovnat součtu všech proher. To je v pořádku.</p>
        <h3>Na co si dát pozor</h3>
        <ul>
          <li><b>Malý počet zápasů zkresluje.</b> Hráč se 4 zápasy a 3 výhrami má 75 %, ale jde spíš o náhodu než o formu. Pořadí je proto dobré číst vždy spolu s účastí.</li>
          <li><b>Účast</b> se počítá ze všech zápasů sezóny – i pro hráče, kteří se přidali později.</li>
          <li>Administrátor může nastavit <b>minimální účast pro zařazení do pořadí</b>. Aktuálně: <b>${min ? `${min} %` : 'bez omezení (jako v Excelu)'}</b>.</li>
        </ul>
      </div>
    </section>`;
  }

  // ---------------- router ----------------
  async function load() {
    const data = await api('/api/data');
    ST = window.FlorbalStats.compute(data);
    document.getElementById('brandTitle').textContent = ST.settings.title;
    document.getElementById('brandSeason').textContent = ST.settings.season;
    document.title = `${ST.settings.title} ${ST.settings.season} – statistiky`;
  }

  function route() {
    const h = location.hash.replace(/^#\/?/, '');
    const [name, id] = h.split('/');
    let html, active = name || 'home';
    if (name === 'hrac') html = viewPlayer(id);
    else if (name === 'terminy') html = viewSessions();
    else if (name === 'info') html = viewInfo();
    else { html = viewHome(); active = 'home'; }
    app.innerHTML = html;
    document.querySelectorAll('.nav-links a[data-route]').forEach((a) => a.classList.toggle('active', a.dataset.route === active));
    if (active === 'home') bindHome();
    window.Charts.bindTooltips(app);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  document.getElementById('credits').innerHTML = UI.credits();
  const themeBtn = document.getElementById('themeBtn');
  themeBtn.innerHTML = UI.SUN;
  themeBtn.addEventListener('click', UI.toggleTheme);

  load().then(() => { route(); window.addEventListener('hashchange', route); })
    .catch((e) => { app.innerHTML = `<div class="wrap empty">Nepodařilo se načíst data: ${esc(e.message)}</div>`; });
})();
