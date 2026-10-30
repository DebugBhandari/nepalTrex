import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../lib/auth-options';
import { query } from '../../../../lib/db';
import { resolveImageInput } from '../../../../lib/object-storage';

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id || session.user.isBanned) return res.status(401).json({ error: 'Authentication required' });
  const profileResult = await query('SELECT id, user_id, approval_status FROM guide_profiles WHERE slug = $1 LIMIT 1', [req.query.slug]);
  const profile = profileResult.rows[0];
  if (!profile) return res.status(404).json({ error: 'Guide profile not found' });
  if (profile.user_id !== session.user.id && session.user.role !== 'superUser') return res.status(403).json({ error: 'You cannot manage this guide profile' });
  if (req.method !== 'GET' && session.user.role !== 'superUser' && profile.approval_status !== 'approved') return res.status(403).json({ error: 'Your guide application must be approved before packages can be created' });
  if (req.method === 'GET') { const result = await query('SELECT * FROM guide_packages WHERE guide_profile_id = $1 ORDER BY created_at DESC', [profile.id]); return res.status(200).json({ packages: result.rows }); }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const p = req.body || {}; const duration = Number(p.durationDays); const price = Number(p.priceAmount); const min = Number(p.groupSizeMin || 1); const max = Number(p.groupSizeMax || min);
  const slug = String(p.slug || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  if (!slug || !String(p.title || '').trim() || !String(p.trekName || '').trim() || !String(p.region || '').trim() || !String(p.summary || '').trim() || !Number.isInteger(duration) || duration < 1 || !Number.isFinite(price) || price < 0 || !Number.isInteger(min) || !Number.isInteger(max) || max < min) return res.status(400).json({ error: 'Complete all package fields with valid pricing and group sizes' });
  try { const image = await resolveImageInput(p.imageUrl, { fallback: '', folder: 'guide-packages' }); const result = await query(`INSERT INTO guide_packages (guide_profile_id,slug,title,trek_name,region,summary,duration_days,group_size_min,group_size_max,price_amount,price_unit,currency,image_url,inclusions,exclusions) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *`, [profile.id,slug,p.title.trim(),p.trekName.trim(),p.region.trim(),p.summary.trim(),duration,min,max,price,['package','per_day','per_person'].includes(p.priceUnit) ? p.priceUnit : 'package',String(p.currency || 'NPR').toUpperCase(),image || null,Array.isArray(p.inclusions) ? p.inclusions.filter(Boolean) : [],Array.isArray(p.exclusions) ? p.exclusions.filter(Boolean) : []]); return res.status(201).json({ package: result.rows[0] }); } catch (error) { return res.status(error.code === '23505' ? 400 : 500).json({ error: error.code === '23505' ? 'Package URL is already in use' : error.message || 'Failed to create package' }); }
}