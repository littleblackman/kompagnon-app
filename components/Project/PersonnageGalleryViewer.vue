<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 z-50 flex bg-gray-950"
      ref="containerRef"
      tabindex="0"
      @keydown.left="prev"
      @keydown.right="next"
      @keydown.escape="$emit('close')"
    >
      <!-- ── Colonne gauche : photo ── -->
      <div class="relative w-1/2 bg-black flex items-center justify-center overflow-hidden">
        <img
          v-if="currentAvatar"
          :src="currentAvatar"
          :alt="currentName"
          class="max-w-full max-h-full object-contain"
        />
        <div v-else class="flex items-center justify-center">
          <UserIcon class="w-40 h-40 text-gray-700" />
        </div>

        <!-- Prev -->
        <button
          v-if="currentIndex > 0"
          @click="prev"
          class="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 hover:bg-black/80 text-white rounded-full flex items-center justify-center transition-colors"
        >
          <ChevronLeftIcon class="w-5 h-5" />
        </button>

        <!-- Next -->
        <button
          v-if="currentIndex < personnages.length - 1"
          @click="next"
          class="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 hover:bg-black/80 text-white rounded-full flex items-center justify-center transition-colors"
        >
          <ChevronRightIcon class="w-5 h-5" />
        </button>

        <!-- Dots -->
        <div class="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-1.5">
          <button
            v-for="(_, i) in personnages"
            :key="i"
            @click="currentIndex = i"
            :class="['h-1.5 rounded-full transition-all', i === currentIndex ? 'bg-white w-5' : 'bg-white/30 w-1.5']"
          />
        </div>
      </div>

      <!-- ── Colonne droite : infos ── -->
      <div class="w-1/2 flex flex-col bg-gray-950 text-white overflow-y-auto">
        <!-- Header -->
        <div class="flex items-center justify-between p-6 border-b border-white/10 flex-shrink-0">
          <span class="text-white/40 text-sm">{{ currentIndex + 1 }} / {{ personnages.length }}</span>
          <button
            @click="$emit('close')"
            class="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            <XMarkIcon class="w-4 h-4" />
          </button>
        </div>

        <!-- Contenu -->
        <div class="flex-1 p-8 space-y-6">
          <!-- Niveau -->
          <span v-if="current?.level" class="text-xs uppercase tracking-widest text-amber-400 font-semibold">
            {{ levelLabels[current.level] }}
          </span>

          <!-- Nom -->
          <h2 class="text-4xl font-bold leading-tight">{{ currentName }}</h2>

          <!-- Âge -->
          <p v-if="current?.age" class="text-white/50 text-sm">{{ current.age }} ans</p>

          <!-- Fonctions dramatiques -->
          <div v-if="current?.personnageDramaticFunctions?.length" class="space-y-2">
            <p class="text-xs uppercase tracking-widest text-white/40">Fonctions dramatiques</p>
            <div class="flex flex-wrap gap-2">
              <span
                v-for="pdf in current.personnageDramaticFunctions"
                :key="pdf.dramaticFunction.id"
                class="px-3 py-1 bg-purple-600/40 border border-purple-500/30 text-purple-200 text-xs rounded-full"
              >
                🎭 {{ pdf.dramaticFunction.name }}
              </span>
            </div>
          </div>

          <!-- Arcs narratifs -->
          <div v-if="current?.personnageNarrativeArcs?.length" class="space-y-2">
            <p class="text-xs uppercase tracking-widest text-white/40">Arcs narratifs</p>
            <div class="flex flex-wrap gap-2">
              <span
                v-for="pna in current.personnageNarrativeArcs"
                :key="pna.id"
                class="px-3 py-1 bg-indigo-600/40 border border-indigo-500/30 text-indigo-200 text-xs rounded-full"
              >
                {{ pna.narrativeArc?.tendency === 'positive' ? '↗️' : pna.narrativeArc?.tendency === 'negative' ? '↘️' : '↔️' }}
                {{ pna.narrativeArc?.name }}
              </span>
            </div>
          </div>

          <!-- Origine -->
          <div v-if="current?.origin" class="space-y-1">
            <p class="text-xs uppercase tracking-widest text-white/40">Origine</p>
            <p class="text-white/70 text-sm">{{ current.origin }}</p>
          </div>

          <!-- Bio -->
          <div v-if="backgroundText" class="space-y-2">
            <p class="text-xs uppercase tracking-widest text-white/40">Biographie</p>
            <p class="text-white/70 text-sm leading-relaxed line-clamp-6">{{ backgroundText }}</p>
          </div>

          <!-- Analyse -->
          <div v-if="analysisText" class="space-y-2">
            <p class="text-xs uppercase tracking-widest text-white/40">Analyse</p>
            <p class="text-white/70 text-sm leading-relaxed line-clamp-4">{{ analysisText }}</p>
          </div>

          <!-- Forces & Faiblesses -->
          <div v-if="current?.strength || current?.weakness" class="grid grid-cols-2 gap-4">
            <div v-if="current?.strength" class="space-y-1">
              <p class="text-xs uppercase tracking-widest text-green-400/70">Forces</p>
              <p class="text-white/70 text-sm leading-relaxed">{{ current.strength }}</p>
            </div>
            <div v-if="current?.weakness" class="space-y-1">
              <p class="text-xs uppercase tracking-widest text-red-400/70">Faiblesses</p>
              <p class="text-white/70 text-sm leading-relaxed">{{ current.weakness }}</p>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="p-6 border-t border-white/10 flex-shrink-0">
          <NuxtLink
            v-if="current?.slug"
            :to="`/projets/detail-${current.slug}`"
            class="w-full flex items-center justify-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-400 text-white font-semibold rounded-xl transition-colors"
            @click="$emit('close')"
          >
            Voir la fiche complète
            <ArrowRightIcon class="w-4 h-4" />
          </NuxtLink>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { UserIcon, XMarkIcon, ChevronLeftIcon, ChevronRightIcon, ArrowRightIcon } from '@heroicons/vue/24/solid';
import { useImages } from '~/composables/useImages';

interface Props {
  personnages: any[];
  startIndex?: number;
}

const props = defineProps<Props>();
defineEmits<{ close: [] }>();

const { getImageUrl, getImagesUrls } = useImages();
const containerRef = ref<HTMLElement | null>(null);
const currentIndex = ref(props.startIndex ?? 0);

onMounted(() => containerRef.value?.focus());
watch(() => props.startIndex, (v) => { if (v != null) currentIndex.value = v; });

const current = computed(() => props.personnages[currentIndex.value]);

const currentName = computed(() =>
  [current.value?.firstName, current.value?.lastName].filter(Boolean).join(' ')
);

const currentAvatar = computed(() => {
  if (!current.value) return null;
  if (current.value.avatar) return getImageUrl(current.value.avatar);
  return getImagesUrls(current.value.images)[0] || null;
});

const levelLabels: Record<number, string> = {
  1: 'Protagoniste', 2: 'Secondaire', 3: 'Tertiaire', 4: 'Figurant',
};

const stripHtml = (html: string): string => {
  if (!html) return '';
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return (doc.body.textContent || '').replace(/\s+/g, ' ').trim();
};

const backgroundText = computed(() => stripHtml(current.value?.background));
const analysisText = computed(() => stripHtml(current.value?.analysis));

const prev = () => { if (currentIndex.value > 0) currentIndex.value--; };
const next = () => { if (currentIndex.value < props.personnages.length - 1) currentIndex.value++; };
</script>
