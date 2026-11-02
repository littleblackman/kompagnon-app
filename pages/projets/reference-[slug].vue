<script setup lang="ts">
// Le cadre narratif vit désormais dans Analyse › Structure : on garde
// l'ancienne adresse pour les favoris et l'historique.
definePageMeta({
  middleware: 'auth',
  redirect: to => ({ path: `/projets/analyse-${to.params.slug}`, query: { onglet: 'structure' } })
})
</script>

<template>
  <div></div>
</template>
