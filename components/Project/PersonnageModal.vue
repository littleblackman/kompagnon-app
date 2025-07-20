<script setup>
import { ref, watch } from 'vue';
import RichTextEditor from '~/components/RichTextEditor.vue';
import ImageUploader from '~/components/Project/ImageUploader.vue';

const props = defineProps({
  personnage: Object
});
const emit = defineEmits(['close', 'save']);

const currentPersonnage = ref({ ...props.personnage });

// Console.log immédiat pour voir les données initiales
console.log('Données personnage au montage:', props.personnage);

watch(() => props.personnage, (newVal) => {
  console.log('Données personnage reçues de l\'API:', newVal);
  currentPersonnage.value = { ...newVal };
}, { deep: true });

const handleSave = () => {
  emit('save', currentPersonnage.value);
};

const handleImagesUpdated = (images) => {
  currentPersonnage.value.images = images;
  // Mettre à jour l'avatar (première image)
  if (images.length > 0) {
    currentPersonnage.value.avatar = images[0];
  } else {
    currentPersonnage.value.avatar = undefined;
  }
};

</script>

<template>
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div class="bg-white rounded-lg w-[90%] max-w-7xl h-[95vh] border-2 border-amber-950 shadow-2xl flex flex-col">
      
      <!-- Header -->
      <div class="flex items-center justify-between p-6 border-b border-gray-200 bg-amber-50 rounded-t-lg">
        <h3 class="text-2xl font-bold text-amber-900">
          {{ currentPersonnage.id ? "Modifier" : "Créer" }} un personnage
        </h3>
        <button 
          @click="$emit('close')" 
          class="text-gray-500 hover:text-gray-700 text-2xl font-bold w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-200 transition-colors"
        >
          ×
        </button>
      </div>

      <!-- Content scrollable -->
      <div class="flex-1 overflow-y-auto p-6">
        <div class="flex flex-col lg:flex-row gap-8 h-full">
          
          <!-- Colonne gauche - Informations de base -->
          <div class="space-y-6 lg:w-1/2">
            <div class="bg-gray-50 p-6 rounded-lg">
              <h4 class="text-lg font-semibold mb-4 text-gray-800 border-b border-gray-300 pb-2">
                Identité
              </h4>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div class="grid grid-cols-[auto_1fr] gap-2 items-center">
                  <label class="font-semibold text-gray-700" for="firstName">
                    Prénom
                  </label>
                  <input
                    id="firstName"
                    type="text"
                    v-model="currentPersonnage.firstName"
                    class="focus:bg-white focus:ring-2 focus:ring-amber-500/30 transition-all min-w-0"
                    placeholder="Prénom du personnage"
                  />
                </div>

                <div class="grid grid-cols-[auto_1fr] gap-2 items-center">
                  <label class="font-semibold text-gray-700" for="lastName">
                    Nom
                  </label>
                  <input
                    id="lastName"
                    type="text"
                    v-model="currentPersonnage.lastName"
                    class="focus:bg-white focus:ring-2 focus:ring-amber-500/30 transition-all min-w-0"
                    placeholder="Nom de famille"
                  />
                </div>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div class="grid grid-cols-[auto_1fr] gap-2 items-center">
                  <label class="font-semibold text-gray-700" for="age">
                    Âge
                  </label>
                  <input
                    id="age"
                    type="number"
                    v-model="currentPersonnage.age"
                    class="focus:bg-white focus:ring-2 focus:ring-amber-500/30 transition-all min-w-0"
                    placeholder="Âge en années"
                    min="0"
                    max="120"
                  />
                </div>

                <div>
                  <select
                    id="importance"
                    v-model="currentPersonnage.level"
                    class="focus:bg-white focus:ring-2 focus:ring-amber-500/30 transition-all w-full min-w-0"
                  >
                    <option value=""></option>
                    <option value="1">Personnage principal</option>
                    <option value="2">Personnage secondaire</option>
                    <option value="3">Figurant</option>
                    <option value="4">Mention/Référence</option>
                  </select>
                </div>
              </div>
            </div>

            <!-- Analyse rapide -->
            <div class="bg-blue-50 p-6 rounded-lg">
              <h4 class="text-lg font-semibold mb-4 text-gray-800 border-b border-blue-300 pb-2">
                Analyse rapide
              </h4>
              <div 
                class="p-4"
                v-html="currentPersonnage.analysis || '<em class=\'text-gray-500\'>Aucune analyse disponible</em>'"
              >
              </div>
            </div>

            <!-- Images -->
            <div v-if="currentPersonnage.id" class="bg-purple-50 p-6 rounded-lg">
              <h4 class="text-lg font-semibold mb-4 text-gray-800 border-b border-purple-300 pb-2">
                Images
              </h4>
              <ImageUploader
                :personnage-id="currentPersonnage.id"
                :images="currentPersonnage.images || []"
                @images-updated="handleImagesUpdated"
              />
            </div>
          </div>

          <!-- Colonne droite - Histoire et background -->
          <div class="flex flex-col h-full lg:w-1/2">
            <div class="bg-green-50 p-6 rounded-lg flex-1 flex flex-col">
              <h4 class="text-lg font-semibold mb-4 text-gray-800 border-b border-green-300 pb-2">
                Histoire & Background
              </h4>
              <div class="flex-1 flex flex-col">
  
                <div class="flex-1 min-h-0">
                  <RichTextEditor 
                    v-model="currentPersonnage.background" 
                    class="border border-gray-300 rounded-lg h-full" 
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer avec boutons -->
      <div class="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50 rounded-b-lg">
        <div class="text-sm text-gray-500">
          <span v-if="currentPersonnage.id" class="text-green-600">● Personnage existant</span>
          <span v-else class="text-blue-600">● Nouveau personnage</span>
        </div>
        
        <div class="flex space-x-4">
          <button 
            class="px-6 py-3 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-lg font-medium transition-colors" 
            @click="$emit('close')"
          >
            Annuler
          </button>
          <button 
            class="px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium transition-colors" 
            @click="handleSave"
          >
            {{ currentPersonnage.id ? "Mettre à jour" : "Créer le personnage" }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>