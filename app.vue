<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>

<script setup>
import { useAuthStore } from '~/store/auth'
const auth = useAuthStore()
auth.initAuth()
</script>
