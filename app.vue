<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>

  <!-- Hors du layout : actifs sur toutes les pages, quel que soit le layout -->
  <ConfirmModal />
  <PromptModal />
  <ToastHost />
  <SessionExpiredModal />

  <!--
    Piloté par le store, donc une seule instance suffit. Il était monté dans
    SequenceList et dans chaque SceneList, soit autant de copies de la même
    fenêtre à l'écoute du même drapeau.
  -->
  <PersonnageDetectionModal />
</template>

<script setup>
import { useAuthStore } from '~/store/auth'
import ConfirmModal from '~/components/ConfirmModal.vue'
import PromptModal from '~/components/PromptModal.vue'
import ToastHost from '~/components/ToastHost.vue'
import SessionExpiredModal from '~/components/SessionExpiredModal.vue'
import PersonnageDetectionModal from '~/components/Project/PersonnageDetectionModal.vue'
const auth = useAuthStore()
auth.initAuth()
</script>
