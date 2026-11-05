import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relativePath) => readFile(path.join(root, relativePath), 'utf8');

test('booking conversations include requester, provider, and every superuser', async () => {
  const chats = await read('app/src/lib/chats.js');
  const migration = await read('db/migrations/20261105_add_superusers_to_booking_chats.sql');

  assert.match(chats, /addBookingParticipants\(client, conversation\.id, reservation\.customerUserId, reservation\.ownerUserId\)/);
  assert.match(chats, /addBookingParticipants\(client, conversation\.id, booking\.customerUserId, booking\.guideUserId\)/);
  assert.match(chats, /WHERE u\.id = ANY\(\$2::uuid\[\]\) OR u\.role = 'superUser'/);
  assert.match(migration, /c\.conversation_type IN \('reservation', 'guide_booking'\)/);
  assert.match(migration, /u\.role = 'superUser'/);
});

test('superusers can list and open every stay and guide booking chat', async () => {
  const listChats = await read('app/src/pages/api/chats/index.js');
  const chatDetail = await read('app/src/pages/api/chats/[id].js');

  assert.match(listChats, /c\.conversation_type IN \('support', 'reservation', 'guide_booking'\)/);
  assert.match(listChats, /c\.conversation_type IN \('reservation', 'guide_booking'\)/);
  assert.match(chatDetail, /c\.conversation_type IN \('support', 'reservation', 'guide_booking'\)/);
});

test('superusers can retrieve all stay and guide reservations', async () => {
  const reservations = await read('app/src/pages/api/reservations/index.js');
  const guideBookings = await read('app/src/pages/api/guide-bookings/index.js');
  const guideManage = await read('app/src/pages/guides/manage.js');
  const guideBookingUpdate = await read('app/src/pages/api/guide-bookings/[id].js');

  assert.match(reservations, /listReservationsForHost\(session\.user\.id, session\.user\.role === 'superUser'\)/);
  assert.match(guideBookings, /WHERE \$2 = 'superUser' OR b\.customer_user_id=\$1 OR gp\.user_id=\$1/);
  assert.match(guideManage, /isPlatformManager \? '' : 'WHERE gp\.user_id=\$1'/);
  assert.match(guideBookingUpdate, /booking\.guide_user_id !== session\.user\.id && session\.user\.role !== 'superUser'/);
});

test('admin reservations link customers and stay owners to their profiles', async () => {
  const admin = await read('app/src/pages/admin.js');
  const reservations = await read('app/src/pages/api/reservations/index.js');

  assert.match(reservations, /customer\.id AS customer_user_id/);
  assert.match(reservations, /owner\.id AS owner_user_id/);
  assert.match(admin, /const customerProfileId = reservation\.customerHandle \|\| reservation\.customerUserId/);
  assert.match(admin, /const ownerProfileId = reservation\.ownerHandle \|\| reservation\.ownerUserId/);
  assert.match(admin, /href=\{`\/user\/\$\{customerProfileId\}`\}/);
  assert.match(admin, /href=\{`\/user\/\$\{ownerProfileId\}`\}/);
});

test('guide reservation history can toggle active, completed, and declined bookings', async () => {
  const guideManage = await read('app/src/pages/guides/manage.js');

  assert.match(guideManage, /useState\('active'\)/);
  assert.match(guideManage, /bookingHistoryView === 'completed'/);
  assert.match(guideManage, /bookingHistoryView === 'declined'/);
  assert.match(guideManage, /\['active', 'Active'\], \['completed', 'Completed'\], \['declined', 'Declined'\]/);
  assert.match(guideManage, /visibleBookings\.map/);
});

test('reservation and guide booking feeds are capped at the 10 newest entries', async () => {
  const files = await Promise.all([
    'app/src/pages/api/reservations/index.js',
    'app/src/pages/api/reservations/my.js',
    'app/src/pages/api/guide-bookings/index.js',
    'app/src/pages/guides/manage.js',
    'app/src/pages/guides/[slug].js',
    'app/src/pages/user/[name].js',
  ].map(read));

  for (const source of files) {
    assert.match(source, /ORDER BY[\s\S]{0,200}LIMIT 10/);
  }
});