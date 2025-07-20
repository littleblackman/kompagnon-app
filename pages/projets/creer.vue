<script setup>
definePageMeta({
  middleware: 'auth'
})

import { useAuthStore } from '~/store/auth';

const auth = useAuthStore();
auth.requireAuth();
</script>

<template>
  <div>
    <div class="flex" style="height: 60vh;">
      
      <ProjectForm 
        :is-edit="false"
      />
      
      <!-- Colonne image -->
      <div class="w-1/2 h-screen overflow-hidden" style="height: 92vh;">
        <img src="/images/tana.jpg"
             class="w-full h-full object-cover"
             alt="Tana le Kompagnon idéal">
      </div>
      
    </div>
  </div>
</template>

<style scoped>
.container {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
}
</style>