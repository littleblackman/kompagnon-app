<script lang="ts" setup>
import { ref, computed, watch } from 'vue';
import RichTextEditor from "@/components/RichTextEditor.vue";
import { useProjectStore } from "~/store/project";
import { PropType } from 'vue';

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
  scene: {
    type: Object as PropType<Scene>,
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

const emit = defineEmits(['close', 'save', 'delete']);

const currentScene = ref<Scene | null>(null);
const selectedSequenceId = ref<number | null>(null);
const afterSceneId = ref<number | null>(null);
const showDeleteConfirm = ref(false);

// Initialiser sceneData en premier
const sceneData = ref({
  id: props.scene?.id,
  name: props.scene?.name || '',
  description: props.scene?.description || '',
  content: props.scene?.content || '',
  position: props.scene?.position || 0
});

// Liste des séquences disponibles
const availableSequences = computed(() => projectStore.sequences);

// Liste des scènes disponibles pour la séquence sélectionnée
const availableScenes = computed(() => {
  if (!selectedSequenceId.value) return [];
  return projectStore.scenes.filter(s => s.sequence_id === selectedSequenceId.value);
});

// Initialiser currentScene quand la prop scene change
watch(() => props.scene, (newScene) => {
  if (newScene) {
    currentScene.value = { ...newScene };
    selectedSequenceId.value = newScene.sequence_id;
    
    // Mettre à jour sceneData
    sceneData.value = {
      id: newScene.id,
      name: newScene.name,
      description: newScene.description,
      content: newScene.content,
      position: newScene.position
    };
    
    // Trouver la scène précédente pour l'emplacement
    const index = availableScenes.value.findIndex(scene => scene.id === newScene.id);
    if (index > 0) {
      afterSceneId.value = availableScenes.value[index - 1].id;
    } else {
      afterSceneId.value = null;
    }
  } else {
    currentScene.value = { 
      id: undefined,
      name: '', 
      description: '', 
      content: '', 
      status: [], 
      sequenceId: props.sequenceId || 0,
      position: 0
    };
    selectedSequenceId.value = props.sequenceId || null;
    afterSceneId.value = null;
    
    // Réinitialiser sceneData
    sceneData.value = {
      id: undefined,
      name: '',
      description: '',
      content: '',
      position: 0
    };
  }
}, { immediate: true });

// Synchroniser sceneData avec currentScene
watch(() => currentScene.value, (newScene) => {
  if (newScene) {
    sceneData.value = {
      id: newScene.id,
      name: newScene.name,
      description: newScene.description,
      content: newScene.content,
      position: newScene.position
    };
  }
}, { deep: true });

// Réinitialiser afterSceneId quand la séquence change
watch(selectedSequenceId, () => {
  afterSceneId.value = null;
});

const handleSave = async () => {
  try {
    const savedScene = await projectStore.saveScene(sceneData.value, props.sequenceId);
    if (savedScene) {
      emit('save', savedScene);
      emit('close');
    }
  } catch (error) {
    console.error('Erreur lors de la sauvegarde de la scène:', error);
  }
};

const handleDelete = async () => {
  if (!sceneData.value.id) return;
  
  try {
    await projectStore.deleteScene(sceneData.value.id);
    emit('close');
  } catch (error) {
    console.error('Erreur lors de la suppression de la scène:', error);
  }
};

const closeModal = () => {
  emit('close');
};
</script>

<template>
  <div>
  <div v-if="currentScene" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white rounded-lg w-[90%] max-w-7xl h-[95vh] flex flex-col">
      <!-- Header -->
      <div class="p-6 border-b border-gray-200 flex justify-between items-center flex-shrink-0">
        <div class="flex-1">
          <input 
            v-model="currentScene.name" 
            type="text" 
            class="text-2xl font-bold text-blue-600 w-full bg-transparent border-b border-transparent hover:border-blue-600 focus:border-blue-600 focus:outline-none"
          >
        </div>
        <div class="flex space-x-4">
          <button @click="handleSave" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            Enregistrer
          </button>
          <button @click="closeModal" class="text-gray-500 hover:text-gray-700">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Content -->
      <div class="p-6 flex-1 overflow-y-auto flex flex-col">
        <div class="mb-6 flex-shrink-0">
          <label class="block text-sm font-medium text-gray-700 mb-2">Description</label>
          <input 
            v-model="currentScene.description" 
            type="text" 
            class="w-full border rounded p-2"
          >
        </div>
        <div class="flex-1 min-h-0">
          <label class="block text-sm font-medium text-gray-700 mb-2">Contenu</label>
          <div class="h-full">
            <RichTextEditor 
              v-model="currentScene.content" 
              class="h-full"
              content-type="printable"
              :editor-height="'100%'"
            />
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Modal de confirmation de suppression -->
  <div v-if="showDeleteConfirm" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
    <div class="bg-white rounded-lg p-6 max-w-sm w-full mx-4 shadow-xl">
      <h3 class="text-lg font-bold mb-4">Confirmation de suppression</h3>
      <p class="text-gray-600 mb-6">Êtes-vous sûr de vouloir supprimer cette scène ?</p>
      <div class="flex justify-end space-x-4">
        <button @click="handleDelete" 
                class="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors">
          Supprimer
        </button>
      </div>
    </div>
  </div>
</div>
</template>

<style scoped>
:deep(.tox-tinymce) {
  height: 100% !important;
}
:deep(.tox-editor-container) {
  height: 100% !important;
}
:deep(.tox-edit-area__iframe) {
  height: 100% !important;
}
</style> 