<script setup>
import { onMounted } from 'vue';
import { useUserStore } from './stores/userStore.js';
import LoginView from './views/LoginView.vue';
import HomeView from './views/HomeView.vue';
const user = useUserStore();
onMounted(() => { if (user.token) user.fetchMe(); });
</script>

<template>
  <HomeView v-if="user.user" />
  <LoginView v-else />
</template>