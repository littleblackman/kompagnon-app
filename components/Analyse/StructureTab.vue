<script setup lang="ts">
import { computed, ref } from 'vue';
import { useAuthStore } from '~/store/auth';
import { useProjectStore } from '~/store/project';
import { useMetadataStore } from '~/store/metadata';
import { useToast } from '~/composables/useToast';
import { PencilSquareIcon } from '@heroicons/vue/24/outline';
import StructureCheck from '~/components/Analyse/StructureCheck.vue';

/**
 * Cadre narratif du projet : genre, sous-genre, structure. On le lit, on le
 * change et on le fait détecter par l'IA au même endroit.
 */
const props = defineProps<{ projectSlug: string }>();

const config = useRuntimeConfig();
const authStore = useAuthStore();
const projectStore = useProjectStore();
const metadataStore = useMetadataStore();
const toast = useToast();

const project = computed(() => projectStore.project);
const reference = computed(() => project.value?.referenceNarrativeComponents ?? null);

const genre = computed(() =>
  metadataStore.genres.find(g => g.id === reference.value?.genre_id) ?? null
);
const subgenre = computed(() =>
  metadataStore.subgenres.find(s => s.id === reference.value?.subgenre_id) ?? null
);
const structure = computed(() =>
  metadataStore.narrativeStructures.find(n => n.id === reference.value?.narrative_structure_id) ?? null
);

const hasFrame = computed(() => !!(genre.value || subgenre.value || structure.value));

/** Les sections de la structure (« Acte 1 »…), segments traduits en noms */
const structureSections = computed(() => {
  const order = structure.value?.narrativePartOrder;
  if (!order) return [];

  return Object.entries(order).map(([section, codes]) => ({
    section,
    parts: codes.map(code => metadataStore.narrativeParts.find(p => p.code === code)?.name ?? code)
  }));
});

// ── Modification du cadre ─────────────────────────────────────────────

const editing = ref(false);
const saving = ref(false);
const form = ref({
  genre_id: null as number | null,
  subgenre_id: null as number | null,
  narrative_structure_id: null as number | null
});

// Les structures proposées dépendent du sous-genre : servies par l'API
const narrativeStructures = ref<any[]>([]);

const subgenres = computed(() => {
  if (!form.value.genre_id) return [];
  return metadataStore.genres.find(g => g.id === form.value.genre_id)?.subgenres ?? [];
});

const loadNarrativeStructures = async (subgenreId: number) => {
  try {
    const data: any = await $fetch(`${config.public.apiBase}/subgenre/${subgenreId}`, {
      headers: { 'X-AUTH-TOKEN': authStore.token || '' }
    });
    narrativeStructures.value = data.narrativeStructures || [];
  } catch (error) {
    console.error('Erreur lors du chargement des structures narratives:', error);
    narrativeStructures.value = [];
  }
};

const startEditing = async () => {
  form.value = {
    genre_id: reference.value?.genre_id ?? null,
    subgenre_id: reference.value?.subgenre_id ?? null,
    narrative_structure_id: reference.value?.narrative_structure_id ?? null
  };
  narrativeStructures.value = [];
  if (form.value.subgenre_id) await loadNarrativeStructures(form.value.subgenre_id);
  editing.value = true;
};

const onGenreChange = () => {
  form.value.subgenre_id = null;
  form.value.narrative_structure_id = null;
  narrativeStructures.value = [];
};

const onSubgenreChange = async () => {
  form.value.narrative_structure_id = null;
  narrativeStructures.value = [];
  if (form.value.subgenre_id) await loadNarrativeStructures(form.value.subgenre_id);
};

const saveFrame = async () => {
  if (!project.value?.id) return;
  saving.value = true;

  try {
    // L'API réécrit nom et description à chaque mise à jour : on les renvoie tels quels
    const data: any = {
      id: project.value.id,
      name: project.value.name,
      description: project.value.description ?? '',
      type_id: project.value.type?.id
    };
    if (form.value.genre_id) data.genre_id = form.value.genre_id;
    if (form.value.subgenre_id) data.subgenre_id = form.value.subgenre_id;
    if (form.value.narrative_structure_id) data.narrative_structure_id = form.value.narrative_structure_id;

    await projectStore.updateProject(data);
    await projectStore.fetchProject(props.projectSlug);
    editing.value = false;
    toast.success('Cadre narratif enregistré.');
  } catch (error) {
    console.error('Erreur lors de la sauvegarde du cadre:', error);
    toast.error("Le cadre narratif n'a pas pu être enregistré.");
  } finally {
    saving.value = false;
  }
};

// ── Détection par l'IA ────────────────────────────────────────────────

const showAIModal = ref(false);
const isAnalyzing = ref(false);
const isApplying = ref(false);
const aiResult = ref<any>(null);
const aiError = ref('');
const contentType = ref<'organizational' | 'full'>('organizational');

const openAIModal = () => {
  showAIModal.value = true;
  aiResult.value = null;
  aiError.value = '';
};

const closeAIModal = () => {
  showAIModal.value = false;
  aiResult.value = null;
  aiError.value = '';
  contentType.value = 'organizational';
};

const analyzeWithAI = async () => {
  if (!project.value?.id) return;
  isAnalyzing.value = true;
  aiError.value = '';

  try {
    const result: any = await $fetch(`${config.public.apiBase}/project/${project.value.id}/analyse`, {
      method: 'POST',
      headers: {
        'X-AUTH-TOKEN': authStore.token || '',
        'Content-Type': 'application/json'
      },
      body: { useFullContent: contentType.value === 'full' }
    });

    if (result.success) {
      aiResult.value = result;
    } else {
      aiError.value = result.message || "Erreur lors de l'analyse";
    }
  } catch (error: any) {
    console.error("Erreur lors de l'analyse IA:", error);
    // L'API renvoie sa cause en 500 (clé absente, Mistral injoignable…) :
    // la masquer laissait deviner. Sans corps, c'est le serveur qui a coupé.
    const status = error?.statusCode ?? error?.response?.status;
    aiError.value = error?.data?.message
      || error?.data?.error
      || (status === 504 || status === 502
        ? "Le serveur a coupé la requête avant la fin de l'analyse (délai dépassé)."
        : `Erreur lors de l'analyse IA${status ? ` (HTTP ${status})` : ''}`);
  } finally {
    isAnalyzing.value = false;
  }
};

const applySuggestions = async () => {
  if (!aiResult.value || !project.value?.id) return;
  isApplying.value = true;

  try {
    const suggestions = aiResult.value.suggestions;
    await $fetch(`${config.public.apiBase}/project/${project.value.id}/analyse/apply`, {
      method: 'POST',
      headers: {
        'X-AUTH-TOKEN': authStore.token || '',
        'Content-Type': 'application/json'
      },
      body: {
        genreId: suggestions.genre?.id,
        subgenreId: suggestions.subgenre?.id,
        structureId: suggestions.structure?.id
      }
    });

    await projectStore.fetchProject(props.projectSlug);
    editing.value = false;
    closeAIModal();
    toast.success('Suggestions appliquées au cadre narratif.');
  } catch (error) {
    console.error("Erreur lors de l'application des suggestions:", error);
    aiError.value = "Erreur lors de l'application des suggestions";
  } finally {
    isApplying.value = false;
  }
};

const selectClass = 'w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500';
</script>

<template>
  <section class="space-y-6">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h2 class="text-lg font-semibold text-gray-900">Cadre narratif</h2>
        <p class="text-sm text-gray-500">
          Le repère de votre récit. Il peut évoluer : il sert de point de départ, pas de contrainte.
        </p>
      </div>
      <div class="flex shrink-0 gap-2">
        <button
          v-if="!editing"
          type="button"
          @click="startEditing"
          class="flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
        >
          <PencilSquareIcon class="h-4 w-4" />
          Modifier
        </button>
        <button
          type="button"
          @click="openAIModal"
          class="flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
        >
          <span>✨</span>
          Détecter avec l'IA
        </button>
      </div>
    </div>

    <!-- Formulaire -->
    <div v-if="editing" class="space-y-4 rounded-lg border border-amber-200 bg-amber-50/40 p-4 sm:p-6">
      <div>
        <label for="frame-genre" class="mb-2 block text-sm font-medium text-gray-700">Genre</label>
        <select id="frame-genre" v-model="form.genre_id" @change="onGenreChange" :class="selectClass">
          <option :value="null">Aucun genre sélectionné</option>
          <option v-for="g in metadataStore.genres" :key="g.id" :value="g.id">{{ g.name }}</option>
        </select>
      </div>

      <div v-if="form.genre_id && subgenres.length">
        <label for="frame-subgenre" class="mb-2 block text-sm font-medium text-gray-700">Sous-genre</label>
        <select id="frame-subgenre" v-model="form.subgenre_id" @change="onSubgenreChange" :class="selectClass">
          <option :value="null">Aucun sous-genre sélectionné</option>
          <option v-for="s in subgenres" :key="s.id" :value="s.id">{{ s.name }}</option>
        </select>
      </div>

      <div v-if="form.subgenre_id && narrativeStructures.length">
        <label for="frame-structure" class="mb-2 block text-sm font-medium text-gray-700">Structure narrative</label>
        <select id="frame-structure" v-model="form.narrative_structure_id" :class="selectClass">
          <option :value="null">Aucune structure narrative sélectionnée</option>
          <option v-for="n in narrativeStructures" :key="n.id" :value="n.id">{{ n.name }}</option>
        </select>
      </div>

      <div class="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          @click="editing = false"
          class="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50"
        >
          Annuler
        </button>
        <button
          type="button"
          @click="saveFrame"
          :disabled="saving"
          class="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {{ saving ? 'Enregistrement…' : 'Enregistrer le cadre' }}
        </button>
      </div>
    </div>

    <!-- Aucun cadre -->
    <div v-else-if="!hasFrame" class="rounded-lg border border-amber-200 bg-amber-50 p-6">
      <h3 class="mb-1 font-semibold text-amber-900">Aucun cadre narratif défini</h3>
      <p class="text-sm text-amber-800">
        Choisissez un genre et une structure avec « Modifier », ou laissez l'IA les détecter à partir de votre texte.
      </p>
    </div>

    <!-- Cadre actuel -->
    <div v-else class="grid gap-4 md:grid-cols-2">
      <div v-if="genre" class="rounded-lg border border-gray-200 bg-white p-5">
        <p class="text-xs font-semibold uppercase tracking-wide text-gray-500">Genre</p>
        <p class="mt-1 text-xl font-bold text-amber-600">{{ genre.name }}</p>
        <p v-if="genre.description" class="mt-2 text-sm text-gray-700">{{ genre.description }}</p>
      </div>

      <div v-if="subgenre" class="rounded-lg border border-gray-200 bg-white p-5">
        <p class="text-xs font-semibold uppercase tracking-wide text-gray-500">Sous-genre</p>
        <p class="mt-1 text-xl font-bold text-amber-600">{{ subgenre.name }}</p>
        <p v-if="subgenre.description" class="mt-2 text-sm text-gray-700">{{ subgenre.description }}</p>
      </div>

      <div v-if="structure" class="rounded-lg border border-gray-200 bg-white p-5 md:col-span-2">
        <p class="text-xs font-semibold uppercase tracking-wide text-gray-500">Structure narrative</p>
        <p class="mt-1 text-xl font-bold text-amber-600">{{ structure.name }}</p>
        <p v-if="structure.description" class="mt-2 text-sm text-gray-700">{{ structure.description }}</p>

        <div v-if="structureSections.length" class="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div v-for="entry in structureSections" :key="entry.section" class="rounded-lg bg-gray-50 p-3">
            <p class="mb-2 text-sm font-semibold text-gray-900">{{ entry.section }}</p>
            <ol class="space-y-1">
              <li v-for="(part, index) in entry.parts" :key="index" class="flex items-start gap-2 text-sm text-gray-700">
                <span class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white">
                  {{ index + 1 }}
                </span>
                {{ part }}
              </li>
            </ol>
          </div>
        </div>
      </div>
    </div>

    <!-- Le texte confronté au cadre : il faut un sous-genre (ses beats) et une structure -->
    <StructureCheck
      v-if="!editing && project?.id && reference?.subgenre_id && reference?.narrative_structure_id"
      :key="`${reference.subgenre_id}-${reference.narrative_structure_id}`"
      :project-id="project.id"
      :project-name="project.name"
    />

    <!-- Modale d'analyse IA -->
    <div
      v-if="showAIModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-0 md:p-4"
      @click.self="closeAIModal"
    >
      <div class="h-full w-full overflow-y-auto bg-white shadow-xl md:h-auto md:max-h-[90vh] md:max-w-2xl md:rounded-lg">
        <div class="sticky top-0 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
          <h3 class="flex items-center gap-2 text-xl font-bold text-gray-900">
            <span>✨</span>
            Détecter le cadre narratif
          </h3>
          <button @click="closeAIModal" class="text-gray-400 transition-colors hover:text-gray-600">✕</button>
        </div>

        <div class="space-y-4 p-6">
          <div v-if="!aiResult">
            <p class="mb-3 block text-sm font-medium text-gray-700">Quel contenu analyser ?</p>
            <div class="space-y-2">
              <label
                class="flex cursor-pointer items-start rounded-lg border-2 p-3 transition-all"
                :class="contentType === 'organizational' ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-indigo-300'"
              >
                <input type="radio" v-model="contentType" value="organizational" class="mr-3 mt-1 text-indigo-600" />
                <div>
                  <div class="font-medium text-gray-900">Notes d'organisation</div>
                  <div class="mt-1 text-sm text-gray-600">
                    Les descriptions des parties et séquences : la vue d'ensemble du récit.
                  </div>
                </div>
              </label>

              <label
                class="flex cursor-pointer items-start rounded-lg border-2 p-3 transition-all"
                :class="contentType === 'full' ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-indigo-300'"
              >
                <input type="radio" v-model="contentType" value="full" class="mr-3 mt-1 text-indigo-600" />
                <div>
                  <div class="font-medium text-gray-900">Texte complet</div>
                  <div class="mt-1 text-sm text-gray-600">
                    Le contenu des scènes en plus des descriptions.
                  </div>
                </div>
              </label>
            </div>

            <button
              @click="analyzeWithAI"
              :disabled="isAnalyzing"
              class="mt-4 w-full rounded-lg bg-indigo-600 px-6 py-3 font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {{ isAnalyzing ? 'Analyse en cours…' : "Lancer l'analyse" }}
            </button>
          </div>

          <div v-else>
            <div class="mb-4">
              <span class="text-xs font-semibold uppercase tracking-wide text-gray-600">Confiance</span>
              <div class="mt-1">
                <span
                  class="inline-block rounded px-2 py-1 text-xs font-semibold"
                  :class="{
                    'bg-green-100 text-green-800': aiResult.confidence === 'high',
                    'bg-yellow-100 text-yellow-800': aiResult.confidence === 'medium',
                    'bg-orange-100 text-orange-800': aiResult.confidence !== 'high' && aiResult.confidence !== 'medium'
                  }"
                >
                  {{ aiResult.confidence === 'high' ? 'Élevée' : aiResult.confidence === 'medium' ? 'Moyenne' : 'Faible' }}
                </span>
              </div>
            </div>

            <div class="space-y-3">
              <div v-if="aiResult.suggestions.genre" class="rounded-lg bg-gray-50 p-3">
                <div class="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-600">Genre suggéré</div>
                <div class="font-medium text-gray-900">{{ aiResult.suggestions.genre.name }}</div>
              </div>
              <div v-if="aiResult.suggestions.subgenre" class="rounded-lg bg-gray-50 p-3">
                <div class="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-600">Sous-genre suggéré</div>
                <div class="font-medium text-gray-900">{{ aiResult.suggestions.subgenre.name }}</div>
                <div class="mt-1 text-xs text-gray-600">Genre : {{ aiResult.suggestions.subgenre.genreName }}</div>
              </div>
              <div v-if="aiResult.suggestions.structure" class="rounded-lg bg-gray-50 p-3">
                <div class="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-600">Structure narrative suggérée</div>
                <div class="font-medium text-gray-900">{{ aiResult.suggestions.structure.name }}</div>
              </div>
            </div>

            <div v-if="aiResult.explanation" class="mt-4 border-l-4 border-blue-500 bg-blue-50 p-4">
              <div class="mb-2 text-xs font-semibold uppercase tracking-wide text-blue-800">Explication de l'IA</div>
              <p class="text-sm text-blue-900">{{ aiResult.explanation }}</p>
            </div>

            <div class="mt-6 flex gap-3">
              <button
                @click="closeAIModal"
                class="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                @click="applySuggestions"
                :disabled="isApplying"
                class="flex-1 rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {{ isApplying ? 'Application…' : 'Appliquer les suggestions' }}
              </button>
            </div>
          </div>

          <div v-if="aiError" class="rounded-lg border border-red-200 bg-red-50 p-4">
            <p class="text-sm text-red-800">{{ aiError }}</p>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
