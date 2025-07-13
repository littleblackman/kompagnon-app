<script setup lang="ts">
import { ref } from 'vue';
import SceneModal from '~/components/Project/SceneModal.vue';
import { useProjectStore } from "~/store/project";
import { PropType } from 'vue';
import { TrashIcon, PlusIcon } from '@heroicons/vue/24/outline';

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
      @close="sceneModalOpen = false"
      @save="handleSaveScene"
      @delete="handleDeleteScene"
    />

    <div class="mb-4">
      <button 
        @click="openSceneModal()" 
        class="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        <PlusIcon class="h-4 w-4 mr-1" />
        Ajouter une scène
      </button>
    </div>

    <div v-if="scenes && scenes.length > 0">
      <div v-for="scene in scenes" :key="scene.id" class="ml-4 mb-4 p-4 border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
        <div class="flex justify-between">
          <h3 class="font-bold text-blue-600 hover:text-blue-800 cursor-pointer" @click="openSceneModal(scene)">
            {{ scene.name }}
          </h3>
          <div class="flex">
            <button class="text-red-500 hover:text-red-700" @click="handleDeleteScene(scene)">
              <TrashIcon class="h-5 w-5" />
            </button>
          </div>
        </div>
        <div class="mt-2 prose prose-sm max-w-none scene-content" v-html="scene.content"></div>
      </div>
    </div>
    <div v-else class="ml-4 p-4 text-gray-500 italic">
      Aucune scène dans cette séquence
    </div>
  </div>
</template>

<style>
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