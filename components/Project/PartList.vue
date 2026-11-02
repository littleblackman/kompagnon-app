<script setup lang="ts">
import { ref, computed } from '#imports'
import type { Part } from '~/types'
import SequenceList from "@/components/Project/SequenceList.vue";
import PartModal from "@/components/Project/PartModal.vue";
import ActionButtons from "@/components/Project/ActionButtons.vue";
import InsertDivider from "@/components/Project/InsertDivider.vue";
import PartScanModal from "@/components/Project/PartScanModal.vue";
import { useProjectStore } from "~/store/project";
import { useToast } from "~/composables/useToast";
import { ChevronDownIcon, ChevronRightIcon, SparklesIcon, UserGroupIcon } from '@heroicons/vue/24/outline'
import { toRoman } from '~/utils/roman';

// Récupérer le store
const projectStore = useProjectStore();
const toast = useToast();

/**** ANALYSE D'UNE PARTIE ****/

// Une partie à la fois, et ses séquences l'une après l'autre : chacune
// déclenche déjà deux appels au modèle.
const partAnalysis = ref<{ partId: number; done: number; total: number } | null>(null);
const scanningPart = ref<Part | null>(null);

const hasText = (sequence: any) =>
  (sequence.scenes ?? []).some((scene: any) => (scene.content ?? '').replace(/<[^>]*>/g, '').trim());

const analysePart = async (part: Part) => {
  const targets = (part.sequences ?? []).filter(hasText);
  if (!targets.length) {
    toast.error('Aucune séquence de cette partie ne contient de texte.');
    return;
  }

  // Les propositions s'affichent sur les séquences : il faut les voir
  if (!isPartExpanded(part.id)) togglePart(part.id);

  partAnalysis.value = { partId: part.id, done: 0, total: targets.length };
  let failures = 0;

  for (const sequence of targets) {
    const result = await projectStore.analyseSequence(sequence.id);
    if (!result.success) failures++;
    partAnalysis.value.done++;
  }

  partAnalysis.value = null;

  failures
    ? toast.error(`${failures} séquence${failures > 1 ? 's' : ''} sur ${targets.length} n'ont pas pu être analysées.`)
    : toast.success('Propositions prêtes : à reprendre séquence par séquence');
};

// Variables pour la modale
const modalOpen = ref(false);
const currentPart = ref<Part | null>(null);
const insertAfterId = ref<number | null>(null);

// Ouvrir la modale pour édition ou création
const openModal = (part: Part | null = null) => {
  currentPart.value = part;
  insertAfterId.value = null;
  modalOpen.value = true;
};

// Insérer une nouvelle partie juste après celle-ci
const insertPartAfter = (partId: number | null) => {
  currentPart.value = null;
  insertAfterId.value = partId;
  modalOpen.value = true;
};

// Ferme la modale après sauvegarde (la sauvegarde est gérée par PartModal)
const handleSavePart = (updatedPart: Part) => {
  modalOpen.value = false;
};

// Gestion de l'expansion
const togglePart = (partId: number) => {
  projectStore.togglePart(partId);
};

// Vérifier si une partie est développée
const isPartExpanded = (partId: number) => {
  return projectStore.expandedParts.has(partId);
};
</script>

<template>
  <div style="width: 100%;">
    <!-- Liste des parties -->
    <ul class="mt-6 space-y-4">
      <template v-for="(part, index) in projectStore.project?.parts" :key="part.id">
      <li class="bg-orange-50 rounded-lg p-2 sm:p-4 hover:bg-orange-100 transition-colors">
        <div class="flex items-start gap-2">
          <button 
            @click="togglePart(part.id)"
            class="text-gray-500 hover:text-gray-700 mt-2 cursor-pointer transition-colors"
          >
            <ChevronDownIcon v-if="isPartExpanded(part.id)" class="w-5 h-5" />
            <ChevronRightIcon v-else class="w-5 h-5" />
          </button>
          <div class="flex-1">
            <h2 
              :id="`part-${part.id}`"
              class="font-bold text-2xl cursor-pointer hover:text-blue-600 transition-colors text-color-primary" 
              @click="openModal(part)"
            >
              {{ toRoman(index + 1) }}. {{ part.name }}
            </h2>
            <div
              v-html="part.description || ''"
              class="cursor-pointer hover:text-blue-600 transition-colors text-gray-500 organizational-text"
              @click="openModal(part)"
            ></div>
            <div v-if="part.sequences?.length" class="mt-2 flex flex-wrap items-center gap-2">
              <button
                @click="analysePart(part)"
                :disabled="!!partAnalysis"
                class="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-white px-3 py-1 text-xs font-medium text-amber-800 transition-colors hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-50"
                data-controller="tooltip"
                title="Proposer intensités, intention, esthétique et information pour chaque séquence"
              >
                <SparklesIcon class="h-3.5 w-3.5" :class="partAnalysis?.partId === part.id && 'animate-pulse'" />
                <template v-if="partAnalysis?.partId === part.id">
                  Analyse {{ partAnalysis.done + 1 }}/{{ partAnalysis.total }}…
                </template>
                <template v-else>Analyser la partie</template>
              </button>
              <button
                @click="scanningPart = part"
                class="inline-flex items-center gap-1.5 rounded-full border border-gray-300 bg-white px-3 py-1 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
                data-controller="tooltip"
                title="Relire toutes les séquences et vérifier qui apparaît vraiment"
              >
                <UserGroupIcon class="h-3.5 w-3.5" />
                Personnages
              </button>
            </div>
            <div v-if="isPartExpanded(part.id)" class="mt-4">
              <SequenceList 
                :sequences="part.sequences" 
                :projectId="projectStore.project?.id || 0" 
                :partId="part.id" 
              />
            </div>
          </div>
        </div>
      </li>

      <li class="list-none">
        <InsertDivider label="Partie" @insert="insertPartAfter(part.id)" />
      </li>
      </template>
    </ul>

    <!-- Projet encore vide -->
    <div v-if="!projectStore.project?.parts?.length" class="mt-6 text-center text-gray-500">
      <p class="italic mb-3">Aucune partie dans ce projet</p>
      <button
        @click="insertPartAfter(null)"
        class="inline-flex items-center gap-1 px-3 py-2 rounded-md bg-amber-600 text-white text-sm font-medium hover:bg-amber-700"
      >
        Ajouter une partie
      </button>
    </div>

    <!-- Boutons d'action -->
    <ActionButtons :projectId="projectStore.project?.id || 0" />

    <!-- Modale -->
    <PartModal
      v-if="modalOpen"
      :part="currentPart"
      :projectId="projectStore.project?.id || 0"
      :insert-after-id="insertAfterId"
      @close="modalOpen = false"
    />

    <PartScanModal
      :open="!!scanningPart"
      :part="scanningPart"
      @close="scanningPart = null"
    />
  </div>
</template>

<style scoped>
/* Contenu organisationnel (Parts) */
.organizational-text {
  color: #9CA3AF !important; /* gray-400 */
  font-style: italic;
}

.organizational-text * {
  color: #9CA3AF !important;
}
</style>
