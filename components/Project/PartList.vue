<script setup lang="ts">
import { ref } from '#imports'
import type { Part } from '~/types'
import SequenceList from "@/components/Project/SequenceList.vue";
import PartModal from "@/components/Project/PartModal.vue";
import ActionButtons from "@/components/Project/ActionButtons.vue";
import { useProjectStore } from "~/store/project";

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

// Met à jour le store directement après modification
const handleSavePart = (updatedPart: Part) => {
  projectStore.addPart(updatedPart);
  modalOpen.value = false;
};
</script>

<template>
  <div>
    <!-- Liste des parties -->
    <ul class="mt-6">
      <li v-for="part in projectStore.project?.parts" :key="part.id">
        <h2 class="font-bold text-2xl cursor-pointer" @click="openModal(part)">
          {{ part.name }}
        </h2>
        <p v-html="part.description || ''" class="cursor-pointer" @click="openModal(part)"></p>
        <SequenceList :sequences="part.sequences" :projectId="projectStore.project?.id || 0" :partId="part.id" />
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
