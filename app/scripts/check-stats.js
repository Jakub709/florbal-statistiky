#!/usr/bin/env node
/** Kontrola, že výpočty aplikace dávají stejná čísla jako původní Excel (Florbal 26-27.xlsx). */
'use strict';
const path = require('path');
const assert = require('assert');
const { readSheet, convert } = require('./import-xlsx');
const { compute } = require('../public/js/stats');

const file = process.argv[2] || path.join(__dirname, '..', '..', 'Florbal 26-27.xlsx');
const cells = readSheet(file);
const data = convert(cells);
const st = compute({ settings: { minAttendance: 0 }, ...data });

let checked = 0;
for (const row of Object.keys(cells).map(Number).filter((r) => r >= 4 && typeof cells[r][1] === 'string')) {
  const c = cells[row];
  const p = st.players.find((x) => x.name === c[1].trim());
  assert.ok(p, `Hráč ${c[1]} chybí`);
  assert.strictEqual(p.rank, c[2], `${p.name}: pořadí ${p.rank} ≠ Excel ${c[2]}`);
  assert.ok(Math.abs(p.winPct - c[3]) < 1e-9, `${p.name}: výhry %`);
  assert.ok(Math.abs(p.attendance - c[4]) < 1e-9, `${p.name}: účast %`);
  assert.strictEqual(p.played, c[5], `${p.name}: odehráno`);
  assert.strictEqual(p.wins, c[6], `${p.name}: výher`);
  assert.strictEqual(p.losses, c[7], `${p.name}: proher`);
  checked++;
}
console.log(`OK – ${checked} hráčů, ${st.sessions.length} hracích dnů, ${st.totalGames} zápasů; pořadí, výhry %, účast %, odehráno, výhry a prohry sedí s Excelem.`);
