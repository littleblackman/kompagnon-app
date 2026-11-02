<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router';
import { computed, onMounted } from 'vue';
import { useAuthStore } from '~/store/auth';
import { useProjectStore } from '~/store/project';
import { useMetadataStore } from '~/store/metadata';
import ProjectSubMenu from '@/components/Project/SubMenu.vue';
import DiagnosticsPanel from '@/components/Project/DiagnosticsPanel.vue';
import StylePanel from '@/components/Project/StylePanel.vue';
import StructureTab from '@/components/Analyse/StructureTab.vue';
import RhythmTab from '@/components/Analyse/RhythmTab.vue';
import PresenceTab from '@/components/Analyse/PresenceTab.vue';
import { useStoryAxis } from '~/composables/useStoryAxis';

definePageMeta({ middleware: 'auth' });

const auth = useAuthStore();
auth.requireAuth();

const projectStore = useProjectStore();
const metadataStore = useMetadataStore();
const route = useRoute();
const router = useRouter();
const slug = route.params.slug as string;
const { sequences } = useStoryAxis();

onMounted(() => {
  if (projectStore.project?.slug !== slug) projectStore.fetchProject(slug);
  if (!metadataStore.loaded) metadataStore.fetchMetadata();
});

const TABS = [
  { key: 'ensemble', label: "Vue d'ensemble" },
  { key: 'structure', label: 'Structure' },
  { key: 'rythme', label: 'Rythme' },
  { key: 'presence', label: 'Présence' },
  { key: 'style', label: 'Style' }
] as const;

type TabKey = typeof TABS[number]['key'];

// L'onglet vit dans l'URL : on peut y renvoyer depuis ailleurs (?onglet=structure)
const activeTab = computed<TabKey>({
  get: () => {
    const key = route.query.onglet as string;
    return TABS.some(t => t.key === key) ? (key as TabKey) : 'ensemble';
  },
  set: (key) => {
    router.replace({ query: { ...route.query, onglet: key === 'ensemble' ? undefined : key } });
  }
});

// Le cadre narratif se règle même sur un projet vide ; le reste lit les séquences
const needsSequences = computed(() => activeTab.value !== 'structure');
</script>

<template>
  <div v-if="!projectStore.project" class="p-8 text-center text-gray-500">Chargement…</div>

  <div v-else>
    <ProjectSubMenu :project-slug="slug" />

    <main class="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
      <header>
        <h1 class="text-2xl font-bold text-gray-900">Analyse</h1>
        <p class="text-sm text-gray-500">{{ projectStore.project.name }}</p>
      </header>

      <!-- Onglets : liste déroulante sur mobile, barre sur desktop -->
      <label for="analyse-tab" class="sr-only">Section d'analyse</label>
      <select
        id="analyse-tab"
        v-model="activeTab"
        class="block w-full rounded-lg border border-gray-300 px-4 py-3 text-base shadow-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500 md:hidden"
      >
        <option v-for="tab in TABS" :key="tab.key" :value="tab.key">{{ tab.label }}</option>
      </select>

      <nav class="hidden gap-1 border-b border-gray-200 md:flex" aria-label="Sections d'analyse">
        <button
          v-for="tab in TABS"
          :key="tab.key"
          type="button"
          @click="activeTab = tab.key"
          class="-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors"
          :class="activeTab === tab.key
            ? 'border-amber-500 text-amber-700'
            : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-800'"
          :aria-current="activeTab === tab.key ? 'page' : undefined"
        >
          {{ tab.label }}
        </button>
      </nav>

      <p v-if="needsSequences && !sequences.length" class="rounded-lg bg-gray-50 p-8 text-center text-gray-500">
        Ce projet ne contient encore aucune séquence.
      </p>

      <template v-else>
        <DiagnosticsPanel v-if="activeTab === 'ensemble'" :project-slug="slug" />
        <StructureTab v-else-if="activeTab === 'structure'" :project-slug="slug" />
        <RhythmTab v-else-if="activeTab === 'rythme'" />
        <PresenceTab v-else-if="activeTab === 'presence'" :project-slug="slug" />
        <StylePanel v-else-if="activeTab === 'style'" :project-slug="slug" />
      </template>
    </main>
  </div>
</template>
