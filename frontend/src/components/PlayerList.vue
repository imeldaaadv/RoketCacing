<script setup>
import { useGameStore } from '../stores/gameStore.js';
const game = useGameStore();
</script>

<template>
  <aside class="players">
    <h3>PEMAIN ({{ game.players.length }})</h3>
    <div v-for="p in game.players" :key="p.userId" class="p-row">
      <span class="p-name">{{ p.username }}</span>
      <span class="p-bet">{{ p.amount }}</span>
      <span class="p-mult" :class="p.status === 'won' ? 'win' : ''">
        {{ p.status === 'won' ? p.cashoutAt + 'x' : '—' }}
      </span>
    </div>
    <p v-if="!game.players.length" class="empty">Belum ada yang bet...</p>
  </aside>
</template>