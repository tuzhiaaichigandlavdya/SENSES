
import { Router, type Request, type Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../db.js';

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-me';

/**
 * User Registration
 * POST /api/auth/register
 */
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, display_name, password, public_key, encrypted_private_key } = req.body;

    if (!username || !display_name || !password || !public_key || !encrypted_private_key) {
      res.status(400).json({ success: false, error: 'Missing required fields' });
      return;
    }

    // Check if user exists
    const userCheck = await query('SELECT username FROM users WHERE username = $1', [username]);
    if (userCheck.rows.length > 0) {
      res.status(409).json({ success: false, error: 'Username already taken' });
      return;
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    // Insert user
    const newUser = await query(
      `INSERT INTO users (username, display_name, password_hash, public_key, encrypted_private_key, is_online, last_seen)
       VALUES ($1, $2, $3, $4, $5, TRUE, NOW())
       RETURNING username, display_name, created_at`,
      [username, display_name, password_hash, public_key, encrypted_private_key]
    );

    // Generate JWT
    const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '24h' });

    res.status(201).json({
      success: true,
      token,
      user: newUser.rows[0]
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * User Login
 * POST /api/auth/login
 */
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      res.status(400).json({ success: false, error: 'Missing username or password' });
      return;
    }

    // Find user
    const result = await query('SELECT * FROM users WHERE username = $1', [username]);
    if (result.rows.length === 0) {
      res.status(401).json({ success: false, error: 'Invalid credentials' });
      return;
    }

    const user = result.rows[0];

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      res.status(401).json({ success: false, error: 'Invalid credentials' });
      return;
    }

    // Update online status
    await query('UPDATE users SET is_online = TRUE, last_seen = NOW() WHERE username = $1', [username]);

    // Generate JWT
    const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '24h' });

    res.json({
      success: true,
      token,
      encrypted_private_key: user.encrypted_private_key,
      public_key: user.public_key,
      user: {
        username: user.username,
        display_name: user.display_name,
        avatar_url: user.avatar_url,
        bio: user.bio
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * User Logout
 * POST /api/auth/logout
 */
router.post('/logout', async (req: Request, res: Response): Promise<void> => {
    try {
        const { username } = req.body;
        // In a real app, verify token matches username
        if (username) {
            await query('UPDATE users SET is_online = FALSE, last_seen = NOW() WHERE username = $1', [username]);
        }
        res.json({ success: true });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

export default router;
