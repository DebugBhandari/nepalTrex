import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../lib/auth-options';
import { query } from '../../../../lib/db';

const STATUSES = new Set(['pending', 'approved', 'rejected', 'suspended']);

export default async function handler(req, res) {
  if (req.method !== 'PATCH') return res.status(405).json({ error: 'Method not allowed' });
  const session = await getServerSession(req, res, authOptions);
  if (session?.user?.role !== 'superUser') return res.status(403).json({ error: 'Only superUsers can moderate guides' });
  const status = String(req.body?.approvalStatus || '');
  if (!STATUSES.has(status)) return res.status(400).json({ error: 'Invalid approval status' });
  try {
    const result = await query(`UPDATE guide_profiles SET approval_status = $1, moderation_note = $2, approved_by_user_id = $3, approved_at = CASE WHEN $1 = 'approved' THEN NOW() ELSE approved_at END, updated_at = NOW() WHERE id = $4 RETURNING id, approval_status, moderation_note`, [status, String(req.body?.moderationNote || '').trim() || null, session.user.id, req.query.id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Guide profile not found' });
    return res.status(200).json({ guide: result.rows[0] });
  } catch (error) { return res.status(500).json({ error: error.message || 'Failed to moderate guide' }); }
}