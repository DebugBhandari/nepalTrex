import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../lib/auth-options';
import { query } from '../../../../lib/db';

export default async function handler(req, res) {
  if (req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);

  if (!session?.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (session.user.role !== 'superUser') {
    return res.status(403).json({ error: 'Only superUsers can update trek descriptions' });
  }

  const trekId = req.query.id;
  const { description } = req.body;

  if (!trekId) {
    return res.status(400).json({ error: 'Missing trek id' });
  }

  if (typeof description !== 'string') {
    return res.status(400).json({ error: 'Description must be a string' });
  }

  const trimmedDescription = description.trim();

  try {
    const result = await query(
      `
        UPDATE treks
        SET description = $1, updated_at = NOW()
        WHERE id = $2
        RETURNING id, description
      `,
      [trimmedDescription, trekId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Trek not found' });
    }

    return res.status(200).json({
      message: 'Trek description updated',
      trek: result.rows[0],
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Failed to update trek description' });
  }
}
