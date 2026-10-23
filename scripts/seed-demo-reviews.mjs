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
    if (key && !(key in process.env)) process.env[key] = value;
  }
}

async function loadEnv() {
  for (const candidate of ['.env', 'app/.env']) {
    try {
      parseEnvFile(await fs.readFile(path.join(repoRoot, candidate), 'utf8'));
    } catch {
      // Ignore a missing local env file.
    }
  }
}

const stayComments = [
  'A comfortable and well-managed stay with friendly service, clean rooms, and a welcome rest after a long day on the trail.',
  'The location was excellent for our itinerary. The team was helpful, meals were satisfying, and the atmosphere felt warm.',
  'A dependable mountain stay with thoughtful hospitality. We appreciated the calm setting and practical trekking support.',
];

const trekComments = [
  'A memorable route with beautiful scenery, sensible pacing, and rewarding stops throughout the journey.',
  'Well worth the effort. The trail experience was varied, scenic, and suited to a carefully planned trekking itinerary.',
  'An enjoyable trek with great landscapes and a good balance of challenge, acclimatisation, and village hospitality.',
];

const ratings = [5, 4, 5, 4, 5, 4, 5];

async function main() {
  await loadEnv();
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await client.query(`
      CREATE TABLE IF NOT EXISTS reviews (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        target_type TEXT NOT NULL CHECK (target_type IN ('stay', 'trek')),
        target_id UUID NOT NULL,
        reviewer_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
        comment TEXT NOT NULL CHECK (char_length(trim(comment)) BETWEEN 3 AND 1200),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT reviews_one_per_user_target UNIQUE (target_type, target_id, reviewer_user_id)
      );
      CREATE INDEX IF NOT EXISTS reviews_target_created_at_idx ON reviews(target_type, target_id, created_at DESC);
    `);

    const usersResult = await client.query(`SELECT id FROM users ORDER BY created_at, id LIMIT 12`);
    const users = usersResult.rows.map((row) => row.id);
    if (users.length === 0) throw new Error('No users are available to author demo reviews');

    const targetResults = await Promise.all([
      client.query(`SELECT id, name FROM stays ORDER BY name, id`),
      client.query(`SELECT id, name FROM treks ORDER BY name, id`),
    ]);

    let inserted = 0;
    for (const [targetType, targets, comments] of [
      ['stay', targetResults[0].rows, stayComments],
      ['trek', targetResults[1].rows, trekComments],
    ]) {
      for (let index = 0; index < targets.length; index += 1) {
        const target = targets[index];
        const result = await client.query(
          `INSERT INTO reviews (target_type, target_id, reviewer_user_id, rating, comment)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (target_type, target_id, reviewer_user_id) DO NOTHING`,
          [
            targetType,
            target.id,
            users[index % users.length],
            ratings[index % ratings.length],
            comments[index % comments.length],
          ]
        );
        inserted += result.rowCount;
      }
    }

    await client.query('COMMIT');
    console.log(`Demo reviews seeded successfully. Inserted ${inserted} new reviews for ${targetResults[0].rowCount} stays and ${targetResults[1].rowCount} treks.`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Failed to seed demo reviews:', error.message || error);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();