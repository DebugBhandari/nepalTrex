import { Pool } from 'pg';

const connectionString =
  process.env.DATABASE_URL ||
  'postgres://nepaltrex:nepaltrex@localhost:5432/nepaltrex';

const globalForPg = globalThis;

export const pool =
  globalForPg.__nepalTrexPgPool ||
  new Pool({
    connectionString,
  });

if (!globalForPg.__nepalTrexPgPool) {
  globalForPg.__nepalTrexPgPool = pool;
}

export async function query(text, params = []) {
  const client = await pool.connect();
  try {
    return await client.query(text, params);
  } finally {
    client.release();
  }
}
