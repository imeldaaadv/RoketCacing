<script setup>
import { ref, onMounted, watch } from 'vue';
import { useUserStore } from '../stores/userStore.js';

const user = useUserStore();
const toastTitle = ref('LEVEL UP!');
const toastSub = ref('Kamu naik ke rank baru!');
const isToastVisible = ref(false);
let canvas = null;
let ctx = null;

function launchConfetti() {
  if (!canvas) return;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const particles = [];
  const colors = ['#3b82f6', '#fbbf24', '#10b981', '#ec4899', '#8b5cf6', '#06b6d4'];

  for (let i = 0; i < 90; i++) {
    particles.push({
      x: canvas.width / 2,
      y: canvas.height / 3,
      vx: (Math.random() - 0.5) * 14,
      vy: (Math.random() - 0.8) * 12,
      size: Math.random() * 8 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      alpha: 1,
      rotation: Math.random() * 360,
      rotSpeed: (Math.random() - 0.5) * 10,
    });
  }

  function frame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let alive = false;
    particles.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.25;
      p.alpha -= 0.012;
      p.rotation += p.rotSpeed;

      if (p.alpha > 0) {
        alive = true;
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      }
    });

    if (alive) {
      requestAnimationFrame(frame);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }
  requestAnimationFrame(frame);
}

function showToast(title, sub) {
  toastTitle.value = title;
  toastSub.value = sub;
  isToastVisible.value = true;
  launchConfetti();
  setTimeout(() => {
    isToastVisible.value = false;
  }, 4500);
}

watch(
  () => user.levelUpEvent,
  (ev) => {
    if (ev) {
      showToast('🎉 LEVEL UP!', `Kamu sekarang mencapai rank ${ev.rank}`);
    }
  }
);

onMounted(() => {
  canvas = document.getElementById('confettiCanvas');
  if (canvas) {
    ctx = canvas.getContext('2d');
  }
});
</script>

<template>
  <div>
    <canvas id="confettiCanvas"></canvas>
    <div
      class="level-up-toast"
      :class="{ show: isToastVisible }"
    >
      <div style="font-size: 28px;">🏆</div>
      <div>
        <div class="toast-title">{{ toastTitle }}</div>
        <div class="toast-subtitle">{{ toastSub }}</div>
      </div>
    </div>
  </div>
</template>
