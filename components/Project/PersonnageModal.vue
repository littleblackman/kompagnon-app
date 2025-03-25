<script setup>
import { ref, watch } from 'vue';
import RichTextEditor from '~/components/RichTextEditor.vue';

const props = defineProps({
  personnage: Object
});
const emit = defineEmits(['close', 'save']);

const currentPersonnage = ref({ ...props.personnage });

watch(() => props.personnage, (newVal) => {
  currentPersonnage.value = { ...newVal };
}, { deep: true });

const handleSave = () => {
  emit('save', currentPersonnage.value);
};
</script>

<template>
  <div class="fixed inset-0 bg-gray-200 bg-opacity-10 flex items-center justify-center z-50">
    <div class="bg-white rounded p-6 w-[900px] border-2 border-amber-950 shadow-xl max-h-[90vh] overflow-y-auto">
      <h3 class="text-xl font-bold mb-6">
        {{ currentPersonnage.id ? "Modifier" : "Ajouter"}} un personnage
      </h3>

      <!-- Prénom -->
      <div class="mb-4">
        <label class="block font-semibold mb-1" for="firstName">Prénom</label>
        <input
            id="firstName"
            type="text"
            v-model="currentPersonnage.firstName"
            class="border rounded p-2 w-full"
        />
      </div>

      <!-- Nom -->
      <div class="mb-4">
        <label class="block font-semibold mb-1" for="lastName">Nom</label>
        <input
            id="lastName"
            type="text"
            v-model="currentPersonnage.lastName"
            class="border rounded p-2 w-full"
        />
      </div>

      <!-- Âge -->
      <div class="mb-4">
        <label class="block font-semibold mb-1" for="age">Âge</label>
        <input
            id="age"
            type="number"
            v-model="currentPersonnage.age"
            class="border rounded p-2 w-full"
        />
      </div>

      <!-- Importance -->
      <div class="mb-4">
        <label class="block font-semibold mb-1" for="importance">Niveau d’importance</label>
        <input
            id="importance"
            type="number"
            v-model="currentPersonnage.importance"
            class="border rounded p-2 w-full"
        />
      </div>

      <!-- Analyse -->
      <div class="mb-4">
        <label class="block font-semibold mb-1" for="analysis">Analyse du personnage</label>
        <textarea
            id="analysis"
            v-model="currentPersonnage.analysis"
            class="border rounded p-2 w-full h-24 resize-y"
        ></textarea>
      </div>

      <!-- Background -->
      <div class="mb-4">
        <label class="block font-semibold mb-1">Histoire / Background</label>
        <RichTextEditor v-model="currentPersonnage.background" class="border rounded" />
      </div>

      <!-- Boutons -->
      <div class="flex justify-end space-x-4 mt-6">
        <button class="px-4 py-2 bg-gray-300 rounded" @click="$emit('close')">Annuler</button>
        <button class="px-4 py-2 bg-primary text-white rounded" @click="handleSave">Enregistrer</button>
      </div>
    </div>
  </div>
</template>