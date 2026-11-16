/* Jednoduché SVG grafy bez knihoven. */
(function () {
  'use strict';
  const { esc, pct, pctColor, displayName } = window.UI;

  function tooltip() {
    const el = document.getElementById('tooltip');
    return {
      show(html, x, y) {
        if (!el) return;
        el.innerHTML = html; el.style.opacity = 1;
        const w = el.offsetWidth;
        el.style.left = Math.min(window.innerWidth - w - 8, x + 14) + 'px';
        el.style.top = y + 14 + 'px';
      },
      hide() { if (el) el.style.opacity = 0; },
    };
  }

  function bindTooltips(root) {
    const tt = tooltip();
    root.querySelectorAll('[data-tip]').forEach((n) => {
      n.addEventListener('mousemove', (e) => tt.show(n.getAttribute('data-tip'), e.clientX, e.clientY));
      n.addEventListener('mouseleave', () => tt.hide());
    });
  }

  /** Bodový graf: účast (x) × výhry % (y) */
  function scatter(players, opts = {}) {
    const W = 640, H = 420, m = { t: 20, r: 24, b: 44, l: 48 };
    const iw = W - m.l - m.r, ih = H - m.t - m.b;
    const x = (v) => m.l + v * iw;
    const y = (v) => m.t + (1 - v) * ih;
    const pts = players.filter((p) => p.played > 0);
    const ticks = [0, .25, .5, .75, 1];
    let s = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Graf výher a účasti">`;
    s += '<g class="grid">';
    ticks.forEach((t) => {
      s += `<line x1="${m.l}" x2="${W - m.r}" y1="${y(t)}" y2="${y(t)}"/>`;
      s += `<line y1="${m.t}" y2="${H - m.b}" x1="${x(t)}" x2="${x(t)}"/>`;
    });
    s += '</g>';
    // kvadranty
    s += `<rect x="${x(.5)}" y="${y(1)}" width="${iw / 2}" height="${ih / 2}" fill="rgba(34,197,94,.07)"/>`;
    s += `<rect x="${x(0)}" y="${y(.5)}" width="${iw / 2}" height="${ih / 2}" fill="rgba(255,93,93,.06)"/>`;
    s += `<line x1="${x(.5)}" x2="${x(.5)}" y1="${m.t}" y2="${H - m.b}" stroke="currentColor" stroke-opacity=".25" stroke-dasharray="4 4"/>`;
    s += `<line x1="${m.l}" x2="${W - m.r}" y1="${y(.5)}" y2="${y(.5)}" stroke="currentColor" stroke-opacity=".25" stroke-dasharray="4 4"/>`;
    s += `<text class="quad" x="${W - m.r - 8}" y="${m.t + 20}" text-anchor="end" fill="#16a34a" style="fill:#16a34a">Opory týmu</text>`;
    s += `<text class="quad" x="${m.l + 8}" y="${m.t + 20}">Vítězí, ale chodí málo</text>`;
    s += `<text class="quad" x="${W - m.r - 8}" y="${H - m.b - 10}" text-anchor="end">Stálice</text>`;
    s += `<text class="quad" x="${m.l + 8}" y="${H - m.b - 10}" style="fill:#dc2626">Občasní</text>`;
    ticks.forEach((t) => {
      s += `<text x="${m.l - 8}" y="${y(t) + 4}" text-anchor="end">${t * 100} %</text>`;
      s += `<text x="${x(t)}" y="${H - m.b + 18}" text-anchor="middle">${t * 100} %</text>`;
    });
    s += `<text class="axis-label" x="${m.l + iw / 2}" y="${H - 4}" text-anchor="middle">Účast →</text>`;
    s += `<text class="axis-label" transform="translate(12 ${m.t + ih / 2}) rotate(-90)" text-anchor="middle">Výhry →</text>`;
    const placed = []; // jednoduché odsazení popisků, aby se nepřekrývaly
    [...pts].sort((a, b) => b.winPct - a.winPct).forEach((p) => {
      const cx = x(p.attendance), cy = y(p.winPct);
      const tip = `<b>${esc(displayName(p.name))}</b><br>Výhry ${pct(p.winPct, 1)} · Účast ${pct(p.attendance)}<br>${p.wins} V / ${p.losses} P z ${p.played} zápasů`;
      const right = cx < W - 110;
      const lx = cx + (right ? 11 : -11);
      let ly = cy + 4;
      while (placed.some((q) => q.right === right && Math.abs(q.x - lx) < 70 && Math.abs(q.y - ly) < 13)) ly += 13;
      placed.push({ x: lx, y: ly, right });
      s += `<a href="#/hrac/${p.id}"><circle class="dot" cx="${cx}" cy="${cy}" r="7" fill="${pctColor(p.winPct)}" data-tip="${esc(tip)}"/></a>`;
      s += `<text class="dot-label" x="${lx}" y="${ly}" text-anchor="${right ? 'start' : 'end'}">${esc(p.name.split(' ')[0])}</text>`;
    });
    s += '</svg>';
    return s;
  }

  /** Sloupcový graf: počet hráčů na termínu */
  function sessionBars(sessions) {
    const W = 460, H = 300, m = { t: 24, r: 8, b: 40, l: 28 };
    const iw = W - m.l - m.r, ih = H - m.t - m.b;
    const max = Math.max(12, ...sessions.map((s) => s.playerCount));
    const bw = iw / Math.max(sessions.length, 1);
    let s = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Počet hráčů na termínech">`;
    s += '<g class="grid">';
    for (let v = 0; v <= max; v += 4) s += `<line x1="${m.l}" x2="${W - m.r}" y1="${m.t + ih - (v / max) * ih}" y2="${m.t + ih - (v / max) * ih}"/>`;
    s += '</g>';
    for (let v = 0; v <= max; v += 4) s += `<text x="${m.l - 6}" y="${m.t + ih - (v / max) * ih + 4}" text-anchor="end">${v}</text>`;
    sessions.forEach((se, i) => {
      const h = (se.playerCount / max) * ih;
      const bx = m.l + i * bw + bw * 0.18, w = bw * 0.64;
      const d = window.UI.parseDate(se.date);
      const tip = `<b>${window.UI.fmtDate(se.date)}</b><br>${se.playerCount} hráčů · ${se.games} zápasy`;
      s += `<rect class="bar-v" x="${bx}" y="${m.t + ih - h}" width="${w}" height="${h}" rx="6" data-tip="${esc(tip)}"/>`;
      s += `<text class="bar-val" x="${bx + w / 2}" y="${m.t + ih - h - 6}" text-anchor="middle">${se.playerCount}</text>`;
      s += `<text x="${bx + w / 2}" y="${H - m.b + 16}" text-anchor="middle">${d.getDate()}.${d.getMonth() + 1}.</text>`;
      s += `<text x="${bx + w / 2}" y="${H - m.b + 30}" text-anchor="middle" style="font-size:10px">${se.games} z.</text>`;
    });
    s += '</svg>';
    return s;
  }

  /** Vývoj hráče: denní úspěšnost (sloupce) + kumulativní výhry % (čára) */
  function playerTrend(p, teamAvg) {
    const W = 760, H = 300, m = { t: 20, r: 16, b: 40, l: 48 };
    const iw = W - m.l - m.r, ih = H - m.t - m.b;
    const n = p.history.length;
    const step = iw / Math.max(n, 1);
    const x = (i) => m.l + step * i + step / 2;
    const y = (v) => m.t + (1 - v) * ih;
    let s = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Vývoj úspěšnosti hráče">`;
    s += '<g class="grid">';
    [0, .25, .5, .75, 1].forEach((t) => { s += `<line x1="${m.l}" x2="${W - m.r}" y1="${y(t)}" y2="${y(t)}"/>`; });
    s += '</g>';
    [0, .25, .5, .75, 1].forEach((t) => { s += `<text x="${m.l - 8}" y="${y(t) + 4}" text-anchor="end">${t * 100} %</text>`; });
    s += `<line x1="${m.l}" x2="${W - m.r}" y1="${y(teamAvg)}" y2="${y(teamAvg)}" stroke="#94a3b8" stroke-dasharray="5 5"/>`;
    p.history.forEach((h, i) => {
      const d = window.UI.parseDate(h.date);
      s += `<text x="${x(i)}" y="${H - m.b + 18}" text-anchor="middle">${d.getDate()}.${d.getMonth() + 1}.</text>`;
      if (h.w === null) {
        s += `<text x="${x(i)}" y="${y(0) - 8}" text-anchor="middle" style="font-size:10px">nehrál</text>`;
        return;
      }
      const day = h.w / (h.w + h.l);
      const bh = Math.max(3, day * ih);
      const tip = `<b>${window.UI.fmtDate(h.date)}</b><br>${h.w} výher / ${h.l} proher (${pct(day)})<br>Celkem po tomto dni: ${pct(h.cumWinPct, 1)}`;
      s += `<rect x="${x(i) - step * 0.28}" y="${y(0) - bh}" width="${step * 0.56}" height="${bh}" rx="5" fill="${pctColor(day)}" fill-opacity=".35" data-tip="${esc(tip)}"/>`;
    });
    const pts = p.history.map((h, i) => (h.cumWinPct === null ? null : [x(i), y(h.cumWinPct)])).filter(Boolean);
    if (pts.length) {
      s += `<path d="M${pts.map((q) => q.join(',')).join(' L')}" fill="none" stroke="var(--text)" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>`;
      pts.forEach((q) => { s += `<circle cx="${q[0]}" cy="${q[1]}" r="4.5" fill="var(--volt)" stroke="var(--text)" stroke-width="2"/>`; });
    }
    s += '</svg>';
    return s;
  }

  window.Charts = { scatter, sessionBars, playerTrend, bindTooltips };
})();
