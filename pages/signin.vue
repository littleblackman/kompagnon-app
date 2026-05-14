<template>
  <div class="flex h-screen overflow-hidden">
    <!-- Colonne contenu -->
    <div class="w-full md:w-1/2 flex flex-col items-center justify-center px-8">

      <div class="max-w-md w-full text-center">
        <span class="inline-block bg-amber-100 text-amber-700 text-xs font-semibold px-3 py-1 rounded-full mb-6 tracking-wide uppercase">
          Beta fermée
        </span>

        <h2 class="text-2xl font-bold text-gray-900 mb-4">Accès sur invitation</h2>

        <p class="text-gray-600 mb-8">
          Kompagnon est actuellement en version beta fermée. Les inscriptions ne sont pas ouvertes au public pour le moment.
        </p>

        <div class="bg-amber-50 border border-amber-200 rounded-lg p-6 mb-8">
          <p class="text-gray-700 mb-4 text-sm">
            Pour demander un accès, contactez-nous sur LinkedIn.
          </p>
          <a
            href="https://www.linkedin.com/in/sandyrazafitrimo"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center gap-2 bg-[#0A66C2] text-white px-5 py-3 rounded-lg hover:bg-[#004182] transition-colors font-medium text-sm"
          >
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
            </svg>
            Demander un accès
          </a>
        </div>

        <p class="text-gray-600 text-center">
          Déjà un compte ?
          <NuxtLink to="/login" class="text-amber-600 hover:underline">Se connecter</NuxtLink>
        </p>
      </div>
    </div>

    <!-- Colonne image (desktop uniquement) -->
    <div class="hidden md:block md:w-1/2 h-screen overflow-hidden">
      <img src="/images/tana.jpg"
           class="w-full h-full object-cover"
           alt="Tana le Kompagnon idéal">
    </div>
  </div>
</template>

<script setup>
  definePageMeta({
    layout: 'home'
  });
</script>
