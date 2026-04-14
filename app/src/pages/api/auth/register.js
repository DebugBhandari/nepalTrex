import bcrypt from 'bcryptjs';

// In-memory user storage for this example
// In production, use a database
const users = [];

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

  // Check if user already exists
  // In production, query your database
  const existingUser = users.find(u => u.email === email || u.username === username);
  if (existingUser) {
    return res.status(400).json({ error: 'Email or username already in use' });
  }

  try {
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Store user (in production, save to database)
    const newUser = {
      id: Date.now().toString(),
      email,
      username,
      password: hashedPassword,
      createdAt: new Date(),
    };
    users.push(newUser);

    // Log to console for debugging
    console.log('New user registered:', { email, username });

    return res.status(201).json({
      message: 'User registered successfully',
      user: { id: newUser.id, email, username },
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ error: 'Registration failed' });
  }
}
