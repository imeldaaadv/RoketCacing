import 'dotenv/config';
import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { Server } from 'socket.io';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { initDatabase } from './config/db.js';
import authRoutes from './routes/auth.routes.js';
import gameRoutes from './routes/game.routes.js';
import walletRoutes from './routes/wallet.routes.js';
import GameEngine from './services/engine.js';
import { setupSocket } from './socket.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);
app.use(cors({ origin: process.env.CLIENT_URL || '*' }));
app.use(express.json());
app.use('/api/', rateLimit({ windowMs: 60_000, max: 240 }));

// Initialize PostgreSQL schema if needed
await initDatabase();

app.use('/api/auth', authRoutes);
app.use('/api/games', gameRoutes);
app.use('/api/wallet', walletRoutes);

// Serve frontend dist if available (for single fullstack Railway container)
const distPath = path.resolve(__dirname, '../../frontend/dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
      return next();
    }
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: process.env.CLIENT_URL || '*' } });

const engine = new GameEngine(io);
setupSocket(io, engine);
await engine.init();

const port = process.env.PORT || 3000;
server.listen(port, () => console.log(`🚀 Server jalan di port ${port}`));