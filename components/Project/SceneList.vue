<script setup lang="ts">
import { ref, nextTick } from 'vue';
import SceneModal from '~/components/Project/SceneModal.vue';
import PersonnageDetectionModal from '~/components/Project/PersonnageDetectionModal.vue';
import InsertDivider from '~/components/Project/InsertDivider.vue';
import { useProjectStore } from "~/store/project";
import { PropType } from 'vue';
import { TrashIcon, PlusIcon, ArrowUpIcon, ArrowDownIcon, DocumentDuplicateIcon, PencilIcon } from '@heroicons/vue/24/outline';
import { useConfirm } from '~/composables/useConfirm';

const projectStore = useProjectStore();
const { confirm } = useConfirm();

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
const focusParagraph = ref<number | null>(null);

const openSceneModal = (scene = null) => {
  if (!scene) {
    // Nouvelle scène
    // Pas de position ici : le serveur la calcule à partir d'afterSceneId
    currentScene.value = {
      id: undefined,
      name: '',
      description: '',
      content: '',
      status: [],
      sequenceId: props.sequenceId
    };
    // On place la nouvelle après la dernière — sortedScenes, pas props.scenes,
    // dont l'ordre du tableau ne suit pas forcément les positions
    const ordered = sortedScenes.value;
    afterSceneId.value = ordered.length > 0 ? ordered[ordered.length - 1].id : null;
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
  focusParagraph.value = null;
  sceneModalOpen.value = true;
};

/**
 * Ouvre l'éditeur directement sur le paragraphe cliqué, plutôt que de
 * laisser chercher le passage dans toute la scène.
 */
const editFromParagraph = (event: MouseEvent, scene) => {
  const container = event.currentTarget as HTMLElement;
  const paragraph = (event.target as HTMLElement).closest('p');

  currentScene.value = { ...scene };
  const index = sortedScenes.value.findIndex(s => s.id === scene.id);
  afterSceneId.value = index > 0 ? sortedScenes.value[index - 1].id : null;

  if (paragraph && container.contains(paragraph)) {
    const position = Array.from(container.querySelectorAll('p')).indexOf(paragraph);
    focusParagraph.value = position >= 0 ? position : null;
  } else {
    focusParagraph.value = null;
  }

  sceneModalOpen.value = true;
};

// SceneModal a déjà sauvegardé : on ne fait que refermer.
const handleSaveScene = () => {
  sceneModalOpen.value = false;
};

// Insérer une nouvelle scène juste après celle-ci
const insertSceneAfter = (sceneId: number | null) => {
  currentScene.value = {
    id: undefined,
    name: '',
    description: '',
    content: '',
    status: [],
    sequenceId: props.sequenceId
  };
  afterSceneId.value = sceneId;
  focusParagraph.value = null;
  sceneModalOpen.value = true;
};

const handleDeleteScene = async (scene) => {
  const ok = await confirm({
    title: 'Supprimer cette scène ?',
    message: `« ${scene.name || 'Sans titre'} » et son contenu seront définitivement perdus.`,
    danger: true,
    confirmLabel: 'Supprimer'
  });
  if (!ok) return;

  try {
    await projectStore.deleteScene(scene.id);
  } catch (error) {
    console.error("Erreur lors de la suppression :", error);
  }
};

const handleMoveScene = async (scene, direction) => {
  try {
    await projectStore.moveScene(scene.id, direction);
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
  
  try {
    // Placer la copie juste après la scène originale
    await projectStore.saveScene(duplicatedScene, props.sequenceId, scene.id);
  } catch (error) {
    console.error("Erreur lors de la duplication :", error);
  }
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
    <PersonnageDetectionModal />

    <SceneModal
      v-if="sceneModalOpen"
      :scene="currentScene"
      :projectId="projectId"
      :sequenceId="sequenceId"
      :availableScenes="sortedScenes"
      :insert-after-id="afterSceneId"
      :focus-paragraph="focusParagraph"
      @close="sceneModalOpen = false"
      @save="handleSaveScene"
      @delete="handleDeleteScene"
      @navigate="handleNavigateToScene"
    />

    <div v-if="sortedScenes && sortedScenes.length > 0">
      <template v-for="(scene, index) in sortedScenes" :key="scene.id">
      <div class="ml-1 sm:ml-4 mb-3 p-2 sm:p-4 border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
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
        <div
          class="mt-2 prose prose-sm max-w-none scene-content printable-content editable-content p-4"
          v-html="scene.content"
          @click="editFromParagraph($event, scene)"
        ></div>
      </div>

      <!-- Insertion contextuelle, y compris après la dernière scène -->
      <InsertDivider
        label="Scène"
        dense
        class="ml-1 sm:ml-4"
        @insert="insertSceneAfter(scene.id)"
      />
      </template>
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
/* Le texte de lecture est éditable au clic : sans repère, personne ne le devine */
.editable-content {
  cursor: text;
}

.editable-content p {
  border-radius: 0.25rem;
  transition: background-color 150ms ease, box-shadow 150ms ease;
}

.editable-content p:hover {
  background-color: rgba(251, 191, 36, 0.10);
  box-shadow: -0.5rem 0 0 rgba(251, 191, 36, 0.10), 0.5rem 0 0 rgba(251, 191, 36, 0.10);
  cursor: pointer;
}

@media print {
  .editable-content p:hover {
    background-color: transparent;
    box-shadow: none;
  }
}

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