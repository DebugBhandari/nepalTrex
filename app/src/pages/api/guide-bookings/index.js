import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../lib/auth-options';
import { pool, query } from '../../../lib/db';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user?.id) return res.status(401).json({ error: 'Authentication required' });
    try { const result = await query(`SELECT b.*, gp.slug AS guide_slug, COALESCE(NULLIF(u.display_name,''), NULLIF(u.username,''), split_part(u.email,'@',1)) AS guide_name, p.title AS package_title FROM guide_bookings b JOIN guide_profiles gp ON gp.id=b.guide_profile_id JOIN users u ON u.id=gp.user_id JOIN guide_packages p ON p.id=b.guide_package_id WHERE b.customer_user_id=$1 OR gp.user_id=$1 ORDER BY b.created_at DESC`, [session.user.id]); return res.status(200).json({ bookings: result.rows }); } catch (error) { return res.status(500).json({ error: error.message || 'Failed to fetch guide bookings' }); }
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id || session.user.isBanned) return res.status(401).json({ error: 'Authentication required' });
  const { packageId, startDate, travelerCount, customerNote } = req.body || {};
  const travelers = Number(travelerCount);
  if (!packageId || !/^\d{4}-\d{2}-\d{2}$/.test(String(startDate || '')) || !Number.isInteger(travelers) || travelers < 1) return res.status(400).json({ error: 'A package, start date, and traveler count are required' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const packageResult = await client.query(`SELECT p.*, gp.id AS guide_profile_id, gp.user_id AS guide_user_id, gp.approval_status FROM guide_packages p JOIN guide_profiles gp ON gp.id=p.guide_profile_id WHERE p.id=$1 AND p.is_active=true`, [packageId]);
    const pkg = packageResult.rows[0];
    if (!pkg || pkg.approval_status !== 'approved') { await client.query('ROLLBACK'); return res.status(404).json({ error: 'This guide package is not available' }); }
    if (pkg.guide_user_id === session.user.id) { await client.query('ROLLBACK'); return res.status(400).json({ error: 'You cannot book your own package' }); }
    if (travelers < pkg.group_size_min || travelers > pkg.group_size_max) { await client.query('ROLLBACK'); return res.status(400).json({ error: `This package supports ${pkg.group_size_min}–${pkg.group_size_max} travelers` }); }
    const multiplier = pkg.price_unit === 'per_person' ? travelers : pkg.price_unit === 'per_day' ? pkg.duration_days : 1;
    const booking = await client.query(`INSERT INTO guide_bookings (guide_package_id,guide_profile_id,customer_user_id,start_date,traveler_count,customer_note,quoted_amount,currency) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`, [pkg.id,pkg.guide_profile_id,session.user.id,startDate,travelers,String(customerNote || '').trim() || null,Number(pkg.price_amount) * multiplier,pkg.currency]);
    await client.query(`INSERT INTO guide_booking_events (guide_booking_id,event_type,next_status,note,actor_user_id) VALUES ($1,'requested','pending',$2,$3)`, [booking.rows[0].id, String(customerNote || '').trim() || null, session.user.id]);
    await client.query('COMMIT'); return res.status(201).json({ booking: booking.rows[0] });
  } catch (error) { await client.query('ROLLBACK'); return res.status(500).json({ error: error.message || 'Failed to request booking' }); } finally { client.release(); }
}