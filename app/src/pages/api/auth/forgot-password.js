import crypto from 'crypto';
import { query } from '../../../lib/db';
import { sendPasswordResetEmail } from '../../../lib/email';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email } = req.body;

  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'Email is required' });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Invalid email address' });
  }

  try {
    // Find user by email
    const userResult = await query(
      `SELECT id, email FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1`,
      [email]
    );

    // Always return success for security (don't reveal if email exists)
    if (userResult.rows.length === 0) {
      return res.status(200).json({
        message: 'If an account exists for this email, a password reset link has been sent.',
      });
    }

    const user = userResult.rows[0];

    // Create reset token (valid for 1 hour)
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 3600000); // 1 hour from now

    // Store reset token in database
    await query(
      `
        INSERT INTO password_reset_tokens (user_id, token, expires_at)
        VALUES ($1, $2, $3)
      `,
      [user.id, token, expiresAt]
    );

    // Send email with reset link (log failure but don't leak it to the client)
    const emailResult = await sendPasswordResetEmail(user.email, token);
    if (!emailResult.success) {
      console.error('Failed to send reset email:', emailResult.error);
    }

    return res.status(200).json({
      message: 'If an account exists for this email, a password reset link has been sent.',
    });
  } catch (error) {
    console.error('Password reset request error:', error);
    return res.status(500).json({
      error: 'An error occurred. Please try again later.',
    });
  }
}
