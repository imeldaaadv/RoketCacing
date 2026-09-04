<script setup>
import { ref, computed, onMounted, nextTick, watch } from 'vue';
import { useGameStore } from '../stores/gameStore.js';
import { useUserStore } from '../stores/userStore.js';
import { getSocket } from '../composables/useSocket.js';

const game = useGameStore();
const user = useUserStore();
const text = ref('');
const chatBodyRef = ref(null);

const messages = computed(() => game.chatMessages);

function scrollToBottom() {
  nextTick(() => {
    if (chatBodyRef.value) {
      chatBodyRef.value.scrollTop = chatBodyRef.value.scrollHeight;
    }
  });
}

watch(messages, () => scrollToBottom(), { deep: true });

function formatTime(timestamp) {
  const d = timestamp ? new Date(timestamp) : new Date();
  return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

function sendMessage() {
  const msg = text.value.trim();
  if (!msg) return;

  const sock = getSocket();
  if (sock) {
    sock.emit('chat:send', { text: msg });
  } else {
    game.addChatMessage({
      username: user.user?.username || 'You',
      text: msg,
      at: Date.now(),
    });
  }
  text.value = '';
  scrollToBottom();
}

// Simulated active chat seed to enrich the live feel
onMounted(() => {
  scrollToBottom();
  const seedMessages = [
    { username: 'NebulaNina', text: 'Ayoo cashout awal broo' },
    { username: 'WormGod', text: '2x aman gass 🔥' },
    { username: 'Astroboi', text: '5x atau mati 🚀' },
    { username: 'Kudanil', text: 'Rugi mulu wkwk' },
    { username: 'Vip3r', text: 'Gass 10x jackpot!' },
  ];

  if (game.chatMessages.length === 0) {
    seedMessages.slice(0, 3).forEach((m, idx) => {
      game.addChatMessage({
        username: m.username,
        text: m.text,
        at: Date.now() - (3 - idx) * 15000,
      });
    });
  }

  const interval = setInterval(() => {
    if (Math.random() < 0.35) {
      const pick = seedMessages[Math.floor(Math.random() * seedMessages.length)];
      game.addChatMessage({
        username: `${pick.username}_${Math.floor(Math.random() * 89 + 10)}`,
        text: pick.text,
        at: Date.now(),
      });
    }
  }, 7000);

  return () => clearInterval(interval);
});
</script>

<template>
  <div class="right panel">
    <h3>Live Chat</h3>
    <div ref="chatBodyRef" class="chat-body">
      <div
        v-for="(m, i) in messages"
        :key="i"
        class="msg"
      >
        <span class="t">{{ formatTime(m.at) }}</span>
        <span
          class="u"
          :style="{ color: m.username === user.user?.username ? 'var(--accent)' : 'var(--accent-2)' }"
        >
          {{ m.username }}:
        </span>
        <span>{{ m.text }}</span>
      </div>
    </div>
    <form class="chat-form" @submit.prevent="sendMessage">
      <input
        v-model="text"
        placeholder="Ketik pesan…"
        maxlength="120"
        autocomplete="off"
      />
      <button type="submit">Kirim</button>
    </form>
  </div>
</template>
