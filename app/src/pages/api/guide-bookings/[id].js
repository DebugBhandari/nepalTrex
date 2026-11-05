import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../lib/auth-options';
import { pool } from '../../../lib/db';
import { activateConversation, createChatNotifications } from '../../../lib/chats';

export default async function handler(req, res) {
  if (req.method !== 'PATCH') return res.status(405).json({ error: 'Method not allowed' });
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) return res.status(401).json({ error: 'Authentication required' });
  const id = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
  const { status, guideNote } = req.body || {};
  if (!['confirmed', 'declined', 'completed'].includes(status)) return res.status(400).json({ error: 'A confirmed, declined, or completed status is required' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const found = await client.query(`SELECT b.*, gp.user_id AS guide_user_id FROM guide_bookings b JOIN guide_profiles gp ON gp.id=b.guide_profile_id WHERE b.id=$1 FOR UPDATE`, [id]);
    const booking = found.rows[0];
    if (!booking) throw Object.assign(new Error('Guide booking not found'), { statusCode: 404 });
    if (booking.guide_user_id !== session.user.id && session.user.role !== 'superUser') throw Object.assign(new Error('Guide booking not found'), { statusCode: 404 });
    const isRespondingToPendingBooking = booking.status === 'pending' && ['confirmed', 'declined'].includes(status);
    const isCompletingConfirmedBooking = booking.status === 'confirmed' && status === 'completed';
    if (!isRespondingToPendingBooking && !isCompletingConfirmedBooking) throw Object.assign(new Error('Only pending guide bookings can be accepted or declined, and only confirmed guide bookings can be completed'), { statusCode: 400 });
    const update = await client.query(`UPDATE guide_bookings SET status=$1, guide_note=CASE WHEN $2::text IS NULL THEN guide_note ELSE $2 END, updated_at=NOW() WHERE id=$3 RETURNING id,status,guide_note,updated_at`, [status, typeof guideNote === 'string' ? guideNote.trim() || null : null, id]);
    await client.query(`INSERT INTO guide_booking_events (guide_booking_id,event_type,previous_status,next_status,note,actor_user_id) VALUES ($1,'guide_status_updated',$2,$3,$4,$5)`, [id, booking.status, status, typeof guideNote === 'string' ? guideNote.trim() || null : null, session.user.id]);
    if (status === 'confirmed') {
      const conversation = await activateConversation(client, 'guide_booking', id);
      if (conversation) await createChatNotifications(client, conversation.id, session.user.id, 'Your guide booking was accepted. You can now message each other.', 'chat_ready');
    }
    await client.query('COMMIT');
    return res.status(200).json({ booking: update.rows[0] });
  } catch (error) { await client.query('ROLLBACK'); return res.status(error.statusCode || 500).json({ error: error.message || 'Failed to update guide booking' }); } finally { client.release(); }
}