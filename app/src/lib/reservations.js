export const RESERVATION_STATUSES = new Set(['pending', 'confirmed', 'declined', 'cancelled', 'completed']);
export const HOST_RESERVATION_STATUSES = new Set(['confirmed', 'declined', 'completed']);
export const CUSTOMER_RESERVATION_STATUSES = new Set(['cancelled']);
export const MAX_RESERVATION_NIGHTS = 30;
export const MAX_RESERVATION_UNITS = 10;

export function parseReservationDates(checkInDate, checkOutDate) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(checkInDate || '')) || !/^\d{4}-\d{2}-\d{2}$/.test(String(checkOutDate || ''))) {
    return null;
  }

  const checkIn = new Date(`${checkInDate}T00:00:00.000Z`);
  const checkOut = new Date(`${checkOutDate}T00:00:00.000Z`);
  if (Number.isNaN(checkIn.getTime()) || Number.isNaN(checkOut.getTime())) return null;

  const nights = Math.round((checkOut - checkIn) / 86_400_000);
  if (nights < 1 || nights > MAX_RESERVATION_NIGHTS) return null;

  return { checkInDate, checkOutDate, nights };
}

export function serializeReservation(row) {
  return {
    id: row.id,
    stayId: row.stay_id,
    stayName: row.stay_name,
    staySlug: row.stay_slug,
    stayLocation: row.stay_location,
    customerName: row.customer_name,
    customerEmail: row.customer_email || '',
    customerPhone: row.customer_phone,
    checkInDate: row.check_in_date,
    checkOutDate: row.check_out_date,
    guestCount: Number(row.guest_count),
    guestNotes: row.guest_notes || '',
    hostNote: row.host_note || '',
    status: row.status,
    holdExpiresAt: row.hold_expires_at,
    totalPrice: Number(row.total_price),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    events: Array.isArray(row.events) ? row.events.map((event) => ({
      id: event.id,
      eventType: event.eventType,
      previousStatus: event.previousStatus,
      nextStatus: event.nextStatus,
      note: event.note || '',
      createdAt: event.createdAt,
      actorName: event.actorName || 'System',
      actorRole: event.actorRole || '',
    })) : [],
    items: Array.isArray(row.items) ? row.items.map((item) => ({
      roomId: item.roomId,
      roomName: item.roomName,
      nightlyPrice: Number(item.nightlyPrice),
      units: Number(item.units),
    })) : [],
  };
}