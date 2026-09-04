import { Router } from 'express';
import pool from '../config/db.js';
import { authMiddleware } from '../middleware/auth.js';
import { adjustBalance } from '../services/wallet.js';

const r = Router();

const DAILY_REWARDS = [2000, 3000, 5000, 7500, 10000, 15000, 25000];

r.get('/balance', authMiddleware, async (req, res) => {
  const q = await pool.query('SELECT balance FROM users WHERE id=$1', [req.user.sub]);
  res.json({ balance: parseFloat(q.rows[0]?.balance || 0) });
});

r.get('/transactions', authMiddleware, async (req, res) => {
  try {
    const q = await pool.query(
      'SELECT id, title, type, amount, balance_after, created_at AS time FROM transactions WHERE user_id=$1 ORDER BY created_at DESC LIMIT 30',
      [req.user.sub]
    );
    res.json(q.rows);
  } catch {
    res.json([]);
  }
});

// Daily Streak Claim
r.post('/daily-claim', authMiddleware, async (req, res) => {
  const q = await pool.query('SELECT daily_streak, last_daily_claim, balance FROM users WHERE id=$1', [req.user.sub]);
  const user = q.rows[0];
  if (!user) return res.status(404).json({ error: 'USER_NOT_FOUND' });

  const lastClaim = user.last_daily_claim ? new Date(user.last_daily_claim).getTime() : 0;
  const now = Date.now();
  const ONE_DAY = 24 * 60 * 60 * 1000;

  if (lastClaim && now - lastClaim < ONE_DAY) {
    return res.status(429).json({ error: 'DAILY_ALREADY_CLAIMED_TODAY' });
  }

  let streak = user.daily_streak || 1;
  // If more than 48h since last claim, reset streak
  if (lastClaim && now - lastClaim > 2 * ONE_DAY) {
    streak = 1;
  }

  const reward = DAILY_REWARDS[Math.min(streak - 1, DAILY_REWARDS.length - 1)];
  const nextStreak = streak < 7 ? streak + 1 : 1;

  const balance = await adjustBalance(req.user.sub, reward, 'daily', `Hadiah Login Hari ke-${streak}`);
  await pool.query(
    'UPDATE users SET daily_streak=$1, last_daily_claim=now(), exp = exp + 50 WHERE id=$2',
    [nextStreak, req.user.sub]
  );

  res.json({ ok: true, reward, balance, streak, nextStreak });
});

// Reset demo balance to Rp 50.000 in DB
r.post('/reset', authMiddleware, async (req, res) => {
  try {
    const q = await pool.query('SELECT balance FROM users WHERE id=$1', [req.user.sub]);
    const cur = parseFloat(q.rows[0]?.balance || 0);
    const diff = 50000 - cur;
    const balance = await adjustBalance(req.user.sub, diff, 'reset', 'Reset Saldo Demo (Rp 50.000)');
    res.json({ ok: true, balance });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Tip / Transfer balance to another player
r.post('/tip', authMiddleware, async (req, res) => {
  const { recipientUsername, amount } = req.body;
  const tipAmount = Math.floor(Number(amount) || 0);

  if (!recipientUsername || tipAmount < 500) {
    return res.status(400).json({ error: 'Minimal kirim tip adalah Rp 500' });
  }

  // Find sender
  const senderQ = await pool.query('SELECT id, username, balance FROM users WHERE id=$1', [req.user.sub]);
  const sender = senderQ.rows[0];
  if (!sender) return res.status(404).json({ error: 'SENDER_NOT_FOUND' });

  if (parseFloat(sender.balance) < tipAmount) {
    return res.status(400).json({ error: 'Saldo Anda tidak mencukupi untuk kirim tip ini' });
  }

  // Find recipient
  const recipientQ = await pool.query('SELECT id, username FROM users WHERE LOWER(username)=LOWER($1)', [recipientUsername]);
  if (!recipientQ.rows.length) {
    return res.status(404).json({ error: `Pemain "${recipientUsername}" tidak ditemukan!` });
  }
  const recipient = recipientQ.rows[0];

  if (recipient.id === sender.id) {
    return res.status(400).json({ error: 'Tidak dapat mengirim tip ke akun sendiri!' });
  }

  try {
    // Deduct sender
    const senderBal = await adjustBalance(sender.id, -tipAmount, 'tip_sent', `Kirim Tip ke @${recipient.username}`);
    // Credit recipient
    await adjustBalance(recipient.id, tipAmount, 'tip_received', `Terima Tip dari @${sender.username}`);

    res.json({
      ok: true,
      senderBalance: senderBal,
      recipientUsername: recipient.username,
      amount: tipAmount,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default r;
