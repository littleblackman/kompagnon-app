<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
  <ConfirmModal />
  <SessionExpiredModal />
</template>

<script setup>
import { useAuthStore } from '~/store/auth'
import ConfirmModal from '~/components/ConfirmModal.vue'
import SessionExpiredModal from '~/components/SessionExpiredModal.vue'
const auth = useAuthStore()
auth.initAuth()
</script>
