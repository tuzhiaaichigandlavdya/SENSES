
import { Router, type Request, type Response } from 'express';
import { query } from '../db.js';
import { authenticateToken, type AuthRequest } from '../middleware/auth.js';

const router = Router();

/**
 * Search Users
 * GET /api/users/search?q=query
 */
router.get('/search', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const q = req.query.q as string;
    
    if (!q || q.length < 2) {
      res.json({ success: true, users: [] });
      return;
    }

    const result = await query(
      `SELECT username, display_name, avatar_url, is_online, last_seen, public_key
       FROM users 
       WHERE username ILIKE $1 OR display_name ILIKE $1
       LIMIT 20`,
      [`%${q}%`]
    );

    res.json({
      success: true,
      users: result.rows
    });
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * Get User Profile (Public)
 * GET /api/users/:username
 */
router.get('/:username', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { username } = req.params;

    const result = await query(
      `SELECT username, display_name, avatar_url, bio, is_online, last_seen, public_key, created_at
       FROM users 
       WHERE username = $1`,
      [username]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    res.json({
      success: true,
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * Update Profile
 * PUT /api/users/profile
 */
router.put('/profile', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const username = req.user?.username;
    const { display_name, bio, avatar_url } = req.body;

    await query(
      `UPDATE users 
       SET display_name = COALESCE($1, display_name),
           bio = COALESCE($2, bio),
           avatar_url = COALESCE($3, avatar_url)
       WHERE username = $4`,
      [display_name, bio, avatar_url, username]
    );

    res.json({ success: true, message: 'Profile updated' });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;
