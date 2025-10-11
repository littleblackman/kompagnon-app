<script lang="ts" setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import RichTextEditor from "@/components/RichTextEditor.vue";
import PersonnageDetectionModal from "@/components/Project/PersonnageDetectionModal.vue";
import { useProjectStore } from "~/store/project";
import { usePersonnageStore } from "~/store/personnage";
import { PropType } from 'vue';

const projectStore = useProjectStore();
const personnageStore = usePersonnageStore();

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
  },
  availableScenes: {
    type: Array as PropType<Scene[]>,
    required: true
  }
});

const emit = defineEmits(['close', 'save', 'delete', 'navigate']);

const currentScene = ref<Scene | null>(null);
const selectedSequenceId = ref<number | null>(null);
const afterSceneId = ref<number | null>(null);
const showDeleteConfirm = ref(false);
const saveStatus = ref<'saved' | 'saving' | 'error' | 'unsaved'>('saved');
let autoSaveInterval: NodeJS.Timeout | null = null;

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

// Index de la scène actuelle dans la liste des scènes
const currentSceneIndex = computed(() => {
  if (!currentScene.value?.id) return -1;
  const index = props.availableScenes.findIndex(scene => scene.id === currentScene.value?.id);
  return index;
});

// Scène précédente
const previousScene = computed(() => {
  const index = currentSceneIndex.value;
  return index > 0 ? props.availableScenes[index - 1] : null;
});

// Scène suivante
const nextScene = computed(() => {
  const index = currentSceneIndex.value;
  return index >= 0 && index < props.availableScenes.length - 1 ? props.availableScenes[index + 1] : null;
});

// Initialiser currentScene quand la prop scene change
watch(() => props.scene, (newScene) => {
  if (newScene) {
    currentScene.value = { ...newScene };
    selectedSequenceId.value = newScene.sequenceId;
    
    // Mettre à jour sceneData
    sceneData.value = {
      id: newScene.id,
      name: newScene.name,
      description: newScene.description,
      content: newScene.content,
      position: newScene.position
    };
    
    // Trouver la scène précédente pour l'emplacement
    const index = props.availableScenes.findIndex(scene => scene.id === newScene.id);
    if (index > 0) {
      afterSceneId.value = props.availableScenes[index - 1].id;
    } else {
      afterSceneId.value = null;
    }
  } else {
    currentScene.value = { 
      id: 0,
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
      id: 0,
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
      
      // Détecter les personnages dans le contenu après sauvegarde
      if (currentScene.value?.content) {
        console.log('Détection personnages pour:', currentScene.value.content.substring(0, 100));
        console.log('Personnages disponibles:', personnageStore.personnages.length);
        await personnageStore.detectAndSuggestCharacters(currentScene.value.content, props.sequenceId);
      }
      
      // Ne fermer que si pas de modal de détection
      if (!personnageStore.showDetectionModal) {
        emit('close');
      }
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

// Auto-save avant navigation (CONTENU UNIQUEMENT, pas la position)
const autoSave = async () => {
  if (currentScene.value && sceneData.value.id) {
    try {
      // Synchroniser UNIQUEMENT le contenu avec la position actuelle (sans la changer)
      sceneData.value.name = currentScene.value.name;
      sceneData.value.description = currentScene.value.description;
      sceneData.value.content = currentScene.value.content;
      // position reste inchangée
      
      // Sauvegarde SANS afterSceneId pour ne PAS changer la position
      await projectStore.saveScene(sceneData.value, props.sequenceId);
      
      // Détecter les personnages après auto-save
      if (currentScene.value?.content) {
        console.log('Auto-save détection pour:', currentScene.value.content.substring(0, 100));
        await personnageStore.detectAndSuggestCharacters(currentScene.value.content, props.sequenceId);
      }
    } catch (error) {
      console.error('Erreur lors de l\'auto-save:', error);
    }
  }
};

// Navigation vers la scène précédente
const goToPreviousScene = async () => {
  if (previousScene.value) {
    await autoSave(); // Maintenant safe - ne touche plus la position
    emit('navigate', previousScene.value);
  }
};

// Navigation vers la scène suivante
const goToNextScene = async () => {
  if (nextScene.value) {
    await autoSave(); // Maintenant safe - ne touche plus la position
    emit('navigate', nextScene.value);
  }
};

// Créer une nouvelle scène après la scène actuelle
const addSceneAfter = async () => {
  await autoSave();
  
  // Position logique : après la scène actuelle
  const insertPosition = (currentScene.value?.position || 0) + 1;
  
  const newScene = {
    name: 'Nouvelle scène',
    description: '',
    content: '',
    position: insertPosition, // Position où on veut l'insérer
    sequenceId: props.sequenceId,
    status: []
  };
  
  try {
    const savedScene = await projectStore.saveScene(newScene, props.sequenceId);
    emit('navigate', savedScene);
  } catch (error) {
    console.error('Erreur lors de la création de la scène:', error);
  }
};

// Auto-save localStorage
const saveToLocalStorage = () => {
  if (currentScene.value?.id) {
    const localKey = `scene_draft_${currentScene.value.id}`;
    const draftData = {
      name: currentScene.value.name,
      description: currentScene.value.description,
      content: currentScene.value.content,
      timestamp: Date.now()
    };
    localStorage.setItem(localKey, JSON.stringify(draftData));
    console.log('💾 Sauvegarde locale effectuée');
  }
};

const loadFromLocalStorage = () => {
  if (currentScene.value?.id) {
    const localKey = `scene_draft_${currentScene.value.id}`;
    const saved = localStorage.getItem(localKey);
    if (saved) {
      try {
        const draftData = JSON.parse(saved);
        // Vérifier si le draft est plus récent (moins de 24h)
        if (Date.now() - draftData.timestamp < 24 * 60 * 60 * 1000) {
          currentScene.value.name = draftData.name;
          currentScene.value.description = draftData.description;
          currentScene.value.content = draftData.content;
          saveStatus.value = 'unsaved';
          console.log('🔄 Brouillon récupéré du localStorage');
        }
      } catch (e) {
        console.error('Erreur lors du chargement du draft:', e);
      }
    }
  }
};

const clearLocalStorage = () => {
  if (currentScene.value?.id) {
    const localKey = `scene_draft_${currentScene.value.id}`;
    localStorage.removeItem(localKey);
  }
};

// Auto-save backend avec debounce
let saveTimeout: NodeJS.Timeout | null = null;
const debouncedAutoSave = () => {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveStatus.value = 'unsaved';

  saveTimeout = setTimeout(async () => {
    if (currentScene.value?.id) {
      try {
        saveStatus.value = 'saving';
        await autoSave();
        saveStatus.value = 'saved';
        clearLocalStorage(); // Effacer le draft après sauvegarde réussie
      } catch (error) {
        saveStatus.value = 'error';
        console.error('Erreur auto-save:', error);
      }
    }
  }, 3000); // Auto-save après 3 secondes d'inactivité
};

// Watcher pour déclencher l'auto-save et la sauvegarde locale
watch(() => currentScene.value, () => {
  if (currentScene.value) {
    saveToLocalStorage(); // Sauvegarde locale immédiate
    debouncedAutoSave(); // Auto-save backend avec debounce
  }
}, { deep: true });

// Lifecycle hooks
onMounted(() => {
  loadFromLocalStorage(); // Charger le draft au montage

  // Auto-save périodique toutes les 30 secondes
  autoSaveInterval = setInterval(() => {
    if (saveStatus.value === 'unsaved' && currentScene.value?.id) {
      debouncedAutoSave();
    }
  }, 30000);

  // Sauvegarder avant de quitter la page
  const beforeUnload = (e: BeforeUnloadEvent) => {
    if (saveStatus.value === 'unsaved') {
      e.preventDefault();
      e.returnValue = 'Vous avez des modifications non sauvegardées. Voulez-vous vraiment quitter ?';
    }
  };
  window.addEventListener('beforeunload', beforeUnload);
});

onUnmounted(() => {
  if (autoSaveInterval) {
    clearInterval(autoSaveInterval);
  }
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }
});

const closeModal = () => {
  if (saveStatus.value === 'unsaved') {
    if (confirm('Vous avez des modifications non sauvegardées. Voulez-vous vraiment fermer ?')) {
      clearLocalStorage();
      emit('close');
    }
  } else {
    clearLocalStorage();
    emit('close');
  }
};
</script>

<template>
  <div>
  <!-- Modal de détection de personnages -->
  <PersonnageDetectionModal />
  
  <div v-if="currentScene" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white rounded-lg w-[90%] max-w-7xl h-[95vh] flex flex-col">
      <!-- Header -->
      <div class="p-6 border-b border-gray-200 flex justify-between items-center flex-shrink-0">
        <!-- Navigation précédente -->
        <div class="flex items-center space-x-2">
          <button 
            @click="goToPreviousScene"
            :disabled="!previousScene"
            :class="[
              'px-3 py-2 rounded-lg font-medium transition-colors flex items-center gap-2',
              previousScene 
                ? 'bg-gray-100 hover:bg-gray-200 text-gray-700' 
                : 'bg-gray-50 text-gray-400 cursor-not-allowed'
            ]"
            title="Scène précédente"
          >
            ← <span v-if="previousScene" class="hidden sm:inline">{{ previousScene.name }}</span>
          </button>
        </div>

        <!-- Titre de la scène -->
        <div class="flex-1 mx-4">
          <input 
            v-model="currentScene.name" 
            type="text" 
            class="text-2xl font-bold text-blue-600 w-full bg-transparent border-b border-transparent hover:border-blue-600 focus:border-blue-600 focus:outline-none text-center"
            placeholder="Nom de la scène"
          >
        </div>

        <!-- Navigation suivante et actions -->
        <div class="flex items-center space-x-2">
          <button 
            @click="addSceneAfter"
            class="px-3 py-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg font-medium transition-colors"
            title="Ajouter une scène après"
          >
            + Scène
          </button>
          
          <button 
            @click="goToNextScene"
            :disabled="!nextScene"
            :class="[
              'px-3 py-2 rounded-lg font-medium transition-colors flex items-center gap-2',
              nextScene 
                ? 'bg-gray-100 hover:bg-gray-200 text-gray-700' 
                : 'bg-gray-50 text-gray-400 cursor-not-allowed'
            ]"
            title="Scène suivante"
          >
            <span v-if="nextScene" class="hidden sm:inline">{{ nextScene.name }}</span> →
          </button>
          
          <!-- Indicateur de statut de sauvegarde -->
          <div class="flex items-center space-x-2">
            <span v-if="saveStatus === 'saved'" class="text-green-600 text-sm flex items-center">
              ✅ Sauvé
            </span>
            <span v-else-if="saveStatus === 'saving'" class="text-blue-600 text-sm flex items-center">
              ⏳ Sauvegarde...
            </span>
            <span v-else-if="saveStatus === 'unsaved'" class="text-orange-600 text-sm flex items-center">
              💾 Non sauvé
            </span>
            <span v-else-if="saveStatus === 'error'" class="text-red-600 text-sm flex items-center">
              ❌ Erreur
            </span>
          </div>

          <button @click="handleSave" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
            Enregistrer
          </button>
          
          <button @click="closeModal" class="text-gray-500 hover:text-gray-700 p-2">
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