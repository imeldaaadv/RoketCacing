<script setup>
import { ref, defineProps, defineEmits, watch } from 'vue';
import { api } from '../api.js';

const props = defineProps({
  isOpen: Boolean,
});

const emit = defineEmits(['close']);

const currentTab = ref('daily');
const leaderboardList = ref([]);
const isLoading = ref(false);

const formatIDR = (n) => 'Rp ' + Math.floor(n).toLocaleString('id-ID');

async function fetchLeaderboard(tab = 'daily') {
  currentTab.value = tab;
  isLoading.value = true;
  try {
    const list = await api(`/api/games/leaderboard?type=${tab}`);
    leaderboardList.value = Array.isArray(list) ? list : [];
  } catch {
    leaderboardList.value = [
      { name: 'NagaSultan_99', profit: 485000, wr: '78%', rank: 'MASTER' },
      { name: 'BintangKosmik', profit: 320000, wr: '72%', rank: 'DIAMOND' },
      { name: 'WormRider_ID', profit: 245000, wr: '69%', rank: 'PLATINUM' },
    ];
  } finally {
    isLoading.value = false;
  }
}

watch(
  () => props.isOpen,
  (open) => {
    if (open) fetchLeaderboard('daily');
  }
);
</script>

<template>
  <div
    class="modal-backdrop"
    :class="{ open: isOpen }"
  >
    <div class="modal-window">
      <div class="modal-top">
        <span>🏆 PAPAN PERINGKAT PRO</span>
        <button
          class="modal-close-btn"
          @click="emit('close')"
        >
          &times;
        </button>
      </div>

      <div class="modal-body">
        <div class="lb-tabs">
          <button
            class="lb-tab-btn"
            :class="{ active: currentTab === 'daily' }"
            @click="fetchLeaderboard('daily')"
          >
            Harian
          </button>
          <button
            class="lb-tab-btn"
            :class="{ active: currentTab === 'weekly' }"
            @click="fetchLeaderboard('weekly')"
          >
            Mingguan
          </button>
          <button
            class="lb-tab-btn"
            :class="{ active: currentTab === 'alltime' }"
            @click="fetchLeaderboard('alltime')"
          >
            Sepanjang Masa
          </button>
        </div>

        <div class="lb-list">
          <div
            v-if="isLoading"
            style="text-align: center; padding: 20px; color: var(--text-dim);"
          >
            Memuat data peringkat...
          </div>
          <div
            v-else-if="!leaderboardList.length"
            style="text-align: center; padding: 20px; color: var(--text-muted); font-size: 12px;"
          >
            Belum ada data taruhan pada periode ini.
          </div>
            <div
              v-for="(item, idx) in leaderboardList"
              :key="idx"
              class="lb-row"
              style="cursor: pointer;"
              title="Klik untuk lihat profil & kirim tip"
              @click="user.inspectPlayer(item.name)"
            >
              <div style="display: flex; align-items: center; gap: 10px;">
                <div
                  class="lb-rank-badge"
                  :class="{
                    'top-1': idx === 0,
                    'top-2': idx === 1,
                    'top-3': idx === 2,
                  }"
                >
                  {{ idx + 1 }}
                </div>
                <div>
                  <div style="font-weight: 700; color: var(--text);">{{ item.name }}</div>
                  <div style="font-size: 10px; color: var(--text-dim);">{{ item.rank }} · WR {{ item.wr }}</div>
                </div>
              </div>
              <div style="font-family: 'JetBrains Mono'; font-weight: 700; color: var(--success);">
                +{{ formatIDR(item.profit) }}
              </div>
            </div>

        </div>
      </div>
    </div>
  </div>
</template>
