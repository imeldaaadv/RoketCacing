<script setup>
import { ref, computed, defineEmits } from 'vue';
import { useUserStore } from '../stores/userStore.js';
import { useGameStore } from '../stores/gameStore.js';

const emit = defineEmits(['close-sidebar', 'open-wallet']);

const user = useUserStore();
const game = useGameStore();

const isGamesMenuOpen = ref(true);
const currentFilter = ref('all');

const formatIDR = (n) => 'Rp ' + Math.floor(n || 0).toLocaleString('id-ID');
const formatX = (n) => Number(n || 1).toFixed(2) + 'x';

const activeGameLabel = computed(() => {
  if (game.activeGame === 'crash') return 'Crash Worm';
  if (game.activeGame === 'roulette') return 'Roulette Pro';
  if (game.activeGame === 'mines') return 'Mines 5x5';
  if (game.activeGame === 'blackjack') return 'Blackjack';
  return 'Game';
});

const filteredHistory = computed(() => {
  const list = user.history || [];
  if (currentFilter.value === 'win') {
    return list.filter((h) => h.is_win || h.cashed);
  }
  if (currentFilter.value === 'loss') {
    return list.filter((h) => !h.is_win && !h.cashed);
  }
  if (currentFilter.value === 'high') {
    return list.filter((h) => Number(h.mult || h.multiplier || 0) >= 2.0);
  }
  return list;
});

function selectGame(gameName) {
  game.setActiveGame(gameName);
  if (window.innerWidth < 768) {
    emit('close-sidebar');
  }
}
</script>

<template>
  <aside class="game-sidebar-drawer">
    <!-- Collapsed Game Bar (When games menu is closed) -->
    <div
      v-if="!isGamesMenuOpen"
      class="panel"
      style="padding: 6px 10px; cursor: pointer; display: flex; align-items: center; justify-content: space-between; background: #0b142d; border-color: #233766;"
      @click="isGamesMenuOpen = true"
    >
      <div style="display: flex; align-items: center; gap: 6px;">
        <span style="font-family: 'Chakra Petch'; font-weight: 700; font-size: 11.5px; color: var(--text);">Game: {{ activeGameLabel }}</span>
      </div>
      <span style="font-size: 10px; color: var(--cyan); font-weight: 600;">Ganti ▼</span>
    </div>

    <!-- Game Navigation Menu (When Open) -->
    <div v-else class="panel sidebar-games-box">
      <div class="panel-header" style="justify-content: space-between;">
        <span>PILIH GAME</span>
        <button
          class="sidebar-close-x"
          title="Tutup Menu Game & Panjangkan Riwayat"
          @click="isGamesMenuOpen = false"
        >
          ✕
        </button>
      </div>

      <div class="sidebar-game-list">
        <button
          class="sidebar-game-item"
          :class="{ active: game.activeGame === 'crash' }"
          @click="selectGame('crash')"
        >
          <div class="game-icon-circle" style="background: #1e3a8a;">
            <img src="/assets/worm_normal.png" style="width: 24px; height: 24px; object-fit: contain;" alt="Crash" />
          </div>
          <div class="game-item-info">
            <div class="g-title">Crash Worm</div>
            <div class="g-sub">Multiplier Terbang</div>
          </div>
        </button>

        <button
          class="sidebar-game-item"
          :class="{ active: game.activeGame === 'roulette' }"
          @click="selectGame('roulette')"
        >
          <div class="game-icon-circle" style="background: #065f46;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#34d399" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="2" x2="12" y2="22" />
              <line x1="2" y1="12" x2="22" y2="12" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </div>
          <div class="game-item-info">
            <div class="g-title">Roulette Pro</div>
            <div class="g-sub">Putar 15 Angka (14x)</div>
          </div>
        </button>

        <button
          class="sidebar-game-item"
          :class="{ active: game.activeGame === 'mines' }"
          @click="selectGame('mines')"
        >
          <div class="game-icon-circle" style="background: #7f1d1d;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f87171" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="9" r="8" />
              <line x1="12" y1="3" x2="12" y2="1" />
              <line x1="18.5" y1="5.5" x2="20" y2="4" />
              <line x1="5.5" y1="5.5" x2="4" y2="4" />
            </svg>
          </div>
          <div class="game-item-info">
            <div class="g-title">Mines 5x5</div>
            <div class="g-sub">Cari Permata & Hindari Bom</div>
          </div>
        </button>

        <button
          class="sidebar-game-item"
          :class="{ active: game.activeGame === 'blackjack' }"
          @click="selectGame('blackjack')"
        >
          <div class="game-icon-circle" style="background: #4c1d95;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c084fc" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="5" width="14" height="16" rx="2" />
              <path d="M7 3h12a2 2 0 0 1 2 2v14" />
            </svg>
          </div>
          <div class="game-item-info">
            <div class="g-title">Blackjack</div>
            <div class="g-sub">Tanding Kartu 21</div>
          </div>
        </button>
      </div>
    </div>

    <!-- Riwayat Taruhan (History - Expands smoothly to fill height) -->
    <div class="panel history-panel">
      <div class="panel-header" style="justify-content: space-between;">
        <div style="display: flex; align-items: center; gap: 6px;">
          <span>Riwayat Ronde</span>
          <span style="color: var(--gold); font-size: 10px; font-family: 'JetBrains Mono';">Streak: {{ user.streak }}x</span>
        </div>
        <button
          class="sidebar-close-x"
          title="Tutup Sidebar"
          @click="emit('close-sidebar')"
        >
          ✕
        </button>
      </div>




      <div class="history-filter-bar">
        <button
          class="filter-btn"
          :class="{ active: currentFilter === 'all' }"
          @click="currentFilter = 'all'"
        >
          Semua
        </button>
        <button
          class="filter-btn"
          :class="{ active: currentFilter === 'win' }"
          @click="currentFilter = 'win'"
        >
          Menang
        </button>
        <button
          class="filter-btn"
          :class="{ active: currentFilter === 'loss' }"
          @click="currentFilter = 'loss'"
        >
          Kalah
        </button>
        <button
          class="filter-btn"
          :class="{ active: currentFilter === 'high' }"
          @click="currentFilter = 'high'"
        >
          ≥2x
        </button>
      </div>

      <div class="history-list">
        <div
          v-if="!filteredHistory.length"
          style="text-align: center; padding: 20px; color: var(--text-muted); font-size: 11px;"
        >
          Belum ada riwayat taruhan.
        </div>
        <div
          v-for="(h, i) in filteredHistory"
          :key="i"
          class="history-item"
        >
          <div style="display: flex; align-items: center; gap: 6px;">
            <span class="history-game-tag">{{ (h.game || 'CRASH').toUpperCase() }}</span>
            <span
              class="history-item-mult"
              :class="(h.is_win || h.cashed) ? 'win' : 'loss'"
            >
              {{ formatX(h.mult || h.multiplier) }}
            </span>
          </div>
          <div style="text-align: right;">
            <div
              class="history-item-amt"
              :class="(h.is_win || h.cashed) ? 'win' : 'loss'"
            >
              {{ (h.is_win || h.cashed) ? '+' : '−' }}{{ formatIDR(Math.abs(h.profit || h.payout || h.amount)) }}
            </div>
            <div style="font-size: 9px; color: var(--text-muted); font-family: 'JetBrains Mono';">
              {{ h.time ? new Date(h.time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : 'Baru saja' }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </aside>
</template>
