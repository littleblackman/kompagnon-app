<script setup>
import { ref, watch } from 'vue';

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

// Fonction pour créer un slug à partir du nom/prénom
const createPersonnageSlug = (firstName, lastName) => {
  const fullName = `${firstName || ''} ${lastName || ''}`.trim();
  return fullName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Supprimer les accents
    .replace(/[^a-z0-9\s-]/g, '') // Garder seulement lettres, chiffres, espaces et tirets
    .replace(/\s+/g, '-') // Remplacer espaces par tirets
    .replace(/-+/g, '-') // Remplacer tirets multiples par un seul
    .replace(/^-|-$/g, ''); // Supprimer tirets en début/fin
};

</script>

<template>
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div class="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] border-2 border-amber-950 shadow-2xl flex flex-col">
      
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
        <div class="space-y-6">
          
          <!-- Informations de base -->
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
                <label class="font-semibold text-gray-700 mb-2" for="importance">
                  Importance
                </label>
                <select
                  id="importance"
                  v-model="currentPersonnage.level"
                  class="focus:bg-white focus:ring-2 focus:ring-amber-500/30 transition-all w-full min-w-0"
                >
                  <option value="">Sélectionner...</option>
                  <option value="1">Personnage principal</option>
                  <option value="2">Personnage secondaire</option>
                  <option value="3">Figurant</option>
                  <option value="4">Mention/Référence</option>
                </select>
              </div>
            </div>
          </div>

          <!-- Forces et faiblesses -->
          <div class="bg-orange-50 p-6 rounded-lg">
            <h4 class="text-lg font-semibold mb-4 text-gray-800 border-b border-orange-300 pb-2">
              Forces & Faiblesses
            </h4>
            
            <div class="space-y-4">
              <div>
                <label class="block font-semibold text-gray-700 mb-2" for="strength">
                  💪 Forces
                </label>
                <textarea
                  id="strength"
                  v-model="currentPersonnage.strength"
                  class="w-full h-24 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500/30 transition-all resize-none"
                  placeholder="Quelles sont les forces de ce personnage ?"
                ></textarea>
              </div>
              
              <div>
                <label class="block font-semibold text-gray-700 mb-2" for="weakness">
                  ⚠️ Faiblesses
                </label>
                <textarea
                  id="weakness"
                  v-model="currentPersonnage.weakness"
                  class="w-full h-24 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500/30 transition-all resize-none"
                  placeholder="Quelles sont les faiblesses de ce personnage ?"
                ></textarea>
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
          <NuxtLink 
            v-if="currentPersonnage.id" 
            :to="`/projets/detail-${createPersonnageSlug(currentPersonnage.firstName, currentPersonnage.lastName)}`"
            class="ml-4 text-amber-600 hover:text-amber-800 underline text-sm transition-colors"
          >
            Détails
          </NuxtLink>
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

<style scoped>
.link {
  text-decoration: none;
  color: #79AC78;
  transition: color 0.3s ease-in-out;
}

.link:hover {
  color: #FF9B9B;
  transform: scale(1.4);
}

.organizational-text {
  color: #9CA3AF;
  font-style: italic;
}

.organizational-text * {
  color: #9CA3AF !important;
  font-style: italic !important;
}

.printable-content {
  color: #111827;
  background-color: #FFFBEB;
  padding: 1rem;
  border-left: 4px solid #F59E0B;
  border-radius: 0.375rem;
}

.printable-content * {
  color: #111827 !important;
}

.scene-content {
  color: #111827;
  padding: 1rem 0;
  line-height: 1.7;
  text-align: justify;
}

.scene-content * {
  color: #111827 !important;
  text-align: justify !important;
}
</style>