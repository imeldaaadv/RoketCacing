<script setup>
import { ref, computed, watch, nextTick, onMounted } from 'vue';
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
watch(
  () => game.isChatOpen,
  (open) => {
    if (open) scrollToBottom();
  }
);

function formatTime(timestamp) {
  if (!timestamp) return '';
  const d = new Date(timestamp);
  const now = new Date();

  const isToday = d.toDateString() === now.toDateString();
  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();

  const timeStr = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

  if (isToday) {
    return timeStr;
  }
  if (isYesterday) {
    return `Kemarin ${timeStr}`;
  }
  const dateStr = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  return `${dateStr}, ${timeStr}`;
}

function formatFullDate(timestamp) {
  if (!timestamp) return '';
  return new Date(timestamp).toLocaleString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function openPlayer(username) {

  if (!username) return;
  user.inspectPlayer(username);
}

function sendMessage() {
  const msg = text.value.trim();
  if (!msg) return;

  const sock = getSocket();
  if (sock) {
    sock.emit('chat:send', { text: msg });
  } else {
    game.addChatMessage({
      username: user.user?.username || 'Kamu',
      text: msg,
      at: Date.now(),
    });
  }
  text.value = '';
  scrollToBottom();
}

onMounted(() => {
  scrollToBottom();
});
</script>

<template>
  <div>
    <!-- Chat Trigger Bubble (Bottom Right) -->
    <div
      class="floating-chat-trigger"
      title="Buka Live Chat Komunitas"
      @click="game.toggleChat"
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
      <span
        v-if="unreadCount > 0"
        class="floating-chat-badge"
      >
        {{ unreadCount }}
      </span>
    </div>


    <!-- Slide-in Chat Drawer -->
    <div
      class="chat-drawer"
      :class="{ open: game.isChatOpen }"
    >
      <div class="chat-drawer-header">
        <div style="display: flex; align-items: center; gap: 8px;">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <span style="font-weight: 700;">Live Chat Komunitas</span>
          <span style="color: var(--success); font-size: 10px;">● Online</span>
        </div>
        <button
          class="chat-close-btn"
          @click="game.closeChat"
        >
          &times;
        </button>
      </div>

      <div
        ref="chatBodyRef"
        class="chat-messages"
      >
        <div
          v-if="!messages.length"
          style="text-align: center; padding: 30px; color: var(--text-muted); font-size: 11px;"
        >
          Belum ada pesan. Jadilah yang pertama menyapa!
        </div>
        <div
          v-for="(m, i) in messages"
          :key="i"
          class="chat-bubble"
          :class="{ self: m.username === user.user?.username || m.username === 'Kamu' }"
        >
          <div class="chat-meta">
            <span
              class="chat-author"
              style="cursor: pointer; text-decoration: underline;"
              title="Lihat profil & kirim tip"
              @click="openPlayer(m.username)"
            >
              {{ m.username }}
            </span>
            <span class="chat-time" :title="formatFullDate(m.at)">{{ formatTime(m.at) }}</span>
          </div>
          <div class="chat-text">{{ m.text }}</div>

        </div>
      </div>

      <form
        class="chat-input-row"
        @submit.prevent="sendMessage"
      >
        <input
          v-model="text"
          type="text"
          class="chat-field"
          placeholder="Ketik pesan..."
          maxlength="120"
          autocomplete="off"
        />
        <button
          type="submit"
          class="chat-send-btn"
        >
          Kirim
        </button>
      </form>
    </div>
  </div>
</template>

