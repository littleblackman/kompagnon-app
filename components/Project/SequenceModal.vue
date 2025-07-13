<script lang="ts" setup>
import { ref, computed, watch } from 'vue';
import RichTextEditor from "~/components/RichTextEditor.vue";
import { useProjectStore } from "~/store/project";
const projectStore = useProjectStore();

// props
const props = defineProps({
  sequence: Object,
  projectId: Number,
});

const emit = defineEmits(['close', 'save', 'delete']);

const currentSequence = ref({ ...props.sequence });
const selectedPartId = ref<number | null>(null);
const afterSequenceId = ref<number | null>(null);
const showDeleteConfirm = ref(false);

// Liste des parties disponibles
const availableParts = computed(() => projectStore.parts);

// Liste des séquences disponibles pour la partie sélectionnée
const availableSequences = computed(() => {
  if (!selectedPartId.value) return [];
  return projectStore.sequences.filter(s => s.part_id === selectedPartId.value);
});

// Mise à jour automatique des valeurs si en mode édition
watch(() => props.sequence, (newVal) => {
  if (newVal) {
    currentSequence.value = { ...newVal };
    selectedPartId.value = newVal.part_id;
    
    // Trouver la séquence précédente pour l'emplacement
    const index = availableSequences.value.findIndex(seq => seq.id === newVal.id);
    if (index > 0) {
      afterSequenceId.value = availableSequences.value[index - 1].id;
    } else {
      afterSequenceId.value = null;
    }
  } else {
    currentSequence.value = { name: '', description: '' };
    selectedPartId.value = null;
    afterSequenceId.value = null;
  }
}, { immediate: true });

// Réinitialiser afterSequenceId quand la partie change
watch(selectedPartId, () => {
  afterSequenceId.value = null;
});

const save = () => {
  if (!selectedPartId.value) {
    alert("Veuillez sélectionner une partie");
    return;
  }
  
  if (!currentSequence.value.name.trim()) {
    alert("Le nom est obligatoire");
    return;
  }

  const sequenceToSave = { 
    ...currentSequence.value, 
    part_id: selectedPartId.value
  };

  emit('save', { 
    sequence: sequenceToSave, 
    afterSequenceId: afterSequenceId.value 
  });
};

const deleteSequence = () => {
  showDeleteConfirm.value = true;
};

const confirmDelete = () => {
  emit('delete', currentSequence.value);
  showDeleteConfirm.value = false;
};

const cancelDelete = () => {
  showDeleteConfirm.value = false;
};
</script>

<template>
  <div class="fixed inset-0 flex items-center justify-center z-50">
    <div class="bg-white rounded p-6 w-[800px] border-2 border-amber-950 shadow-xl">
      <h3 class="text-xl font-bold mb-4">
        {{ currentSequence.id ? "Modifier la séquence" : "Ajouter une séquence" }}
      </h3>

      <!-- Select de la partie -->
      <label class="block mb-2 font-semibold">Partie :</label>
      <select v-model="selectedPartId" class="border rounded p-2 w-full mb-4">
        <option :value="null">Sélectionner une partie</option>
        <option v-for="part in availableParts" :key="part.id" :value="part.id">
          {{ part.name }}
        </option>
      </select>

      <label class="block mb-2 font-semibold">Nom :</label>
      <input type="text" v-model="currentSequence.name" class="border rounded p-2 w-full mb-4">

      <label class="block mb-2 font-semibold">Description :</label>
      <RichTextEditor v-model="currentSequence.description" />

      <!-- Select de l'emplacement -->
      <label class="block mt-4 font-semibold">Emplacement après :</label>
      <select v-model="afterSequenceId" class="border rounded p-2 w-full" :disabled="!selectedPartId">
        <option :value="null">Début de la partie</option>
        <option v-for="seq in availableSequences" :key="seq.id" :value="seq.id">
          {{ seq.name }}
        </option>
      </select>

      <div class="flex justify-between mt-4">
        <div>
          <button v-if="currentSequence.id" 
                  @click="deleteSequence" 
                  class="px-4 py-2 bg-red-500 text-white rounded">
            Supprimer
          </button>
        </div>
        <div class="space-x-4">
          <button @click="emit('close')" class="px-4 py-2 bg-gray-500 text-white rounded">Annuler</button>
          <button @click="save" class="px-4 py-2 bg-primary text-white rounded">
            Valider
          </button>
        </div>
      </div>
    </div>

    <!-- Modal de confirmation de suppression -->
    <div v-if="showDeleteConfirm" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
      <div class="bg-white rounded-lg p-6 max-w-sm w-full mx-4 shadow-xl">
        <h3 class="text-lg font-bold mb-4">Confirmation de suppression</h3>
        <p class="text-gray-600 mb-6">Êtes-vous sûr de vouloir supprimer cette séquence ?</p>
        <div class="flex justify-end space-x-4">
          <button @click="cancelDelete" 
                  class="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors">
            Annuler
          </button>
          <button @click="confirmDelete" 
                  class="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors">
            Supprimer
          </button>
        </div>
      </div>
    </div>
  </div>
</template>