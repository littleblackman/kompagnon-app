<script setup lang="ts">
import { useRoute } from 'vue-router';
import { useAuthStore } from '~/store/auth';
import { useProjectStore } from '~/store/project';
import { onMounted, computed, ref } from "vue";
import PartList from "@/components/Project/PartList.vue";
import ProjectSubMenu from "@/components/Project/SubMenu.vue";
import { EyeIcon, Bars3Icon, XMarkIcon, UserGroupIcon } from '@heroicons/vue/24/solid';

const auth = useAuthStore();
auth.requireAuth();

const projectStore = useProjectStore();
const route = useRoute();
const slug = route.params.slug as string;

// ✅ Charger le projet une seule fois au montage
onMounted(() => projectStore.fetchProject(slug));
const project = computed(() => projectStore.project);
const parts = computed(() => projectStore.parts);

// État du menu table des matières
const showTableOfContents = ref(false);

// Fonction pour faire défiler vers un élément
const scrollToElement = (elementId: string) => {
  const element = document.getElementById(elementId);
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    showTableOfContents.value = false;
  }
};

</script>

<template>
  <div v-if="!project">Chargement...</div>
  <div v-else>
    <ProjectSubMenu :project-slug="slug" />
    <div class="relative">
    <!-- Bouton burger fixe -->
    <button
      @click="showTableOfContents = !showTableOfContents"
      class="fixed left-4 top-1/2 transform -translate-y-1/2 z-50 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg transition-all duration-300 hover:scale-110"
      title="Table des matières"
    >
      <Bars3Icon v-if="!showTableOfContents" class="w-5 h-5" />
      <XMarkIcon v-else class="w-5 h-5" />
    </button>

    <!-- Menu slide-out table des matières -->
    <div 
      :class="[
        'fixed left-0 top-0 h-full w-80 bg-white shadow-xl transform transition-transform duration-300 ease-in-out z-40',
        showTableOfContents ? 'translate-x-0' : '-translate-x-full'
      ]"
    >
      <div class="p-6 border-b border-gray-200">
        <h3 class="text-lg font-bold text-gray-800 flex items-center gap-2">
          📋 Plan du projet
        </h3>
      </div>
      
      <div class="p-6 overflow-y-auto h-full pb-20">
        <!-- Titre du projet -->
        <div class="mb-4">
          <button
            @click="scrollToElement('project-title')"
            class="w-full text-left p-2 rounded hover:bg-blue-50 text-blue-700 font-bold text-lg"
          >
            {{ project.name }}
          </button>
        </div>

        <!-- Parties, Séquences et Scènes -->
        <div v-for="part in parts" :key="part.id" class="mb-4">
          <!-- Partie (H2) -->
          <button
            @click="scrollToElement(`part-${part.id}`)"
            class="w-full text-left p-2 rounded hover:bg-blue-50 text-blue-600 font-semibold flex items-center gap-2"
          >
            📖 {{ part.name }}
          </button>

          <!-- Séquences (H3) -->
          <div v-if="part.sequences" class="ml-4 mt-2">
            <div v-for="sequence in part.sequences" :key="sequence.id" class="mb-2">
              <button
                @click="scrollToElement(`sequence-${sequence.id}`)"
                class="w-full text-left p-2 rounded hover:bg-amber-50 text-amber-700 font-medium flex items-center gap-2"
              >
                🎯 {{ sequence.name }}
              </button>

              <!-- Scènes (H4) -->
              <div v-if="sequence.scenes" class="ml-4 mt-1">
                <button
                  v-for="scene in sequence.scenes"
                  :key="scene.id"
                  @click="scrollToElement(`scene-${scene.id}`)"
                  class="w-full text-left p-1 px-2 rounded hover:bg-gray-50 text-gray-600 text-sm flex items-center gap-2"
                >
                  🎪 {{ scene.name }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>


    <!-- Contenu principal -->
    <div class="flex flex-col items-center p-6">
      <div class="w-full max-w-4xl mb-6">
        <div class="flex items-center gap-3 mb-2">
          <h1 id="project-title" class="font-extrabold text-3xl">{{ project.name }}</h1>
        </div>
        <p v-if="project.description" v-html="project.description" class="italic text-justify"></p>
      </div>
      <PartList :parts="parts" :projectId="project.id"/>
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
</style>
