<script setup>
import { defineProps, defineEmits } from 'vue';
import { useUserStore } from '../stores/userStore.js';

const props = defineProps({
  isOpen: Boolean,
});

const emit = defineEmits(['close']);

const user = useUserStore();

const DAILY_REWARDS = [2000, 3000, 5000, 7500, 10000, 15000, 25000];

const formatIDR = (n) => 'Rp ' + Math.floor(n).toLocaleString('id-ID');

async function handleClaim() {
  if (user.isDailyClaimedToday) return;
  try {
    const res = await user.claimDaily();
    alert(`🎉 Selamat! Hadiah ${formatIDR(res.reward)} berhasil diklaim!`);
  } catch (e) {
    alert(e.message === 'DAILY_ALREADY_CLAIMED_TODAY' ? 'Hadiah sudah diambil hari ini, kembali lagi besok!' : e.message);
  }
}
</script>

<template>
  <div
    class="modal-backdrop"
    :class="{ open: isOpen }"
  >
    <div class="modal-window">
      <div class="modal-top">
        <span>🎁 KLAIM HADIAH HARIAN</span>
        <button
          class="modal-close-btn"
          @click="emit('close')"
        >
          &times;
        </button>
      </div>

      <div class="modal-body">
        <div style="font-size: 13px; color: var(--text-dim); line-height: 1.5;">
          Login setiap hari untuk meningkatkan streak dan dapatkan bonus saldo gratis hingga <b>Rp 25.000</b>!
        </div>

        <div class="streak-grid">
          <div
            v-for="(amt, idx) in DAILY_REWARDS"
            :key="idx"
            class="streak-card"
            :class="{
              claimed: (idx + 1) < user.dailyStreak || ((idx + 1) === user.dailyStreak && user.isDailyClaimedToday),
              today: (idx + 1) === user.dailyStreak && !user.isDailyClaimedToday,
            }"
          >
            <div class="streak-day-lbl">Hari {{ idx + 1 }}</div>
            <div style="font-size: 20px;">{{ idx === 6 ? '👑' : '🎁' }}</div>
            <div class="streak-amount">{{ formatIDR(amt) }}</div>
          </div>
        </div>

        <button
          class="primary-action-btn"
          :class="user.isDailyClaimedToday ? '' : 'btn-green-bet'"
          :disabled="user.isDailyClaimedToday"
          @click="handleClaim"
        >
          {{
            user.isDailyClaimedToday
              ? 'Sudah Diklaim Hari Ini ✓'
              : `Klaim Hari ${user.dailyStreak} (${formatIDR(DAILY_REWARDS[Math.min(user.dailyStreak - 1, 6)])})`
          }}
        </button>
      </div>
    </div>
  </div>
</template>
