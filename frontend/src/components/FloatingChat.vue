<script setup>
import { ref, computed, watch, nextTick, onMounted } from 'vue';
import { useGameStore } from '../stores/gameStore.js';
import { useUserStore } from '../stores/userStore.js';
import { getSocket } from '../composables/useSocket.js';

const game = useGameStore();
const user = useUserStore();
const text = ref('');
const chatBodyRef = ref(null);

const bubblePos = ref({ x: null, y: null });
let isDragging = false;
let startX = 0, startY = 0;
let initialBubbleX = 0, initialBubbleY = 0;
let hasMoved = false;

function onPointerDown(e) {
  isDragging = true;
  hasMoved = false;
  startX = e.clientX;
  startY = e.clientY;

  const el = e.currentTarget;
  const rect = el.getBoundingClientRect();
  initialBubbleX = bubblePos.value.x !== null ? bubblePos.value.x : rect.left;
  initialBubbleY = bubblePos.value.y !== null ? bubblePos.value.y : rect.top;

  try {
    el.setPointerCapture(e.pointerId);
  } catch {}
}

function onPointerMove(e) {
  if (!isDragging) return;
  const dx = e.clientX - startX;
  const dy = e.clientY - startY;
  if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
    hasMoved = true;
  }

  const maxX = window.innerWidth - 65;
  const maxY = window.innerHeight - 65;

  bubblePos.value = {
    x: Math.min(Math.max(10, initialBubbleX + dx), maxX),
    y: Math.min(Math.max(10, initialBubbleY + dy), maxY),
  };
}

function onPointerUp(e) {
  if (!isDragging) return;
  isDragging = false;
  try {
    e.currentTarget.releasePointerCapture(e.pointerId);
  } catch {}

  if (!hasMoved) {
    game.toggleChat();
  }
}

const bubbleStyle = computed(() => {
  if (bubblePos.value.x === null || bubblePos.value.y === null) {
    return {};
  }
  return {
    left: `${bubblePos.value.x}px`,
    top: `${bubblePos.value.y}px`,
    bottom: 'auto',
    right: 'auto',
    touchAction: 'none',
  };
});

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
    <!-- Chat Trigger Bubble (Draggable / Movable) -->
    <div
      class="floating-chat-trigger"
      :style="bubbleStyle"
      title="Buka Live Chat Komunitas (Tahan & Geser untuk Pindahkan)"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="isDragging = false"
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
      <span
        v-if="game.unreadChatCount > 0"
        class="floating-chat-badge"
      >
        {{ game.unreadChatCount }}
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

