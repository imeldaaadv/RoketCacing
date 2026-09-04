import { defineStore } from 'pinia';
import { api } from '../api.js';

export const RANKS = [
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

export const useUserStore = defineStore('user', {
  state: () => ({
    token: localStorage.getItem('sw_token'),
    user: null,
    exp: 0,
    games: 0,
    wins: 0,
    profit: 0,
    bestX: 1.0,
    streak: 0,
    history: [],
    transactions: [],
    dailyStreak: 1,
    lastDailyClaim: null,
    currentBet: 0,
    levelUpEvent: null,
    selectedProfile: null,
    isProfileModalOpen: false,
  }),
  getters: {
    winrate: (state) => (state.games > 0 ? ((state.wins / state.games) * 100).toFixed(1) : '0'),
    rankInfo: (state) => {
      let idx = 0;
      for (let i = 0; i < RANKS.length; i++) {
        if (state.exp >= RANKS[i].xp) idx = i;
      }
      const cur = RANKS[idx];
      const next = RANKS[idx + 1] || null;
      let progress = 100;
      if (next) {
        progress = Math.max(0, Math.min(100, ((state.exp - cur.xp) / (next.xp - cur.xp)) * 100));
      }
      return { cur, next, progress };
    },
    isDailyClaimedToday: (state) => {
      if (!state.lastDailyClaim) return false;
      const last = new Date(state.lastDailyClaim).getTime();
      return Date.now() - last < 24 * 60 * 60 * 1000;
    },
  },
  actions: {
    async inspectPlayer(username) {
      if (!username) return;
      try {
        const data = await api(`/api/auth/profile/${encodeURIComponent(username)}`);
        this.selectedProfile = data;
        this.isProfileModalOpen = true;
      } catch (e) {
        alert(e.message || 'Pemain tidak ditemukan!');
      }
    },
    closeProfileModal() {
      this.isProfileModalOpen = false;
      this.selectedProfile = null;
    },
    async sendTip(recipientUsername, amount) {
      const res = await api('/api/wallet/tip', {
        method: 'POST',
        token: this.token,
        body: { recipientUsername, amount },
      });
      if (res.ok) {
        this.setBalance(res.senderBalance);
        this.fetchTransactions();
      }
      return res;
    },
    async login(username, password) {
      const d = await api('/api/auth/login', { method: 'POST', body: { username, password } });
      this.setSession(d);
    },

    async register(username, password) {
      const d = await api('/api/auth/register', { method: 'POST', body: { username, password } });
      this.setSession(d);
    },
    setSession({ token, user }) {
      this.token = token;
      this.user = user;
      localStorage.setItem('sw_token', token);
      this.fetchMe();
      this.fetchStats();
      this.fetchHistory();
      this.fetchTransactions();
    },
    async fetchMe() {
      try {
        const u = await api('/api/auth/me', { token: this.token });
        this.user = u;
        this.exp = u.exp || 0;
        this.dailyStreak = u.daily_streak || 1;
        this.lastDailyClaim = u.last_daily_claim;
      } catch {
        this.logout();
      }
    },
    async fetchStats() {
      try {
        const s = await api('/api/auth/stats', { token: this.token });
        const prevRank = this.rankInfo.cur.name;
        this.games = s.games || 0;
        this.wins = s.wins || 0;
        this.bestX = s.best || 1.0;
        this.profit = s.profit || 0;
        this.exp = s.exp || 0;
        this.dailyStreak = s.dailyStreak || 1;
        this.lastDailyClaim = s.lastDailyClaim;

        const newRank = this.rankInfo.cur.name;
        if (prevRank && newRank !== prevRank) {
          this.triggerLevelUp(newRank);
        }
      } catch {}
    },
    async fetchHistory() {
      try {
        const h = await api('/api/games/user-history', { token: this.token });
        this.history = Array.isArray(h) ? h : [];
      } catch {}
    },
    async fetchTransactions() {
      try {
        const t = await api('/api/wallet/transactions', { token: this.token });
        this.transactions = Array.isArray(t) ? t : [];
      } catch {}
    },
    async claimDaily() {
      const res = await api('/api/wallet/daily-claim', { method: 'POST', token: this.token });
      if (res.ok) {
        this.setBalance(res.balance);
        this.dailyStreak = res.nextStreak;
        this.lastDailyClaim = new Date().toISOString();
        this.addExp(50);
        this.fetchTransactions();
      }
      return res;
    },
    async resetBalance() {
      const res = await api('/api/wallet/reset', { method: 'POST', token: this.token });
      if (res.ok) {
        this.setBalance(res.balance);
        this.fetchTransactions();
      }
      return res;
    },
    async playSingle({ game, betAmount, multiplier, isWin, title }) {
      const res = await api('/api/games/play-single', {
        method: 'POST',
        token: this.token,
        body: { game, betAmount, multiplier, isWin, title },
      });
      if (res.ok) {
        this.setBalance(res.balance);
        this.games += 1;
        if (isWin) {
          this.wins += 1;
          this.profit += res.profit;
          this.streak += 1;
          this.bestX = Math.max(this.bestX, multiplier);
        } else {
          this.profit += res.profit;
          this.streak = 0;
        }
        this.fetchHistory();
        this.fetchTransactions();
        this.fetchStats();
      }
      return res;
    },
    setBalance(b) {
      if (this.user) this.user.balance = parseFloat(b);
    },
    recordBet(amount) {
      this.currentBet = amount;
    },
    clearBet() {
      this.currentBet = 0;
    },
    recordWin({ multiplier, profit, balance }) {
      const mult = Number(multiplier) || 1.0;
      const prof = Number(profit) || 0;
      const betAmt = this.currentBet || (prof / (mult - 1 || 1));
      this.games += 1;
      this.wins += 1;
      this.profit += prof;
      this.streak += 1;
      this.bestX = Math.max(this.bestX, mult);
      this.addExp(Math.max(10, Math.floor(prof / 200)));
      if (balance !== undefined) this.setBalance(balance);

      this.history.unshift({
        game: 'crash',
        mult,
        bet: betAmt,
        profit: prof,
        is_win: true,
        time: new Date().toISOString(),
      });
      this.currentBet = 0;
      this.fetchTransactions();
      this.fetchStats();
    },
    recordLoss(crashPoint) {
      if (!this.currentBet) return;
      const betAmt = this.currentBet;
      this.games += 1;
      this.profit -= betAmt;
      this.streak = 0;
      this.addExp(5);
      this.history.unshift({
        game: 'crash',
        mult: Number(crashPoint) || 1.0,
        bet: betAmt,
        profit: -betAmt,
        is_win: false,
        time: new Date().toISOString(),
      });
      this.currentBet = 0;
      this.fetchTransactions();
      this.fetchStats();
    },
    addExp(amt) {
      const prevRank = this.rankInfo.cur.name;
      this.exp += amt;
      const newRank = this.rankInfo.cur.name;
      if (newRank !== prevRank) {
        this.triggerLevelUp(newRank);
      }
    },
    triggerLevelUp(rankName) {
      this.levelUpEvent = { rank: rankName, time: Date.now() };
    },
    logout() {
      this.token = null;
      this.user = null;
      this.currentBet = 0;
      localStorage.removeItem('sw_token');
    },
  },
});