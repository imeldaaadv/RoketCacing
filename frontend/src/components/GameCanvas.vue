<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useGameStore } from '../stores/gameStore.js';
import { useUserStore } from '../stores/userStore.js';
import { getSocket } from '../composables/useSocket.js';

const game = useGameStore();
const user = useUserStore();

const autoMode = ref(false);
const autoCashChk = ref(true);
const autoCashVal = ref(2.0);
const betAmount = ref(5000);
const canvasRef = ref(null);
let ctx = null;

const formatIDR = (n) => 'Rp ' + Math.floor(n || 0).toLocaleString('id-ID');
const formatX = (n) => Number(n || 1).toFixed(2) + 'x';

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

const multiText = computed(() => {
  if (game.phase === 'crashed') {
    return (game.lastCrash ? game.lastCrash.toFixed(2) : game.multiplier.toFixed(2)) + 'x';
  }
  if (game.phase === 'betting') {
    return '1.00x';
  }
  return game.multiplier.toFixed(2) + 'x';
});

const multiClass = computed(() => {
  if (game.phase === 'crashed') return 'crashed';
  if (game.phase === 'betting') return 'waiting';
  if (game.multiplier >= 2.0) return 'hot';
  return 'flying';
});

const wormSpriteStyle = computed(() => {
  const norm = Math.max(0, Math.min(1, (game.multiplier - 1) / 6.0));
  const leftPct = game.phase === 'betting' || game.phase === 'idle' ? 8 : 8 + norm * 72;
  const bottomPct = game.phase === 'betting' || game.phase === 'idle' ? 8 : 8 + Math.pow(norm, 0.85) * 70;

  let bg = '/assets/worm_normal.png';
  let tr = 'rotate(0deg)';

  if (game.phase === 'crashed') {
    bg = '/assets/worm_crash.png';
    tr = 'translateY(40px) rotate(30deg)';
  } else if (game.phase === 'running') {
    bg = '/assets/worm_win.png';
    tr = 'scale(1.08)';
  }

  return {
    left: `${leftPct}%`,
    bottom: `${bottomPct}%`,
    backgroundImage: `url(${bg})`,
    transform: tr,
  };
});

function drawTrajectory() {
  if (!canvasRef.value || !ctx) return;
  const w = canvasRef.value.width;
  const h = canvasRef.value.height;
  ctx.clearRect(0, 0, w, h);

  const isCrash = game.phase === 'crashed';
  const norm = Math.max(0, Math.min(1, (game.multiplier - 1) / 6.0));
  const curveY = Math.pow(norm, 0.85);

  const startX = w * 0.08;
  const startY = h * 0.88;
  const endX = w * (0.08 + norm * 0.76);
  const endY = h * (0.88 - curveY * 0.74);

  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.quadraticCurveTo(startX + (endX - startX) * 0.4, startY, endX, endY);
  ctx.strokeStyle = isCrash ? 'rgba(239, 68, 68, 0.85)' : 'rgba(59, 130, 246, 0.85)';
  ctx.lineWidth = 4;
  ctx.shadowColor = isCrash ? '#ef4444' : '#3b82f6';
  ctx.shadowBlur = 12;
  ctx.stroke();
  ctx.shadowBlur = 0;

  ctx.lineTo(endX, startY);
  ctx.lineTo(startX, startY);
  ctx.closePath();
  const fillGrad = ctx.createLinearGradient(0, endY, 0, startY);
  fillGrad.addColorStop(0, isCrash ? 'rgba(239,68,68,0.2)' : 'rgba(59,130,246,0.25)');
  fillGrad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = fillGrad;
  ctx.fill();
}

watch(() => game.multiplier, () => drawTrajectory());
watch(() => game.phase, () => drawTrajectory());

function resizeCanvas() {
  if (!canvasRef.value) return;
  canvasRef.value.width = canvasRef.value.parentElement.clientWidth;
  canvasRef.value.height = canvasRef.value.parentElement.clientHeight;
  drawTrajectory();
}

function setPreset(amt) {
  betAmount.value = amt;
}

function modifyBet(type) {
  const cur = Number(betAmount.value) || 5000;
  if (type === 'half') betAmount.value = Math.max(500, Math.floor(cur / 2));
  else if (type === 'double') betAmount.value = Math.min(Number(user.user?.balance) || 50000, cur * 2);
  else if (type === 'max') betAmount.value = Math.max(500, Math.floor(Number(user.user?.balance) || 50000));
}

function placeBet() {
  const betAmt = Math.max(500, Math.floor(Number(betAmount.value) || 0));
  const currentBal = Number(user.user?.balance) || 0;
  if (betAmt <= 0 || betAmt > currentBal) {
    alert('Saldo tidak mencukupi untuk taruhan ini!');
    return;
  }

  const payload = {
    amount: betAmt,
    auto: autoMode.value && autoCashChk.value ? Number(autoCashVal.value) : null,
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

onMounted(() => {
  if (canvasRef.value) {
    ctx = canvasRef.value.getContext('2d');
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
  }
});
</script>

<template>
  <section class="crash-container">
    <div class="flight-arena">
      <div class="arena-gradient-glow"></div>

      <!-- Past Crash Pills -->
      <div class="arena-history-chips">
        <div
          v-for="(h, i) in (game.history || []).slice(0, 8)"
          :key="i"
          class="mult-chip"
          :class="{
            mega: Number(h) >= 10,
            win: Number(h) >= 2.0 && Number(h) < 10,
            loss: Number(h) < 2.0,
          }"
        >
          {{ formatX(h) }}
        </div>
      </div>

      <!-- Trajectory Canvas -->
      <canvas ref="canvasRef" id="crashCanvas"></canvas>

      <!-- Flying Worm Element -->
      <div class="flying-worm-elem" :style="wormSpriteStyle"></div>

      <!-- Big Multiplier Display -->
      <div class="big-multiplier-display" :class="multiClass">
        {{ multiText }}
      </div>

      <!-- Stage Footer Bar -->
      <div class="stage-footer-bar">
        <div
          class="live-status-pill"
          :class="{
            betting: game.phase === 'betting',
            crashed: game.phase === 'crashed',
          }"
        >
          <span class="indicator"></span>
          <span>
            {{
              game.phase === 'betting'
                ? 'Ronde baru… pasang taruhan'
                : game.phase === 'running'
                ? 'Cacing Terbang…'
                : 'CRASH!'
            }}
          </span>
        </div>
        <div v-if="game.phase === 'betting' && game.bettingEndsAt">
          Waktu: {{ Math.max(0, (game.bettingEndsAt - Date.now()) / 1000).toFixed(1) }}s
        </div>
      </div>
    </div>

    <!-- Crash Betting Controls -->
    <div class="bet-control-panel">
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
        <div class="bet-mode-tabs">
          <button
            class="mode-tab-btn"
            :class="{ active: !autoMode }"
            @click="autoMode = false"
          >
            Manual
          </button>
          <button
            class="mode-tab-btn"
            :class="{ active: autoMode }"
            @click="autoMode = true"
          >
            Auto
          </button>
        </div>

        <div class="quick-presets-row">
          <span class="preset-chip" @click="setPreset(1000)">1k</span>
          <span class="preset-chip" @click="setPreset(5000)">5k</span>
          <span class="preset-chip" @click="setPreset(10000)">10k</span>
          <span class="preset-chip" @click="setPreset(25000)">25k</span>
          <span class="preset-chip" @click="setPreset(50000)">50k</span>
        </div>
      </div>

      <div class="bet-inputs-row">
        <div class="currency-input-wrapper">
          <span class="currency-prefix">Rp</span>
          <input
            v-model.number="betAmount"
            type="number"
            min="500"
            step="500"
            class="game-input"
            :disabled="game.phase === 'running'"
          />
        </div>
        <button class="quick-bet-btn" :disabled="game.phase === 'running'" @click="modifyBet('half')">½</button>
        <button class="quick-bet-btn" :disabled="game.phase === 'running'" @click="modifyBet('double')">2×</button>
        <button class="quick-bet-btn" :disabled="game.phase === 'running'" @click="modifyBet('max')">MAX</button>
      </div>

      <div v-show="autoMode" class="auto-settings-row">
        <label>
          <input v-model="autoCashChk" type="checkbox" />
          <span>Auto Cashout di</span>
        </label>
        <div style="display: flex; align-items: center; gap: 4px;">
          <input
            v-model.number="autoCashVal"
            type="number"
            min="1.01"
            step="0.1"
            class="game-input"
            style="width: 80px; padding: 6px 8px;"
          />
          <span style="font-family: 'JetBrains Mono'; font-weight: 700; color: var(--text-dim);">x</span>
        </div>
      </div>

      <!-- Action Button -->
      <button
        class="primary-action-btn"
        :class="{
          'btn-gold-cashout': canCash,
          'btn-red-cancel': game.phase === 'betting' && myBet,
          'btn-green-bet': canBet,
        }"
        :disabled="!canCash && !canBet"
        @click="handleAction"
      >
        <template v-if="canCash">
          Ambil Saldo: {{ formatIDR(myBet.amount + profitEstimate) }} ({{ formatX(game.multiplier) }})
        </template>
        <template v-else-if="game.phase === 'betting'">
          {{ myBet ? `Bet Terpasang (${formatIDR(myBet.amount)})` : `Pasang Bet (${formatIDR(betAmount)})` }}
        </template>
        <template v-else-if="game.phase === 'crashed'">
          CRASHED
        </template>
        <template v-else>
          Menunggu Ronde...
        </template>
      </button>
    </div>
  </section>
</template>
