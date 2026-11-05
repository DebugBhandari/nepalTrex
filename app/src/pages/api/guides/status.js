import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../lib/auth-options';
import { query } from '../../../lib/db';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) return res.status(401).json({ error: 'Authentication required' });

  try {
    const result = await query(
      'SELECT approval_status FROM guide_profiles WHERE user_id = $1 LIMIT 1',
      [session.user.id]
    );
    return res.status(200).json({ approvalStatus: result.rows[0]?.approval_status || null });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Unable to load guide status' });
  }
}