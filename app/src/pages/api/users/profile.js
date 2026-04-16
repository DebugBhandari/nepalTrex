import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../lib/auth-options';
import { query } from '../../../lib/db';
import { isImageDataUrl, resolveImageInput } from '../../../lib/object-storage';

function normalizeHandle(value) {
  return (value || '')
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'user';
}

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);

  if (!session?.user?.id) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (req.method === 'GET') {
    const result = await query(
      `
        SELECT id, username, email, display_name, role, provider, profile_image_url
        FROM users
        WHERE id = $1
        LIMIT 1
      `,
      [session.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const row = result.rows[0];
    const baseName = row.username || row.display_name || (row.email || '').split('@')[0] || 'user';

    return res.status(200).json({
      profile: {
        id: row.id,
        name: row.display_name || row.username || '',
        email: row.email || '',
        role: row.role || 'user',
        provider: row.provider || 'credentials',
        username: row.username || '',
        handle: normalizeHandle(baseName),
        imageUrl: row.profile_image_url || session.user.image || '',
      },
    });
  }

  if (req.method === 'PATCH') {
    const { displayName, imageDataUrl } = req.body || {};

    if (imageDataUrl && (typeof imageDataUrl !== 'string' || (!isImageDataUrl(imageDataUrl) && !/^https?:\/\//i.test(imageDataUrl)))) {
      return res.status(400).json({ error: 'Invalid image format' });
    }

    if (imageDataUrl && imageDataUrl.length > 2_500_000) {
      return res.status(400).json({ error: 'Image is too large' });
    }

    const resolvedProfileImageUrl =
      typeof imageDataUrl === 'string' && imageDataUrl.trim()
        ? await resolveImageInput(imageDataUrl, { folder: 'profiles' })
        : null;

    const result = await query(
      `
        UPDATE users
        SET
          display_name = COALESCE($1, display_name),
          profile_image_url = COALESCE($2, profile_image_url),
          updated_at = NOW()
        WHERE id = $3
        RETURNING id, username, email, display_name, role, provider, profile_image_url
      `,
      [
        typeof displayName === 'string' && displayName.trim() ? displayName.trim() : null,
        resolvedProfileImageUrl,
        session.user.id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const row = result.rows[0];
    const baseName = row.username || row.display_name || (row.email || '').split('@')[0] || 'user';

    return res.status(200).json({
      profile: {
        id: row.id,
        name: row.display_name || row.username || '',
        email: row.email || '',
        role: row.role || 'user',
        provider: row.provider || 'credentials',
        username: row.username || '',
        handle: normalizeHandle(baseName),
        imageUrl: row.profile_image_url || session.user.image || '',
      },
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
