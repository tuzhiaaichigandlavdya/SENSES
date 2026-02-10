
import { Router, type Response } from 'express';
import { query } from '../db.js';
import { authenticateToken, type AuthRequest } from '../middleware/auth.js';

const router = Router();

/**
 * Send Message
 * POST /api/messages/send
 */
router.post('/send', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { recipient, encrypted_content, iv, tag } = req.body;
    const sender = req.user?.username;

    if (!recipient || !encrypted_content || !iv) {
      res.status(400).json({ success: false, error: 'Missing required fields' });
      return;
    }

    // Check if recipient exists
    const recipientCheck = await query('SELECT username FROM users WHERE username = $1', [recipient]);
    if (recipientCheck.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Recipient not found' });
      return;
    }

    // Insert message
    const result = await query(
      `INSERT INTO messages (sender_username, recipient_username, encrypted_content, iv, tag)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, created_at`,
      [sender, recipient, encrypted_content, iv, tag || '']
    );

    res.status(201).json({
      success: true,
      message_id: result.rows[0].id,
      timestamp: result.rows[0].created_at
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * Receive Messages (Polling)
 * GET /api/messages/receive?since=TIMESTAMP
 */
router.get('/receive', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const username = req.user?.username;
    const since = req.query.since as string; // ISO timestamp

    // Update online status
    await query('UPDATE users SET is_online = TRUE, last_seen = NOW() WHERE username = $1', [username]);

    let sql = `
      SELECT m.*, u.display_name as sender_display_name, u.avatar_url as sender_avatar_url
      FROM messages m
      JOIN users u ON m.sender_username = u.username
      WHERE (m.recipient_username = $1 OR m.sender_username = $1)
    `;
    
    const params = [username];

    if (since) {
      sql += ` AND m.created_at > $2`;
      params.push(since);
    }

    sql += ` ORDER BY m.created_at ASC LIMIT 100`;

    const result = await query(sql, params);

    res.json({
      success: true,
      messages: result.rows
    });
  } catch (error) {
    console.error('Receive messages error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * Get Conversations (Recent chats)
 * GET /api/messages/conversations
 */
router.get('/conversations', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const username = req.user?.username;

    // Get unique users interacted with
    const result = await query(
      `SELECT DISTINCT 
        CASE WHEN sender_username = $1 THEN recipient_username ELSE sender_username END as contact_username
       FROM messages
       WHERE sender_username = $1 OR recipient_username = $1`,
      [username]
    );

    const contacts = result.rows.map(r => r.contact_username);

    if (contacts.length === 0) {
      res.json({ success: true, conversations: [] });
      return;
    }

    // Get user details
    const usersResult = await query(
      `SELECT username, display_name, avatar_url, is_online, last_seen 
       FROM users 
       WHERE username = ANY($1)`,
      [contacts]
    );

    res.json({
      success: true,
      conversations: usersResult.rows
    });
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;
