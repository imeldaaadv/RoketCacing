<script setup>
import { ref, computed } from 'vue';
import { useUserStore } from '../stores/userStore.js';

const user = useUserStore();

const isActive = ref(false);
const betAmount = ref(5000);
const mineCount = ref(3);
const minePositions = ref(new Set());
const revealedIndices = ref(new Set());
const currentMultiplier = ref(1.0);

const formatIDR = (n) => 'Rp ' + Math.floor(n || 0).toLocaleString('id-ID');
const formatX = (n) => Number(n).toFixed(2) + 'x';

const nextMultiplier = computed(() => {
  const k = revealedIndices.value.size;
  const m = Number(mineCount.value);
  if (k < 25 - m) {
    let mult = 1.0;
    for (let step = 0; step <= k; step++) {
      mult *= (25 - step) / (25 - m - step);
    }
    return Math.round(mult * 0.98 * 100) / 100;
  }
  return currentMultiplier.value;
});

const curProfit = computed(() => {
  if (!isActive.value) return 0;
  return Math.floor(betAmount.value * (currentMultiplier.value - 1));
});

function modifyBet(type) {
  const current = Number(betAmount.value) || 5000;
  if (type === 'half') betAmount.value = Math.max(500, Math.floor(current / 2));
  else if (type === 'double') betAmount.value = Math.min(Number(user.user?.balance) || 50000, current * 2);
}

function startGame() {
  if (isActive.value) {
    cashout();
    return;
  }

  const bet = Math.floor(Number(betAmount.value) || 0);
  const currentBal = Number(user.user?.balance) || 0;

  if (bet <= 0 || bet > currentBal) {
    alert('Saldo tidak mencukupi untuk main Mines!');
    return;
  }

  isActive.value = true;
  revealedIndices.value = new Set();
  minePositions.value = new Set();
  currentMultiplier.value = 1.0;

  // Place random mines
  const mCount = Number(mineCount.value);
  while (minePositions.value.size < mCount) {
    minePositions.value.add(Math.floor(Math.random() * 25));
  }
}

async function onTileClick(index) {
  if (!isActive.value || revealedIndices.value.has(index)) return;

  if (minePositions.value.has(index)) {
    // Hit Bomb
    revealedIndices.value.add(index);
    isActive.value = false;

    try {
      await user.playSingle({
        game: 'mines',
        betAmount: betAmount.value,
        multiplier: 0,
        isWin: false,
        title: `Mines (${mineCount.value} Bom) Kalah 💣`,
      });
    } catch (e) {
      console.error(e);
    }
  } else {
    // Found Gem
    revealedIndices.value.add(index);
    const k = revealedIndices.value.size;
    const m = Number(mineCount.value);

    let mult = 1.0;
    for (let step = 0; step < k; step++) {
      mult *= (25 - step) / (25 - m - step);
    }
    currentMultiplier.value = Math.round(mult * 0.98 * 100) / 100;

    // Won all gems
    if (revealedIndices.value.size === 25 - m) {
      cashout();
    }
  }
}

async function cashout() {
  if (!isActive.value) return;
  isActive.value = false;

  const bet = Math.floor(Number(betAmount.value) || 0);
  const mult = currentMultiplier.value;

  try {
    await user.playSingle({
      game: 'mines',
      betAmount: bet,
      multiplier: mult,
      isWin: true,
      title: `Mines Cashout (${formatX(mult)})`,
    });
  } catch (e) {
    console.error(e);
  }
}
</script>

<template>
  <div class="mines-wrapper">
    <div class="mines-left-control">
      <div style="font-family: 'Chakra Petch'; font-size: 12px; letter-spacing: 2px; color: var(--text-dim); text-transform: uppercase;">
        Konfigurasi Bom
      </div>

      <div>
        <label style="font-size: 11px; color: var(--text-dim); display: block; margin-bottom: 6px;">
          Jumlah Bom (1 - 24):
        </label>
        <select
          v-model.number="mineCount"
          class="game-input"
          style="padding-left: 12px;"
          :disabled="isActive"
        >
          <option :value="1">1 Bom (Aman)</option>
          <option :value="3">3 Bom (Standar)</option>
          <option :value="5">5 Bom (Menengah)</option>
          <option :value="10">10 Bom (Tinggi)</option>
          <option :value="15">15 Bom (Ekstrem)</option>
          <option :value="20">20 Bom (Legenda)</option>
          <option :value="24">24 Bom (1 Permata)</option>
        </select>
      </div>

      <div>
        <label style="font-size: 11px; color: var(--text-dim); display: block; margin-bottom: 6px;">
          Jumlah Taruhan:
        </label>
        <div class="currency-input-wrapper">
          <span class="currency-prefix">Rp</span>
          <input
            v-model.number="betAmount"
            type="number"
            min="500"
            step="500"
            class="game-input"
            :disabled="isActive"
          />
        </div>
      </div>

      <div style="display: flex; gap: 6px;">
        <button class="quick-bet-btn" style="flex: 1;" :disabled="isActive" @click="modifyBet('half')">½</button>
        <button class="quick-bet-btn" style="flex: 1;" :disabled="isActive" @click="modifyBet('double')">2×</button>
      </div>

      <div style="margin-top: auto;">
        <button
          class="primary-action-btn"
          :class="isActive ? 'btn-gold-cashout' : 'btn-green-bet'"
          :disabled="isActive && revealedIndices.size === 0"
          @click="startGame"
        >
          <template v-if="!isActive">
            Mulai Game Mines ({{ formatIDR(betAmount) }})
          </template>
          <template v-else-if="revealedIndices.size === 0">
            Pilih Permata...
          </template>
          <template v-else>
            Ambil Saldo: {{ formatIDR(Math.floor(betAmount * currentMultiplier)) }}
          </template>
        </button>
      </div>
    </div>

    <!-- Mines 5x5 Grid Container -->
    <div class="mines-board-container">
      <div class="mines-stats-banner">
        <div>Multi Saat Ini: <b style="color: var(--gold);">{{ formatX(currentMultiplier) }}</b></div>
        <div>Next Multi: <b style="color: var(--cyan);">{{ formatX(nextMultiplier) }}</b></div>
        <div>Estimasi Profit: <b style="color: var(--success);">{{ formatIDR(curProfit) }}</b></div>
      </div>

      <div class="mines-grid">
        <div
          v-for="i in 25"
          :key="i - 1"
          class="mine-tile"
          :class="{
            'revealed-gem': revealedIndices.has(i - 1) && !minePositions.has(i - 1),
            'revealed-bomb': (!isActive && minePositions.has(i - 1)) || (revealedIndices.has(i - 1) && minePositions.has(i - 1)),
          }"
          @click="onTileClick(i - 1)"
        >
          <template v-if="revealedIndices.has(i - 1) && !minePositions.has(i - 1)">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="#34d399" stroke="#10b981" stroke-width="1.5">
              <path d="M6 3h12l4 7-10 11L2 10l4-7z" />
              <path d="M12 21L8 10h8l-4 11z" fill="#6ee7b7" />
            </svg>
          </template>
          <template v-else-if="(!isActive && minePositions.has(i - 1)) || (revealedIndices.has(i - 1) && minePositions.has(i - 1))">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="#ef4444" stroke="#fca5a5" stroke-width="1.5">
              <circle cx="12" cy="13" r="8" />
              <path d="M12 5V2" stroke="#fca5a5" stroke-width="2" />
              <path d="M15 3l2-2" stroke="#fbbf24" stroke-width="2" />
            </svg>
          </template>
        </div>

      </div>
    </div>
  </div>
</template>
