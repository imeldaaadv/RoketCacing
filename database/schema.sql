CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(30) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  balance NUMERIC(15,2) NOT NULL DEFAULT 50000.00,
  exp INT NOT NULL DEFAULT 0,
  daily_streak INT NOT NULL DEFAULT 1,
  last_daily_claim TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_type VARCHAR(20) NOT NULL DEFAULT 'crash',
  nonce INT NOT NULL DEFAULT 0,
  server_seed VARCHAR(64) NOT NULL DEFAULT '',
  client_seed VARCHAR(64) NOT NULL DEFAULT '',
  crash_point NUMERIC(10,2) NOT NULL DEFAULT 1.00,
  outcome VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  game_type VARCHAR(20) NOT NULL DEFAULT 'crash',
  game_id UUID REFERENCES games(id) ON DELETE SET NULL,
  amount NUMERIC(15,2) NOT NULL,
  multiplier NUMERIC(10,2) DEFAULT 1.00,
  cashout_at NUMERIC(10,2),
  profit NUMERIC(15,2) DEFAULT 0,
  status VARCHAR(12) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(100) NOT NULL DEFAULT 'Transaksi',
  type VARCHAR(20) NOT NULL DEFAULT 'debit',
  amount NUMERIC(15,2) NOT NULL,
  balance_after NUMERIC(15,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  username VARCHAR(30) NOT NULL,
  text VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bets_game ON bets(game_id);
CREATE INDEX IF NOT EXISTS idx_bets_user ON bets(user_id);
CREATE INDEX IF NOT EXISTS idx_tx_user ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_time ON chat_messages(created_at DESC);