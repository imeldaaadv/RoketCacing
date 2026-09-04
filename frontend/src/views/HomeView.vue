<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { connectSocket, disconnectSocket } from '../composables/useSocket.js';
import { useUserStore } from '../stores/userStore.js';
import { useGameStore } from '../stores/gameStore.js';

import GameSidebar from '../components/GameSidebar.vue';
import GameCanvas from '../components/GameCanvas.vue';
import RouletteGame from '../components/RouletteGame.vue';
import MinesGame from '../components/MinesGame.vue';
import BlackjackGame from '../components/BlackjackGame.vue';
import FloatingChat from '../components/FloatingChat.vue';
import DailyModal from '../components/DailyModal.vue';
import LeaderboardModal from '../components/LeaderboardModal.vue';
import WalletModal from '../components/WalletModal.vue';
import PlayerProfileModal from '../components/PlayerProfileModal.vue';
import ConfettiToast from '../components/ConfettiToast.vue';

const user = useUserStore();
const game = useGameStore();

const isSidebarOpen = ref(true);
const isDailyOpen = ref(false);
const isLeaderboardOpen = ref(false);
const isWalletOpen = ref(false);

const formatIDR = (n) => 'Rp ' + Math.floor(n || 0).toLocaleString('id-ID');

function openMyProfile() {
  if (user.user?.username) {
    user.inspectPlayer(user.user.username);
  }
}

onMounted(() => {
  connectSocket();
  user.fetchMe();
  user.fetchStats();
  user.fetchHistory();
  user.fetchTransactions();
});

onUnmounted(() => {
  disconnectSocket();
});
</script>

<template>
  <div class="app-layout">
    <!-- TOP NAVIGATION BAR (Clean & Compact) -->
    <header class="top-nav">
      <!-- Left: Hamburger Button (Toggles Game Menu Sidebar) + Logo -->
      <div class="top-left-brand">
        <button
          class="nav-btn hamburger-trigger"
          :title="isSidebarOpen ? 'Tutup Menu Game' : 'Buka Menu Game'"
          @click="isSidebarOpen = !isSidebarOpen"
        >
          ☰
        </button>

        <div class="brand" @click="game.setActiveGame('crash')" style="cursor: pointer;">
          <div class="brand-logo">
            <img src="/assets/worm_normal.png" alt="Logo" />
          </div>
          <span>SPACE<b>WORM</b></span>
        </div>
      </div>

      <!-- Right: Daily, Rank, Profile Photo, Wallet, Logout -->
      <div class="nav-actions">
        <button class="nav-btn btn-gift" title="Klaim Hadiah Harian" @click="isDailyOpen = true">
          <span class="dot-pulse"></span>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 12 20 22 4 22 4 12" />
            <rect x="2" y="7" width="20" height="5" />
            <line x1="12" y1="22" x2="12" y2="7" />
            <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
            <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
          </svg>
          <span class="hide-mobile">Klaim Harian</span>
        </button>

        <button class="nav-btn" title="Papan Peringkat" @click="isLeaderboardOpen = true">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
            <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
            <path d="M4 22h16" />
            <path d="M10 14.66V17c0 .55-.45 1-1 1H7v4h10v-4h-2c-.55 0-1-.45-1-1v-2.34" />
            <path d="M18 2H6v7a6 6 0 0 0 12 0V2z" />
          </svg>
          <span class="hide-mobile">Peringkat</span>
        </button>

        <!-- User Profile Chip on Topbar (Click to view profile & stats) -->
        <div
          class="top-profile-chip"
          title="Klik untuk lihat Profil & EXP"
          @click="openMyProfile"
        >
          <div class="profile-mini-avatar">
            <img src="/assets/worm_win.png" alt="Avatar" onerror="this.src='/assets/worm_normal.png'" />
          </div>
          <span class="p-name">{{ user.user?.username }}</span>
          <span class="rank-badge" style="font-size: 9px; padding: 1px 4px;">{{ user.rankInfo.cur.name }}</span>
        </div>

        <!-- Wallet Chip (Click opens Wallet modal with balance, history & transfer tip) -->
        <div
          class="wallet-chip"
          title="Buka Dompet, Mutasi (+/−), & Kirim Tip"
          @click="isWalletOpen = true"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
            <line x1="1" y1="10" x2="23" y2="10" />
          </svg>
          <span class="w-label">DOMPET</span>
          <span class="w-amount">{{ formatIDR(user.user?.balance) }}</span>
        </div>

        <button class="nav-btn" title="Keluar dari Akun" @click="user.logout()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f87171" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </button>
      </div>


    </header>

    <!-- MAIN BODY GRID (Game Menu Sidebar on Left + Center Game Stage) -->
    <main class="main-content">
      <!-- Backdrop on Mobile when sidebar is open -->
      <div
        v-if="isSidebarOpen"
        class="mobile-sidebar-backdrop"
        @click="isSidebarOpen = false"
      ></div>

      <Transition name="slide-fade">
        <GameSidebar
          v-if="isSidebarOpen"
          @close-sidebar="isSidebarOpen = false"
          @open-wallet="isWalletOpen = true"
        />
      </Transition>

      <section class="center-stage">
        <Transition name="fade" mode="out-in">
          <GameCanvas v-if="game.activeGame === 'crash'" key="crash" />
          <RouletteGame v-else-if="game.activeGame === 'roulette'" key="roulette" />
          <MinesGame v-else-if="game.activeGame === 'mines'" key="mines" />
          <BlackjackGame v-else-if="game.activeGame === 'blackjack'" key="blackjack" />
        </Transition>
      </section>
    </main>

    <!-- Floating Messenger Chat & Drawer -->
    <FloatingChat />

    <!-- Modals -->
    <DailyModal :is-open="isDailyOpen" @close="isDailyOpen = false" />
    <LeaderboardModal :is-open="isLeaderboardOpen" @close="isLeaderboardOpen = false" />
    <WalletModal :is-open="isWalletOpen" @close="isWalletOpen = false" />
    <PlayerProfileModal />
    <ConfettiToast />
  </div>
</template>




