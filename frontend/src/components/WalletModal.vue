<script setup>
import { ref, defineProps, defineEmits } from 'vue';
import { useUserStore } from '../stores/userStore.js';

const props = defineProps({
  isOpen: Boolean,
});

const emit = defineEmits(['close']);

const user = useUserStore();
const activeTab = ref('mutasi'); // 'mutasi' | 'tip'

const tipRecipient = ref('');
const tipAmount = ref(5000);
const tipLoading = ref(false);
const tipStatusMsg = ref('');
const isSuccess = ref(false);

const formatIDR = (n) => 'Rp ' + Math.floor(n || 0).toLocaleString('id-ID');

async function handleReset() {
  try {
    await user.resetBalance();
    alert('Saldo demo berhasil direset ke Rp 50.000!');
  } catch (e) {
    alert(e.message);
  }
}

function setPreset(amt) {
  tipAmount.value = amt;
}

async function handleSendTip() {
  const recipient = tipRecipient.value.trim();
  const amt = Math.floor(Number(tipAmount.value) || 0);

  if (!recipient) {
    tipStatusMsg.value = 'Silakan masukkan username penerima!';
    isSuccess.value = false;
    return;
  }
  if (amt < 500) {
    tipStatusMsg.value = 'Minimal transfer tip adalah Rp 500';
    isSuccess.value = false;
    return;
  }

  tipLoading.value = true;
  tipStatusMsg.value = '';
  try {
    const res = await user.sendTip(recipient, amt);
    tipStatusMsg.value = `🎉 Berhasil mengirim ${formatIDR(res.amount)} ke @${res.recipientUsername}!`;
    isSuccess.value = true;
    tipRecipient.value = '';
    tipAmount.value = 5000;
  } catch (e) {
    tipStatusMsg.value = e.message || 'Gagal mengirim tip';
    isSuccess.value = false;
  } finally {
    tipLoading.value = false;
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
        <div style="display: flex; align-items: center; gap: 8px;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
            <line x1="1" y1="10" x2="23" y2="10" />
          </svg>
          <span>DOMPET & TRANSFER TIP</span>
        </div>
        <button
          class="modal-close-btn"
          @click="emit('close')"
        >
          &times;
        </button>
      </div>

      <div class="modal-body">
        <!-- Balance Header Box -->
        <div style="background: linear-gradient(135deg, #0e1a38, #162752); border: 1px solid #283e74; padding: 14px 18px; border-radius: 12px; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <div style="font-size: 11px; text-transform: uppercase; color: var(--text-dim); letter-spacing: 1px; font-weight: 600;">
              Total Saldo Aktif
            </div>
            <div style="font-family: 'JetBrains Mono'; font-weight: 700; font-size: 24px; color: var(--gold); margin-top: 2px;">
              {{ formatIDR(user.user?.balance) }}
            </div>
          </div>
          <div style="font-size: 11px; color: var(--success); font-weight: 600; display: flex; align-items: center; gap: 4px;">
            <span>● Akun Terverifikasi</span>
          </div>
        </div>


        <!-- Navigation Tabs -->
        <div class="lb-tabs">
          <button
            class="lb-tab-btn"
            :class="{ active: activeTab === 'mutasi' }"
            @click="activeTab = 'mutasi'"
          >
            Mutasi Transaksi (+ / −)
          </button>
          <button
            class="lb-tab-btn"
            :class="{ active: activeTab === 'tip' }"
            @click="activeTab = 'tip'"
          >
            Kirim Tip / Transfer
          </button>
        </div>


        <!-- TAB 1: MUTASI TRANSAKSI -->
        <div v-if="activeTab === 'mutasi'">
          <div
            class="history-list"
            style="max-height: 220px;"
          >
            <div
              v-if="!user.transactions.length"
              style="text-align: center; padding: 20px; color: var(--text-muted); font-size: 11px;"
            >
              Belum ada mutasi transaksi.
            </div>
            <div
              v-for="(log, idx) in user.transactions"
              :key="idx"
              class="history-item"
            >
              <div>
                <div style="font-weight: 600; color: var(--text);">{{ log.title }}</div>
                <div style="font-size: 9.5px; color: var(--text-muted); font-family: 'JetBrains Mono';">
                  {{ log.time ? new Date(log.time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : 'Baru saja' }}
                </div>
              </div>
              <div
                class="history-item-amt"
                :class="log.type === 'credit' ? 'win' : 'loss'"
              >
                {{ log.type === 'credit' ? '+' : '−' }}{{ formatIDR(log.amount) }}
              </div>
            </div>
          </div>
        </div>

        <!-- TAB 2: TRANSFER TIP FORM -->
        <div v-else-if="activeTab === 'tip'" style="display: flex; flex-direction: column; gap: 12px;">
          <div>
            <label style="font-size: 11px; color: var(--text-dim); display: block; margin-bottom: 4px;">
              Username Penerima
            </label>
            <input
              v-model="tipRecipient"
              class="game-input"
              style="padding-left: 12px;"
              placeholder="Ketik username teman..."
              :disabled="tipLoading"
            />
          </div>

          <div>
            <label style="font-size: 11px; color: var(--text-dim); display: block; margin-bottom: 4px;">
              Nominal Transfer (Min Rp 500)
            </label>
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
          </div>

          <div style="display: flex; gap: 6px; flex-wrap: wrap;">
            <span class="preset-chip" @click="setPreset(1000)">1k</span>
            <span class="preset-chip" @click="setPreset(5000)">5k</span>
            <span class="preset-chip" @click="setPreset(10000)">10k</span>
            <span class="preset-chip" @click="setPreset(25000)">25k</span>
            <span class="preset-chip" @click="setPreset(50000)">50k</span>
          </div>

          <button
            class="primary-action-btn btn-green-bet"
            style="margin-top: 4px; padding: 12px;"
            :disabled="tipLoading"
            @click="handleSendTip"
          >
            {{ tipLoading ? 'Mengirim Tip...' : `Kirim ${formatIDR(tipAmount)} Sekarang 💸` }}
          </button>

          <div
            v-if="tipStatusMsg"
            :style="{ color: isSuccess ? 'var(--success)' : 'var(--danger)', fontSize: '12px', textAlign: 'center', fontWeight: '600' }"
          >
            {{ tipStatusMsg }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

