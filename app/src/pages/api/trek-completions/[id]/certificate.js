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

function certificateText(text, fontSize, color, x, y, maxWidth, font = 'F2') {
  const fittedFontSize = Math.min(fontSize, maxWidth / (text.length * 0.56));
  return `BT /${font} ${fittedFontSize.toFixed(1)} Tf ${color} rg ${x} ${y} Td (${escapePdfText(
    text
  )}) Tj ET`;
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
  const mapBox = { x: 424, y: 22, width: 344, height: 238 };
  const point = (waypoint) => [
    mapBox.x + ((waypoint.lng - minLng) / lngSpan) * mapBox.width,
    mapBox.y + ((waypoint.lat - minLat) / latSpan) * mapBox.height,
  ];
  const labels = [];
  const completionByIndex = new Map(
    completedWaypoints.map((waypoint) => [
      Number(waypoint.waypoint_index),
      waypoint,
    ])
  );
  const [firstX, firstY] = point(waypoints[0]);
  const commands = [
    'q',
    '/GS1 gs',
    '0.2 0.88 0.78 RG 3.5 w',
    `${firstX.toFixed(1)} ${firstY.toFixed(1)} m`,
  ];

  waypoints.slice(1).forEach((waypoint) => {
    const [x, y] = point(waypoint);
    commands.push(`${x.toFixed(1)} ${y.toFixed(1)} l`);
  });
  commands.push('S', 'Q');

  waypoints.forEach((waypoint, index) => {
    const [x, y] = point(waypoint);
    const completed = completionByIndex.get(index);
    commands.push('q', '/GS1 gs');
    commands.push(completed ? '1 0.68 0.12 rg' : '0.24 0.9 0.82 rg');
    commands.push(
      `${(x - (completed ? 4 : 2.5)).toFixed(1)} ${(
        y - (completed ? 4 : 2.5)
      ).toFixed(1)} ${completed ? 8 : 5} ${completed ? 8 : 5} re f`
    );
    commands.push('Q');

    if (completed) {
      const place =
        completed.waypoint_name || waypoint.place || `Coordinate ${index + 1}`;
      const completedOn = formatDate(
        completed.completed_at,
        { dateStyle: 'medium' },
        'Date unavailable'
      );
      const label = `${place} - ${completedOn}`;
      const labelWidth = Math.min(
        Math.max(label.length * 3.9 + 14, 96),
        mapBox.width - 12
      );
      const labelHeight = 18;
      const positions = [
        [x + 9, y - 4],
        [x - labelWidth - 9, y - 4],
        [x - labelWidth / 2, y + 10],
        [x - labelWidth / 2, y - labelHeight - 9],
      ].map(([candidateX, candidateY]) => ({
        x: Math.max(
          mapBox.x + 4,
          Math.min(candidateX, mapBox.x + mapBox.width - labelWidth - 4)
        ),
        y: Math.max(
          mapBox.y + 4,
          Math.min(candidateY, mapBox.y + mapBox.height - labelHeight - 4)
        ),
      }));
      const labelBox = positions
        .map((candidate) => {
          const overlap = labels.reduce((total, previous) => {
            const overlapWidth = Math.max(
              0,
              Math.min(
                candidate.x + labelWidth,
                previous.x + previous.width
              ) - Math.max(candidate.x, previous.x)
            );
            const overlapHeight = Math.max(
              0,
              Math.min(
                candidate.y + labelHeight,
                previous.y + previous.height
              ) - Math.max(candidate.y, previous.y)
            );
            return total + overlapWidth * overlapHeight;
          }, 0);
          return { ...candidate, overlap };
        })
        .sort((a, b) => a.overlap - b.overlap)[0];
      labels.push({
        x: labelBox.x,
        y: labelBox.y,
        width: labelWidth,
        height: labelHeight,
      });
      const fontSize = Math.min(8, (labelWidth - 12) / (label.length * 0.53));
      commands.push(
        'q',
        '/GS1 gs',
        '1 1 1 rg',
        `${labelBox.x.toFixed(1)} ${labelBox.y.toFixed(1)} ${labelWidth.toFixed(
          1
        )} ${labelHeight} re f`,
        'Q',
        '0.08 0.29 0.22 RG 1.4 w',
        `${(x - 2).toFixed(1)} ${(y - 0.5).toFixed(1)} m ${(x + 0.5).toFixed(
          1
        )} ${(y - 3).toFixed(1)} l ${(x + 5).toFixed(1)} ${(y + 4).toFixed(
          1
        )} l S`,
        `BT /F2 ${fontSize.toFixed(1)} Tf 1 1 1 rg ${(labelBox.x + 6).toFixed(
          1
        )} ${(labelBox.y + 5).toFixed(1)} Td (${escapePdfText(label)}) Tj ET`
      );
    }
  });
  return commands.join('\n');
}

function buildPdf({
  recipientName,
  trekName,
  completedAt,
  certificateCode,
  isDemo,
  waypoints,
  completedWaypoints,
}) {
  const completionDate = formatDate(completedAt, { dateStyle: 'long' });
  const map = routeBackground(waypoints, completedWaypoints);
  const evidenceText = isDemo
    ? 'Demo route records - not live GPS verification.'
    : 'GPS evidence recorded within 10 km of every mapped route waypoint.';
  const logo = [
    'q',
    '0.49 0.85 0.91 rg 0 25 m 40 85 l 80 25 l f',
    '0.75 0.92 0.95 rg 60 25 m 100 95 l 140 25 l f',
    '0.49 0.85 0.91 rg 160 25 m 200 90 l 240 25 l f',
    '0.75 0.92 0.95 rg 220 25 m 260 80 l 300 25 l f',
    '0.24 0.77 0.85 rg 20 25 m 70 110 l 120 25 l f',
    '0.13 0.6 0.67 rg 100 25 m 150 115 l 200 25 l f',
    '0.24 0.77 0.85 rg 180 25 m 230 105 l 280 25 l f',
    '0.86 0.08 0.24 rg 50 25 m 95 120 l 140 25 l f',
    '0 0.22 0.58 RG 9 w 50 25 m 95 120 l 140 25 l S',
    '0.86 0.08 0.24 rg 160 25 m 205 120 l 250 25 l f',
    '0 0.22 0.58 RG 9 w 160 25 m 205 120 l 250 25 l S',
    '1 0.93 0.78 rg',
    '95 80 m 99.4 80 103 83.6 103 88 c 103 92.4 99.4 96 95 96 c 90.6 96 87 92.4 87 88 c 87 83.6 90.6 80 95 80 c f',
    '0.001 0.067 0.114 rg',
    '97.5 81 m 101.4 81 104.5 84.1 104.5 88 c 104.5 91.9 101.4 95 97.5 95 c 93.6 95 90.5 91.9 90.5 88 c 90.5 84.1 93.6 81 97.5 81 c f',
    '1 0.93 0.78 rg',
    '205 80 m 209.4 80 213 83.6 213 88 c 213 92.4 209.4 96 205 96 c 200.6 96 197 92.4 197 88 c 197 83.6 200.6 80 205 80 c f',
    '1 0.93 0.78 RG 2 w 205 90 m 205 94 l S 205 66 m 205 70 l S 215 80 m 219 80 l S 191 80 m 195 80 l S 210.5 85.5 m 213.5 88.5 l S 199.5 74.5 m 196.5 71.5 l S 210.5 74.5 m 213.5 71.5 l S 199.5 85.5 m 196.5 88.5 l S',
    '0.035 0.075 0.105 rg BT /F2 52 Tf 19 30 Td (NepalTrex) Tj ET',
    'Q',
  ].join('\n');
  const page = [
    'q 0.035 0.075 0.105 rg 0 0 792 612 re f Q',
    map,
    certificateText('CERTIFICATE OF COMPLETION', 34, '1 0.49 0', 42, 552, 390),
    certificateText('This proudly recognizes', 22, '0.49 0.85 0.91', 42, 501, 390, 'F1'),
    certificateText(recipientName, 40, '1 0.93 0.82', 42, 451, 390),
    certificateText(
      'for verified completion of',
      22,
      '0.49 0.85 0.91',
      42,
      408,
      390,
      'F1'
    ),
    certificateText(trekName, 31, '1 0.49 0', 42, 359, 390),
    certificateText(
      `Verified ${completionDate}`,
      22,
      '1 0.93 0.82',
      42,
      312,
      390,
      'F1'
    ),
    certificateText(
      `Certificate ${certificateCode}`,
      19,
      '0.49 0.85 0.91',
      42,
      273,
      390,
      'F1'
    ),
    certificateText(evidenceText, 15, '0.75 0.92 0.95', 42, 237, 390, 'F1'),
    'q 0.55 0 0 0.55 42 46 cm /Logo Do Q',
  ].join('\n');
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 792 612] /Resources << /ExtGState << /GS1 7 0 R >> /Font << /F1 5 0 R /F2 6 0 R >> /XObject << /Logo 8 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${Buffer.byteLength(page)} >>\nstream\n${page}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>',
    '<< /Type /ExtGState /ca 0.12 /CA 0.12 >>',
    `<< /Type /XObject /Subtype /Form /FormType 1 /BBox [0 0 300 135] /Resources << /Font << /F2 6 0 R >> >> /Length ${Buffer.byteLength(
      logo
    )} >>\nstream\n${logo}\nendstream`,
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
  return Buffer.from(
    `${pdf}trailer\n<< /Size ${
      objects.length + 1
    } /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`
  );
}

export default async function handler(req, res) {
  if (req.method !== 'GET')
    return res.status(405).json({ error: 'Method not allowed' });

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user?.id)
      return res.status(401).json({ error: 'Authentication required' });
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
    if (!completion)
      return res.status(404).json({ error: 'Certificate not found' });

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
    return res
      .status(500)
      .json({
        error: 'Unable to generate this certificate. Please try again.',
      });
  }
}
