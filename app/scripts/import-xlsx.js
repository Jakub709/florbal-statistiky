#!/usr/bin/env node
/**
 * Import úvodní Excelové tabulky (formát "Florbal 26-27.xlsx") do data/db.json.
 *
 * Struktura listu:
 *   ř. 1  – datum hracího dne (sloučené přes 2 sloupce: výhry | prohry)
 *   ř. 2  – počet odehraných zápasů v daný den
 *   ř. 3  – popisky (Hráč, Pořadí, Výhry, Účast, odehráno, výher, proher)
 *   ř. 4+ – hráči: sloupec A jméno, od sloupce H dvojice (výhry, prohry) pro každý den
 *
 * Použití:  node scripts/import-xlsx.js "../Florbal 26-27.xlsx" [--force]
 * Dny bez vyplněného data dostanou datum odhadem (+7 dní od předchozího).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const store = require('../lib/store');

function unzip(buf) {
  // najdi End of Central Directory
  let eocd = -1;
  for (let i = buf.length - 22; i >= 0; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('Soubor není platný .xlsx (ZIP).');
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const files = {};
  for (let n = 0; n < count; n++) {
    const method = buf.readUInt16LE(p + 10);
    const csize = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const local = buf.readUInt32LE(p + 42);
    const name = buf.toString('utf8', p + 46, p + 46 + nameLen);
    const lNameLen = buf.readUInt16LE(local + 26);
    const lExtraLen = buf.readUInt16LE(local + 28);
    const start = local + 30 + lNameLen + lExtraLen;
    const data = buf.subarray(start, start + csize);
    files[name] = method === 8 ? zlib.inflateRawSync(data) : data;
    p += 46 + nameLen + extraLen + commentLen;
  }
  return files;
}

const decode = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');

function colToNum(col) {
  let n = 0;
  for (const ch of col) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n;
}

function readSheet(file) {
  const files = unzip(fs.readFileSync(file));
  const ssXml = files['xl/sharedStrings.xml'] ? files['xl/sharedStrings.xml'].toString('utf8') : '';
  const shared = [...ssXml.matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) =>
    decode([...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) => t[1]).join('')));
  const xml = files['xl/worksheets/sheet1.xml'].toString('utf8');
  const cells = {}; // cells[row][colNum] = value
  for (const m of xml.matchAll(/<c r="([A-Z]+)(\d+)"([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
    const [, col, row, attrs, inner] = m;
    if (!inner) continue;
    const v = inner.match(/<v>([\s\S]*?)<\/v>/);
    if (!v) continue;
    let val = v[1];
    if (/t="s"/.test(attrs)) val = shared[Number(val)];
    else if (/t="str"/.test(attrs) || /t="inlineStr"/.test(attrs)) val = decode(val);
    else val = Number(val);
    (cells[row] ||= {})[colToNum(col)] = val;
  }
  return cells;
}

function excelDate(serial) {
  const d = new Date(Date.UTC(1899, 11, 30) + serial * 86400000);
  return d.toISOString().slice(0, 10);
}
function addDays(iso, days) {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function convert(cells) {
  const FIRST = colToNum('H');
  const playerRows = Object.keys(cells).map(Number).filter((r) => r >= 4 && typeof cells[r][1] === 'string' && cells[r][1].trim());
  const players = playerRows.map((r, i) => ({ id: 'p' + (i + 1), name: cells[r][1].trim(), active: true }));
  const sessions = [];
  let lastDate = null;
  for (let c = FIRST; ; c += 2) {
    const games = cells[2] && cells[2][c];
    if (typeof games !== 'number' || games <= 0) break;
    let date = cells[1] && typeof cells[1][c] === 'number' ? excelDate(cells[1][c]) : null;
    let note = '';
    if (!date) {
      date = lastDate ? addDays(lastDate, 7) : new Date().toISOString().slice(0, 10);
      note = 'Datum doplněno odhadem při importu (v Excelu chybělo).';
    }
    lastDate = date;
    const results = {};
    playerRows.forEach((r, i) => {
      const w = cells[r][c], l = cells[r][c + 1];
      if (typeof w === 'number' || typeof l === 'number') {
        results[players[i].id] = { w: Number(w) || 0, l: Number(l) || 0 };
      }
    });
    sessions.push({ id: 's' + (sessions.length + 1), date, games, note, results });
  }
  return { players, sessions };
}

if (require.main === module) {
  const file = process.argv[2];
  if (!file) { console.error('Použití: node scripts/import-xlsx.js <soubor.xlsx> [--force]'); process.exit(1); }
  const force = process.argv.includes('--force');
  const exists = require('fs').existsSync(store.DB_FILE);
  const db = store.load();
  if (exists && (db.sessions.length || db.players.length) && !force) {
    console.error('Lokální databáze (data/db.json) už obsahuje data. Pro přepsání hráčů a termínů přidejte --force.');
    process.exit(1);
  }
  const { players, sessions } = convert(readSheet(path.resolve(file)));
  db.players = players;
  db.sessions = sessions;
  store.save(db);
  const totalGames = sessions.reduce((a, s) => a + s.games, 0);
  console.log(`Importováno: ${players.length} hráčů, ${sessions.length} hracích dnů, ${totalGames} zápasů.`);
  sessions.filter((s) => s.note).forEach((s) => console.log(`  ! ${s.date}: ${s.note}`));
}

module.exports = { readSheet, convert };
