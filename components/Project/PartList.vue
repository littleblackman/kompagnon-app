<script setup lang="ts">
import { ref, computed } from '#imports'
import type { Part } from '~/types'
import SequenceList from "@/components/Project/SequenceList.vue";
import PartModal from "@/components/Project/PartModal.vue";
import ActionButtons from "@/components/Project/ActionButtons.vue";
import { useProjectStore } from "~/store/project";
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/vue/24/outline'
import { toRoman } from '~/utils/roman';

// Récupérer le store
const projectStore = useProjectStore();

// Variables pour la modale
const modalOpen = ref(false);
const currentPart = ref<Part | null>(null);

// Ouvrir la modale pour édition ou création
const openModal = (part: Part | null = null) => {
  currentPart.value = part;
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
      <li v-for="(part, index) in projectStore.project?.parts" :key="part.id" 
          class="bg-orange-50 rounded-lg p-4 hover:bg-orange-100 transition-colors">
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
    </ul>

    <!-- Boutons d'action -->
    <ActionButtons :projectId="projectStore.project?.id || 0" />

    <!-- Modale -->
    <PartModal
      v-if="modalOpen"
      :part="currentPart"
      :projectId="projectStore.project?.id || 0"
      @close="modalOpen = false"
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
