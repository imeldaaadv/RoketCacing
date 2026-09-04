import { Router } from 'express';
import bcrypt from 'bcryptjs';
import pool from '../config/db.js';
import { signToken, authMiddleware } from '../middleware/auth.js';

const r = Router();

const RANKS = [
  { name: 'IRON I', xp: 0 },
  { name: 'IRON II', xp: 100 },
  { name: 'BRONZE', xp: 250 },
  { name: 'SILVER', xp: 500 },
  { name: 'GOLD', xp: 900 },
  { name: 'PLATINUM', xp: 1500 },
  { name: 'DIAMOND', xp: 2500 },
  { name: 'MASTER', xp: 4000 },
  { name: 'RADIANT', xp: 6500 },
];

r.post('/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password || password.length < 6) {
    return res.status(400).json({ error: 'USERNAME/PASSWORD_INVALID (min 6 karakter)' });
  }
  try {
    const hash = await bcrypt.hash(password, 10);
    const q = await pool.query(
      'INSERT INTO users(username,password_hash,balance,exp,daily_streak) VALUES($1,$2,50000,0,1) RETURNING id,username,balance,exp,daily_streak,last_daily_claim',
      [username, hash]
    );
    const user = q.rows[0];
    user.balance = parseFloat(user.balance);
    res.json({ token: signToken(user), user });
  } catch {
    res.status(409).json({ error: 'USERNAME_TAKEN' });
  }
});

r.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const q = await pool.query('SELECT * FROM users WHERE username=$1', [username]);
  if (!q.rows.length) return res.status(401).json({ error: 'INVALID_CREDENTIALS' });
  const user = q.rows[0];
  if (!(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({ error: 'INVALID_CREDENTIALS' });
  }
  const safe = {
    id: user.id,
    username: user.username,
    balance: parseFloat(user.balance),
    exp: user.exp || 0,
    daily_streak: user.daily_streak || 1,
    last_daily_claim: user.last_daily_claim,
  };
  res.json({ token: signToken(safe), user: safe });
});

r.get('/me', authMiddleware, async (req, res) => {
  const q = await pool.query(
    'SELECT id,username,balance,exp,daily_streak,last_daily_claim FROM users WHERE id=$1',
    [req.user.sub]
  );
  if (!q.rows.length) return res.status(404).json({ error: 'NOT_FOUND' });
  const user = q.rows[0];
  user.balance = parseFloat(user.balance);
  user.exp = user.exp || 0;
  res.json(user);
});

// Real player statistics & rank progression
r.get('/stats', authMiddleware, async (req, res) => {
  const q = await pool.query(
    `SELECT
       COUNT(*) FILTER (WHERE status IN ('won','lost')) AS games,
       COUNT(*) FILTER (WHERE status = 'won') AS wins,
       COALESCE(MAX(multiplier), 1.00) AS best,
       COALESCE(SUM(CASE WHEN status='won' THEN profit
                         WHEN status='lost' THEN -amount
                         ELSE 0 END), 0) AS profit
     FROM bets WHERE user_id=$1`,
    [req.user.sub]
  );

  const u = await pool.query('SELECT exp, daily_streak, last_daily_claim FROM users WHERE id=$1', [req.user.sub]);
  const userExp = u.rows[0]?.exp || 0;

  const s = q.rows[0];
  const games = parseInt(s.games) || 0;
  const wins = parseInt(s.wins) || 0;
  const winrate = games ? Math.round((wins / games) * 100) : 0;

  let level = 0;
  for (let i = 0; i < RANKS.length; i++) {
    if (userExp >= RANKS[i].xp) level = i;
  }
  const curRank = RANKS[level];
  const nextRank = level < RANKS.length - 1 ? RANKS[level + 1] : null;

  res.json({
    winrate,
    games,
    wins,
    best: parseFloat(s.best) || 1.0,
    profit: parseFloat(s.profit) || 0,
    exp: userExp,
    rank: curRank,
    nextRank,
    dailyStreak: u.rows[0]?.daily_streak || 1,
    lastDailyClaim: u.rows[0]?.last_daily_claim,
  });
});

// Inspect any player's public profile (rank, winrate, exp, stats)
r.get('/profile/:username', async (req, res) => {
  const { username } = req.params;
  const u = await pool.query('SELECT id, username, exp, created_at FROM users WHERE LOWER(username)=LOWER($1)', [username]);
  if (!u.rows.length) return res.status(404).json({ error: 'USER_NOT_FOUND' });

  const target = u.rows[0];
  const userExp = target.exp || 0;

  const q = await pool.query(
    `SELECT
       COUNT(*) FILTER (WHERE status IN ('won','lost')) AS games,
       COUNT(*) FILTER (WHERE status = 'won') AS wins,
       COALESCE(MAX(multiplier), 1.00) AS best,
       COALESCE(SUM(CASE WHEN status='won' THEN profit
                         WHEN status='lost' THEN -amount
                         ELSE 0 END), 0) AS profit
     FROM bets WHERE user_id=$1`,
    [target.id]
  );

  const s = q.rows[0];
  const games = parseInt(s.games) || 0;
  const wins = parseInt(s.wins) || 0;
  const winrate = games ? Math.round((wins / games) * 100) : 0;

  let level = 0;
  for (let i = 0; i < RANKS.length; i++) {
    if (userExp >= RANKS[i].xp) level = i;
  }
  const curRank = RANKS[level];
  const nextRank = level < RANKS.length - 1 ? RANKS[level + 1] : null;

  res.json({
    id: target.id,
    username: target.username,
    exp: userExp,
    rank: curRank.name,
    nextRank: nextRank?.name || 'MAX',
    games,
    wins,
    winrate,
    bestX: parseFloat(s.best) || 1.0,
    profit: parseFloat(s.profit) || 0,
    createdAt: target.created_at,
  });
});

export default r;
