<script setup lang="ts">
import RatingStars from "@/components/Project/RatingStars.vue";
import SequenceModal from "~/components/Project/SequenceModal.vue";
import PersonnageModal from "~/components/Project/PersonnageModal.vue";
import PersonnageConfigModal from "~/components/Project/PersonnageConfigModal.vue";
import FieldIcon from '@/components/FieldIcon.vue'
import SceneList from '@/components/Project/SceneList.vue'
import InsertDivider from '@/components/Project/InsertDivider.vue'
import AlignmentGauge from '@/components/Project/AlignmentGauge.vue'
import { 
  LightBulbIcon,      // Pour intention
  EyeIcon,            // Pour idée esthétique  
  InformationCircleIcon 
} from '@heroicons/vue/24/solid'
import { ArrowUpIcon, ArrowDownIcon, PencilIcon, ChevronDownIcon, ChevronRightIcon, ArrowPathIcon } from '@heroicons/vue/24/outline'
import { StarIcon } from '@heroicons/vue/24/solid'

import { useProjectStore } from "~/store/project";
import { useMetadataStore } from "~/store/metadata";
import { usePersonnageStore } from "~/store/personnage";
import { useAuthStore } from "~/store/auth";
import { useConfirm } from "~/composables/useConfirm";
import { useToast } from "~/composables/useToast";

const { confirm } = useConfirm();
const toast = useToast();

/**** ANALYSE PAR LE MODÈLE ****/

// Une séquence à la fois : l'appel est lent et coûte un jeton
const analysing = ref<{ id: number; kind: 'alignment' | 'criterias' } | null>(null);

const analysingField = ref<{ id: number; field: string } | null>(null);

const isAnalysing = (sequenceId: number, kind: 'alignment' | 'criterias') =>
  analysing.value?.id === sequenceId && analysing.value.kind === kind;

const isAnalysingField = (sequenceId: number, field: string) =>
  analysingField.value?.id === sequenceId && analysingField.value.field === field;

const runAlignment = async (sequenceId: number, field: 'intention' | 'aesthetic' | 'information') => {
  analysingField.value = { id: sequenceId, field };
  const result = await projectStore.analyseSequenceAlignment(sequenceId, field);
  analysingField.value = null;

  if (!result.success) toast.error(result.message ?? "L'analyse a échoué.");
};

const runCriterias = async (sequenceId: number) => {
  analysing.value = { id: sequenceId, kind: 'criterias' };
  const result = await projectStore.suggestSequenceCriterias(sequenceId);
  analysing.value = null;

  result.success
    ? toast.success('Intensités proposées')
    : toast.error(result.message ?? "L'analyse a échoué.");
};

// Les propositions ne sont pas enregistrées tant qu'on ne les reprend pas
const applySuggestedCriterias = async (sequence: any) => {
  const suggestions = sequence.suggestedCriterias ?? [];
  for (const suggestion of suggestions) {
    await projectStore.saveCriteria(suggestion.value, sequence.id, suggestion.criteriaId);
  }
  sequence.suggestedCriterias = null;
  toast.success(`${suggestions.length} note${suggestions.length > 1 ? 's' : ''} appliquée${suggestions.length > 1 ? 's' : ''}`);
};
const projectStore = useProjectStore();
const metadataStore = useMetadataStore();
const personnageStore = usePersonnageStore();

// Metadata sont maintenant chargées au login dans auth.ts

const props = defineProps({
  sequences: Array,
  projectId: Number,
  partId: Number
});

// Les personnages sont maintenant gérés via les séquences

// Trier les séquences par position
const sortedSequences = computed(() => {
  if (!props.sequences) return [];
  return [...props.sequences].sort((a, b) => a.position - b.position);
});

const sequenceModalOpen = ref(false);
const currentSequence = ref(null);
const personnageModalOpen = ref(false);
const selectedPersonnage = ref(null);
const showPersonnageConfig = ref(false);
const criteriaModalSequenceId = ref<number | null>(null);
const afterSequenceId = ref<number | null>(null);

/**** BANDE DE CONTEXTE (personnages + intention / esthétique / information) ****/

// Repliée par défaut : sur une séquence pleine de scènes, ces trois champs et
// la liste des personnages repoussaient le texte hors de l'écran.
const CONTEXT_STORAGE_KEY = 'kompagnon-sequence-context-open';
const openContexts = ref<Set<number>>(new Set());

onMounted(() => {
  try {
    const raw = localStorage.getItem(CONTEXT_STORAGE_KEY);
    if (raw) openContexts.value = new Set(JSON.parse(raw));
  } catch {
    // simple préférence d'affichage : on repart replié sans bruit
  }
});

const isContextOpen = (sequenceId: number) => openContexts.value.has(sequenceId);

const toggleContext = (sequenceId: number) => {
  const next = new Set(openContexts.value);
  next.has(sequenceId) ? next.delete(sequenceId) : next.add(sequenceId);
  openContexts.value = next;
  try {
    localStorage.setItem(CONTEXT_STORAGE_KEY, JSON.stringify([...next]));
  } catch {
    // pas de persistance possible : l'état reste valable pour la session
  }
};

// Ce qui est renseigné doit rester visible même replié, sinon on l'oublie
const contextSummary = (sequence: any) => ({
  personnages: sequence.sequencePersonnages?.length ?? 0,
  intention: !!sequence.intention?.trim(),
  aesthetic: !!sequence.aesthetic_idea?.trim(),
  information: !!sequence.information?.trim()
});


/**** SEQUENCES & SAVE PART ****/

const openSequenceModal = (sequence = null) => {
  if (!sequence) {
    sequence = {
      name: '',
      description: '',
      part_id: props.partId
    };
  } else {
    // S'assurer que la séquence a bien le part_id
    sequence = {
      ...sequence,
      part_id: props.partId
    };
  }
  currentSequence.value = sequence;
  afterSequenceId.value = null;
  sequenceModalOpen.value = true;
};

// Insérer une nouvelle séquence juste après celle-ci.
// currentSequence à null pour que la modale passe en mode création.
const insertSequenceAfter = (sequenceId: number | null) => {
  currentSequence.value = null;
  afterSequenceId.value = sequenceId;
  sequenceModalOpen.value = true;
};

const handleSaveSequence = async ({ sequence, afterSequenceId }) => {
  try {
    // Le store applique la réponse de l'API (séquence + positions) sur l'arbre
    await projectStore.saveSequence(sequence, props.partId, afterSequenceId);
    sequenceModalOpen.value = false;
  } catch (error) {
    console.error("Erreur lors de la sauvegarde :", error);
  }
};

const handleDeleteSequence = async (sequence) => {
  try {
    await projectStore.deleteSequence(sequence.id);
    sequenceModalOpen.value = false;
  } catch (error) {
    console.error("Erreur lors de la suppression :", error);
  }
};

const handleMoveSequence = async (sequence, direction) => {
  try {
    await projectStore.moveSequence(sequence.id, direction);
  } catch (error) {
    console.error('Erreur lors du déplacement de la séquence:', error);
  }
};

/*** Icon field ***/
async function updateField(field: string, value: string, sequenceId: number) {
  try {
    const sequence = props.sequences.find(s => s.id === sequenceId);
    if (!sequence) return;

    // Mise à jour locale immédiate
    sequence[field] = value;

    // Utiliser la même méthode que le modal (POST /api/sequence/update)
    await projectStore.updateSequenceContent(sequence);
  } catch (error) {
    console.error(`Erreur lors de la mise à jour du champ ${field}:`, error);
  }
}



/**** PERSONNAGES PART ****/

const updatePersonnage = (personnage = null, sequenceId = null) => {
  if(!personnage) {
    personnage = {
      firstName: '',
      lastName: '',
      age: 0,
      background: ''
    };
  }

  selectedPersonnage.value = { ...personnage, sequenceId };
  personnageModalOpen.value = true;
};

const handleSavePersonnage = async (personnage) => {
  try {
    if (!projectStore.project?.id) {
      console.error('Aucun projet chargé');
      return;
    }
    
    const savedPersonnage = await personnageStore.savePersonnage(personnage, projectStore.project.id);
    if (savedPersonnage) {
      console.log('Personnage sauvegardé :', savedPersonnage);
      // Recharger le projet pour mettre à jour les relations
      if (projectStore.project) {
        await projectStore.fetchProject(projectStore.project.slug);
      }
    }
  } catch (error) {
    console.error('Erreur lors de la sauvegarde du personnage :', error);
  }
  personnageModalOpen.value = false;
};

const getPersonnageName = (p) => {
  return personnageStore.getPersonnageName(p);
};

const removePersonnageFromSequence = async (sequencePersonnageId, sequenceId) => {
  try {
    // Trouver le personnageId depuis le sequencePersonnage
    const sequence = props.sequences?.find(s => s.id === sequenceId);
    const sequencePersonnage = sequence?.sequencePersonnages?.find(sp => sp.id === sequencePersonnageId);

    if (sequencePersonnage && sequencePersonnage.personnage) {
      const ok = await confirm({
        title: 'Retirer ce personnage ?',
        message: `${getPersonnageName(sequencePersonnage.personnage)} ne sera plus associé à cette séquence. Le personnage lui-même n'est pas supprimé.`,
        confirmLabel: 'Retirer'
      });
      if (!ok) return;

      await personnageStore.removePersonnageFromSequence(sequenceId, sequencePersonnage.personnage.id);
      
      // Recharger le projet pour mettre à jour l'affichage
      if (projectStore.project?.slug) {
        await projectStore.fetchProject(projectStore.project.slug);
      }
    }
  } catch (error) {
    console.error('Erreur lors de la suppression du personnage de la séquence :', error);
  }
};



/**** CRITERIAS PART ****/
// Ces critères seront automatiquement analysés par l'IA
// Affichage en lecture seule uniquement

// get note by criteria
const getCriteriaRating = (sequence, criteriaId) => {
  const sequenceCriteria = sequence.sequenceCriterias?.find(sc => sc.criteria?.id === criteriaId);
  return sequenceCriteria?.rating || 0;
};

// Fonction pour mettre à jour le rating d'un critère
const updateRating = async (ratingData) => {
  const config = useRuntimeConfig();
  const authStore = useAuthStore();

  try {
    await $fetch(`${config.public.apiBase}/criteria/update`, {
      method: 'POST',
      headers: {
        'X-AUTH-TOKEN': authStore.token || '',
        'Content-Type': 'application/json'
      },
      body: {
        sequenceId: ratingData.sequenceId,
        criteriaId: ratingData.criteriaId,
        value: ratingData.value
      }
    });

    // Recharger le projet pour avoir les données à jour
    if (projectStore.project?.slug) {
      await projectStore.fetchProject(projectStore.project.slug);
    }
  } catch (error) {
    console.error('Erreur lors de la mise à jour du rating:', error);
  }
};




</script>

<template>
  <ul class="bg-white">


    <SequenceModal v-if="sequenceModalOpen"
                   :sequence="currentSequence"
                   :projectId="projectId"
                   :part-id="partId"
                   :insert-after-id="afterSequenceId"
                   @close="sequenceModalOpen = false"
                   @save="handleSaveSequence"
                   @delete="handleDeleteSequence"
              />

    <PersonnageModal
        v-if="personnageModalOpen"
        :personnage="selectedPersonnage"
        @close="personnageModalOpen = false"
        @save="handleSavePersonnage"
    />
    
    
    <PersonnageConfigModal v-model:showConfig="showPersonnageConfig" />


    <template v-for="sequence in sortedSequences" :key="sequence.id">
    <li class="pl-2 pr-1 pt-4 pb-4 sm:pl-6 sm:pr-3 sm:pt-6 sm:pb-6">

      <div class="mb-4">
        <div class="flex items-center justify-between mb-3">
          <h3 :id="`sequence-${sequence.id}`" class="font-bold text-black text-xl">
            {{ sequence.name }}
          </h3>

          <div class="flex items-center space-x-2">
            <!-- Bouton critères (étoile) -->
            <button
              class="relative p-1 rounded text-yellow-400 hover:text-yellow-500 hover:bg-yellow-50"
              @click="criteriaModalSequenceId = sequence.id"
              data-controller="tooltip" title="Intensité dramatique"
            >
              <StarIcon class="h-5 w-5" />
              <span
                v-if="metadataStore.criterias?.some(c => getCriteriaRating(sequence, c.id))"
                class="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-yellow-500"
              ></span>
            </button>

            <!-- Boutons d'action -->
            <div class="flex items-center space-x-1">
              <button
                class="p-1 rounded text-gray-600 hover:text-gray-800 hover:bg-gray-50"
                @click="openSequenceModal(sequence)"
                data-controller="tooltip" title="Éditer la séquence"
              >
                <PencilIcon class="h-4 w-4" />
              </button>
              <button
                :disabled="sortedSequences.findIndex(s => s.id === sequence.id) === 0"
                :class="['p-1 rounded', sortedSequences.findIndex(s => s.id === sequence.id) === 0 ? 'text-gray-300 cursor-not-allowed' : 'text-blue-500 hover:text-blue-700 hover:bg-blue-50']"
                @click="handleMoveSequence(sequence, 'up')"
                data-controller="tooltip" title="Déplacer vers le haut"
              >
                <ArrowUpIcon class="h-4 w-4" />
              </button>
              <button
                :disabled="sortedSequences.findIndex(s => s.id === sequence.id) === sortedSequences.length - 1"
                :class="['p-1 rounded', sortedSequences.findIndex(s => s.id === sequence.id) === sortedSequences.length - 1 ? 'text-gray-300 cursor-not-allowed' : 'text-blue-500 hover:text-blue-700 hover:bg-blue-50']"
                @click="handleMoveSequence(sequence, 'down')"
                data-controller="tooltip" title="Déplacer vers le bas"
              >
                <ArrowDownIcon class="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Contenu séquence (pleine largeur) -->
      <div class="w-full">
          <!-- Bande de contexte repliable : personnages + champs narratifs -->
          <div class="mb-3 border border-gray-200 rounded-lg overflow-hidden">
            <button
              type="button"
              @click="toggleContext(sequence.id)"
              class="w-full flex items-center justify-between gap-3 px-3 py-2 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
              :aria-expanded="isContextOpen(sequence.id)"
            >
              <span class="flex items-center gap-2 min-w-0">
                <ChevronDownIcon v-if="isContextOpen(sequence.id)" class="w-4 h-4 text-gray-400 flex-shrink-0" />
                <ChevronRightIcon v-else class="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span class="text-xs font-semibold text-gray-600 uppercase tracking-wide">Contexte</span>
              </span>

              <!-- Résumé, pour ne pas oublier ce qui est renseigné une fois replié -->
              <span v-if="!isContextOpen(sequence.id)" class="flex items-center gap-2 text-xs text-gray-400">
                <span v-if="contextSummary(sequence).personnages">
                  {{ contextSummary(sequence).personnages }}
                  personnage{{ contextSummary(sequence).personnages > 1 ? 's' : '' }}
                </span>
                <span class="flex items-center gap-1">
                  <LightBulbIcon
                    v-if="contextSummary(sequence).intention"
                    class="w-3.5 h-3.5 text-amber-500"
                    data-controller="tooltip" title="Intention renseignée"
                  />
                  <EyeIcon
                    v-if="contextSummary(sequence).aesthetic"
                    class="w-3.5 h-3.5 text-purple-500"
                    data-controller="tooltip" title="Esthétique renseignée"
                  />
                  <InformationCircleIcon
                    v-if="contextSummary(sequence).information"
                    class="w-3.5 h-3.5 text-blue-500"
                    data-controller="tooltip" title="Information renseignée"
                  />
                </span>
              </span>
            </button>

            <div v-show="isContextOpen(sequence.id)" class="p-3 bg-white">
          <!-- Personnages - Style moderne avec badges -->
          <div class="bg-gradient-to-r from-slate-50 to-gray-50 rounded-lg px-4 py-3 border border-gray-200 mb-3">
            <div class="flex items-center justify-between mb-2">
              <span class="text-xs font-semibold text-gray-600 uppercase tracking-wide">Personnages</span>
              <div class="flex items-center gap-2">
                <button
                  @click="updatePersonnage(null, sequence.id)"
                  class="flex items-center gap-1 px-2 py-1 bg-green-500 hover:bg-green-600 text-white text-xs rounded-full transition-colors"
                  data-controller="tooltip" title="Ajouter un personnage"
                >
                  <span class="font-bold">+</span>
                  <span>Ajouter</span>
                </button>
                <button
                  @click="showPersonnageConfig = true"
                  class="px-2 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs rounded-full transition-colors"
                  data-controller="tooltip" title="Configurer la détection automatique"
                >
                  ⚙️
                </button>
              </div>
            </div>
            <div class="flex flex-wrap gap-2">
              <template v-if="sequence.sequencePersonnages && sequence.sequencePersonnages.length">
                <span
                  v-for="sp in sequence.sequencePersonnages"
                  :key="sp.id"
                  class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-blue-200 rounded-full text-sm text-gray-700 hover:border-blue-400 hover:shadow-sm transition-all cursor-pointer group"
                  @click="updatePersonnage(sp.personnage, sequence.id)"
                >
                  <span class="text-blue-600 font-medium group-hover:text-blue-700">
                    {{ getPersonnageName(sp.personnage) }}
                  </span>
                  <button
                    @click.stop="removePersonnageFromSequence(sp.id, sequence.id)"
                    class="ml-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full w-4 h-4 flex items-center justify-center transition-colors"
                    data-controller="tooltip" title="Retirer de cette séquence"
                  >
                    <span class="text-xs leading-none">×</span>
                  </button>
                </span>
              </template>
              <span v-else class="text-sm text-gray-400 italic">Aucun personnage assigné</span>
            </div>
          </div>

          <!-- Inputs inline pour Intention, Esthétique et Info - Style Pill -->
          <div class="space-y-2 my-3">
            <!-- Intention -->
            <div class="flex items-center gap-2 bg-amber-50 rounded-full px-3 py-2.5 border border-amber-200 transition-all hover:bg-amber-100 focus-within:ring-2 focus-within:ring-amber-400 focus-within:bg-white">
              <LightBulbIcon class="w-4 h-4 text-amber-600 flex-shrink-0" data-controller="tooltip" title="Intention" />
              <input
                type="text"
                :value="sequence.intention ?? ''"
                @blur="(e) => updateField('intention', e.target.value, sequence.id)"
                @keyup.enter="(e) => e.target.blur()"
                placeholder="Intention : Émotions et sensations..."
                class="flex-1 bg-transparent text-sm text-gray-800 placeholder-amber-400 focus:outline-none"
              />
              <AlignmentGauge
                :level="sequence.alignment?.intention?.level ?? null"
                :comment="sequence.alignment?.intention?.comment ?? ''"
                label="Intention"
              />
              <button
                @click="runAlignment(sequence.id, 'intention')"
                :disabled="!!analysingField"
                class="shrink-0 rounded-full p-1 text-gray-400 transition-colors hover:bg-white hover:text-amber-600 disabled:cursor-not-allowed disabled:opacity-40"
                data-controller="tooltip"
                title="Le texte écrit tient-il cette ligne ?"
              >
                <ArrowPathIcon
                  class="h-4 w-4"
                  :class="isAnalysingField(sequence.id, 'intention') && 'animate-spin'"
                />
              </button>
            </div>

            <!-- Esthétique -->
            <div class="flex items-center gap-2 bg-purple-50 rounded-full px-3 py-2.5 border border-purple-200 transition-all hover:bg-purple-100 focus-within:ring-2 focus-within:ring-purple-400 focus-within:bg-white">
              <EyeIcon class="w-4 h-4 text-purple-600 flex-shrink-0" data-controller="tooltip" title="Esthétique" />
              <input
                type="text"
                :value="sequence.aesthetic_idea ?? ''"
                @blur="(e) => updateField('aesthetic_idea', e.target.value, sequence.id)"
                @keyup.enter="(e) => e.target.blur()"
                placeholder="Esthétique : Approche artistique..."
                class="flex-1 bg-transparent text-sm text-gray-800 placeholder-purple-400 focus:outline-none"
              />
              <AlignmentGauge
                :level="sequence.alignment?.aesthetic?.level ?? null"
                :comment="sequence.alignment?.aesthetic?.comment ?? ''"
                label="Idée esthétique"
              />
              <button
                @click="runAlignment(sequence.id, 'aesthetic')"
                :disabled="!!analysingField"
                class="shrink-0 rounded-full p-1 text-gray-400 transition-colors hover:bg-white hover:text-amber-600 disabled:cursor-not-allowed disabled:opacity-40"
                data-controller="tooltip"
                title="Le texte écrit tient-il cette ligne ?"
              >
                <ArrowPathIcon
                  class="h-4 w-4"
                  :class="isAnalysingField(sequence.id, 'aesthetic') && 'animate-spin'"
                />
              </button>
            </div>

            <!-- Info -->
            <div class="flex items-center gap-2 bg-blue-50 rounded-full px-3 py-2.5 border border-blue-200 transition-all hover:bg-blue-100 focus-within:ring-2 focus-within:ring-blue-400 focus-within:bg-white">
              <InformationCircleIcon class="w-4 h-4 text-blue-600 flex-shrink-0" data-controller="tooltip" title="Information" />
              <input
                type="text"
                :value="sequence.information ?? ''"
                @blur="(e) => updateField('information', e.target.value, sequence.id)"
                @keyup.enter="(e) => e.target.blur()"
                placeholder="Information : Éléments narratifs clés..."
                class="flex-1 bg-transparent text-sm text-gray-800 placeholder-blue-400 focus:outline-none"
              />
              <AlignmentGauge
                :level="sequence.alignment?.information?.level ?? null"
                :comment="sequence.alignment?.information?.comment ?? ''"
                label="Information"
              />
              <button
                @click="runAlignment(sequence.id, 'information')"
                :disabled="!!analysingField"
                class="shrink-0 rounded-full p-1 text-gray-400 transition-colors hover:bg-white hover:text-amber-600 disabled:cursor-not-allowed disabled:opacity-40"
                data-controller="tooltip"
                title="Le texte écrit tient-il cette ligne ?"
              >
                <ArrowPathIcon
                  class="h-4 w-4"
                  :class="isAnalysingField(sequence.id, 'information') && 'animate-spin'"
                />
              </button>
            </div>
          </div>
            </div>
          </div>

          <!-- Les intensités se demandent pour toute la séquence ;
               l'alignement se vérifie ligne par ligne, au plus près du champ. -->
          <div class="mt-3 flex flex-wrap items-center gap-2">
            <button
              @click="runCriterias(sequence.id)"
              :disabled="!!analysing"
              class="inline-flex items-center gap-1.5 rounded-full border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              data-controller="tooltip"
              title="Proposer une note d'intensité par critère, d'après le texte écrit"
            >
              <span v-if="isAnalysing(sequence.id, 'criterias')">Analyse…</span>
              <span v-else>Proposer les intensités</span>
            </button>
          </div>

          <!-- Propositions du modèle : rien n'est enregistré sans validation -->
          <div
            v-if="sequence.suggestedCriterias?.length"
            class="mt-3 rounded-lg border border-amber-200 bg-amber-50/60 p-3"
          >
            <div class="mb-2 flex items-center justify-between gap-3">
              <span class="text-xs font-semibold uppercase tracking-wide text-amber-700">
                Intensités proposées
              </span>
              <div class="flex gap-2">
                <button
                  @click="sequence.suggestedCriterias = null"
                  class="rounded px-2 py-1 text-xs text-gray-600 hover:bg-white"
                >
                  Ignorer
                </button>
                <button
                  @click="applySuggestedCriterias(sequence)"
                  class="rounded bg-amber-500 px-2 py-1 text-xs font-medium text-white hover:bg-amber-600"
                >
                  Appliquer
                </button>
              </div>
            </div>
            <ul class="space-y-1">
              <li
                v-for="suggestion in sequence.suggestedCriterias"
                :key="suggestion.criteriaId"
                class="flex items-baseline gap-2 text-sm"
              >
                <span class="w-44 shrink-0 text-gray-700">{{ suggestion.name }}</span>
                <span class="w-8 shrink-0 font-semibold tabular-nums text-amber-800">{{ suggestion.value }}</span>
                <span class="text-xs italic text-gray-500">{{ suggestion.comment }}</span>
              </li>
            </ul>
          </div>

          <div v-html="sequence.description" class="text-gray-500 organizational-text mt-3"></div>

          <SceneList
            :scenes="sequence.scenes"
            :projectId="projectId"
            :sequenceId="sequence.id"
          />
      </div>

      <!-- Modale critères -->
      <div
        v-if="criteriaModalSequenceId === sequence.id"
        class="fixed inset-0 z-50 flex items-center justify-center"
        style="background:rgba(0,0,0,0.4)"
        @click.self="criteriaModalSequenceId = null"
      >
        <div class="bg-white rounded-xl shadow-2xl p-6 w-80 max-w-full mx-4">
          <div class="flex items-center justify-between mb-4">
            <h3 class="font-bold text-gray-800 flex items-center gap-2">
              <StarIcon class="w-5 h-5 text-yellow-400" />
              Intensité dramatique
            </h3>
            <button @click="criteriaModalSequenceId = null" class="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
          </div>
          <div v-for="criteria in metadataStore.criterias" :key="criteria.id" class="mb-4">
            <div class="text-sm font-semibold text-gray-700 mb-2">{{ criteria.name }}</div>
            <RatingStars
              :rating="getCriteriaRating(sequence, criteria.id)"
              :sequenceId="sequence.id"
              :criteriaId="criteria.id"
              @rate="updateRating"
            />
          </div>
        </div>
      </div>
    </li>

    <li class="list-none px-2 sm:px-6">
      <InsertDivider label="Séquence" @insert="insertSequenceAfter(sequence.id)" />
    </li>
    </template>
  </ul>
</template>

<style scoped>
/* Contenu organisationnel (Sequences) */
.organizational-text {
  color: #9CA3AF !important; /* gray-400 */
  font-style: italic;
}

.organizational-text * {
  color: #9CA3AF !important;
}

</style>
