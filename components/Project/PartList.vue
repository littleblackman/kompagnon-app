<script setup>
import { ref, watch, reactive } from "vue";
import SequenceList from "@/components/Project/SequenceList.vue";
import PartModal from "@/components/Project/PartModal.vue";

const props = defineProps({
  parts: Array,
  criterias: Array,
  personnages: Array,
  status: Array,
  projectId: Number,
});

const parts = reactive([...props.parts]);

watch(() => props.parts, (newParts) => {
  Object.assign(parts, [...newParts]);
}, { deep: true });

const modalOpen = ref(false);
const currentPart = ref(null);

// Ouvrir la modale pour édition ou création
const openModal = (part = null) => {
  currentPart.value = part;
  modalOpen.value = true;
};

const handleSavePart = (updatedPart) => {
  const index = parts.findIndex(p => p.id === updatedPart.id);
  if (index !== -1) {
    // Update existing part
    parts[index]['name'] = updatedPart.name;
    parts[index]['description'] = updatedPart.description;
  } else {
    // Add new part
    parts.push(updatedPart);
  }
  modalOpen.value = false;
};
</script>

<template>
  <div>
    <button @click="() => { currentPart = null; modalOpen = true }" class="px-3 py-2 rounded bg-light text-white mb-4 cursor-pointer">
      + Ajouter une partie
    </button>

    <ul class="mt-6">
      <li v-for="part in parts" :key="part.id">
        <h2 class="font-bold text-2xl cursor-pointer" @click="currentPart=part; modalOpen=true">
          {{ part.name }}
        </h2>
        <hr class="border-2 my-2" />
        <p v-html="part.description || ''"
           class="cursor-pointer"
           @click="currentPart=part; modalOpen=true">
        </p>
        <SequenceList :sequences="part.sequences" :criterias="criterias" :personnages="personnages"/>
      </li>
    </ul>

    <!-- Modale externalisée -->
    <PartModal v-if="modalOpen"
               :part="currentPart"
               :projectId="projectId"
               @save="handleSavePart"
               @close="modalOpen = false"/>
  </div>
</template>