import pool from '../config/db.js';

// Transaksi atomik + row locking (anti race-condition)
export async function adjustBalance(userId, delta, type = 'bet', title = null) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const r = await client.query('SELECT balance FROM users WHERE id=$1 FOR UPDATE', [userId]);
    if (!r.rows.length) throw new Error('USER_NOT_FOUND');
    const after = Math.max(0, parseFloat(r.rows[0].balance) + delta);
    if (delta < 0 && parseFloat(r.rows[0].balance) + delta < 0) {
      throw new Error('INSUFFICIENT_BALANCE');
    }
    await client.query('UPDATE users SET balance=$1 WHERE id=$2', [after, userId]);

    const txTitle = title || (delta >= 0 ? `Hadiah / Kemenangan (${type})` : `Taruhan Permainan (${type})`);
    const txType = delta >= 0 ? 'credit' : 'debit';

    await client.query(
      'INSERT INTO transactions(user_id,title,type,amount,balance_after) VALUES($1,$2,$3,$4,$5)',
      [userId, txTitle, txType, Math.abs(delta), after]
    );
    await client.query('COMMIT');
    return after;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}