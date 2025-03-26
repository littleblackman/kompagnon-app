<script lang="ts" setup>
import { ref } from 'vue';
import RichTextEditor from "~/components/RichTextEditor.vue";
import { useProjectStore } from "~/store/project";
const projectStore = useProjectStore();


// props
const props = defineProps({
  sequence: Object,
  projectId: Number,
});

const currentSequence = ref({ ...props.sequence });


// emit
const emit = defineEmits(['close', 'save']);

watch(() => props.sequence, (newVal) => {
  currentSequence.value = { ...newVal };
});


const afterSequenceId = ref<number | null>(null);

// calcul des séquences disponibles (à partir du store ou d’un prop passé)
const availableSequences = computed(() => {
  return projectStore.sequences.filter(s => s.part_id === currentSequence.value.part_id);
});


// mise à jour automatique du select si en mode édition
watch(() => props.sequence, (newVal) => {
  currentSequence.value = { ...newVal };

  if (newVal?.id) {
    const index = availableSequences.value.findIndex(seq => seq.id === newVal.id);
    if (index > 0) {
      afterSequenceId.value = availableSequences.value[index - 1].id;
    } else {
      afterSequenceId.value = null;
    }
  } else {
    afterSequenceId.value = null;
  }

}, { immediate: true });

const save = () => {
  emit('save', { sequence: currentSequence.value, afterSequenceId: afterSequenceId.value });
};


</script>
<template>

  <div class="fixed inset-0 flex items-center justify-center z-50">
    <div class="bg-white rounded p-6 w-[800px] border-2 border-amber-950 shadow-xl">
      <h3 class="text-xl font-bold mb-4">
        {{ currentSequence.id ? "Modifier la séquence" : "Ajouter une séquence" }}
      </h3>

      <label class="block mb-2 font-semibold">Nom :</label>
      <input type="text" v-model="currentSequence.name" class="border rounded p-2 w-full mb-4">

      <label class="block mb-2 font-semibold">Description :</label>
      <RichTextEditor v-model="currentSequence.description" />

      <label class="block mt-4 font-semibold">Emplacement après :</label>
      <select v-model="afterSequenceId" class="border rounded p-2 w-full">
        <option :value="null">Début de la partie</option>
        <option v-for="seq in availableSequences" :key="seq.id" :value="seq.id">
          {{ seq.name }}
        </option>
      </select>


      <div class="flex justify-end space-x-4 mt-4">
        <button @click="emit('close')" class="px-4 py-2 bg-gray-500 text-white rounded">Annuler</button>

        <button @click="save" class="px-4 py-2 bg-primary text-white rounded">
          Valider
        </button>


      </div>


    </div>
  </div>


</template>