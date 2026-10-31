import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../lib/auth-options';
import { query } from '../../../../lib/db';
import { parseRouteWaypoints } from '../../../../lib/treks';

function escapePdfText(value) {
  return String(value || '').replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function routeBackground(waypoints, completedWaypoints) {
  if (!waypoints.length) return '';
  const lats = waypoints.map((waypoint) => waypoint.lat);
  const lngs = waypoints.map((waypoint) => waypoint.lng);
  const minLat = Math.min(...lats); const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs); const maxLng = Math.max(...lngs);
  const latSpan = Math.max(maxLat - minLat, 0.01); const lngSpan = Math.max(maxLng - minLng, 0.01);
  const point = (waypoint) => [88 + ((waypoint.lng - minLng) / lngSpan) * 616, 164 + ((waypoint.lat - minLat) / latSpan) * 220];
  const completionByIndex = new Map(completedWaypoints.map((waypoint) => [Number(waypoint.waypoint_index), waypoint]));
  const [firstX, firstY] = point(waypoints[0]);
  const commands = ['q 0.96 0.98 0.97 rg 68 144 656 260 re f', '0.56 0.67 0.63 RG 2 w', `${firstX.toFixed(1)} ${firstY.toFixed(1)} m`];
  waypoints.slice(1).forEach((waypoint) => { const [x, y] = point(waypoint); commands.push(`${x.toFixed(1)} ${y.toFixed(1)} l`); });
  commands.push('S');
  waypoints.forEach((waypoint, index) => {
    const [x, y] = point(waypoint); const completed = completionByIndex.has(index);
    commands.push(completed ? '0.83 0.63 0.06 rg' : '0.15 0.38 0.42 rg');
    commands.push(`${(x - 3).toFixed(1)} ${(y - 3).toFixed(1)} 6 6 re f`);
    if (completed) {
      const completedOn = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(completed.completed_at));
      const label = `${waypoint.place || `Coordinate ${index + 1}`} - ${completedOn}`;
      commands.push(`BT /F1 7 Tf 0.05 0.26 0.10 rg ${(x + 5).toFixed(1)} ${(y + 7).toFixed(1)} Td (${escapePdfText(label)}) Tj ET`);
    }
  });
  commands.push('Q');
  return commands.join('\n');
}

function buildPdf({ recipientName, trekName, completedAt, certificateCode, isDemo, waypoints, completedWaypoints }) {
  const completionDate = new Intl.DateTimeFormat('en', { dateStyle: 'long' }).format(new Date(completedAt));
  const map = routeBackground(waypoints, completedWaypoints);
  const records = completedWaypoints.map((waypoint, index) => `${index + 1}. ${waypoint.waypoint_name} — ${new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(waypoint.completed_at))}`);
  const pageOne = [
    'q 0.02 0.10 0.15 rg 0 0 792 612 re f Q', map,
    'BT /F2 19 Tf 0.96 0.75 0.25 rg 320 555 Td (NEPAL TREX) Tj ET',
    `BT /F2 30 Tf 1 1 1 rg 190 500 Td (${escapePdfText(isDemo ? 'DEMO COMPLETION CERTIFICATE' : 'CERTIFICATE OF COMPLETION')}) Tj ET`,
    'BT /F1 14 Tf 0.88 0.92 0.91 rg 302 462 Td (Awarded to) Tj ET',
    `BT /F2 27 Tf 0.96 0.75 0.25 rg 105 425 Td (${escapePdfText(recipientName)}) Tj ET`,
    `BT /F2 24 Tf 1 1 1 rg 115 115 Td (${escapePdfText(trekName)}) Tj ET`,
    `BT /F1 12 Tf 0.88 0.92 0.91 rg 250 83 Td (Completed ${escapePdfText(completionDate)}  |  ${escapePdfText(certificateCode)}) Tj ET`,
    `BT /F1 10 Tf 0.88 0.92 0.91 rg 182 64 Td (${escapePdfText(isDemo ? 'Demo route records — not live GPS verification.' : 'Every mapped coordinate recorded with live GPS. Gold crowns mark completed coordinates.')}) Tj ET`,
  ].join('\n');
  const pageTwoLines = ['BT /F2 25 Tf 0.02 0.10 0.15 rg 64 548 Td (Completed coordinate records) Tj ET', `BT /F1 11 Tf 0.16 0.24 0.28 rg 64 523 Td (${escapePdfText(trekName)} — ${escapePdfText(certificateCode)}) Tj ET`];
  records.forEach((record, index) => {
    const column = Math.floor(index / 17); const row = index % 17;
    pageTwoLines.push(`BT /F1 10 Tf 0.08 0.18 0.21 rg ${64 + column * 350} ${490 - row * 24} Td (${escapePdfText(record)}) Tj ET`);
  });
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
  let pdf = '%PDF-1.4\n'; const offsets = [0];
  objects.forEach((object, index) => { offsets.push(Buffer.byteLength(pdf)); pdf += `${index + 1} 0 obj\n${object}\nendobj\n`; });
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => { pdf += `${String(offset).padStart(10, '0')} 00000 n \n`; });
  return Buffer.from(`${pdf}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) return res.status(401).json({ error: 'Authentication required' });
  const result = await query(
    `SELECT c.*, t.name AS trek_name, t.route_geojson, COALESCE(NULLIF(u.display_name, ''), NULLIF(u.username, ''), split_part(u.email, '@', 1)) AS recipient_name
     FROM trek_completions c JOIN treks t ON t.id = c.trek_id JOIN users u ON u.id = c.user_id
     WHERE c.id = $1 AND c.user_id = $2 LIMIT 1`, [req.query.id, session.user.id]
  );
  const completion = result.rows[0];
  if (!completion) return res.status(404).json({ error: 'Certificate not found' });
  const waypointResult = await query(
    `SELECT waypoint_index, waypoint_name, completed_at, is_demo FROM trek_waypoint_completions
     WHERE trek_id = $1 AND user_id = $2 ORDER BY waypoint_index`, [completion.trek_id, session.user.id]
  );
  const filename = `NepalTrex-${completion.trek_name.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '')}-certificate.pdf`;
  res.setHeader('Content-Type', 'application/pdf'); res.setHeader('Content-Disposition', `attachment; filename="${filename}"`); res.setHeader('Cache-Control', 'private, no-store');
  return res.status(200).send(buildPdf({ recipientName: completion.recipient_name, trekName: completion.trek_name, completedAt: completion.completed_at, certificateCode: completion.certificate_code, isDemo: completion.is_demo, waypoints: parseRouteWaypoints(completion.route_geojson), completedWaypoints: waypointResult.rows }));
}
