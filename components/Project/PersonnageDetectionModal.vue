<template>
  <div v-if="personnageStore.showDetectionModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white rounded-lg max-w-2xl w-full mx-4 shadow-xl">
      <div class="p-8">
        <h3 class="text-lg font-bold mb-4 text-gray-900">Personnages détectés</h3>
        <p class="text-gray-600 mb-4">
          Des personnages ont été détectés dans le contenu de cette scène. Voulez-vous les ajouter à la séquence ?
        </p>
        
        <div class="space-y-4 mb-8">
          <div 
            v-for="detected in filteredDetectedCharacters" 
            :key="`${detected.personnage?.id}-${detected.name}`"
            class="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div class="flex-1">
              <div class="font-medium text-gray-900">
                {{ personnageStore.getPersonnageName(detected.personnage!) }}
              </div>
              <div class="text-sm text-gray-500">
                Trouvé : "{{ detected.name }}" 
                <span class="text-green-600">({{ Math.round(detected.confidence * 100) }}% de correspondance)</span>
              </div>
            </div>
            <button
              @click="addCharacterToSequence(detected.personnage!.id)"
              class="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
            >
              Ajouter
            </button>
          </div>
        </div>
        
        <div class="flex justify-end space-x-3">
          <button
            @click="personnageStore.closeDetectionModal()"
            class="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Ignorer
          </button>
          <button
            @click="addAllCharacters"
            class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
          >
            Tout ajouter
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue';
import { usePersonnageStore } from '~/store/personnage';
import { useProjectStore } from '~/store/project';

const personnageStore = usePersonnageStore();
const projectStore = useProjectStore();

// Computed pour filtrer les personnages déjà assignés
const filteredDetectedCharacters = computed(() => {
  if (!personnageStore.currentSequenceId || !projectStore.project) {
    return personnageStore.detectedCharacters;
  }
  
  // Trouver la séquence dans la hiérarchie du projet
  let currentSequence = null;
  for (const part of projectStore.project.parts) {
    if (part.sequences) {
      currentSequence = part.sequences.find(s => s.id === personnageStore.currentSequenceId);
      if (currentSequence) break;
    }
  }
  
  if (!currentSequence || !currentSequence.sequencePersonnages) {
    return personnageStore.detectedCharacters;
  }
  
  // Extraire les IDs des personnages déjà assignés
  const assignedPersonnageIds = currentSequence.sequencePersonnages.map(sp => sp.personnage?.id).filter(Boolean);
  
  // Filtrer les détections pour exclure les personnages déjà assignés
  return personnageStore.detectedCharacters.filter(detectedChar => 
    !assignedPersonnageIds.includes(detectedChar.personnage?.id)
  );
});

// Watcher pour fermer la modal si plus de personnages à proposer
watch(filteredDetectedCharacters, (newFiltered) => {
  if (personnageStore.showDetectionModal && newFiltered.length === 0) {
    console.log('No characters to suggest, closing modal');
    personnageStore.closeDetectionModal();
  }
}, { immediate: true });

const addCharacterToSequence = async (personnageId: number) => {
  if (!personnageStore.currentSequenceId) return;
  
  const success = await personnageStore.addPersonnageToSequence(
    personnageId, 
    personnageStore.currentSequenceId
  );
  
  if (success) {
    // Recharger le projet pour mettre à jour l'affichage
    if (projectStore.project?.slug) {
      await projectStore.fetchProject(projectStore.project.slug);
    }
    
    // Retirer ce personnage de la liste des détectés
    personnageStore.detectedCharacters = personnageStore.detectedCharacters.filter(
      d => d.personnage?.id !== personnageId
    );
    
    // Fermer la modal si plus de personnages à ajouter
    if (personnageStore.detectedCharacters.length === 0) {
      personnageStore.closeDetectionModal();
    }
  }
};

const addAllCharacters = async () => {
  for (const detected of filteredDetectedCharacters.value) {
    if (detected.personnage && personnageStore.currentSequenceId) {
      await personnageStore.addPersonnageToSequence(
        detected.personnage.id, 
        personnageStore.currentSequenceId
      );
    }
  }
  
  // Recharger le projet
  if (projectStore.project?.slug) {
    await projectStore.fetchProject(projectStore.project.slug);
  }
  
  personnageStore.closeDetectionModal();
};
</script>