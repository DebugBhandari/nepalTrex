import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../lib/auth-options';
import { query } from '../../../../lib/db';

function escapePdfText(value) {
  return String(value || '').replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function buildCertificatePdf({ recipientName, trekName, completedAt, certificateCode }) {
  const completionDate = new Intl.DateTimeFormat('en', { dateStyle: 'long' }).format(new Date(completedAt));
  const lines = [
    'q', '0.03 0.12 0.18 rg', '0 0 792 612 re f',
    '0.08 0.45 0.48 rg', '42 42 708 528 re S',
    '0.96 0.75 0.25 rg', '60 60 672 492 re S',
    'BT /F1 20 Tf 312 520 Td (NEPAL TREX) Tj ET',
    'BT /F2 34 Tf 0.96 0.75 0.25 rg 230 445 Td (CERTIFICATE OF COMPLETION) Tj ET',
    'BT /F1 15 Tf 0.88 0.92 0.91 rg 300 398 Td (This proudly recognizes) Tj ET',
    `BT /F2 28 Tf 1 1 1 rg 0 0 0 rg 0.96 0.75 0.25 rg 80 350 Td (${escapePdfText(recipientName)}) Tj ET`,
    'BT /F1 15 Tf 0.88 0.92 0.91 rg 250 305 Td (for verified completion of) Tj ET',
    `BT /F2 27 Tf 1 1 1 rg 96 258 Td (${escapePdfText(trekName)}) Tj ET`,
    `BT /F1 13 Tf 0.88 0.92 0.91 rg 262 205 Td (Verified ${escapePdfText(completionDate)}) Tj ET`,
    `BT /F1 11 Tf 0.88 0.92 0.91 rg 250 94 Td (Certificate ${escapePdfText(certificateCode)}) Tj ET`,
    'BT /F1 10 Tf 0.88 0.92 0.91 rg 132 72 Td (GPS evidence recorded within 10 km of every mapped route waypoint.) Tj ET',
  ].join('\n');
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 792 612] /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${Buffer.byteLength(lines, 'utf8')} >>\nstream\n${lines}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>',
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf, 'utf8'));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = Buffer.byteLength(pdf, 'utf8');
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => { pdf += `${String(offset).padStart(10, '0')} 00000 n \n`; });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(pdf, 'utf8');
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) return res.status(401).json({ error: 'Authentication required' });
  const result = await query(
    `SELECT c.*, t.name AS trek_name, COALESCE(NULLIF(u.display_name, ''), NULLIF(u.username, ''), split_part(u.email, '@', 1)) AS recipient_name
     FROM trek_completions c JOIN treks t ON t.id = c.trek_id JOIN users u ON u.id = c.user_id
     WHERE c.id = $1 AND c.user_id = $2 LIMIT 1`,
    [req.query.id, session.user.id]
  );
  const completion = result.rows[0];
  if (!completion) return res.status(404).json({ error: 'Certificate not found' });
  const filename = `NepalTrex-${completion.trek_name.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '')}-certificate.pdf`;
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Cache-Control', 'private, no-store');
  return res.status(200).send(buildCertificatePdf({
    recipientName: completion.recipient_name,
    trekName: completion.trek_name,
    completedAt: completion.completed_at,
    certificateCode: completion.certificate_code,
  }));
}