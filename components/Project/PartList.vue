<script setup lang="ts">
import { ref } from "vue";
import SequenceList from "@/components/Project/SequenceList.vue";
import PartModal from "@/components/Project/PartModal.vue";
import { useProjectStore } from "~/store/project";

// Récupérer le store
const projectStore = useProjectStore();

// Variables pour la modale
const modalOpen = ref(false);
const currentPart = ref(null);

// Ouvrir la modale pour édition ou création
const openModal = (part = null) => {
  currentPart.value = part;
  modalOpen.value = true;
};

// Met à jour le store directement après modification
const handleSavePart = (updatedPart) => {
  projectStore.addPart(updatedPart);
  modalOpen.value = false;
};
</script>

<template>
  <div>
    <button @click="openModal()" class="px-3 py-2 bg-primary bg-cta rounded mb-4 cursor-pointer font-bold">
      + Ajouter une partie
    </button>

    <ul class="mt-6">
      <li v-for="part in projectStore.project?.parts" :key="part.id">
        <h2 class="font-bold text-2xl cursor-pointer" @click="openModal(part)">
          {{ part.name }}
        </h2>
        <p v-html="part.description || ''" class="cursor-pointer" @click="openModal(part)"></p>
        <SequenceList :sequences="part.sequences" :projectId="projectStore.project?.id"/>
      </li>
    </ul>

    <!-- Modale -->
    <PartModal v-if="modalOpen"
               :part="currentPart"
               :projectId="projectStore.project?.id"
               @close="modalOpen = false"/>
  </div>
</template>
