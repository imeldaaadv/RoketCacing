import { defineStore } from 'pinia';

export const useGameStore = defineStore('game', {
  state: () => ({
    activeGame: 'crash', // 'crash', 'roulette', 'mines', 'blackjack'
    isChatOpen: false,
    unreadChatCount: 0,
    phase: 'idle',
    multiplier: 1.0,
    history: [],
    players: [],
    bettingEndsAt: null,
    lastCrash: null,
    seedHash: null,
    chatMessages: [],
  }),
  actions: {
    setActiveGame(game) {
      this.activeGame = game;
    },
    toggleChat() {
      this.isChatOpen = !this.isChatOpen;
      if (this.isChatOpen) {
        this.unreadChatCount = 0;
      }
    },
    openChat() {
      this.isChatOpen = true;
      this.unreadChatCount = 0;
    },
    closeChat() {
      this.isChatOpen = false;
    },
    setState(s) {
      if (s.phase) this.phase = s.phase;
      if (s.multiplier) this.multiplier = s.multiplier;
      if (s.history) this.history = s.history;
      if (s.players) this.players = s.players;
      if (s.bettingEndsAt) this.bettingEndsAt = s.bettingEndsAt;
      if (s.lastCrash) this.lastCrash = s.lastCrash;
    },
    betting(d) {
      this.phase = 'betting';
      this.bettingEndsAt = d.endsAt;
      this.seedHash = d.seedHash;
      this.multiplier = 1;
      this.players = [];
    },
    start() {
      this.phase = 'running';
    },
    tick(m) {
      this.multiplier = m;
    },
    crash(d) {
      this.phase = 'crashed';
      this.lastCrash = d.crashPoint;
      if (d.history) this.history = d.history;
    },
    setPlayers(p) {
      this.players = p;
    },
    setChatHistory(list) {
      this.chatMessages = Array.isArray(list) ? list : [];
    },
    addChatMessage(msg) {
      this.chatMessages.push(msg);
      if (!this.isChatOpen) {
        this.unreadChatCount += 1;
      }
      if (this.chatMessages.length > 80) this.chatMessages.shift();
    },
  },
});