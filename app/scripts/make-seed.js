#!/usr/bin/env node
/**
 * Uloží aktuální data (hráči, termíny, nastavení) do lib/seed-data.js, který je součástí repozitáře.
 * Z těchto dat začíná každá nová kopie aplikace – lokálně (bez data/db.json) i na novém Netlify webu.
 *
 *   npm run sync            → stáhne data z živého webu (veřejné /api/data, žádná hesla)
 *   npm run seed            → vezme data z lokální databáze data/db.json
 *
 * Adresu webu lze změnit proměnnou FLORBAL_URL.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', 'lib', 'seed-data.js');
// totéž pro verzi bez serveru (složka public/ nahraná ručně na Netlify čte data z data.json)
const OUT_JSON = path.join(__dirname, '..', 'public', 'data.json');
const URL_BASE = (process.env.FLORBAL_URL || 'https://florbal-statistiky.netlify.app').replace(/\/$/, '');

function check(d) {
  if (!d || typeof d !== 'object' || !Array.isArray(d.players) || !Array.isArray(d.sessions) || !d.players.length) {
    throw new Error('Data nemají očekávaný tvar (chybí hráči nebo termíny) – nic jsem nepřepsal.');
  }
}

async function main() {
  let data;
  if (process.argv.includes('--from-web')) {
    const res = await fetch(`${URL_BASE}/api/data`, { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`Web vrátil ${res.status}`);
    data = await res.json();
  } else {
    const fileDb = path.join(__dirname, '..', 'data', 'db.json');
    if (!fs.existsSync(fileDb)) throw new Error('Lokální data/db.json neexistuje.');
    data = JSON.parse(fs.readFileSync(fileDb, 'utf8'));
  }
  check(data);
  const { settings, players } = data;
  const sessions = [...data.sessions].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  const content =
    '// Aktuální data aplikace (hráči, termíny, nastavení) – bez hesel a tajných klíčů.\n' +
    '// Generuje se příkazem `npm run sync` (z živého webu) nebo `npm run seed` (z data/db.json).\n' +
    '// Nová kopie aplikace (lokálně i na Netlify) začíná z těchto dat.\n' +
    `module.exports = ${JSON.stringify({ settings, players, sessions }, null, 2)};\n`;
  const json = JSON.stringify({ settings, players, sessions }, null, 2) + '\n';
  const read = (f) => (fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : '');
  if (read(OUT) === content && read(OUT_JSON) === json) {
    console.log(`Beze změny: ${players.length} hráčů, ${sessions.length} termínů.`);
    return;
  }
  fs.writeFileSync(OUT, content, 'utf8');
  fs.writeFileSync(OUT_JSON, json, 'utf8');
  console.log(`Uloženo: ${players.length} hráčů, ${sessions.length} termínů → lib/seed-data.js a public/data.json`);
}

main().catch((e) => { console.error('Chyba:', e.message); process.exit(1); });
