import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../lib/auth-options';
import { query } from '../../../../lib/db';
import { parseRouteWaypoints } from '../../../../lib/treks';

function escapePdfText(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

function formatDate(value, options, fallback = 'Date unavailable') {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return new Intl.DateTimeFormat('en', options).format(date);
}

function coordinateLabel(latitude, longitude) {
  const lat = Number(latitude);
  const lng = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return 'coordinates unavailable';
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

function routeBackground(waypoints, completedWaypoints) {
  if (!waypoints.length) return '';

  const lats = waypoints.map((waypoint) => waypoint.lat);
  const lngs = waypoints.map((waypoint) => waypoint.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const latSpan = Math.max(maxLat - minLat, 0.01);
  const lngSpan = Math.max(maxLng - minLng, 0.01);
  const mapBox = { x: 54, y: 128, width: 684, height: 330 };
  const point = (waypoint) => [
    mapBox.x + ((waypoint.lng - minLng) / lngSpan) * mapBox.width,
    mapBox.y + ((waypoint.lat - minLat) / latSpan) * mapBox.height,
  ];
  const completionByIndex = new Map(
    completedWaypoints.map((waypoint) => [Number(waypoint.waypoint_index), waypoint])
  );
  const [firstX, firstY] = point(waypoints[0]);
  const commands = [
    'q',
    '0.93 0.97 0.95 rg',
    `${mapBox.x} ${mapBox.y} ${mapBox.width} ${mapBox.height} re f`,
    '0.76 0.85 0.82 RG 0.5 w',
    `${mapBox.x} ${mapBox.y} ${mapBox.width} ${mapBox.height} re S`,
    '0.35 0.56 0.50 RG 3 w',
    `${firstX.toFixed(1)} ${firstY.toFixed(1)} m`,
  ];

  waypoints.slice(1).forEach((waypoint) => {
    const [x, y] = point(waypoint);
    commands.push(`${x.toFixed(1)} ${y.toFixed(1)} l`);
  });
  commands.push('S');

  waypoints.forEach((waypoint, index) => {
    const [x, y] = point(waypoint);
    const completed = completionByIndex.get(index);
    commands.push(completed ? '0.83 0.63 0.06 rg' : '0.12 0.38 0.43 rg');
    commands.push(`${(x - (completed ? 4 : 2.5)).toFixed(1)} ${(y - (completed ? 4 : 2.5)).toFixed(1)} ${completed ? 8 : 5} ${completed ? 8 : 5} re f`);

    if (completed) {
      const place = completed.waypoint_name || waypoint.place || `Coordinate ${index + 1}`;
      const label = `${place} | ${coordinateLabel(waypoint.lat, waypoint.lng)}`;
      commands.push(
        `BT /F1 7 Tf 0.03 0.22 0.14 rg ${(x + 6).toFixed(1)} ${(y + 7).toFixed(1)} Td (${escapePdfText(label)}) Tj ET`
      );
    }
  });
  commands.push('Q');
  return commands.join('\n');
}

function buildPdf({ recipientName, trekName, completedAt, certificateCode, isDemo, waypoints, completedWaypoints }) {
  const completionDate = formatDate(completedAt, { dateStyle: 'long' });
  const map = routeBackground(waypoints, completedWaypoints);
  const records = completedWaypoints.map((waypoint, index) => {
    const mappedCoordinates = coordinateLabel(waypoint.waypoint_latitude, waypoint.waypoint_longitude);
    const recordedCoordinates = coordinateLabel(waypoint.recorded_latitude, waypoint.recorded_longitude);
    const completedOn = formatDate(
      waypoint.completed_at,
      { dateStyle: 'medium', timeStyle: 'short' }
    );
    return [
      `${index + 1}. ${waypoint.waypoint_name || `Coordinate ${Number(waypoint.waypoint_index) + 1}`}`,
      `Mapped: ${mappedCoordinates}`,
      `Recorded: ${recordedCoordinates} | ${completedOn}`,
    ];
  });
  const pageOne = [
    'q 0.02 0.10 0.15 rg 0 0 792 612 re f Q',
    map,
    'BT /F2 19 Tf 0.96 0.75 0.25 rg 320 570 Td (NEPAL TREX) Tj ET',
    `BT /F2 28 Tf 1 1 1 rg 172 525 Td (${escapePdfText(isDemo ? 'DEMO COMPLETION CERTIFICATE' : 'CERTIFICATE OF COMPLETION')}) Tj ET`,
    'BT /F1 13 Tf 0.88 0.92 0.91 rg 302 495 Td (Awarded to) Tj ET',
    `BT /F2 27 Tf 0.96 0.75 0.25 rg 105 462 Td (${escapePdfText(recipientName)}) Tj ET`,
    `BT /F2 22 Tf 1 1 1 rg 115 82 Td (${escapePdfText(trekName)}) Tj ET`,
    `BT /F1 12 Tf 0.88 0.92 0.91 rg 250 58 Td (Completed ${escapePdfText(completionDate)} | ${escapePdfText(certificateCode)}) Tj ET`,
    `BT /F1 9 Tf 0.88 0.92 0.91 rg 144 40 Td (${escapePdfText(isDemo ? 'Demo route records - not live GPS verification.' : 'Gold stops are completed coordinates. The route map is shown as this certificate background.')}) Tj ET`,
  ].join('\n');
  const pageTwoLines = [
    'BT /F2 25 Tf 0.02 0.10 0.15 rg 64 554 Td (Completed coordinate records) Tj ET',
    `BT /F1 11 Tf 0.16 0.24 0.28 rg 64 529 Td (${escapePdfText(trekName)} | ${escapePdfText(certificateCode)}) Tj ET`,
  ];
  records.forEach((record, index) => {
    const row = index % 13;
    const column = Math.floor(index / 13);
    const x = 58 + column * 370;
    const y = 495 - row * 36;
    record.forEach((line, lineIndex) => {
      pageTwoLines.push(
        `BT /F1 ${lineIndex === 0 ? 10 : 8} Tf 0.08 0.18 0.21 rg ${x} ${y - lineIndex * 10} Td (${escapePdfText(line)}) Tj ET`
      );
    });
  });
  if (!records.length) {
    pageTwoLines.push('BT /F1 11 Tf 0.16 0.24 0.28 rg 64 485 Td (No completed coordinate records are available.) Tj ET');
  }
  const pageTwo = pageTwoLines.join('\n');
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R 4 0 R] /Count 2 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 792 612] /Resources << /Font << /F1 7 0 R /F2 8 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 792 612] /Resources << /Font << /F1 7 0 R /F2 8 0 R >> >> /Contents 6 0 R >>',
    `<< /Length ${Buffer.byteLength(pageOne)} >>\nstream\n${pageOne}\nendstream`,
    `<< /Length ${Buffer.byteLength(pageTwo)} >>\nstream\n${pageTwo}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>',
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  });
  return Buffer.from(`${pdf}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user?.id) return res.status(401).json({ error: 'Authentication required' });
    const result = await query(
      `SELECT c.*, t.name AS trek_name, t.route_geojson,
        COALESCE(NULLIF(u.display_name, ''), NULLIF(u.username, ''), split_part(u.email, '@', 1)) AS recipient_name
       FROM trek_completions c
       JOIN treks t ON t.id = c.trek_id
       JOIN users u ON u.id = c.user_id
       WHERE c.id = $1 AND c.user_id = $2
       LIMIT 1`,
      [req.query.id, session.user.id]
    );
    const completion = result.rows[0];
    if (!completion) return res.status(404).json({ error: 'Certificate not found' });

    const waypointResult = await query(
      `SELECT waypoint_index, waypoint_name, waypoint_latitude, waypoint_longitude,
        recorded_latitude, recorded_longitude, completed_at, is_demo
       FROM trek_waypoint_completions
       WHERE trek_id = $1 AND user_id = $2
       ORDER BY waypoint_index`,
      [completion.trek_id, session.user.id]
    );
    const filename = `NepalTrex-${completion.trek_name
      .replace(/[^a-z0-9]+/gi, '-')
      .replace(/^-|-$/g, '')}-certificate.pdf`;
    const pdf = buildPdf({
      recipientName: completion.recipient_name,
      trekName: completion.trek_name,
      completedAt: completion.completed_at,
      certificateCode: completion.certificate_code,
      isDemo: completion.is_demo,
      waypoints: parseRouteWaypoints(completion.route_geojson),
      completedWaypoints: waypointResult.rows,
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', pdf.length);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'private, no-store');
    return res.status(200).send(pdf);
  } catch (error) {
    console.error('Unable to generate trek completion certificate', error);
    return res.status(500).json({ error: 'Unable to generate this certificate. Please try again.' });
  }
}