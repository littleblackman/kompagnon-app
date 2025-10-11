<script setup lang="ts">
import { ref, nextTick } from 'vue';
import SceneModal from '~/components/Project/SceneModal.vue';
import { useProjectStore } from "~/store/project";
import { PropType } from 'vue';
import { TrashIcon, PlusIcon, ArrowUpIcon, ArrowDownIcon, DocumentDuplicateIcon, PencilIcon } from '@heroicons/vue/24/outline';

const projectStore = useProjectStore();

interface Scene {
  id: number;
  name: string;
  position: number;
  description: string;
  content: string;
  status: any[];
  sequenceId: number;
}

const props = defineProps({
  scenes: {
    type: Array as PropType<Scene[]>,
    required: true
  },
  projectId: {
    type: Number,
    required: true
  },
  sequenceId: {
    type: Number,
    required: true
  }
});

// Trier les scènes par position
const sortedScenes = computed(() => {
  if (!props.scenes) return [];
  return [...props.scenes].sort((a, b) => a.position - b.position);
});

const sceneModalOpen = ref(false);
const currentScene = ref<Scene | null>(null);
const afterSceneId = ref<number | null>(null);

const openSceneModal = (scene = null) => {
  if (!scene) {
    // Nouvelle scène
    currentScene.value = {
      id: undefined,
      name: '',
      description: '',
      content: '',
      status: [],
      sequenceId: props.sequenceId,
      position: props.scenes.length
    };
    // Si des scènes existent, on place la nouvelle après la dernière
    if (props.scenes.length > 0) {
      afterSceneId.value = props.scenes[props.scenes.length - 1].id;
    } else {
      afterSceneId.value = null;
    }
  } else {
    // Édition d'une scène existante
    currentScene.value = { ...scene };
    const index = props.scenes.findIndex(s => s.id === scene.id);
    if (index > 0) {
      afterSceneId.value = props.scenes[index - 1].id;
    } else {
      afterSceneId.value = null;
    }
  }
  sceneModalOpen.value = true;
};

const handleSaveScene = async (scene) => {
  try {
    await projectStore.saveScene(scene, props.sequenceId, afterSceneId.value);
    sceneModalOpen.value = false;
  } catch (error) {
    console.error("Erreur lors de la sauvegarde :", error);
  }
};

const handleDeleteScene = async (scene) => {
  try {
    await projectStore.deleteScene(scene.id);
  } catch (error) {
    console.error("Erreur lors de la suppression :", error);
  }
};

const handleMoveScene = async (scene, direction) => {
  const currentIndex = sortedScenes.value.findIndex(s => s.id === scene.id);
  
  try {
    if (direction === 'up' && currentIndex > 0) {
      // NOUVELLE LOGIQUE : Échanger les positions côté frontend
      const scenesCopy = [...sortedScenes.value];
      
      // Échanger avec la scène précédente
      [scenesCopy[currentIndex], scenesCopy[currentIndex - 1]] = 
      [scenesCopy[currentIndex - 1], scenesCopy[currentIndex]];
      
      // Recalculer les positions
      scenesCopy.forEach((s, index) => {
        s.position = index + 1;
      });
      
      // Sauvegarder le nouvel ordre
      await projectStore.saveSceneOrder(scenesCopy);
      
    } else if (direction === 'down' && currentIndex < sortedScenes.value.length - 1) {
      // NOUVELLE LOGIQUE : Échanger les positions côté frontend
      const scenesCopy = [...sortedScenes.value];
      
      // Échanger avec la scène suivante
      [scenesCopy[currentIndex], scenesCopy[currentIndex + 1]] = 
      [scenesCopy[currentIndex + 1], scenesCopy[currentIndex]];
      
      // Recalculer les positions
      scenesCopy.forEach((s, index) => {
        s.position = index + 1;
      });
      
      // Sauvegarder le nouvel ordre
      await projectStore.saveSceneOrder(scenesCopy);
    }
    
    // Recharger le projet pour voir les changements
    if (projectStore.project?.slug) {
      await projectStore.fetchProject(projectStore.project.slug);
    }
  } catch (error) {
    console.error('Erreur lors du déplacement de la scène:', error);
  }
};

const handleDuplicateScene = async (scene) => {
  const duplicatedScene = {
    name: scene.name + ' (copie)',
    description: scene.description,
    content: scene.content,
    status: scene.status,
    sequenceId: props.sequenceId,
  };
  
  // Placer la copie juste après la scène originale
  await projectStore.saveScene(duplicatedScene, props.sequenceId, scene.id);
};

// Navigation vers une autre scène
const handleNavigateToScene = (scene: any) => {
  // Simplement fermer et rouvrir avec la nouvelle scène
  sceneModalOpen.value = false;
  
  nextTick(() => {
    currentScene.value = { ...scene };
    sceneModalOpen.value = true;
  });
};

// Directive pour le HTML brut
const vHtml = {
  mounted: (el: HTMLElement, binding: any) => {
    el.innerHTML = binding.value;
  },
  updated: (el: HTMLElement, binding: any) => {
    el.innerHTML = binding.value;
  }
};
</script>

<template>
  <div>
    <SceneModal
      v-if="sceneModalOpen"
      :scene="currentScene"
      :projectId="projectId"
      :sequenceId="sequenceId"
      :availableScenes="sortedScenes"
      @close="sceneModalOpen = false"
      @save="handleSaveScene"
      @delete="handleDeleteScene"
      @navigate="handleNavigateToScene"
    />

    <div v-if="sortedScenes && sortedScenes.length > 0">
      <div v-for="(scene, index) in sortedScenes" :key="scene.id" class="ml-4 mb-4 p-4 border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
        <div class="flex justify-between">
          <h3 :id="`scene-${scene.id}`" class="font-bold text-blue-600 hover:text-blue-800 cursor-pointer" @click="openSceneModal(scene)">
            {{ scene.name }}
          </h3>
          <div class="flex space-x-1">
            <!-- Bouton Éditer -->
            <button 
              class="p-1 rounded text-gray-600 hover:text-gray-800 hover:bg-gray-50"
              @click="openSceneModal(scene)"
              title="Éditer la scène"
            >
              <PencilIcon class="h-4 w-4" />
            </button>
            
            <!-- Bouton Monter -->
            <button 
              :disabled="index === 0"
              :class="['p-1 rounded', index === 0 ? 'text-gray-300 cursor-not-allowed' : 'text-blue-500 hover:text-blue-700 hover:bg-blue-50']"
              @click="handleMoveScene(scene, 'up')"
              title="Déplacer vers le haut"
            >
              <ArrowUpIcon class="h-4 w-4" />
            </button>
            
            <!-- Bouton Descendre -->
            <button 
              :disabled="index === sortedScenes.length - 1"
              :class="['p-1 rounded', index === sortedScenes.length - 1 ? 'text-gray-300 cursor-not-allowed' : 'text-blue-500 hover:text-blue-700 hover:bg-blue-50']"
              @click="handleMoveScene(scene, 'down')"
              title="Déplacer vers le bas"
            >
              <ArrowDownIcon class="h-4 w-4" />
            </button>
            
            <!-- Bouton Dupliquer -->
            <button 
              class="p-1 rounded text-green-500 hover:text-green-700 hover:bg-green-50"
              @click="handleDuplicateScene(scene)"
              title="Dupliquer la scène"
            >
              <DocumentDuplicateIcon class="h-4 w-4" />
            </button>
            
            <!-- Bouton Supprimer -->
            <button 
              class="p-1 rounded text-red-500 hover:text-red-700 hover:bg-red-50" 
              @click="handleDeleteScene(scene)"
              title="Supprimer la scène"
            >
              <TrashIcon class="h-4 w-4" />
            </button>
          </div>
        </div>
        <div class="mt-2 prose prose-sm max-w-none scene-content printable-content p-4" v-html="scene.content"></div>
      </div>
      
      <!-- Bouton Ajouter après toutes les scènes -->
      <div class="ml-4 mb-4">
        <button 
          @click="openSceneModal()" 
          class="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <PlusIcon class="h-4 w-4 mr-1" />
          Ajouter une scène
        </button>
      </div>
    </div>
    <div v-else class="ml-4">
      <p class="p-4 text-gray-500 italic">Aucune scène dans cette séquence</p>
      <button 
        @click="openSceneModal()" 
        class="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        <PlusIcon class="h-4 w-4 mr-1" />
        Ajouter une scène
      </button>
    </div>
  </div>
</template>

<style>
/* Contenu organisationnel (Parts et Sequences) */
.organizational-text {
  color: #9CA3AF !important; /* gray-400 */
  font-style: italic;
}

.organizational-text * {
  color: #9CA3AF !important;
}

/* Contenu imprimable (Scenes) */
.printable-content {
  color: #111827 !important; /* gray-900 */
  background-color: #FFFBEB; /* amber-50 - fond léger */
  padding-left: 1.2rem;
}

.printable-content * {
  color: #111827 !important;
}

.scene-content {
  font-size: 0.875rem;
  line-height: 1.5;
}

.scene-content h1,
.scene-content h2,
.scene-content h3,
.scene-content h4,
.scene-content h5,
.scene-content h6 {
  color: #1a202c;
  font-weight: 600;
  margin-top: 1.5em;
  margin-bottom: 0.5em;
}

.scene-content h1 {
  font-size: 1.5em;
}

.scene-content h2 {
  font-size: 1.25em;
}

.scene-content h3 {
  font-size: 1.125em;
}

.scene-content p {
  margin-top: 1em;
  margin-bottom: 1em;
}

.scene-content [dir="ltr"] {
  direction: ltr;
  text-align: left;
}
</style> 