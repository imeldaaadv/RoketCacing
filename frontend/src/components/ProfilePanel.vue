<script setup>
import { ref, computed, defineEmits } from 'vue';
import { useUserStore } from '../stores/userStore.js';

const emit = defineEmits(['open-wallet']);

const user = useUserStore();
const currentFilter = ref('all');


const formatIDR = (n) => 'Rp ' + Math.floor(n || 0).toLocaleString('id-ID');
const formatX = (n) => Number(n || 1).toFixed(2) + 'x';

const rank = computed(() => user.rankInfo);
const winrate = computed(() => user.winrate);

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
</script>

<template>
  <aside class="left-sidebar">
    <!-- Profile Box -->
    <div class="panel profile-box">
      <div class="avatar-row">
        <div class="avatar-frame">
          <img
            src="/assets/worm_win.png"
            alt="Avatar"
            onerror="this.src='https://customer-assets-eiarnc6j.emergentagent.net/job_21fa66fc-26b9-428c-a580-34df4035d637/artifacts/owvwpkjq_worm_win.png'"
          />
        </div>
        <div class="avatar-info">
          <div class="player-name">{{ user.user?.username || 'CosmicWorm_01' }}</div>
          <div class="rank-badge">{{ rank.cur.name }}</div>
        </div>
      </div>

      <!-- EXP Section -->
      <div class="exp-section">
        <div class="exp-header">
          <span v-if="rank.next">EXP {{ user.exp }} / {{ rank.next.xp }}</span>
          <span v-else>EXP {{ user.exp }} (MAX)</span>
          <span>{{ rank.next ? '→ ' + rank.next.name : '★ RADIANT' }}</span>
        </div>
        <div class="exp-track">
          <div
            class="exp-fill"
            :style="{ width: rank.progress + '%' }"
          ></div>
        </div>
      </div>

      <!-- Mini Stats -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="s-lbl">Winrate</div>
          <div
            class="s-val"
            :class="user.games > 0 ? (Number(winrate) >= 50 ? 'win' : 'loss') : ''"
          >
            {{ winrate }}%
          </div>
        </div>
        <div class="stat-card">
          <div class="s-lbl">Total Game</div>
          <div class="s-val">{{ user.games }}</div>
        </div>
        <div class="stat-card">
          <div class="s-lbl">Best Multi</div>
          <div class="s-val gold">{{ formatX(user.bestX) }}</div>
        </div>
        <div class="stat-card">
          <div class="s-lbl">Net Profit</div>
          <div
            class="s-val"
            :class="user.profit >= 0 ? 'win' : 'loss'"
          >
            {{ user.profit >= 0 ? '+' : '' }}{{ formatIDR(user.profit) }}
          </div>
        </div>
      </div>

      <!-- Quick Action Buttons in Sidebar -->
      <div style="display: flex; gap: 6px; margin-top: 2px;">
        <button
          class="nav-btn"
          style="flex: 1; justify-content: center; background: #131e3d; border-color: #233766;"
          @click="emit('open-wallet')"
        >
          💳 Dompet
        </button>
        <button
          class="nav-btn"
          style="flex: 1; justify-content: center; background: #0f2d26; border-color: #10b98155; color: #a7f3d0;"
          @click="emit('open-wallet')"
        >
          💸 Kirim Tip
        </button>
        <button
          class="nav-btn"
          style="padding: 5px 8px; justify-content: center; background: #2a1215; border-color: #ef444455; color: #fca5a5;"
          title="Keluar / Logout"
          @click="user.logout()"
        >
          🚪
        </button>
      </div>
    </div>


    <!-- History Panel with Real DB Records -->
    <div class="panel history-panel">
      <div class="panel-header">
        <span>Riwayat Ronde</span>
        <span style="color: var(--gold); font-size: 10px;">Streak: {{ user.streak }}x 🔥</span>
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
          Menang (+)
        </button>
        <button
          class="filter-btn"
          :class="{ active: currentFilter === 'loss' }"
          @click="currentFilter = 'loss'"
        >
          Kalah (−)
        </button>
        <button
          class="filter-btn"
          :class="{ active: currentFilter === 'high' }"
          @click="currentFilter = 'high'"
        >
          Multi &ge;2x
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
            <div style="font-size: 9.5px; color: var(--text-muted); font-family: 'JetBrains Mono';">
              {{ h.time ? new Date(h.time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : 'Baru saja' }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </aside>
</template>
