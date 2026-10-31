import { query } from './db';
import { sendReservationRequestEmail } from './email';

function displayName(user) {
  return user.display_name || user.username || (user.email || '').split('@')[0] || 'NepalTrex partner';
}

function toDate(value) {
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

async function getRecipients(client, ownerUserId) {
  const result = await client.query(
    `
      SELECT id, email, display_name, username, role
      FROM users
      WHERE id = $1 OR role = 'superUser'
      ORDER BY CASE WHEN id = $1 THEN 0 ELSE 1 END, created_at ASC
    `,
    [ownerUserId]
  );
  return result.rows;
}

async function createNotifications(client, { recipients, notificationKey, notificationType, title, body, href, metadata }) {
  const created = [];
  for (const recipient of recipients) {
    const result = await client.query(
      `
        INSERT INTO app_notifications (
          recipient_user_id, notification_key, notification_type, title, body, href, metadata
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
        ON CONFLICT (recipient_user_id, notification_key) DO NOTHING
        RETURNING id
      `,
      [recipient.id, notificationKey, notificationType, title, body, href, JSON.stringify(metadata)]
    );
    if (result.rows[0]) created.push({ notificationId: result.rows[0].id, recipient });
  }
  return created;
}

export async function createStayReservationNotifications(client, reservation) {
  const recipients = await getRecipients(client, reservation.ownerUserId);
  const title = `New stay reservation for ${reservation.stayName}`;
  const body = `${reservation.customerName} requested ${reservation.roomName} for ${toDate(reservation.checkInDate)}–${toDate(reservation.checkOutDate)}.`;
  const href = '/admin';
  const created = await createNotifications(client, {
    recipients,
    notificationKey: `stay-reservation-requested:${reservation.id}`,
    notificationType: 'stay_reservation_requested',
    title,
    body,
    href,
    metadata: { reservationId: reservation.id, stayId: reservation.stayId, stayName: reservation.stayName },
  });
  return created.map(({ notificationId, recipient }) => ({
    notificationId,
    recipient,
    title,
    body,
    href,
  }));
}

export async function createGuideBookingNotifications(client, booking) {
  const recipients = await getRecipients(client, booking.guideUserId);
  const title = `New guide booking for ${booking.packageTitle}`;
  const body = `${booking.customerName} requested ${booking.travelerCount} traveler${Number(booking.travelerCount) === 1 ? '' : 's'} starting ${toDate(booking.startDate)}.`;
  const href = '/notifications';
  const created = await createNotifications(client, {
    recipients,
    notificationKey: `guide-booking-requested:${booking.id}`,
    notificationType: 'guide_booking_requested',
    title,
    body,
    href,
    metadata: { guideBookingId: booking.id, guidePackageId: booking.packageId, packageTitle: booking.packageTitle },
  });
  return created.map(({ notificationId, recipient }) => ({
    notificationId,
    recipient,
    title,
    body,
    href,
  }));
}

export async function deliverReservationNotificationEmails(notifications) {
  await Promise.allSettled(
    notifications.map(async ({ notificationId, recipient, title, body, href }) => {
      if (!recipient.email) return;
      const sent = await sendReservationRequestEmail(recipient.email, displayName(recipient), title, body, href);
      await query(
        `
          UPDATE app_notifications
          SET email_sent_at = CASE WHEN $2 THEN NOW() ELSE email_sent_at END,
              email_error = CASE WHEN $2 THEN NULL ELSE $3 END,
              updated_at = NOW()
          WHERE id = $1
        `,
        [notificationId, sent.success, sent.error || null]
      );
    })
  );
}