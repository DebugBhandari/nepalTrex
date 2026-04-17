import fs from 'fs/promises';
import path from 'path';
import { Pool } from 'pg';

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');

function parseEnvFile(content) {
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const separator = trimmed.indexOf('=');
    if (separator === -1) continue;
    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim().replace(/^['"]|['"]$/g, '');
    if (key && !(key in process.env)) {
      process.env[key] = value;
    }
  }
}

async function loadEnv() {
  for (const candidate of ['.env', 'app/.env']) {
    try {
      const content = await fs.readFile(path.join(repoRoot, candidate), 'utf8');
      parseEnvFile(content);
    } catch {
      // Ignore missing env file.
    }
  }
}

function extractDummySeedSql(content) {
  const marker = '-- DUMMY DATA: STAYS + MENU ITEMS + ORDERS';
  const index = content.indexOf(marker);
  if (index === -1) {
    throw new Error('Could not find stay dummy data block in db/init.sql');
  }
  return content.slice(index);
}

async function reseedDemoStays(client) {
  const initSql = await fs.readFile(path.join(repoRoot, 'db/init.sql'), 'utf8');
  const sql = extractDummySeedSql(initSql);
  await client.query(sql);
}

async function assignLocalStockImages(client) {
  const stayImageBySlug = {
    'ghandruk-homestay': '/stays/village-homestay.jpg',
    'namche-teahouse-hotel': '/stays/khumbu-lodge.jpg',
    'pokhara-lakeside-inn': '/stays/lakeside-boutique.jpg',
    'chitwan-jungle-camp': '/stays/jungle-retreat.jpg',
    'bandipur-heritage-guesthouse': '/stays/heritage-courtyard.jpg',
    'nagarkot-sunrise-lodge': '/stays/sunrise-ridge.jpg',
    'thamel-boutique-hotel': '/stays/heritage-courtyard.jpg',
    'bhaktapur-heritage-inn': '/stays/heritage-courtyard.jpg',
    'patan-cultural-homestay': '/stays/village-homestay.jpg',
    'lumbini-peace-guest-house': '/stays/monastery-guesthouse.jpg',
    'everest-view-hotel': '/stays/alpine-basecamp.jpg',
    'manang-mountain-lodge': '/stays/alpine-basecamp.jpg',
    'lukla-adventure-hotel': '/stays/khumbu-lodge.jpg',
    'dingboche-mountain-lodge': '/stays/alpine-basecamp.jpg',
    'ghorepani-poon-hill-inn': '/stays/sunrise-ridge.jpg',
    'abc-sanctuary-lodge': '/stays/village-homestay.jpg',
    'kyanjin-ri-lodge': '/stays/alpine-basecamp.jpg',
    'gilded-lantern-dhunche': '/stays/village-homestay.jpg',
    'manaslu-circuit-serena': '/stays/alpine-basecamp.jpg',
    'soti-khola-gateway-inn': '/stays/village-homestay.jpg',
    'lo-manthang-kingdom-lodge': '/stays/mustang-inn.jpg',
    'jomsom-gateway-teahouse': '/stays/mustang-inn.jpg',
    'kanchenjunga-sacred-peak-lodge': '/stays/khumbu-lodge.jpg',
    'janakpur-pilgrimage-inn': '/stays/monastery-guesthouse.jpg',
    'lobuche-glacier-rest': '/stays/alpine-basecamp.jpg',
    'gokyo-blue-lake-lodge': '/stays/khumbu-lodge.jpg',
    'chhomrong-hillside-homestay': '/stays/village-homestay.jpg',
    'lama-hotel-riverside-inn': '/stays/village-homestay.jpg',
    'namrung-horizon-lodge': '/stays/alpine-basecamp.jpg',
    'kagbeni-monastery-guesthouse': '/stays/monastery-guesthouse.jpg',
  };

  const stayWhen = Object.entries(stayImageBySlug)
    .map(([slug, imageUrl]) => `WHEN '${slug}' THEN '${imageUrl}'`)
    .join('\n          ');

  await client.query(`
    UPDATE stays
    SET image_url = CASE slug
          ${stayWhen}
          ELSE image_url
        END,
        updated_at = NOW()
    WHERE slug = ANY($1::text[])
  `, [Object.keys(stayImageBySlug)]);

  await client.query(`
    UPDATE menu_items
    SET image_url = CASE
        WHEN category = 'room' AND name ILIKE '%suite%' THEN '/stays/room-suite.jpg'
        WHEN category = 'room' AND (name ILIKE '%dorm%' OR name ILIKE '%bed%') THEN '/stays/room-dorm.jpg'
        WHEN category = 'room' THEN '/stays/room-standard.jpg'
        WHEN category = 'food' AND name ~* '(momo)' THEN '/stays/food-momo.jpg'
        WHEN category = 'food' AND name ~* '(thukpa|soup|stew)' THEN '/stays/food-thukpa.jpg'
        WHEN category = 'food' AND name ~* '(breakfast|tea|toast|porridge|pancake)' THEN '/stays/food-breakfast.jpg'
        ELSE '/stays/food-dal-bhat.jpg'
      END,
      updated_at = NOW()
  `);
}

async function main() {
  await loadEnv();

  const connectionString = process.env.DATABASE_URL || 'postgres://nepaltrex:nepaltrex@localhost:5432/nepaltrex';
  const pool = new Pool({ connectionString });
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await reseedDemoStays(client);
    await assignLocalStockImages(client);
    const countResult = await client.query('SELECT COUNT(*)::int AS count FROM stays');
    await client.query('COMMIT');
    console.log(`Demo stays reseeded successfully. Current stay count: ${countResult.rows[0].count}`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Failed to reseed demo stays:', error.message || error);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();