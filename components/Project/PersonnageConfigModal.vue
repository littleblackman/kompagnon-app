<template>
  <div v-if="showConfig" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white rounded-lg max-w-md w-full mx-4 shadow-xl">
      <div class="p-6">
        <h3 class="text-lg font-bold mb-4 text-gray-900">Configuration détection personnages</h3>
        <p class="text-gray-600 mb-4">
          Configurez les paramètres pour la détection automatique des personnages dans les scènes.
        </p>
        
        <div class="space-y-4 mb-6">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Distance maximum (2-3 caractères)
            </label>
            <input
              v-model.number="config.maxDistance"
              type="number"
              min="1"
              max="5"
              class="w-full border rounded p-2"
            >
            <p class="text-xs text-gray-500 mt-1">
              Plus la distance est élevée, plus la détection sera permissive.
            </p>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Longueur minimum (3 caractères)
            </label>
            <input
              v-model.number="config.minLength"
              type="number"
              min="2"
              max="10"
              class="w-full border rounded p-2"
            >
            <p class="text-xs text-gray-500 mt-1">
              Mots plus courts que cette valeur seront ignorés.
            </p>
          </div>
        </div>
        
        <div class="flex justify-end space-x-3">
          <button
            @click="closeConfig"
            class="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Annuler
          </button>
          <button
            @click="saveConfig"
            class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Sauvegarder
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { usePersonnageStore } from '~/store/personnage';

const personnageStore = usePersonnageStore();

const showConfig = defineModel<boolean>('showConfig', { default: false });

const config = ref({
  maxDistance: personnageStore.detectionConfig.maxDistance,
  minLength: personnageStore.detectionConfig.minLength
});

const saveConfig = () => {
  personnageStore.setDetectionConfig(config.value);
  showConfig.value = false;
};

const closeConfig = () => {
  // Restore original values
  config.value = {
    maxDistance: personnageStore.detectionConfig.maxDistance,
    minLength: personnageStore.detectionConfig.minLength
  };
  showConfig.value = false;
};
</script>