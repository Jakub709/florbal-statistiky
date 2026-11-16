#!/usr/bin/env node
/** Vytvoří netlify/functions/seed-data.mjs z data/db.json (bez hesla a tajných klíčů). */
'use strict';
const fs = require('fs');
const path = require('path');
const { load } = require('../lib/store');

const { settings, players, sessions } = load();
const out = path.join(__dirname, '..', 'netlify', 'functions', 'seed-data.mjs');
fs.writeFileSync(out,
  '// Úvodní data pro Netlify (vygenerováno: npm run seed). Použijí se jen při prvním spuštění.\n' +
  `export default ${JSON.stringify({ settings, players, sessions }, null, 2)};\n`, 'utf8');
console.log(`Seed: ${players.length} hráčů, ${sessions.length} termínů → ${path.relative(process.cwd(), out)}`);
