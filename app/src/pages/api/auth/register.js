import bcrypt from 'bcryptjs';
import { query } from '../../../lib/db';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, username, password } = req.body;

  // Validation
  if (!email || !username || !password) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  if (username.length < 3) {
    return res.status(400).json({ error: 'Username must be at least 3 characters' });
  }

  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  try {
    // Check if user already exists
    const existingUser = await query(
      `
        SELECT id FROM users 
        WHERE username = $1 OR email = $2
        LIMIT 1
      `,
      [username, email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Email or username already in use' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user into database
    const result = await query(
      `
        INSERT INTO users (username, email, password_hash, provider, display_name, role)
        VALUES ($1, $2, $3, 'credentials', $4, $5)
        RETURNING id, username, email, role
      `,
      [
        username,
        email,
        hashedPassword,
        username,
        email.trim().toLowerCase() === 'bhandarideepakdev@gmail.com' ? 'superUser' : 'user',
      ]
    );

    console.log('New user registered:', { email, username });

    return res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: result.rows[0].id,
        email: result.rows[0].email,
        username: result.rows[0].username,
        role: result.rows[0].role,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({
      error: error.message || 'Registration failed',
    });
  }
}
