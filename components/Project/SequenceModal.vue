<script lang="ts" setup>

import { ref } from 'vue';
import RichTextEditor from "~/components/RichTextEditor.vue";

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

      <div class="flex justify-end space-x-4 mt-4">
        <button @click="emit('close')" class="px-4 py-2 bg-gray-500 text-white rounded">Annuler</button>
        <button @click="emit('save', currentSequence)" class="px-4 py-2 bg-primary text-white rounded">Valider</button>
      </div>


    </div>
  </div>


</template>