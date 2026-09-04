<script setup>
import { ref } from 'vue';
import { useUserStore } from '../stores/userStore.js';

const user = useUserStore();
const mode = ref('login');
const username = ref('');
const password = ref('');
const error = ref('');
const loading = ref(false);

async function submit() {
  if (!username.value || !password.value) {
    error.value = 'Mohon isi username dan password';
    return;
  }
  error.value = '';
  loading.value = true;
  try {
    if (mode.value === 'login') {
      await user.login(username.value, password.value);
    } else {
      await user.register(username.value, password.value);
    }
  } catch (e) {
    error.value = e.message || 'Terjadi kesalahan';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="login-wrap">
    <div class="login-card">
      <h1 style="margin: 0; font-family: 'Chakra Petch', sans-serif; letter-spacing: 2px;">
        SPACE<b>WORM</b>
      </h1>
      <p class="sub" style="margin-top: -6px; font-size: 13px;">
        {{ mode === 'login' ? 'Masuk ke akun Anda' : 'Daftar akun baru' }}
      </p>

      <div style="display: flex; flex-direction: column; gap: 10px; text-align: left; width: 100%;">
        <div style="width: 100%;">
          <label style="font-size: 11px; color: var(--text-dim); display: block; margin-bottom: 4px;">Username</label>
          <input
            v-model="username"
            placeholder="Ketik username..."
            autocomplete="username"
            style="width: 100%;"
            @keyup.enter="submit"
          />
        </div>

        <div style="width: 100%;">
          <label style="font-size: 11px; color: var(--text-dim); display: block; margin-bottom: 4px;">Password</label>
          <input
            v-model="password"
            type="password"
            placeholder="Ketik password..."
            autocomplete="current-password"
            style="width: 100%;"
            @keyup.enter="submit"
          />
        </div>
      </div>


      <button
        class="primary-action-btn btn-green-bet"
        style="margin-top: 6px; padding: 12px;"
        :disabled="loading"
        @click="submit"
      >
        {{ loading ? 'Memproses...' : mode === 'login' ? 'MASUK' : 'DAFTAR' }}
      </button>

      <p v-if="error" class="err" style="margin: 0;">{{ error }}</p>

      <div style="margin-top: 4px;">
        <a
          href="#"
          @click.prevent="mode = mode === 'login' ? 'register' : 'login'"
        >
          {{ mode === 'login' ? 'Belum punya akun? Daftar' : 'Sudah punya akun? Masuk' }}
        </a>
      </div>
    </div>
  </div>
</template>


