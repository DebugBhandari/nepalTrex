import { randomUUID } from 'crypto';
import { Client as MinioClient } from 'minio';

const IMAGE_DATA_URL_PATTERN = /^data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=\n\r]+)$/;
const DEFAULT_MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const MIME_EXTENSIONS = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
  'image/avif': 'avif',
};

const endpoint = (process.env.MINIO_ENDPOINT || 'localhost').toString().trim();
const port = Number(process.env.MINIO_PORT || 9000);
const useSSL = String(process.env.MINIO_USE_SSL || 'false').toLowerCase() === 'true';
const accessKey = (process.env.MINIO_ACCESS_KEY || 'minioadmin').toString().trim();
const secretKey = (process.env.MINIO_SECRET_KEY || 'minioadmin').toString().trim();
const bucket = (process.env.MINIO_BUCKET || 'nepaltrex').toString().trim();
const publicBaseUrl =
  (process.env.MINIO_PUBLIC_URL || `${useSSL ? 'https' : 'http'}://${endpoint}:${port}`)
    .toString()
    .trim()
    .replace(/\/+$/, '');

let client = null;
let ensureBucketPromise = null;

function isConfigured() {
  return Boolean(endpoint && Number.isFinite(port) && accessKey && secretKey && bucket);
}

function getClient() {
  if (!isConfigured()) {
    throw new Error('MinIO is not configured. Set MINIO_ENDPOINT, MINIO_PORT, MINIO_ACCESS_KEY, MINIO_SECRET_KEY, and MINIO_BUCKET.');
  }

  if (!client) {
    client = new MinioClient({
      endPoint: endpoint,
      port,
      useSSL,
      accessKey,
      secretKey,
    });
  }

  return client;
}

async function ensureBucketExists() {
  if (!ensureBucketPromise) {
    ensureBucketPromise = (async () => {
      const minio = getClient();
      const exists = await minio.bucketExists(bucket);
      if (!exists) {
        await minio.makeBucket(bucket);
      }
    })().catch((error) => {
      ensureBucketPromise = null;
      throw error;
    });
  }

  return ensureBucketPromise;
}

function toPublicUrl(objectName) {
  const encodedPath = objectName
    .split('/')
    .map((part) => encodeURIComponent(part))
    .join('/');
  return `${publicBaseUrl}/${bucket}/${encodedPath}`;
}

function parseImageDataUrl(value) {
  const match = IMAGE_DATA_URL_PATTERN.exec((value || '').toString().trim());
  if (!match) {
    throw new Error('Invalid image data URL');
  }

  const mimeType = match[1].toLowerCase();
  const base64Payload = match[2].replace(/\s+/g, '');
  const bytes = Buffer.from(base64Payload, 'base64');

  if (!bytes.length) {
    throw new Error('Image data is empty');
  }

  if (bytes.length > DEFAULT_MAX_IMAGE_BYTES) {
    throw new Error('Image is too large');
  }

  return { mimeType, bytes };
}

export function isImageDataUrl(value) {
  return IMAGE_DATA_URL_PATTERN.test((value || '').toString().trim());
}

export async function uploadImageDataUrl(dataUrl, folder = 'uploads') {
  const { mimeType, bytes } = parseImageDataUrl(dataUrl);
  const extension = MIME_EXTENSIONS[mimeType] || 'bin';
  const objectName = `${folder.replace(/^\/+|\/+$/g, '')}/${Date.now()}-${randomUUID()}.${extension}`;

  await ensureBucketExists();
  const minio = getClient();
  await minio.putObject(bucket, objectName, bytes, bytes.length, {
    'Content-Type': mimeType,
    'Cache-Control': 'public, max-age=31536000, immutable',
  });

  return toPublicUrl(objectName);
}

export async function resolveImageInput(value, options = {}) {
  const trimmed = (value || '').toString().trim();
  const fallback = (options.fallback || '').toString();
  const folder = options.folder || 'uploads';

  if (!trimmed) {
    return fallback;
  }

  if (isImageDataUrl(trimmed)) {
    return uploadImageDataUrl(trimmed, folder);
  }

  return trimmed;
}
