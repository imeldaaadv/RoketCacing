import crypto from 'crypto';
import pool from '../config/db.js';
import redis from '../config/redis.js';
import { newSeed, hashSeed, crashPointFromSeeds } from './rng.js';
import { adjustBalance } from './wallet.js';

const BETTING_MS = 5000, PAUSE_MS = 3000, TICK_MS = 100, GROWTH = 0.00006;
const round2 = (x) => Math.floor(x * 100) / 100;

export default class GameEngine {
  constructor(io) {
    this.io = io;
    this.phase = 'idle';
    this.multiplier = 1.0;
    this.round = null;
    this.bets = new Map();
    this.history = [];
    this.nonce = 0;
    this.clientsCount = 0;
    this.isSleeping = false;
    this.timer = null;
    this.loop = null;
  }

  async init() {
    try {
      const h = await pool.query('SELECT crash_point FROM games WHERE game_type=\'crash\' ORDER BY created_at DESC LIMIT 20');
      this.history = h.rows.map((r) => parseFloat(r.crash_point));
      const n = await pool.query('SELECT COALESCE(MAX(nonce),0) AS n FROM games');
      this.nonce = parseInt(n.rows[0].n);
    } catch {
      this.history = [2.14, 1.45, 5.80, 1.18, 3.20, 12.40, 1.85, 2.90];
      this.nonce = 1;
    }
    this.startBetting();
  }

  setClientsCount(count) {
    this.clientsCount = count;
    // Wake up if sleeping and players connect
    if (this.clientsCount > 0 && this.isSleeping) {
      console.log('⚡ Pemain aktif terdeteksi, GameEngine bangun dari sleep!');
      this.isSleeping = false;
      this.startBetting();
    }
  }

  async startBetting() {
    // If no players connected, sleep to save Railway free resources!
    if (this.clientsCount === 0 && this.bets.size === 0) {
      this.phase = 'idle';
      this.isSleeping = true;
      console.log('💤 Tidak ada pemain aktif, GameEngine standby (hemat resource Railway)');
      return;
    }

    this.isSleeping = false;
    this.phase = 'betting';
    this.bets.clear();
    this.multiplier = 1.0;
    this.nonce += 1;
    const serverSeed = newSeed(), clientSeed = newSeed();
    const crashPoint = crashPointFromSeeds(serverSeed, clientSeed, this.nonce);
    
    try {
      const r = await pool.query(
        'INSERT INTO games(nonce,server_seed,client_seed,crash_point,game_type) VALUES($1,$2,$3,$4,\'crash\') RETURNING id',
        [this.nonce, serverSeed, clientSeed, crashPoint]
      );
      this.round = { id: r.rows[0]?.id, serverSeed, clientSeed, crashPoint, nonce: this.nonce };
    } catch (e) {
      this.round = { id: null, serverSeed, clientSeed, crashPoint, nonce: this.nonce };
    }

    this.bettingEndsAt = Date.now() + BETTING_MS;
    try {
      await redis.set('round:state', JSON.stringify({ phase: 'betting', nonce: this.nonce }));
    } catch {}

    this.io.emit('game:players', []);
    this.io.emit('game:betting', { nonce: this.nonce, endsAt: this.bettingEndsAt, seedHash: hashSeed(serverSeed) });
    
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.startRunning(), BETTING_MS);
  }

  startRunning() {
    this.phase = 'running';
    this.startedAt = Date.now();
    this.io.emit('game:start', { startedAt: this.startedAt });
    
    clearInterval(this.loop);
    this.loop = setInterval(() => this.tick(), TICK_MS);
  }

  tick() {
    this.multiplier = Math.exp(GROWTH * (Date.now() - this.startedAt));

    // Auto cashout check
    for (const [userId, bet] of this.bets) {
      if (bet.status === 'active' && bet.autoCashout && this.multiplier >= bet.autoCashout) {
        this.doCashout(userId, bet.autoCashout, true);
      }
    }

    if (this.multiplier >= this.round.crashPoint) {
      this.multiplier = this.round.crashPoint;
      this.crash();
    } else {
      this.io.emit('game:tick', { multiplier: round2(this.multiplier) });
    }
  }

  async crash() {
    clearInterval(this.loop);
    this.phase = 'crashed';
    const lost = [...this.bets.values()].filter((b) => b.status === 'active');
    if (lost.length && this.round?.id) {
      try {
        await pool.query(`UPDATE bets SET status='lost', game_id=$1 WHERE id = ANY($2)`,
          [this.round.id, lost.map((b) => b.id)]);
      } catch {}
    }

    this.history = [this.round.crashPoint, ...this.history].slice(0, 20);
    try {
      await redis.set('history', JSON.stringify(this.history));
    } catch {}

    this.io.emit('game:crash', {
      crashPoint: this.round.crashPoint,
      history: this.history,
      serverSeed: this.round.serverSeed,
      clientSeed: this.round.clientSeed,
      nonce: this.round.nonce,
    });

    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.startBetting(), PAUSE_MS);
  }

  async placeBet(user, amount, autoCashout = null) {
    if (this.phase !== 'betting') throw new Error('BETTING_CLOSED');
    if (!Number.isFinite(amount) || amount < 100) throw new Error('INVALID_AMOUNT');
    if (autoCashout !== null && (!Number.isFinite(autoCashout) || autoCashout < 1.01))
      throw new Error('INVALID_AUTO_CASHOUT');
    if (this.bets.has(user.sub)) throw new Error('ALREADY_BET');
    
    const balance = await adjustBalance(user.sub, -amount, 'crash', `Taruhan Crash Worm (${amount})`);
    let betId = null;
    try {
      const r = await pool.query(
        'INSERT INTO bets(user_id,amount,status,game_type) VALUES($1,$2,$3,\'crash\') RETURNING id',
        [user.sub, amount, 'active']
      );
      betId = r.rows[0]?.id;
    } catch {}

    this.bets.set(user.sub, {
      id: betId,
      userId: user.sub,
      username: user.username,
      amount,
      status: 'active',
      cashoutAt: null,
      autoCashout,
    });

    this.io.emit('game:players', this.playerList());
    return balance;
  }

  async cashOut(user) {
    if (this.phase !== 'running') throw new Error('NOT_RUNNING');
    const bet = this.bets.get(user.sub);
    if (!bet || bet.status !== 'active') throw new Error('NO_ACTIVE_BET');
    return this.doCashout(user.sub, this.multiplier, false);
  }

  async doCashout(userId, m, isAuto) {
    const bet = this.bets.get(userId);
    if (!bet || bet.status !== 'active') return null;
    bet.status = 'won';
    const mm = round2(m);
    const profit = Math.floor(bet.amount * (mm - 1));
    bet.cashoutAt = mm;
    const balance = await adjustBalance(userId, bet.amount + profit, 'crash', `Menang Crash Worm (${mm}x)`);
    
    if (bet.id) {
      try {
        await pool.query(
          'UPDATE bets SET status=$1, cashout_at=$2, multiplier=$2, profit=$3, game_id=$4 WHERE id=$5',
          ['won', mm, profit, this.round?.id, bet.id]
        );
        // Add exp to user in DB
        const expGain = Math.max(10, Math.floor(profit / 200));
        await pool.query('UPDATE users SET exp = exp + $1 WHERE id=$2', [expGain, userId]);
      } catch {}
    }

    this.io.to('user:' + userId).emit(isAuto ? 'bet:auto_cashed' : 'bet:cashed', {
      multiplier: mm,
      profit,
      balance,
    });
    this.io.emit('game:players', this.playerList());
    return { multiplier: mm, profit, balance };
  }

  playerList() {
    return [...this.bets.values()].map((b) => ({
      userId: b.userId,
      username: b.username,
      amount: b.amount,
      status: b.status,
      cashoutAt: b.cashoutAt,
      autoCashout: b.autoCashout,
    }));
  }

  state() {
    return {
      phase: this.phase,
      multiplier: round2(this.multiplier),
      history: this.history,
      players: this.playerList(),
      bettingEndsAt: this.bettingEndsAt,
      nonce: this.round?.nonce,
    };
  }
}