'use strict';
/** Lokální úložiště: data/db.json s atomickým zápisem (pro server.js a import z Excelu). */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { normalize } = require('./core');

const DATA_DIR = process.env.FLORBAL_DATA_DIR || path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const PASSWORD_FILE = path.join(DATA_DIR, 'PRVNI-HESLO-ADMIN.txt');

function load() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  return normalize(fs.existsSync(DB_FILE) ? JSON.parse(fs.readFileSync(DB_FILE, 'utf8')) : null);
}

function save(db) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const json = JSON.stringify(db, null, 2);
  const tmp = DB_FILE + '.tmp';
  fs.writeFileSync(tmp, json, 'utf8');
  try {
    fs.renameSync(tmp, DB_FILE);
  } catch (e) {
    // OneDrive / antivir občas drží soubor – zapiš napřímo
    fs.writeFileSync(DB_FILE, json, 'utf8');
    try { fs.unlinkSync(tmp); } catch (_) { /* ignore */ }
  }
}

/** Úložiště ve tvaru, který očekává lib/core.js */
const fileStorage = {
  async load() { return load(); },
  async save(db) { save(db); },
  async initialPassword() {
    // první spuštění: vygeneruj heslo a ulož ho do souboru, který si admin přečte
    const password = crypto.randomBytes(6).toString('base64url');
    fs.writeFileSync(PASSWORD_FILE,
      'Přihlášení do administrace\n' +
      `Uživatel: admin\nHeslo:    ${password}\n\n` +
      'Po přihlášení si heslo změňte v Administrace → Nastavení.\n' +
      'Po změně hesla se tento soubor automaticky smaže.\n', 'utf8');
    return password;
  },
  async onPasswordChanged() {
    try { fs.unlinkSync(PASSWORD_FILE); } catch (_) { /* ignore */ }
  },
  async backup(snapshot) {
    const dir = path.join(DATA_DIR, 'zalohy');
    fs.mkdirSync(dir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 23);
    fs.writeFileSync(path.join(dir, `pred-obnovou-${stamp}.json`), JSON.stringify(snapshot, null, 2), 'utf8');
  },
};

module.exports = { load, save, fileStorage, DATA_DIR, DB_FILE, PASSWORD_FILE };
