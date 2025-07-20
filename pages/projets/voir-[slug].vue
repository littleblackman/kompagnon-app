<script setup lang="ts">
import { useRoute } from 'vue-router';
import { useAuthStore } from '~/store/auth';
import { useProjectStore } from '~/store/project';
import { onMounted, computed, ref, watch } from "vue";
import { PencilIcon } from '@heroicons/vue/24/solid';
import ProjectSubMenu from "@/components/Project/SubMenu.vue";

const auth = useAuthStore();
auth.requireAuth();

const projectStore = useProjectStore();
const route = useRoute();
const slug = route.params.slug as string;

// Clé pour localStorage
const STORAGE_KEY = 'kompagnon-reading-preferences';

// Fonction pour charger les préférences depuis localStorage
const loadPreferences = () => {
  if (process.client) {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Erreur lors du chargement des préférences:', e);
      }
    }
  }
  // Valeurs par défaut
  return {
    showOrganizational: true,
    showPrintable: true,
    showH2: true,
    showH3: true,
    showH4: true,
    numberParts: false
  };
};

// Fonction pour sauvegarder les préférences
const savePreferences = (prefs: any) => {
  if (process.client) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  }
};

// État des filtres avec persistance
const preferences = loadPreferences();
const showOrganizational = ref(preferences.showOrganizational);
const showPrintable = ref(preferences.showPrintable);
const showH2 = ref(preferences.showH2);
const showH3 = ref(preferences.showH3);
const showH4 = ref(preferences.showH4);
const numberParts = ref(preferences.numberParts);

// Fonction pour convertir en chiffres romains
const toRoman = (num: number): string => {
  const romanNumerals = [
    { value: 1000, symbol: 'M' },
    { value: 900, symbol: 'CM' },
    { value: 500, symbol: 'D' },
    { value: 400, symbol: 'CD' },
    { value: 100, symbol: 'C' },
    { value: 90, symbol: 'XC' },
    { value: 50, symbol: 'L' },
    { value: 40, symbol: 'XL' },
    { value: 10, symbol: 'X' },
    { value: 9, symbol: 'IX' },
    { value: 5, symbol: 'V' },
    { value: 4, symbol: 'IV' },
    { value: 1, symbol: 'I' }
  ];

  let result = '';
  for (const { value, symbol } of romanNumerals) {
    while (num >= value) {
      result += symbol;
      num -= value;
    }
  }
  return result;
};

// Fonction pour faire défiler vers un élément
const scrollToElement = (elementId: string) => {
  const element = document.getElementById(elementId);
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
};

// Charger le projet
onMounted(() => projectStore.fetchProject(slug));
const project = computed(() => projectStore.project);
const parts = computed(() => projectStore.parts);

// Watcher pour sauvegarder automatiquement les préférences
watch([showOrganizational, showPrintable, showH2, showH3, showH4, numberParts], () => {
  const currentPrefs = {
    showOrganizational: showOrganizational.value,
    showPrintable: showPrintable.value,
    showH2: showH2.value,
    showH3: showH3.value,
    showH4: showH4.value,
    numberParts: numberParts.value
  };
  savePreferences(currentPrefs);
}, { deep: true });
</script>

<template>
  <div v-if="!project" class="flex justify-center items-center min-h-screen">
    <div class="text-lg">Chargement...</div>
  </div>
  
  <div v-else>
    <ProjectSubMenu :project-slug="slug" />
    <div class="flex flex-col items-center p-6">
    <!-- En-tête du projet -->
    <div class="w-full max-w-4xl mb-8">
      <div class="flex items-center gap-3 mb-4">
        <h1 class="font-extrabold text-4xl">{{ project.name }}</h1>
        <NuxtLink 
          :to="`/projets/projet-${slug}`"
          class="px-2"
          title="Mode Édition"
        >
          <PencilIcon class="w-4 h-4 link" />
        </NuxtLink>
      </div>
      <div v-if="project.description" v-html="project.description" class="italic text-gray-600 text-lg text-justify"></div>
    </div>

    <!-- Contrôles de filtre -->
    <div class="w-full max-w-4xl mb-8 p-6 bg-gradient-to-r from-blue-50 to-amber-50 rounded-xl border border-gray-200 shadow-sm">
      <h3 class="font-bold mb-4 text-gray-800 text-lg flex items-center gap-2">
        🎭 Que souhaitez-vous afficher ?
      </h3>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        <label class="flex items-center cursor-pointer p-3 rounded-lg bg-white hover:bg-gray-50 transition-colors border border-gray-100 shadow-sm">
          <input 
            type="checkbox" 
            v-model="showOrganizational" 
            class="mr-3 w-5 h-5 text-gray-500 rounded focus:ring-gray-400"
          />
          <span class="text-gray-600 font-medium flex items-center gap-2">
            📝 Notes d'organisation
          </span>
        </label>
        <label class="flex items-center cursor-pointer p-3 rounded-lg bg-white hover:bg-amber-50 transition-colors border border-gray-100 shadow-sm">
          <input 
            type="checkbox" 
            v-model="showPrintable" 
            class="mr-3 w-5 h-5 text-amber-500 rounded focus:ring-amber-400"
          />
          <span class="text-gray-800 font-medium flex items-center gap-2">
            🎬 Contenu de scènes
          </span>
        </label>
        <label class="flex items-center cursor-pointer p-3 rounded-lg bg-white hover:bg-blue-50 transition-colors border border-gray-100 shadow-sm">
          <input 
            type="checkbox" 
            v-model="showH2" 
            class="mr-3 w-5 h-5 text-blue-500 rounded focus:ring-blue-400"
          />
          <span class="text-blue-700 font-medium flex items-center gap-2">
            📖 Titres des parties
          </span>
        </label>
        <label class="flex items-center cursor-pointer p-3 rounded-lg bg-white hover:bg-amber-50 transition-colors border border-gray-100 shadow-sm">
          <input 
            type="checkbox" 
            v-model="showH3" 
            class="mr-3 w-5 h-5 text-amber-500 rounded focus:ring-amber-400"
          />
          <span class="text-amber-700 font-medium flex items-center gap-2">
            🎯 Titres des séquences
          </span>
        </label>
        <label class="flex items-center cursor-pointer p-3 rounded-lg bg-white hover:bg-gray-50 transition-colors border border-gray-100 shadow-sm">
          <input 
            type="checkbox" 
            v-model="showH4" 
            class="mr-3 w-5 h-5 text-gray-500 rounded focus:ring-gray-400"
          />
          <span class="text-gray-800 font-medium flex items-center gap-2">
            🎪 Titres des scènes
          </span>
        </label>
        <label class="flex items-center cursor-pointer p-3 rounded-lg bg-white hover:bg-purple-50 transition-colors border border-gray-100 shadow-sm">
          <input 
            type="checkbox" 
            v-model="numberParts" 
            class="mr-3 w-5 h-5 text-purple-500 rounded focus:ring-purple-400"
          />
          <span class="text-purple-700 font-medium flex items-center gap-2">
            🔢 Numéroter les parties
          </span>
        </label>
      </div>
    </div>

    <!-- Plan du projet -->
    <div class="w-full max-w-4xl mb-8 p-6 bg-blue-50 rounded-xl border border-blue-200">
      <h3 class="font-bold mb-4 text-blue-800 text-lg flex items-center gap-2">
        📋 Plan du projet
      </h3>
      <div class="space-y-3">
        <div v-for="(part, partIndex) in parts" :key="part.id" class="text-sm">
          <!-- Partie -->
          <button 
            v-if="showH2" 
            @click="scrollToElement(`part-${part.id}`)"
            class="w-full text-left font-semibold text-blue-700 flex items-center gap-2 mb-2 hover:text-blue-800 hover:bg-blue-100 p-2 rounded transition-colors cursor-pointer"
          >
            📖 <span v-if="numberParts">{{ toRoman(partIndex + 1) }}. </span>{{ part.name }}
          </button>
          
          <!-- Séquences avec leurs scènes -->
          <div v-if="part.sequences" class="ml-4 space-y-2">
            <div v-for="sequence in part.sequences" :key="sequence.id">
              <!-- Titre de la séquence -->
              <button 
                v-if="showH3" 
                @click="scrollToElement(`sequence-${sequence.id}`)"
                class="w-full text-left text-amber-700 flex items-center gap-2 font-medium hover:text-amber-800 hover:bg-amber-100 p-2 rounded transition-colors cursor-pointer"
              >
                🎯 {{ sequence.name }}
              </button>
              
              <!-- Scènes de cette séquence -->
              <div v-if="showH4 && sequence.scenes" class="ml-4 space-y-1">
                <button 
                  v-for="scene in sequence.scenes" 
                  :key="scene.id" 
                  @click="scrollToElement(`scene-${scene.id}`)"
                  class="w-full text-left text-gray-600 flex items-center gap-2 hover:text-gray-800 hover:bg-gray-100 p-1 px-2 rounded transition-colors cursor-pointer"
                >
                  🎪 {{ scene.name }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Contenu du projet -->
    <div class="w-full max-w-4xl space-y-8">
      <div 
        v-for="(part, index) in parts" 
        :key="part.id"
        class="pl-6"
      >
        <!-- Titre de la partie -->
        <h2 v-if="showH2" :id="`part-${part.id}`" class="text-2xl font-bold mb-4 text-blue-700">
          <span v-if="numberParts">{{ toRoman(index + 1) }}. </span>{{ part.name }}
        </h2>
        
        <!-- Description de la partie (organisationnel) -->
        <div 
          v-if="showOrganizational && part.description" 
          v-html="part.description" 
          class="organizational-text mb-6"
        ></div>

        <!-- Séquences -->
        <div class="space-y-6">
          <div 
            v-for="sequence in part.sequences" 
            :key="sequence.id"
            class="ml-4 pl-4"
          >
            <!-- Titre de la séquence -->
            <h3 v-if="showH3" :id="`sequence-${sequence.id}`" class="text-xl font-semibold mb-3 text-amber-700">{{ sequence.name }}</h3>
            
            <!-- Description de la séquence (organisationnel) -->
            <div 
              v-if="showOrganizational && sequence.description" 
              v-html="sequence.description" 
              class="organizational-text mb-4"
            ></div>

            <!-- Scènes -->
            <div class="space-y-4">
              <div 
                v-for="scene in sequence.scenes" 
                :key="scene.id"
                class="ml-4"
              >
                <!-- Titre de la scène -->
                <h4 v-if="showH4" :id="`scene-${scene.id}`" class="text-lg font-bold mb-2 text-gray-800">{{ scene.name }}</h4>
                
                <!-- Contenu de la scène (printable) -->
                <div 
                  v-if="showPrintable && scene.content" 
                  v-html="scene.content" 
                  class="scene-content prose prose-sm max-w-none text-justify"
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Message si aucun contenu -->
    <div 
      v-if="!parts || parts.length === 0"
      class="text-center text-gray-500 py-12"
    >
      <p>Aucun contenu disponible pour ce projet</p>
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