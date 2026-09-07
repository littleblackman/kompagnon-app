<script lang="ts" setup>
import { useToast } from '~/composables/useToast';
const toast = useToast();
import { ref, computed, watch, nextTick } from 'vue';
import RichTextEditor from "~/components/RichTextEditor.vue";
import { useProjectStore } from "~/store/project";
import { useConfirm } from "~/composables/useConfirm";
const projectStore = useProjectStore();
const { confirm } = useConfirm();

// props
const props = defineProps({
  sequence: Object,
  projectId: Number,
  /** À la création : partie cible pré-sélectionnée */
  partId: { type: Number, default: null },
  /** À la création : insérer juste après cette séquence (null = début de la partie) */
  insertAfterId: { type: Number, default: null },
});

const emit = defineEmits(['close', 'save', 'delete']);

const currentSequence = ref({ ...props.sequence });
const selectedPartId = ref<number | null>(null);
const afterSequenceId = ref<number | null>(null);

// Liste des parties disponibles
const availableParts = computed(() => projectStore.parts);

// Liste des séquences disponibles pour la partie sélectionnée
const availableSequences = computed(() => {
  if (!selectedPartId.value) return [];
  const part = projectStore.parts.find(p => p.id === selectedPartId.value);
  return part?.sequences || [];
});


// Mise à jour automatique des valeurs si en mode édition
watch(() => props.sequence, (newVal) => {
  if (newVal) {
    currentSequence.value = { ...newVal };
    selectedPartId.value = newVal.part_id;
    afterSequenceId.value = null; // Pas de repositionnement en mode édition
  } else {
    // Création : contexte d'insertion fourni par l'appelant
    currentSequence.value = { name: '', description: '' };
    selectedPartId.value = props.partId;
    afterSequenceId.value = props.insertAfterId;
  }
}, { immediate: true });

// Changer de partie invalide le point d'insertion, qui appartenait à l'ancienne
watch(selectedPartId, (newPartId, oldPartId) => {
  if (oldPartId !== undefined && newPartId !== oldPartId) {
    afterSequenceId.value = null;
  }
});

const save = async () => {
  if (!selectedPartId.value) {
    toast.error("Veuillez sélectionner une partie");
    return;
  }
  
  if (!currentSequence.value.name.trim()) {
    toast.error("Le nom est obligatoire");
    return;
  }

  const sequenceToSave = { 
    ...currentSequence.value, 
    part_id: selectedPartId.value
  };

  try {
    if (currentSequence.value.id) {
      // Modification d'une séquence existante → utiliser updateSequenceContent
      await projectStore.updateSequenceContent(sequenceToSave);
      emit('close');
    } else {
      // Nouvelle séquence → passer par l'événement save avec afterSequenceId
      emit('save', { 
        sequence: sequenceToSave, 
        afterSequenceId: afterSequenceId.value 
      });
      return;
    }
  } catch (error) {
    console.error('Erreur lors de la sauvegarde:', error);
    toast.error('Erreur lors de la sauvegarde');
  }
};

const deleteSequence = async () => {
  const ok = await confirm({
    title: 'Supprimer cette séquence ?',
    message: `« ${currentSequence.value.name || 'Sans titre'} » sera supprimée, ainsi que toutes ses scènes.`,
    danger: true,
    confirmLabel: 'Supprimer'
  });
  if (!ok) return;

  emit('delete', currentSequence.value);
};
</script>

<template>
  <div class="fixed inset-0 flex items-center justify-center z-50">
    <div class="bg-white rounded p-6 w-[800px] border-2 border-amber-950 shadow-xl">
      <h3 class="text-xl font-bold mb-4">
        {{ currentSequence.id ? "Modifier la séquence" : "Ajouter une séquence" }}
      </h3>

      <!-- Sélection de la partie -->
      <div class="mb-4">
        <label class="block mb-2 font-semibold">Partie associée :</label>
        <select v-model="selectedPartId" class="border rounded p-2 w-full">
          <option :value="null">Sélectionner une partie</option>
          <option v-for="part in availableParts" :key="part.id" :value="part.id">
            {{ part.name }}
          </option>
        </select>
      </div>

      <!-- Emplacement (seulement en création) -->
      <div v-if="!currentSequence.id" class="mb-4">
        <label class="block mb-2 font-semibold">Insérer après :</label>
        <select v-model="afterSequenceId" class="border rounded p-2 w-full" :disabled="!selectedPartId">
          <option :value="null">Début de la partie</option>
          <option v-for="seq in availableSequences" :key="seq.id" :value="seq.id">
            {{ seq.name }}
          </option>
        </select>
      </div>

      <label class="block mb-2 font-semibold">Nom :</label>
      <input type="text" v-model="currentSequence.name" class="border rounded p-2 w-full mb-4">

      <label class="block mb-2 font-semibold">Description :</label>
      <RichTextEditor v-model="currentSequence.description" content-type="organizational" />


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
  </div>
</template>