import fs from 'fs/promises';
import path from 'path';
import bcrypt from 'bcryptjs';
import { Pool } from 'pg';

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const password = '12345678';
const guides = [
  { email: 'guide1@guide.com', username: 'maya-sherpa', name: 'Maya Sherpa', slug: 'maya-sherpa', region: 'Everest', years: 12, license: 'NTB-G-1001', headline: 'Everest and high-altitude trekking specialist', bio: 'Licensed local guide focused on safe acclimatisation, Sherpa culture, and small-group Himalayan journeys.', packages: [['everest-base-camp-14-day', 'Everest Base Camp in 14 Days', 'Everest Base Camp', 14, 185000], ['gokyo-lakes-12-day', 'Gokyo Lakes Explorer', 'Gokyo Lakes', 12, 168000]] },
  { email: 'guide2@guide.com', username: 'arjun-gurung', name: 'Arjun Gurung', slug: 'arjun-gurung', region: 'Annapurna', years: 9, license: 'NTB-G-1002', headline: 'Annapurna circuit and community trekking guide', bio: 'Licensed Gurung guide offering practical logistics, local insight, and flexible private itineraries.', packages: [['annapurna-circuit-15-day', 'Annapurna Circuit Classic', 'Annapurna Circuit', 15, 155000], ['poon-hill-5-day', 'Poon Hill Sunrise Trek', 'Poon Hill', 5, 48000]] },
  { email: 'guide3@guide.com', username: 'sonam-tamang', name: 'Sonam Tamang', slug: 'sonam-tamang', region: 'Langtang', years: 8, license: 'NTB-G-1003', headline: 'Langtang and Tamang Heritage Trail guide', bio: 'Licensed guide for culturally grounded treks through Langtang, Helambu, and Tamang communities.', packages: [['langtang-valley-8-day', 'Langtang Valley Trek', 'Langtang Valley', 8, 79000], ['tamang-heritage-7-day', 'Tamang Heritage Trail', 'Tamang Heritage Trail', 7, 69000]] },
];
const customers = [['customer1@demo.com', 'priya-traveler', 'Priya Traveler'], ['customer2@demo.com', 'daniel-hiker', 'Daniel Hiker']];
const reviewComments = ['Thoughtful pacing, excellent local knowledge, and clear safety guidance throughout our trek.', 'A reliable guide who made every part of the journey feel well organised and welcoming.', 'Great communication and a memorable itinerary with meaningful local insight.'];

async function loadEnv() {
  for (const filename of ['.env', 'app/.env']) {
    try {
      for (const line of (await fs.readFile(path.join(repoRoot, filename), 'utf8')).split(/\r?\n/)) {
        const separator = line.indexOf('=');
        if (separator > 0 && !line.trim().startsWith('#')) {
          const key = line.slice(0, separator).trim();
          if (!(key in process.env)) process.env[key] = line.slice(separator + 1).trim().replace(/^['"]|['"]$/g, '');
        }
      }
    } catch {}
  }
}

async function upsertUser(client, { email, username, name, hash }) {
  const result = await client.query(
    `INSERT INTO users (username, email, display_name, password_hash, provider, role)
     VALUES ($1, $2, $3, $4, 'credentials', 'user')
     ON CONFLICT (email) DO UPDATE SET username = EXCLUDED.username, display_name = EXCLUDED.display_name, password_hash = EXCLUDED.password_hash
     RETURNING id`,
    [username, email, name, hash]
  );
  return result.rows[0].id;
}

async function main() {
  await loadEnv();
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const hash = await bcrypt.hash(password, 10);
    const reviewerIds = await Promise.all(customers.map(([email, username, name]) => upsertUser(client, { email, username, name, hash })));
    for (const [guideIndex, guide] of guides.entries()) {
      const userId = await upsertUser(client, { ...guide, hash });
      const profile = await client.query(
        `INSERT INTO guide_profiles (user_id, slug, headline, bio, home_region, languages, years_experience, license_number, license_document_url, citizenship_document_url, approval_status, approved_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'approved', NOW())
         ON CONFLICT (user_id) DO UPDATE SET slug = EXCLUDED.slug, headline = EXCLUDED.headline, bio = EXCLUDED.bio, home_region = EXCLUDED.home_region, languages = EXCLUDED.languages, years_experience = EXCLUDED.years_experience, license_number = EXCLUDED.license_number, license_document_url = EXCLUDED.license_document_url, citizenship_document_url = EXCLUDED.citizenship_document_url, approval_status = 'approved', updated_at = NOW()
         RETURNING id`,
        [userId, guide.slug, guide.headline, guide.bio, guide.region, ['English', 'Nepali'], guide.years, guide.license, `https://example.com/demo/${guide.slug}-license.pdf`, `https://example.com/demo/${guide.slug}-citizenship.pdf`]
      );
      const profileId = profile.rows[0].id;
      for (const [slug, title, trek, days, price] of guide.packages) {
        await client.query(
          `INSERT INTO guide_packages (guide_profile_id, slug, title, trek_name, region, summary, duration_days, group_size_min, group_size_max, price_amount, price_unit, currency, inclusions, exclusions)
           VALUES ($1, $2, $3, $4, $5, $6, $7, 1, 8, $8, 'package', 'NPR', $9, $10)
           ON CONFLICT (guide_profile_id, slug) DO UPDATE SET title = EXCLUDED.title, summary = EXCLUDED.summary, price_amount = EXCLUDED.price_amount, updated_at = NOW()`,
          [profileId, slug, title, trek, guide.region, `A guided ${days}-day ${trek} itinerary with local logistics and personalised support.`, days, price, ['Guide service', 'Permit coordination', 'First-aid kit'], ['International flights', 'Travel insurance']]
        );
      }
      for (const [reviewIndex, reviewerId] of reviewerIds.entries()) {
        await client.query(
          `INSERT INTO reviews (target_type, target_id, reviewer_user_id, rating, comment)
           VALUES ('guide', $1, $2, $3, $4)
           ON CONFLICT (target_type, target_id, reviewer_user_id) DO NOTHING`,
          [profileId, reviewerId, 5 - (reviewIndex % 2), reviewComments[(guideIndex + reviewIndex) % reviewComments.length]]
        );
      }
    }
    await client.query('COMMIT');
    console.log('Demo guides, packages, customer reviewers, and reviews seeded. Guide logins: guide1@guide.com through guide3@guide.com; password: 12345678.');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error('Failed to seed demo guides:', error.message || error);
  process.exitCode = 1;
});