import bcrypt from 'bcryptjs';
import { query } from '../../../lib/db';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { token, password, confirmPassword } = req.body;

  // Validation
  if (!token) {
    return res.status(400).json({ error: 'Reset token is required' });
  }

  if (!password) {
    return res.status(400).json({ error: 'Password is required' });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ error: 'Passwords do not match' });
  }

  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  try {
    // Find valid reset token
    const tokenResult = await query(
      `
        SELECT id, user_id FROM password_reset_tokens
        WHERE token = $1 AND expires_at > NOW()
        LIMIT 1
      `,
      [token]
    );

    if (tokenResult.rows.length === 0) {
      return res.status(400).json({ error: 'Reset token is invalid or has expired' });
    }

    const { user_id: userId } = tokenResult.rows[0];

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update user password
    const updateResult = await query(
      `
        UPDATE users
        SET password_hash = $1, updated_at = NOW()
        WHERE id = $2
        RETURNING id, email
      `,
      [hashedPassword, userId]
    );

    if (updateResult.rows.length === 0) {
      return res.status(400).json({ error: 'User not found' });
    }

    // Delete reset token (and all expired tokens)
    await query(
      `DELETE FROM password_reset_tokens WHERE user_id = $1 OR expires_at <= NOW()`,
      [userId]
    );

    console.log('Password reset successfully for user:', updateResult.rows[0].email);

    return res.status(200).json({
      message: 'Password reset successfully. You can now sign in with your new password.',
    });
  } catch (error) {
    console.error('Password reset error:', error);
    return res.status(500).json({
      error: 'An error occurred. Please try again later.',
    });
  }
}
