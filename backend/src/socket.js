import pool from './config/db.js';
import { verifySocket } from './middleware/auth.js';

export function setupSocket(io, engine) {
  io.use((socket, next) => {
    const user = verifySocket(socket);
    if (!user) return next(new Error('UNAUTHORIZED'));
    socket.user = user;
    next();
  });

  io.on('connection', async (socket) => {
    socket.join('user:' + socket.user.sub);
    
    // Sync client count with engine for sleeping / waking
    engine.setClientsCount(io.engine.clientsCount);

    socket.emit('game:state', engine.state());

    // Load recent chat messages from DB
    try {
      const q = await pool.query(
        'SELECT username, text, created_at AS at FROM chat_messages ORDER BY created_at DESC LIMIT 50'
      );
      const history = q.rows.reverse().map((r) => ({
        username: r.username,
        text: r.text,
        at: new Date(r.at).getTime(),
      }));
      socket.emit('chat:history', history);
    } catch {
      socket.emit('chat:history', []);
    }

    socket.on('bet:place', async ({ amount, auto }, cb) => {
      try {
        const balance = await engine.placeBet(
          socket.user,
          Number(amount),
          auto == null ? null : Number(auto)
        );
        cb({ ok: true, balance });
      } catch (e) {
        cb({ ok: false, error: e.message });
      }
    });

    socket.on('bet:cashout', async (_, cb) => {
      try {
        cb({ ok: true, ...(await engine.cashOut(socket.user)) });
      } catch (e) {
        cb({ ok: false, error: e.message });
      }
    });

    // Real live chat saved to database
    socket.on('chat:send', async ({ text }) => {
      const msg = String(text || '').trim().slice(0, 150);
      if (!msg) return;
      const entry = {
        username: socket.user.username,
        text: msg,
        at: Date.now(),
      };
      try {
        await pool.query(
          'INSERT INTO chat_messages(user_id,username,text) VALUES($1,$2,$3)',
          [socket.user.sub, socket.user.username, msg]
        );
      } catch {}
      io.emit('chat:message', entry);
    });

    socket.on('disconnect', () => {
      engine.setClientsCount(io.engine.clientsCount);
    });
  });
}