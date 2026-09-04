<script setup>
import { useGameStore } from '../stores/gameStore.js';
const game = useGameStore();
const color = (v) => (v < 2 ? 'pill-low' : v < 10 ? 'pill-mid' : 'pill-high');
</script>

<template>
  <div class="history">
    <span v-for="(h, i) in game.history" :key="i" class="pill" :class="color(h)">{{ h.toFixed(2) }}x</span>
  </div>
</template>