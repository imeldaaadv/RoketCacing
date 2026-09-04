import { io } from 'socket.io-client';
import { SOCKET_URL } from '../api.js';
import { useUserStore } from '../stores/userStore.js';
import { useGameStore } from '../stores/gameStore.js';

let socket = null;

export function connectSocket() {
  const user = useUserStore();
  const game = useGameStore();
  socket = io(SOCKET_URL, { auth: { token: user.token } });

  socket.on('game:state', (s) => game.setState(s));
  socket.on('game:betting', (d) => {
    game.betting(d);
  });
  socket.on('game:start', () => game.start());
  socket.on('game:tick', (d) => game.tick(d.multiplier));
  socket.on('game:crash', (d) => {
    game.crash(d);
    // If player had a bet active and hasn't cashed out, record loss
    user.recordLoss(d.crashPoint);
  });
  socket.on('game:players', (p) => game.setPlayers(p));

  // Chat
  socket.on('chat:history', (list) => game.setChatHistory(list));
  socket.on('chat:message', (entry) => game.addChatMessage(entry));

  // Cashout events
  socket.on('bet:cashed', (data) => {
    user.recordWin(data);
  });
  socket.on('bet:auto_cashed', (data) => {
    user.recordWin(data);
  });

  return socket;
}

export function getSocket() {
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}