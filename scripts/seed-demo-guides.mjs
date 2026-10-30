import fs from 'fs/promises';
import path from 'path';
import bcrypt from 'bcryptjs';
import { Pool } from 'pg';

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const password = '1234';

const guides = [
  ['Maya Sherpa', 'maya-sherpa', 'Everest', 12, 'NTB-G-1001', 'Everest and high-altitude trekking specialist', 'Licensed local guide focused on safe acclimatisation, Sherpa culture, and small-group Himalayan journeys.', ['English', 'Nepali', 'Sherpa'], [['everest-base-camp-14-day', 'Everest Base Camp in 14 Days', 'Everest Base Camp', 14, 185000], ['gokyo-lakes-12-day', 'Gokyo Lakes Explorer', 'Gokyo Lakes', 12, 168000]]],
  ['Arjun Gurung', 'arjun-gurung', 'Annapurna', 9, 'NTB-G-1002', 'Annapurna circuit and community trekking guide', 'Licensed Gurung guide offering practical logistics, local insight, and flexible private itineraries.', ['English', 'Nepali', 'Gurung'], [['annapurna-circuit-15-day', 'Annapurna Circuit Classic', 'Annapurna Circuit', 15, 155000], ['poon-hill-5-day', 'Poon Hill Sunrise Trek', 'Poon Hill', 5, 48000]]],
  ['Sonam Tamang', 'sonam-tamang', 'Langtang', 8, 'NTB-G-1003', 'Langtang and Tamang Heritage Trail guide', 'Licensed guide for culturally grounded treks through Langtang, Helambu, and Tamang communities.', ['English', 'Nepali', 'Tamang'], [['langtang-valley-8-day', 'Langtang Valley Trek', 'Langtang Valley', 8, 79000], ['tamang-heritage-7-day', 'Tamang Heritage Trail', 'Tamang Heritage Trail', 7, 69000]]],
  ['Nima Dolma', 'nima-dolma', 'Manaslu', 11, 'NTB-G-1004', 'Remote Manaslu and Tsum Valley specialist', 'Experienced guide for quieter Himalayan trails, cultural visits, and carefully paced high-pass adventures.', ['English', 'Nepali', 'Tibetan'], [['manaslu-circuit-14-day', 'Manaslu Circuit Adventure', 'Manaslu Circuit', 14, 172000], ['tsum-valley-12-day', 'Tsum Valley Cultural Trek', 'Tsum Valley', 12, 148000]]],
  ['Kiran Rai', 'kiran-rai', 'Makalu', 10, 'NTB-G-1005', 'Eastern Himalaya and Makalu trekking guide', 'A licensed Rai guide who specialises in rewarding routes beyond the busiest trekking corridors.', ['English', 'Nepali', 'Rai'], [['makalu-base-camp-18-day', 'Makalu Base Camp Expedition Trek', 'Makalu Base Camp', 18, 218000], ['arun-valley-9-day', 'Arun Valley Discovery Trek', 'Arun Valley', 9, 92000]]],
  ['Pema Lama', 'pema-lama', 'Mustang', 13, 'NTB-G-1006', 'Upper Mustang culture and desert trails guide', 'Licensed guide blending Tibetan Buddhist heritage, dramatic trans-Himalayan landscapes, and reliable logistics.', ['English', 'Nepali', 'Tibetan'], [['upper-mustang-12-day', 'Upper Mustang Heritage Trek', 'Upper Mustang', 12, 196000], ['lower-mustang-7-day', 'Lower Mustang Explorer', 'Lower Mustang', 7, 76000]]],
  ['Sita Thapa', 'sita-thapa', 'Kanchenjunga', 7, 'NTB-G-1007', 'Kanchenjunga and tea-house trekking guide', 'Patient and detail-oriented guide for eastern Nepal expeditions, village stays, and mountain photography.', ['English', 'Nepali', 'Hindi'], [['kanchenjunga-north-20-day', 'Kanchenjunga North Base Camp', 'Kanchenjunga', 20, 245000], ['milke-danda-8-day', 'Milke Danda Rhododendron Trek', 'Milke Danda', 8, 82000]]],
  ['Dawa Tsering', 'dawa-tsering', 'Dolpo', 14, 'NTB-G-1008', 'Dolpo wilderness and Buddhist heritage guide', 'Licensed wilderness guide experienced with remote camping logistics, restricted-area permits, and high passes.', ['English', 'Nepali', 'Tibetan'], [['upper-dolpo-22-day', 'Upper Dolpo Wilderness Trek', 'Upper Dolpo', 22, 295000], ['phoksundo-9-day', 'Phoksundo Lake Trek', 'Shey Phoksundo', 9, 112000]]],
  ['Ramesh Karki', 'ramesh-karki', 'Rolwaling', 9, 'NTB-G-1009', 'Rolwaling and Everest approach guide', 'A licensed guide for demanding alpine routes, glacier viewpoints, and responsible mountain preparation.', ['English', 'Nepali', 'Hindi'], [['rolwaling-tashi-lapcha-17-day', 'Rolwaling and Tashi Lapcha', 'Rolwaling', 17, 208000], ['pikey-peak-7-day', 'Pikey Peak Panorama Trek', 'Pikey Peak', 7, 73000]]],
  ['Lhakpa Bhote', 'lhakpa-bhote', 'Helambu', 6, 'NTB-G-1010', 'Helambu and Kathmandu Valley escape guide', 'Friendly licensed guide for accessible Himalayan getaways, family treks, and local food experiences.', ['English', 'Nepali', 'Tibetan'], [['helambu-7-day', 'Helambu Village Trek', 'Helambu', 7, 62000], ['gosainkunda-9-day', 'Gosainkunda Lake Trek', 'Gosainkunda', 9, 88000]]],
].map(([name, username, region, years, license, headline, bio, languages, packages], index) => ({
  email: `guide${index + 1}@guide.com`, name, username, slug: username, region, years, license, headline, bio, languages, packages,
}));

const customers = [
  ['customer1@demo.com', 'priya-traveler', 'Priya Traveler'],
  ['customer2@demo.com', 'daniel-hiker', 'Daniel Hiker'],
  ['customer3@demo.com', 'elena-walker', 'Elena Walker'],
  ['customer4@demo.com', 'marcus-trail', 'Marcus Trail'],
  ['customer5@demo.com', 'aisha-explorer', 'Aisha Explorer'],
  ['customer6@demo.com', 'leo-trekker', 'Leo Trekker'],
];

const reviewComments = [
  'Thoughtful pacing, excellent local knowledge, and clear safety guidance throughout our trek.',
  'A reliable guide who made every part of the journey feel well organised and welcoming.',
  'Great communication and a memorable itinerary with meaningful local insight.',
  'The itinerary was flexible, the logistics were smooth, and every day felt well prepared.',
  'A warm professional guide who made our group feel confident at every stage of the route.',
  'Excellent cultural knowledge and sensible advice that made the trek far more enjoyable.',
];

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
    `INSERT INTO users (username, email, display_name, password_hash, provider, role, is_banned)
     VALUES ($1, $2, $3, $4, 'credentials', 'user', false)
     ON CONFLICT (email) DO UPDATE SET
       username = EXCLUDED.username, display_name = EXCLUDED.display_name, password_hash = EXCLUDED.password_hash,
       provider = 'credentials', role = 'user', is_banned = false
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
        `INSERT INTO guide_profiles (user_id, slug, headline, bio, home_region, languages, years_experience, license_number, license_document_url, citizenship_document_url, profile_image_url, approval_status, approved_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'approved', NOW())
         ON CONFLICT (user_id) DO UPDATE SET
           slug = EXCLUDED.slug, headline = EXCLUDED.headline, bio = EXCLUDED.bio, home_region = EXCLUDED.home_region,
           languages = EXCLUDED.languages, years_experience = EXCLUDED.years_experience, license_number = EXCLUDED.license_number,
           license_document_url = EXCLUDED.license_document_url, citizenship_document_url = EXCLUDED.citizenship_document_url,
           profile_image_url = EXCLUDED.profile_image_url, approval_status = 'approved', approved_at = NOW(), moderation_note = NULL, updated_at = NOW()
         RETURNING id`,
        [userId, guide.slug, guide.headline, guide.bio, guide.region, guide.languages, guide.years, guide.license, `https://example.com/demo/${guide.slug}-license.pdf`, `https://example.com/demo/${guide.slug}-citizenship.pdf`, `https://i.pravatar.cc/300?u=${guide.slug}`]
      );
      const profileId = profile.rows[0].id;

      for (const [slug, title, trek, days, price] of guide.packages) {
        await client.query(
          `INSERT INTO guide_packages (guide_profile_id, slug, title, trek_name, region, summary, duration_days, group_size_min, group_size_max, price_amount, price_unit, currency, image_url, inclusions, exclusions)
           VALUES ($1, $2, $3, $4, $5, $6, $7, 1, 8, $8, 'package', 'NPR', $9, $10, $11)
           ON CONFLICT (guide_profile_id, slug) DO UPDATE SET
             title = EXCLUDED.title, trek_name = EXCLUDED.trek_name, region = EXCLUDED.region, summary = EXCLUDED.summary,
             duration_days = EXCLUDED.duration_days, price_amount = EXCLUDED.price_amount, image_url = EXCLUDED.image_url,
             inclusions = EXCLUDED.inclusions, exclusions = EXCLUDED.exclusions, is_active = true, updated_at = NOW()`,
          [profileId, slug, title, trek, guide.region, `A guided ${days}-day ${trek} itinerary with local logistics, permit support, flexible pacing, and personalised mountain guidance.`, days, price, `https://placehold.co/1200x700?text=${encodeURIComponent(title)}`, ['Licensed guide service', 'Permit coordination', 'First-aid kit', 'Pre-trek planning call'], ['International flights', 'Travel insurance', 'Personal snacks']]
        );
      }

      for (const reviewerIndex of [guideIndex % reviewerIds.length, (guideIndex + 2) % reviewerIds.length, (guideIndex + 4) % reviewerIds.length]) {
        await client.query(
          `INSERT INTO reviews (target_type, target_id, reviewer_user_id, rating, comment)
           VALUES ('guide', $1, $2, $3, $4)
           ON CONFLICT (target_type, target_id, reviewer_user_id) DO UPDATE SET rating = EXCLUDED.rating, comment = EXCLUDED.comment, updated_at = NOW()`,
          [profileId, reviewerIds[reviewerIndex], reviewerIndex % 3 === 0 ? 4 : 5, reviewComments[(guideIndex + reviewerIndex) % reviewComments.length]]
        );
      }
    }

    await client.query('COMMIT');
    console.log('Seeded 10 approved demo guides, 20 guide packages, 6 regular-user reviewers, and guide reviews. Guide logins: guide1@guide.com through guide10@guide.com; password: 1234.');
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