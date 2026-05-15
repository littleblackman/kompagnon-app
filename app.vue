<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
  <ConfirmModal />
</template>

<script setup>
import { useAuthStore } from '~/store/auth'
import ConfirmModal from '~/components/ConfirmModal.vue'
const auth = useAuthStore()
auth.initAuth()
</script>
