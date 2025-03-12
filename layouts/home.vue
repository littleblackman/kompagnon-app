<script setup>
useHead({
  title: 'Kompagnon App - Ecrivez vos projets',
  meta: [
    { name: 'description', content: 'Application Kompagnon pour gérer efficacement vos projets d’écriture' },
    { charset: 'utf-8' },
    { name: 'viewport', content: 'width=device-width, initial-scale=1' }
  ],
  link: [
    { rel: 'icon', type: 'image/png', href: '/logo-kpgn.png' }
  ]
})
</script>

<template>
  <div class="w-full min-h-screen">
    <slot />
  </div>
</template>