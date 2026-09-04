<script setup>
import { ref, onMounted } from 'vue';
import { useUserStore } from '../stores/userStore.js';

const user = useUserStore();

const ROULETTE_NUMBERS = [
  { num: 0, color: 'green' },
  { num: 1, color: 'red' },
  { num: 2, color: 'black' },
  { num: 3, color: 'red' },
  { num: 4, color: 'black' },
  { num: 5, color: 'red' },
  { num: 6, color: 'black' },
  { num: 7, color: 'red' },
  { num: 8, color: 'black' },
  { num: 9, color: 'red' },
  { num: 10, color: 'black' },
  { num: 11, color: 'red' },
  { num: 12, color: 'black' },
  { num: 13, color: 'red' },
  { num: 14, color: 'black' },
];

const selectedColor = ref('red');
const isSpinning = ref(false);
const betAmount = ref(5000);
const pastColors = ref(['red', 'black', 'red', 'green', 'black', 'red']);
const rouletteStripRef = ref(null);

const formatIDR = (n) => 'Rp ' + Math.floor(n || 0).toLocaleString('id-ID');

function selectColor(color) {
  if (isSpinning.value) return;
  selectedColor.value = color;
}

function modifyBet(type) {
  const current = Number(betAmount.value) || 5000;
  if (type === 'half') betAmount.value = Math.max(500, Math.floor(current / 2));
  else if (type === 'double') betAmount.value = Math.min(Number(user.user?.balance) || 50000, current * 2);
  else if (type === 'max') betAmount.value = Math.max(500, Math.floor(Number(user.user?.balance) || 50000));
}

async function spin() {
  if (isSpinning.value) return;
  const bet = Math.floor(Number(betAmount.value) || 0);
  const currentBal = Number(user.user?.balance) || 0;

  if (bet <= 0 || bet > currentBal) {
    alert('Saldo tidak mencukupi untuk taruhan ini!');
    return;
  }

  isSpinning.value = true;

  const winningIdx = Math.floor(Math.random() * ROULETTE_NUMBERS.length);
  const outcome = ROULETTE_NUMBERS[winningIdx];
  const isWin = outcome.color === selectedColor.value;
  const multi = outcome.color === 'green' ? 14.0 : 2.0;

  const tileWidth = 73;
  const targetTileIndex = 4 * ROULETTE_NUMBERS.length + winningIdx;
  const targetTranslate = -(targetTileIndex * tileWidth) + 140 + (Math.random() * 20 - 10);

  if (rouletteStripRef.value) {
    rouletteStripRef.value.style.transition = 'transform 4s cubic-bezier(0.12, 0.8, 0.32, 1)';
    rouletteStripRef.value.style.transform = `translateX(${targetTranslate}px)`;
  }

  setTimeout(async () => {
    isSpinning.value = false;
    pastColors.value.unshift(outcome.color);
    if (pastColors.value.length > 8) pastColors.value.pop();

    try {
      await user.playSingle({
        game: 'roulette',
        betAmount: bet,
        multiplier: isWin ? multi : 0,
        isWin,
        title: `Roulette (${outcome.color.toUpperCase()} ${outcome.num})`,
      });
    } catch (e) {
      console.error(e);
    }
  }, 4200);
}

onMounted(() => {
  // Populate strip tiles in template
});
</script>

<template>
  <div class="roulette-wrapper">
    <div class="roulette-stage">
      <div style="font-family: 'Chakra Petch'; font-size: 12px; letter-spacing: 2px; color: var(--text-dim); text-transform: uppercase;">
        Horizontal Wheel Carousel
      </div>

      <div class="roulette-track-container">
        <div class="roulette-needle"></div>
        <div
          ref="rouletteStripRef"
          class="roulette-strip"
        >
          <template v-for="cycle in 8" :key="cycle">
            <div
              v-for="item in ROULETTE_NUMBERS"
              :key="item.num + '-' + cycle"
              class="roulette-tile"
              :class="`tile-${item.color}`"
            >
              {{ item.num }}
            </div>
          </template>
        </div>
      </div>

      <div style="display: flex; gap: 8px; align-items: center;">
        <div
          v-for="(c, i) in pastColors"
          :key="i"
          class="mult-chip"
          :class="{
            win: c === 'green',
            loss: c === 'red',
          }"
          style="padding: 2px 6px;"
        >
          {{ c === 'green' ? '🟢 HIJAU' : c === 'red' ? '🔴 MERAH' : '⚫ HITAM' }}
        </div>
      </div>
    </div>

    <!-- Options Pick Grid -->
    <div class="roulette-options-grid">
      <div
        class="roulette-pick-card"
        :class="{ 'selected-red': selectedColor === 'red' }"
        @click="selectColor('red')"
      >
        <div class="pick-icon-badge" style="background: #ef4444; color: #fff;">🔴</div>
        <div class="pick-name" style="color: #f87171;">Merah</div>
        <div class="pick-payout">Bayar 2.00x</div>
      </div>

      <div
        class="roulette-pick-card"
        :class="{ 'selected-green': selectedColor === 'green' }"
        @click="selectColor('green')"
      >
        <div class="pick-icon-badge" style="background: #10b981; color: #fff;">🟢</div>
        <div class="pick-name" style="color: #34d399;">Hijau</div>
        <div class="pick-payout">Bayar 14.00x</div>
      </div>

      <div
        class="roulette-pick-card"
        :class="{ 'selected-black': selectedColor === 'black' }"
        @click="selectColor('black')"
      >
        <div class="pick-icon-badge" style="background: #1e293b; color: #fff; border: 1px solid #475569;">⚫</div>
        <div class="pick-name" style="color: #cbd5e1;">Hitam</div>
        <div class="pick-payout">Bayar 2.00x</div>
      </div>
    </div>

    <!-- Controls Panel -->
    <div class="bet-control-panel">
      <div class="bet-inputs-row">
        <div class="currency-input-wrapper">
          <span class="currency-prefix">Rp</span>
          <input
            v-model.number="betAmount"
            type="number"
            min="500"
            step="500"
            class="game-input"
            :disabled="isSpinning"
          />
        </div>
        <button class="quick-bet-btn" :disabled="isSpinning" @click="modifyBet('half')">½</button>
        <button class="quick-bet-btn" :disabled="isSpinning" @click="modifyBet('double')">2×</button>
        <button class="quick-bet-btn" :disabled="isSpinning" @click="modifyBet('max')">MAX</button>
      </div>

      <button
        class="primary-action-btn btn-green-bet"
        :disabled="isSpinning"
        @click="spin"
      >
        {{ isSpinning ? 'Memutar Roulette...' : `Putar Roulette (${formatIDR(betAmount)})` }}
      </button>
    </div>
  </div>
</template>
