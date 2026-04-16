import fs from 'fs/promises';
import path from 'path';
import { Pool } from 'pg';
import { Client as MinioClient } from 'minio';

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');

function parseEnvFile(content) {
  const result = {};
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const rawValue = trimmed.slice(idx + 1).trim();
    const value = rawValue.replace(/^"|"$/g, '').replace(/^'|'$/g, '');
    if (key && !(key in process.env)) {
      process.env[key] = value;
    }
    result[key] = value;
  }
  return result;
}

async function loadEnv() {
  const candidates = [
    path.join(repoRoot, '.env'),
    path.join(repoRoot, 'app/.env'),
  ];

  for (const filePath of candidates) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      parseEnvFile(content);
    } catch {
      // Ignore missing env files.
    }
  }
}

function normalizePublicBaseUrl(raw) {
  return (raw || '').toString().trim().replace(/\/+$/, '');
}

function contentTypeFor(fileName) {
  const ext = path.extname(fileName).toLowerCase();
  switch (ext) {
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.png':
      return 'image/png';
    case '.webp':
      return 'image/webp';
    case '.gif':
      return 'image/gif';
    case '.svg':
      return 'image/svg+xml';
    case '.avif':
      return 'image/avif';
    default:
      return 'application/octet-stream';
  }
}

function toPublicUrl(publicBaseUrl, bucket, objectName) {
  const encodedPath = objectName
    .split('/')
    .map((part) => encodeURIComponent(part))
    .join('/');
  return `${publicBaseUrl}/${bucket}/${encodedPath}`;
}

async function listFiles(dirPath) {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  return entries.filter((entry) => entry.isFile()).map((entry) => entry.name);
}

async function uploadDirectory(minio, bucket, publicBaseUrl, folderName) {
  const localDir = path.join(repoRoot, 'app/public', folderName);
  try {
    await fs.access(localDir);
  } catch {
    return { fileCount: 0, mapping: new Map() };
  }

  const fileNames = await listFiles(localDir);
  const mapping = new Map();

  for (const fileName of fileNames) {
    const localPath = path.join(localDir, fileName);
    const objectName = `${folderName}/${fileName}`;
    const meta = {
      'Content-Type': contentTypeFor(fileName),
      'Cache-Control': 'public, max-age=31536000, immutable',
    };

    await minio.fPutObject(bucket, objectName, localPath, meta);
    mapping.set(`/${folderName}/${fileName}`, toPublicUrl(publicBaseUrl, bucket, objectName));
  }

  return { fileCount: fileNames.length, mapping };
}

async function ensureBucket(minio, bucket) {
  const exists = await minio.bucketExists(bucket);
  if (!exists) {
    await minio.makeBucket(bucket);
  }
}

async function updateDatabase(imageMap) {
  const connectionString = process.env.DATABASE_URL || 'postgres://nepaltrex:nepaltrex@localhost:5432/nepaltrex';
  const pool = new Pool({ connectionString });
  const client = await pool.connect();

  let stayUpdates = 0;
  let menuUpdates = 0;

  try {
    await client.query('BEGIN');

    for (const [oldValue, newValue] of imageMap.entries()) {
      const stayResult = await client.query(
        `
          UPDATE stays
          SET image_url = $1, updated_at = NOW()
          WHERE image_url = $2
        `,
        [newValue, oldValue]
      );
      stayUpdates += stayResult.rowCount;

      const menuResult = await client.query(
        `
          UPDATE menu_items
          SET image_url = $1, updated_at = NOW()
          WHERE image_url = $2
        `,
        [newValue, oldValue]
      );
      menuUpdates += menuResult.rowCount;
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }

  return { stayUpdates, menuUpdates };
}

async function main() {
  await loadEnv();

  const endpoint = (process.env.MINIO_ENDPOINT || 'localhost').toString().trim();
  const port = Number(process.env.MINIO_PORT || 9000);
  const useSSL = String(process.env.MINIO_USE_SSL || 'false').toLowerCase() === 'true';
  const accessKey = (process.env.MINIO_ACCESS_KEY || 'minioadmin').toString().trim();
  const secretKey = (process.env.MINIO_SECRET_KEY || 'minioadmin').toString().trim();
  const bucket = (process.env.MINIO_BUCKET || 'nepaltrex').toString().trim();
  const publicBaseUrl = normalizePublicBaseUrl(
    process.env.MINIO_PUBLIC_URL || `${useSSL ? 'https' : 'http'}://${endpoint}:${port}`
  );

  if (!endpoint || !Number.isFinite(port) || !accessKey || !secretKey || !bucket || !publicBaseUrl) {
    throw new Error('Missing MinIO configuration. Check MINIO_ENDPOINT, MINIO_PORT, MINIO_ACCESS_KEY, MINIO_SECRET_KEY, MINIO_BUCKET, MINIO_PUBLIC_URL.');
  }

  const minio = new MinioClient({
    endPoint: endpoint,
    port,
    useSSL,
    accessKey,
    secretKey,
  });

  await ensureBucket(minio, bucket);

  const stays = await uploadDirectory(minio, bucket, publicBaseUrl, 'stays');
  const treks = await uploadDirectory(minio, bucket, publicBaseUrl, 'treks');

  const mergedMap = new Map([...stays.mapping, ...treks.mapping]);
  const dbResult = await updateDatabase(mergedMap);

  console.log('MinIO image migration complete.');
  console.log(`Uploaded stays images: ${stays.fileCount}`);
  console.log(`Uploaded treks images: ${treks.fileCount}`);
  console.log(`Updated stays.image_url rows: ${dbResult.stayUpdates}`);
  console.log(`Updated menu_items.image_url rows: ${dbResult.menuUpdates}`);
}

main().catch((error) => {
  console.error('Failed to migrate images to MinIO:', error.message || error);
  process.exit(1);
});
