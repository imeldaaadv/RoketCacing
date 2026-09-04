<script setup>
import { ref } from 'vue';
import { useUserStore } from '../stores/userStore.js';

const user = useUserStore();

const SUITS = ['♠', '♥', '♦', '♣'];
const VALUES = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

const isActive = ref(false);
const betAmount = ref(5000);
const dealerHand = ref([]);
const playerHand = ref([]);
const dealerRevealed = ref(false);
const statusMsg = ref('Pasang taruhan dan klik DEAL');
let deck = [];

const formatIDR = (n) => 'Rp ' + Math.floor(n || 0).toLocaleString('id-ID');

function createDeck() {
  const d = [];
  SUITS.forEach((s) => {
    VALUES.forEach((v) => {
      d.push({ suit: s, val: v, isRed: s === '♥' || s === '♦' });
    });
  });
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

function getHandScore(hand) {
  let total = 0;
  let aces = 0;
  hand.forEach((c) => {
    if (['J', 'Q', 'K'].includes(c.val)) total += 10;
    else if (c.val === 'A') {
      total += 11;
      aces++;
    } else total += Number(c.val);
  });
  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }
  return total;
}

function modifyBet(type) {
  const current = Number(betAmount.value) || 5000;
  if (type === 'half') betAmount.value = Math.max(500, Math.floor(current / 2));
  else if (type === 'double') betAmount.value = Math.min(Number(user.user?.balance) || 50000, current * 2);
}

function deal() {
  if (isActive.value) return;
  const bet = Math.floor(Number(betAmount.value) || 0);
  const currentBal = Number(user.user?.balance) || 0;

  if (bet <= 0 || bet > currentBal) {
    alert('Saldo tidak mencukupi untuk main Blackjack!');
    return;
  }

  isActive.value = true;
  dealerRevealed.value = false;
  deck = createDeck();
  playerHand.value = [deck.pop(), deck.pop()];
  dealerHand.value = [deck.pop(), deck.pop()];
  statusMsg.value = 'Pilih aksi: Hit, Stand, atau Double!';

  if (getHandScore(playerHand.value) === 21) {
    stand();
  }
}

function hit() {
  if (!isActive.value) return;
  playerHand.value.push(deck.pop());
  const score = getHandScore(playerHand.value);
  if (score > 21) {
    statusMsg.value = 'BUST! Nilai kartu melebihi 21.';
    endRound('dealer');
  } else if (score === 21) {
    stand();
  }
}

function doubleDown() {
  if (!isActive.value) return;
  betAmount.value *= 2;
  playerHand.value.push(deck.pop());
  const score = getHandScore(playerHand.value);
  if (score > 21) {
    statusMsg.value = 'BUST! Nilai kartu melebihi 21.';
    endRound('dealer');
  } else {
    stand();
  }
}

function stand() {
  if (!isActive.value) return;
  dealerRevealed.value = true;

  while (getHandScore(dealerHand.value) < 17) {
    dealerHand.value.push(deck.pop());
  }

  const pScore = getHandScore(playerHand.value);
  const dScore = getHandScore(dealerHand.value);

  if (pScore > 21) {
    endRound('dealer');
  } else if (dScore > 21) {
    statusMsg.value = 'DEALER BUST! Kamu menang.';
    endRound('player');
  } else if (pScore > dScore) {
    statusMsg.value = `MENANG! ${pScore} vs ${dScore}`;
    endRound('player');
  } else if (pScore < dScore) {
    statusMsg.value = `KALAH! ${pScore} vs ${dScore}`;
    endRound('dealer');
  } else {
    statusMsg.value = `SERI (PUSH)! Saldo dikembalikan.`;
    endRound('push');
  }
}

async function endRound(winner) {
  isActive.value = false;
  const isNaturalBJ = playerHand.value.length === 2 && getHandScore(playerHand.value) === 21;
  const mult = isNaturalBJ ? 2.5 : 2.0;

  if (winner === 'player') {
    try {
      await user.playSingle({
        game: 'blackjack',
        betAmount: betAmount.value,
        multiplier: mult,
        isWin: true,
        title: `Blackjack Menang (${isNaturalBJ ? 'Natural 21' : 'Score ' + getHandScore(playerHand.value)})`,
      });
    } catch (e) {
      console.error(e);
    }
  } else if (winner === 'dealer') {
    try {
      await user.playSingle({
        game: 'blackjack',
        betAmount: betAmount.value,
        multiplier: 0,
        isWin: false,
        title: 'Blackjack Kalah',
      });
    } catch (e) {
      console.error(e);
    }
  }
}
</script>

<template>
  <div class="bj-wrapper">
    <div class="bj-table">
      <!-- Dealer Hand -->
      <div class="bj-hand-section">
        <div class="bj-hand-label">
          <span>DEALER</span>
          <span class="bj-score-pill">
            {{
              dealerRevealed
                ? getHandScore(dealerHand)
                : dealerHand.length > 0
                ? `${getHandScore([dealerHand[0]])} + ?`
                : '?'
            }}
          </span>
        </div>
        <div class="cards-row">
          <template v-if="!dealerHand.length">
            <div class="bj-card back">?</div>
            <div class="bj-card back">?</div>
          </template>
          <template v-else>
            <div
              v-for="(c, idx) in dealerHand"
              :key="idx"
              class="bj-card"
              :class="{
                red: c.isRed,
                back: idx === 1 && !dealerRevealed,
              }"
            >
              <template v-if="idx === 1 && !dealerRevealed">♠</template>
              <template v-else>
                <div>{{ c.val }}</div>
                <div style="font-size: 20px; text-align: center;">{{ c.suit }}</div>
                <div style="text-align: right;">{{ c.val }}</div>
              </template>
            </div>
          </template>
        </div>
      </div>

      <!-- Status Msg in Center -->
      <div style="text-align: center; font-family: 'Chakra Petch'; font-size: 18px; font-weight: 700; color: var(--gold); letter-spacing: 1.5px;">
        {{ statusMsg }}
      </div>

      <!-- Player Hand -->
      <div class="bj-hand-section">
        <div class="cards-row">
          <template v-if="!playerHand.length">
            <div class="bj-card back">?</div>
            <div class="bj-card back">?</div>
          </template>
          <template v-else>
            <div
              v-for="(c, idx) in playerHand"
              :key="idx"
              class="bj-card"
              :class="{ red: c.isRed }"
            >
              <div>{{ c.val }}</div>
              <div style="font-size: 20px; text-align: center;">{{ c.suit }}</div>
              <div style="text-align: right;">{{ c.val }}</div>
            </div>
          </template>
        </div>
        <div class="bj-hand-label">
          <span>KAMU</span>
          <span class="bj-score-pill">{{ getHandScore(playerHand) }}</span>
        </div>
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
            :disabled="isActive"
          />
        </div>
        <button class="quick-bet-btn" :disabled="isActive" @click="modifyBet('half')">½</button>
        <button class="quick-bet-btn" :disabled="isActive" @click="modifyBet('double')">2×</button>
      </div>

      <div class="bj-actions-bar">
        <button class="bj-btn bj-btn-deal" :disabled="isActive" @click="deal">DEAL</button>
        <button class="bj-btn bj-btn-hit" :disabled="!isActive" @click="hit">HIT</button>
        <button class="bj-btn bj-btn-stand" :disabled="!isActive" @click="stand">STAND</button>
        <button class="bj-btn bj-btn-double" :disabled="!isActive" @click="doubleDown">2X DOUBLE</button>
      </div>
    </div>
  </div>
</template>
