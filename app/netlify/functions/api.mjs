/**
 * API pro Netlify – stejná logika jako lokální server (lib/core.js), data v Netlify Blobs.
 * Při prvním spuštění se databáze naplní úvodními daty ze seed-data.mjs (import z Excelu).
 * Počáteční heslo admina: proměnná prostředí ADMIN_PASSWORD (po změně hesla v aplikaci se už nepoužívá).
 */
import { getStore } from '@netlify/blobs';
import core from '../../lib/core.js';
import seed from './seed-data.mjs';

const store = () => getStore({ name: 'florbal', consistency: 'strong' });

const storage = {
  async load() {
    const db = await store().get('db', { type: 'json' });
    return db ?? structuredClone(seed);
  },
  async save(db) {
    await store().setJSON('db', db);
  },
  async initialPassword() {
    return Netlify.env.get('ADMIN_PASSWORD') || null;
  },
  async backup(snapshot) {
    await store().setJSON(`zalohy/pred-obnovou-${new Date().toISOString()}`, snapshot);
  },
};

const handle = core.createApi(storage);

export default async (req, context) => {
  const url = new URL(req.url);
  const bodyText = req.method === 'GET' || req.method === 'HEAD' ? '' : await req.text();
  const out = await handle({
    method: req.method,
    pathname: url.pathname,
    headers: Object.fromEntries(req.headers),
    ip: context.ip,
    bodyText,
    secure: url.protocol === 'https:',
  });
  return new Response(out.body, { status: out.status, headers: { 'X-Content-Type-Options': 'nosniff', ...out.headers } });
};

export const config = { path: '/api/*' };
