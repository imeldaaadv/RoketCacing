import { createClient } from 'redis';

let redis;

try {
  const client = createClient({
    url: process.env.REDIS_URL,
    socket: {
      connectTimeout: 3000,
      reconnectStrategy: (retries) => {
        if (retries > 2) return new Error('STOP_RECONNECT');
        return 500;
      },
    },
  });
  client.on('error', () => {});
  await client.connect();
  redis = client;
  console.log('✅ Redis terhubung');
} catch {
  console.log('⚠️ Redis tidak tersedia — pakai fallback in-memory');
  const mem = new Map();
  redis = {
    set: async (k, v) => (mem.set(k, v), 'OK'),
    get: async (k) => mem.get(k) ?? null,
    del: async (k) => mem.delete(k),
    disconnect: async () => {},
  };
}

export default redis;