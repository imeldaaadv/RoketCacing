<script setup>
import { ref, computed } from 'vue';
import { useGameStore } from '../stores/gameStore.js';
import { useUserStore } from '../stores/userStore.js';
import { getSocket } from '../composables/useSocket.js';

const game = useGameStore();
const user = useUserStore();

const autoMode = ref(false);
const autoCashChk = ref(true);
const autoCashout = ref(2.0);
const amount = ref(10);

const fmt = (n) =>
  Number(n || 0).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const myBet = computed(() =>
  game.players.find((p) => p.userId === (user.user?.id || user.user?.sub))
);

const canBet = computed(() => game.phase === 'betting' && !myBet.value);
const canCash = computed(() => game.phase === 'running' && myBet.value?.status === 'active');

const profitEstimate = computed(() => {
  if (!myBet.value) return 0;
  const mult = game.multiplier || 1.0;
  return Math.max(0, (myBet.value.amount || 0) * (mult - 1));
});

const actionBtnClass = computed(() => {
  if (canCash.value) return 'btn-cash';
  if (game.phase === 'betting' && myBet.value) return 'btn-cancel';
  if (canBet.value) return 'btn-bet';
  return 'btn-bet';
});

const actionBtnText = computed(() => {
  if (canCash.value) {
    return `Cashout ${game.multiplier.toFixed(2)}x — +${fmt(profitEstimate.value)}`;
  }
  if (game.phase === 'betting') {
    if (myBet.value) {
      return `Bet Terpasang · ${fmt(myBet.value.amount)}★`;
    }
    return 'Bet';
  }
  if (game.phase === 'crashed') {
    return 'CRASH';
  }
  return 'Menunggu…';
});

const isActionDisabled = computed(() => {
  if (canCash.value) return false;
  if (canBet.value) return false;
  return true;
});

function setHalf() {
  amount.value = Math.max(1, Math.floor((Number(amount.value) || 1) / 2));
}

function setDouble() {
  const max = Number(user.user?.balance) || 1000;
  amount.value = Math.min(max, (Number(amount.value) || 1) * 2);
}

function placeBet() {
  const betAmt = Math.max(1, Math.floor(Number(amount.value) || 0));
  const currentBal = Number(user.user?.balance) || 0;
  if (betAmt <= 0 || betAmt > currentBal) {
    alert('Saldo tidak mencukupi atau jumlah tidak valid.');
    return;
  }

  const payload = {
    amount: betAmt,
    auto: autoMode.value && autoCashChk.value ? Number(autoCashout.value) : null,
  };

  const sock = getSocket();
  if (sock) {
    sock.emit('bet:place', payload, (r) => {
      if (r.ok) {
        user.setBalance(r.balance);
        user.recordBet(betAmt);
      } else {
        alert(r.error || 'Gagal memasang taruhan');
      }
    });
  }
}

function handleAction() {
  if (canCash.value) {
    const sock = getSocket();
    if (sock) {
      sock.emit('bet:cashout', {}, (r) => {
        if (r.ok) {
          user.recordWin({
            multiplier: r.multiplier,
            profit: r.profit,
            balance: r.balance,
          });
        } else {
          alert(r.error || 'Gagal cashout');
        }
      });
    }
    return;
  }

  if (canBet.value) {
    placeBet();
  }
}
</script>

<template>
  <div class="controls">
    <!-- Tabs: Manual / Auto -->
    <div class="tabs">
      <button
        :class="{ on: !autoMode }"
        @click="autoMode = false"
      >
        Manual
      </button>
      <button
        :class="{ on: autoMode }"
        @click="autoMode = true"
      >
        Auto
      </button>
    </div>

    <!-- Bet Input Row -->
    <div class="bet-row">
      <input
        v-model.number="amount"
        type="number"
        min="1"
        step="1"
        class="bet-input"
        placeholder="Jumlah Bet"
      />
      <button class="mini" @click="setHalf">½</button>
      <button class="mini" @click="setDouble">2×</button>
    </div>

    <!-- Auto Cashout Row -->
    <div v-show="autoMode" class="auto-row">
      <label>
        <input v-model="autoCashChk" type="checkbox" />
        Auto Cashout at
      </label>
      <input
        v-model.number="autoCashout"
        type="number"
        min="1.01"
        step="0.01"
      />
      <span>x</span>
    </div>

    <!-- Dynamic Action Button -->
    <button
      class="action"
      :class="actionBtnClass"
      :disabled="isActionDisabled"
      @click="handleAction"
    >
      {{ actionBtnText }}
    </button>
  </div>
</template>