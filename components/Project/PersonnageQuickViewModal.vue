<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4" @click.self="$emit('close')">
    <div class="absolute inset-0 bg-black/60" @click="$emit('close')" />

    <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto z-10">
      <!-- Header -->
      <div class="flex items-start gap-4 p-6 border-b border-gray-100">
        <!-- Avatar cliquable -->
        <div
          class="w-20 h-20 rounded-full overflow-hidden bg-gray-100 flex-shrink-0 ring-2 ring-gray-200 cursor-pointer hover:ring-amber-400 transition-all"
          data-controller="tooltip" :title="allImages.length ? 'Voir les photos' : ''"
          @click="allImages.length && openLightbox(0)"
        >
          <img
            v-if="avatarUrl"
            :src="avatarUrl"
            :alt="fullName"
            class="w-full h-full object-cover"
          />
          <div v-else class="w-full h-full flex items-center justify-center text-gray-400">
            <UserIcon class="w-10 h-10" />
          </div>
        </div>

        <!-- Nom + level + âge -->
        <div class="flex-1 min-w-0">
          <h2 class="text-2xl font-bold text-gray-900 truncate">{{ fullName }}</h2>
          <p v-if="personnage.age" class="text-sm text-gray-500 mt-0.5">{{ personnage.age }} ans</p>

          <!-- Level dots -->
          <div v-if="personnage.level" class="flex items-center gap-1.5 mt-2">
            <span
              v-for="i in 4"
              :key="i"
              :class="['w-3 h-3 rounded-full', i <= (5 - personnage.level) ? 'bg-amber-400' : 'bg-gray-200']"
            />
            <span class="text-xs text-gray-400 ml-1">{{ levelLabel }}</span>
          </div>
        </div>

        <!-- Bouton fermer -->
        <button @click="$emit('close')" class="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0">
          <XMarkIcon class="w-6 h-6" />
        </button>
      </div>

      <!-- Body -->
      <div class="p-6 space-y-5">

        <!-- Photos -->
        <div v-if="allImages.length" class="space-y-2">
          <h3 class="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Photos ({{ allImages.length }})
          </h3>
          <div class="grid grid-cols-4 gap-2">
            <div
              v-for="(img, i) in allImages"
              :key="i"
              class="relative aspect-square rounded-lg overflow-hidden cursor-pointer group"
              @click="openLightbox(i)"
            >
              <img :src="img" :alt="`Photo ${i + 1}`" class="w-full h-full object-cover transition-transform group-hover:scale-105" />
              <div class="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                <MagnifyingGlassPlusIcon class="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div v-if="i === 0" class="absolute top-1 left-1 bg-amber-500 text-white text-xs px-1.5 py-0.5 rounded font-medium">
                Avatar
              </div>
            </div>
          </div>
        </div>

        <!-- Fonctions dramatiques -->
        <div v-if="personnage.personnageDramaticFunctions?.length" class="space-y-2">
          <h3 class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Fonctions dramatiques</h3>
          <div class="flex flex-wrap gap-2">
            <span
              v-for="pdf in personnage.personnageDramaticFunctions"
              :key="pdf.dramaticFunction.id"
              class="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-semibold rounded-full bg-purple-600 text-white"
            >
              🎭 {{ pdf.dramaticFunction.name }}
            </span>
          </div>
        </div>

        <!-- Arcs narratifs -->
        <div v-if="personnage.personnageNarrativeArcs?.length" class="space-y-2">
          <h3 class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Arcs narratifs</h3>
          <div class="flex flex-wrap gap-2">
            <span
              v-for="pna in personnage.personnageNarrativeArcs"
              :key="pna.id"
              class="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-full bg-blue-100 text-blue-800"
            >
              {{ pna.narrativeArc?.name }}
            </span>
          </div>
        </div>

        <!-- Biographie -->
        <div v-if="backgroundText" class="space-y-2">
          <h3 class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Biographie</h3>
          <p class="text-sm text-gray-700 leading-relaxed line-clamp-4">{{ backgroundText }}</p>
        </div>

        <!-- Motivation -->
        <div v-if="motivationText" class="space-y-2">
          <h3 class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Motivation</h3>
          <p class="text-sm text-gray-700 leading-relaxed line-clamp-3">{{ motivationText }}</p>
        </div>
      </div>

      <!-- Footer actions -->
      <div class="flex gap-3 p-6 pt-0">
        <NuxtLink
          :to="`/projets/detail-${personnage.slug}`"
          class="flex-1 flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-medium px-4 py-2.5 rounded-lg transition-colors"
          @click="$emit('close')"
        >
          <PencilIcon class="w-4 h-4" />
          Modifier la fiche
        </NuxtLink>
        <button
          @click="$emit('close')"
          class="px-4 py-2.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          Fermer
        </button>
      </div>
    </div>
  </div>

  <!-- Lightbox téléportée au body pour passer au dessus de la modale -->
  <Teleport to="body">
    <Lightbox
      :images="allImages"
      :current-index="lightboxIndex"
      :show="lightboxOpen"
      @close="lightboxOpen = false"
      @update:current-index="lightboxIndex = $event"
    />
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { UserIcon, XMarkIcon, PencilIcon, MagnifyingGlassPlusIcon } from '@heroicons/vue/24/solid';
import { useImages } from '~/composables/useImages';
import Lightbox from '~/components/Lightbox.vue';

interface Props {
  personnage: any;
}

const props = defineProps<Props>();
defineEmits<{ close: [] }>();

const { getImageUrl, getImagesUrls } = useImages();

const lightboxOpen = ref(false);
const lightboxIndex = ref(0);

const allImages = computed(() => getImagesUrls(props.personnage.images));

const openLightbox = (index: number) => {
  lightboxIndex.value = index;
  lightboxOpen.value = true;
};

const fullName = computed(() => {
  return [props.personnage.firstName, props.personnage.lastName].filter(Boolean).join(' ');
});

const avatarUrl = computed(() => {
  if (props.personnage.avatar) return getImageUrl(props.personnage.avatar);
  return allImages.value[0] || null;
});

const levelLabels: Record<number, string> = {
  1: 'Protagoniste',
  2: 'Secondaire',
  3: 'Tertiaire',
  4: 'Figurant',
};
const levelLabel = computed(() => levelLabels[props.personnage.level] ?? '');

const stripHtml = (html: string): string => {
  if (!html) return '';
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return (doc.body.textContent || '').replace(/\s+/g, ' ').trim();
};

const backgroundText = computed(() => stripHtml(props.personnage.background));
const motivationText = computed(() => stripHtml(props.personnage.motivation));
</script>
