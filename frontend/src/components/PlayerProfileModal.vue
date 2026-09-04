<script setup>
import { ref } from 'vue';
import { useUserStore } from '../stores/userStore.js';

const user = useUserStore();

const tipAmount = ref(5000);
const tipLoading = ref(false);
const tipSuccess = ref('');

const formatIDR = (n) => 'Rp ' + Math.floor(n || 0).toLocaleString('id-ID');
const formatX = (n) => Number(n || 1).toFixed(2) + 'x';

function setTip(amt) {
  tipAmount.value = amt;
}

async function handleSendTip() {
  if (!user.selectedProfile?.username) return;
  tipSuccess.value = '';
  tipLoading.value = true;
  try {
    const res = await user.sendTip(user.selectedProfile.username, tipAmount.value);
    tipSuccess.value = `Berhasil mengirim tip ${formatIDR(res.amount)} ke ${res.recipientUsername}!`;
    setTimeout(() => {
      tipSuccess.value = '';
    }, 4000);
  } catch (e) {
    alert(e.message || 'Gagal mengirim tip');
  } finally {
    tipLoading.value = false;
  }
}
</script>

<template>
  <div
    class="modal-backdrop"
    :class="{ open: user.isProfileModalOpen }"
  >
    <div class="modal-window" v-if="user.selectedProfile">
      <div class="modal-top">
        <span>👤 PROFIL PEMAIN</span>
        <button
          class="modal-close-btn"
          @click="user.closeProfileModal()"
        >
          &times;
        </button>
      </div>

      <div class="modal-body">
        <!-- Player Header Box -->
        <div style="background: linear-gradient(135deg, #0e1a38, #162752); border: 1px solid #283e74; padding: 16px; border-radius: 12px; display: flex; align-items: center; gap: 14px;">
          <div class="avatar-frame" style="width: 64px; height: 64px;">
            <img
              src="/assets/worm_win.png"
              alt="Avatar"
              onerror="this.src='/assets/worm_normal.png'"
            />
          </div>
          <div>
            <div style="font-size: 18px; font-weight: 700; color: #fff;">
              {{ user.selectedProfile.username }}
            </div>
            <div style="display: flex; gap: 6px; align-items: center; margin-top: 4px;">
              <span class="rank-badge">{{ user.selectedProfile.rank }}</span>
              <span style="font-size: 11px; color: var(--text-dim);">EXP: {{ user.selectedProfile.exp }}</span>
            </div>
          </div>
        </div>

        <!-- Stats 4-Grid -->
        <div class="stats-grid">
          <div class="stat-card">
            <div class="s-lbl">Winrate</div>
            <div
              class="s-val"
              :class="user.selectedProfile.winrate >= 50 ? 'win' : 'loss'"
            >
              {{ user.selectedProfile.winrate }}%
            </div>
          </div>
          <div class="stat-card">
            <div class="s-lbl">Total Game</div>
            <div class="s-val">{{ user.selectedProfile.games }}</div>
          </div>
          <div class="stat-card">
            <div class="s-lbl">Best Multi</div>
            <div class="s-val gold">{{ formatX(user.selectedProfile.bestX) }}</div>
          </div>
          <div class="stat-card">
            <div class="s-lbl">Total Profit</div>
            <div
              class="s-val"
              :class="user.selectedProfile.profit >= 0 ? 'win' : 'loss'"
            >
              {{ user.selectedProfile.profit >= 0 ? '+' : '' }}{{ formatIDR(user.selectedProfile.profit) }}
            </div>
          </div>
        </div>

        <!-- Send Tip Section -->
        <div
          v-if="user.selectedProfile.username !== user.user?.username"
          style="background: #090e1f; border: 1px solid var(--border); border-radius: 12px; padding: 14px; display: flex; flex-direction: column; gap: 10px;"
        >
          <div style="font-family: 'Chakra Petch'; font-size: 12px; letter-spacing: 1px; color: var(--gold); text-transform: uppercase; font-weight: 700;">
            🎁 Kirim Tip / Saldo ke @{{ user.selectedProfile.username }}
          </div>

          <div style="display: flex; gap: 6px; flex-wrap: wrap;">
            <span class="preset-chip" @click="setTip(1000)">1k</span>
            <span class="preset-chip" @click="setTip(5000)">5k</span>
            <span class="preset-chip" @click="setTip(10000)">10k</span>
            <span class="preset-chip" @click="setTip(25000)">25k</span>
            <span class="preset-chip" @click="setTip(50000)">50k</span>
          </div>

          <div class="bet-inputs-row">
            <div class="currency-input-wrapper">
              <span class="currency-prefix">Rp</span>
              <input
                v-model.number="tipAmount"
                type="number"
                min="500"
                step="500"
                class="game-input"
                :disabled="tipLoading"
              />
            </div>
            <button
              class="primary-action-btn btn-green-bet"
              style="width: auto; padding: 10px 18px; font-size: 13px;"
              :disabled="tipLoading || tipAmount < 500"
              @click="handleSendTip"
            >
              {{ tipLoading ? 'Mengirim...' : 'Kirim Tip 💸' }}
            </button>
          </div>

          <div
            v-if="tipSuccess"
            style="color: var(--success); font-size: 12px; font-weight: 600; text-align: center;"
          >
            {{ tipSuccess }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
