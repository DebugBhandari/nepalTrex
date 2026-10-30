import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../lib/auth-options';
import { query } from '../../../lib/db';
import { resolveImageInput } from '../../../lib/object-storage';

const STATUSES = new Set(['pending', 'approved', 'rejected', 'suspended']);

function textList(value) {
  return Array.isArray(value) ? value.map((item) => String(item).trim()).filter(Boolean).slice(0, 20) : [];
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const showAll = req.query.all === 'true';
    const session = showAll ? await getServerSession(req, res, authOptions) : null;
    if (showAll && session?.user?.role !== 'superUser') return res.status(403).json({ error: 'Only superUsers can view all guide applications' });
    try {
      const result = await query(`
          SELECT gp.id, gp.slug, gp.headline, gp.bio, gp.home_region, gp.languages, gp.years_experience,
            CASE WHEN $1 THEN gp.license_number ELSE NULL END AS license_number,
            CASE WHEN $1 THEN gp.license_document_url ELSE NULL END AS license_document_url,
            CASE WHEN $1 THEN gp.citizenship_document_url ELSE NULL END AS citizenship_document_url,
            gp.profile_image_url, gp.approval_status, gp.moderation_note,
          u.id AS user_id, COALESCE(NULLIF(u.display_name, ''), NULLIF(u.username, ''), split_part(u.email, '@', 1)) AS guide_name,
          COALESCE(AVG(r.rating), 0)::numeric(3,1) AS avg_rating, COUNT(r.id)::int AS review_count,
          COUNT(gpk.id) FILTER (WHERE gpk.is_active)::int AS package_count
        FROM guide_profiles gp
        JOIN users u ON u.id = gp.user_id
        LEFT JOIN reviews r ON r.target_type = 'guide' AND r.target_id = gp.id
        LEFT JOIN guide_packages gpk ON gpk.guide_profile_id = gp.id
        ${showAll ? '' : "WHERE gp.approval_status = 'approved'"}
        GROUP BY gp.id, u.id
        ORDER BY CASE gp.approval_status WHEN 'pending' THEN 0 WHEN 'approved' THEN 1 ELSE 2 END, gp.created_at DESC
      `, [showAll]);
      return res.status(200).json({ guides: result.rows });
    } catch (error) { return res.status(500).json({ error: error.message || 'Failed to fetch guides' }); }
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id || session.user.isBanned) return res.status(401).json({ error: 'Authentication required' });
  const { slug, headline, bio, homeRegion, languages, yearsExperience, licenseNumber, licenseDocumentUrl, citizenshipDocumentUrl, profileImageUrl } = req.body || {};
  const normalizedSlug = String(slug || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const years = Number(yearsExperience || 0);
  if (session.user.role !== 'user') return res.status(403).json({ error: 'Only regular user accounts can apply to become guides' });
  if (!normalizedSlug || !String(headline || '').trim() || !String(bio || '').trim() || !String(homeRegion || '').trim() || !Number.isInteger(years) || years < 0 || !String(licenseNumber || '').trim() || !String(licenseDocumentUrl || '').trim() || !String(citizenshipDocumentUrl || '').trim()) return res.status(400).json({ error: 'Slug, profile details, trekking license number and document, and citizenship document are required' });
  try {
    const imageUrl = await resolveImageInput(profileImageUrl, { fallback: session.user.image || '', folder: 'guides' });
    const result = await query(`
      INSERT INTO guide_profiles (user_id, slug, headline, bio, home_region, languages, years_experience, license_number, license_document_url, citizenship_document_url, profile_image_url)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      ON CONFLICT (user_id) DO UPDATE SET slug = EXCLUDED.slug, headline = EXCLUDED.headline, bio = EXCLUDED.bio, home_region = EXCLUDED.home_region, languages = EXCLUDED.languages, years_experience = EXCLUDED.years_experience, license_number = EXCLUDED.license_number, license_document_url = EXCLUDED.license_document_url, citizenship_document_url = EXCLUDED.citizenship_document_url, profile_image_url = EXCLUDED.profile_image_url, approval_status = 'pending', moderation_note = NULL, updated_at = NOW()
      RETURNING *`, [session.user.id, normalizedSlug, headline.trim(), bio.trim(), homeRegion.trim(), textList(languages), years, String(licenseNumber || '').trim(), String(licenseDocumentUrl || '').trim(), String(citizenshipDocumentUrl || '').trim(), imageUrl || null]);
    return res.status(201).json({ guide: result.rows[0] });
  } catch (error) { return res.status(error.code === '23505' ? 400 : 500).json({ error: error.code === '23505' ? 'That guide URL is already in use' : error.message || 'Failed to submit guide application' }); }
}