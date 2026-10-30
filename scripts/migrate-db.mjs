import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { Client } from 'pg';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const migrationsDirectory = path.join(repoRoot, 'db', 'migrations');

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
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
}

function checksum(content) {
  return crypto.createHash('sha256').update(content).digest('hex');
}

function containsTransactionControl(sql) {
  return /^\s*(BEGIN|COMMIT|ROLLBACK)\s*;/im.test(sql);
}

async function loadMigrations() {
  const entries = await fs.readdir(migrationsDirectory, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.sql'))
    .map((entry) => entry.name)
    .sort();

  return Promise.all(
    files.map(async (filename) => {
      const sql = await fs.readFile(path.join(migrationsDirectory, filename), 'utf8');
      return { filename, sql, checksum: checksum(sql) };
    })
  );
}

async function main() {
  await loadEnv();

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is required to run database migrations.');
  }

  const client = new Client({ connectionString });
  await client.connect();

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename TEXT PRIMARY KEY,
        checksum TEXT NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    const migrations = await loadMigrations();

    await client.query('BEGIN');
    try {
      await client.query("SELECT pg_advisory_xact_lock(hashtext('nepaltrex-schema-migrations'))");
      const applied = await client.query('SELECT filename, checksum FROM schema_migrations');
      const appliedByFilename = new Map(applied.rows.map((row) => [row.filename, row.checksum]));

      for (const migration of migrations) {
        const appliedChecksum = appliedByFilename.get(migration.filename);
        if (appliedChecksum) {
          if (appliedChecksum !== migration.checksum) {
            throw new Error(`Migration checksum mismatch for ${migration.filename}. Applied migrations must never be edited.`);
          }
          continue;
        }

        if (containsTransactionControl(migration.sql)) {
          await client.query('COMMIT');
          await client.query(migration.sql);
          await client.query('BEGIN');
          await client.query("SELECT pg_advisory_xact_lock(hashtext('nepaltrex-schema-migrations'))");
        } else {
          await client.query(migration.sql);
        }

        await client.query(
          'INSERT INTO schema_migrations (filename, checksum) VALUES ($1, $2)',
          [migration.filename, migration.checksum]
        );
        console.log(`Applied migration: ${migration.filename}`);
      }

      await client.query('COMMIT');
      console.log(`Database migrations are current (${migrations.length} migration${migrations.length === 1 ? '' : 's'} tracked).`);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(`Database migration failed: ${error.message || error}`);
  process.exitCode = 1;
});