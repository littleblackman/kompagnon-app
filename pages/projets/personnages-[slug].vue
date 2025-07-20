<script setup lang="ts">
import { useRoute } from 'vue-router';
import { useAuthStore } from '~/store/auth';
import { useProjectStore } from '~/store/project';
import { usePersonnageStore } from '~/store/personnage';
import { onMounted, computed, ref } from "vue";
import PersonnageModal from "@/components/Project/PersonnageModal.vue";
import ProjectSubMenu from "@/components/Project/SubMenu.vue";
import { PencilIcon, TrashIcon, UserPlusIcon, UserIcon } from '@heroicons/vue/24/solid';

const auth = useAuthStore();
auth.requireAuth();

const projectStore = useProjectStore();
const personnageStore = usePersonnageStore();
const route = useRoute();
const slug = route.params.slug as string;

// Charger le projet au montage
onMounted(() => projectStore.fetchProject(slug));
const project = computed(() => projectStore.project);

// Modal state
const personnageModalOpen = ref(false);
const selectedPersonnage = ref(null);

// Ouvrir modal pour créer/éditer personnage
const openPersonnageModal = (personnage = null) => {
  selectedPersonnage.value = personnage || {
    firstName: '',
    lastName: '',
    background: '',
    age: null,
    level: null,
    analysis: ''
  };
  personnageModalOpen.value = true;
};

// Sauvegarder personnage
const handleSavePersonnage = async (personnageData) => {
  if (!project.value) return;

  const savedPersonnage = await personnageStore.savePersonnage(personnageData, project.value.id);
  if (savedPersonnage) {
    // Recharger le projet pour avoir les données à jour
    await projectStore.fetchProject(slug);
    personnageModalOpen.value = false;
  }
};

// Supprimer personnage
const deletePersonnage = async (personnageId) => {
  if (confirm('Êtes-vous sûr de vouloir supprimer ce personnage ? Cette action est irréversible.')) {
    const success = await personnageStore.deletePersonnage(personnageId);
    if (success) {
      // Recharger le projet pour avoir les données à jour
      await projectStore.fetchProject(slug);
    }
  }
};

// Fonction pour obtenir le nom complet
const getPersonnageName = (personnage) => {
  return personnageStore.getPersonnageName(personnage);
};

// Fonction pour obtenir l'avatar du personnage
const getPersonnageAvatar = (personnage) => {
  if (!personnage || !personnage.images) return null;
  
  // Si les images sont une chaîne JSON, la parser
  let images = personnage.images;
  if (typeof images === 'string') {
    try {
      images = JSON.parse(images);
    } catch {
      return null;
    }
  }
  
  // Si c'est un tableau et qu'il a des éléments, prendre le premier
  if (Array.isArray(images) && images.length > 0) {
    const config = useRuntimeConfig();
    const baseUrl = config.public.apiBase.replace('/api', '');
    return `${baseUrl}/${images[0]}`;
  }
  
  return null;
};

// Personnages triés par niveau (1 = le plus élevé) puis alphabétique
const sortedPersonnages = computed(() => {
  return [...personnageStore.personnages].sort((a, b) => {
    // Tri par niveau d'abord (niveau 1 = le plus important)
    const levelA = a.level || 999; // Si pas de niveau, mettre à la fin
    const levelB = b.level || 999;
    
    if (levelA !== levelB) {
      return levelA - levelB; // Niveau 1 avant niveau 2, etc.
    }
    
    // Si même niveau, tri alphabétique par prénom
    const nameA = a.firstName?.toLowerCase() || '';
    const nameB = b.firstName?.toLowerCase() || '';
    return nameA.localeCompare(nameB);
  });
});
</script>

<template>
  <div v-if="!project">Chargement...</div>
  <div v-else>
    <ProjectSubMenu :project-slug="slug" />
    <div class="container mx-auto p-6">
    <!-- Header -->
    <div class="mb-8">
      <div class="mb-4">
        <h1 class="text-3xl font-bold text-gray-900">Personnages - {{ project.name }}</h1>
      </div>
      
      <div class="flex justify-between items-center">
        <p class="text-gray-600">Gérez les personnages de votre projet</p>
        <button
          @click="openPersonnageModal()"
          class="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <UserPlusIcon class="w-4 h-4" />
          Nouveau personnage
        </button>
      </div>
    </div>

    <!-- Liste des personnages -->
    <div v-if="personnageStore.personnages.length === 0" class="text-center py-12">
      <UserPlusIcon class="w-16 h-16 text-gray-300 mx-auto mb-4" />
      <h3 class="text-lg font-medium text-gray-900 mb-2">Aucun personnage</h3>
      <p class="text-gray-500 mb-4">Commencez par créer votre premier personnage</p>
      <button
        @click="openPersonnageModal()"
        class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors"
      >
        Créer un personnage
      </button>
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div
        v-for="personnage in sortedPersonnages"
        :key="personnage.id"
        class="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow"
      >
        <!-- En-tête carte personnage -->
        <div class="flex justify-between items-start mb-4">
          <div class="flex items-center gap-3">
            <!-- Avatar rond -->
            <div class="w-12 h-12 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
              <img 
                v-if="getPersonnageAvatar(personnage)"
                :src="getPersonnageAvatar(personnage)" 
                :alt="getPersonnageName(personnage)"
                class="w-full h-full object-cover"
              />
              <div v-else class="w-full h-full flex items-center justify-center text-gray-400">
                <UserIcon class="w-6 h-6" />
              </div>
            </div>
            
            <!-- Nom et âge -->
            <div>
              <h3 class="text-xl font-semibold text-gray-900">
                {{ getPersonnageName(personnage) }}
              </h3>
              <p v-if="personnage.age" class="text-sm text-gray-500">{{ personnage.age }} ans</p>
            </div>
          </div>
          <div class="flex gap-2">
            <button
              @click="openPersonnageModal(personnage)"
              class="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Modifier"
            >
              <PencilIcon class="w-4 h-4" />
            </button>
            <button
              @click="deletePersonnage(personnage.id)"
              class="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Supprimer"
            >
              <TrashIcon class="w-4 h-4" />
            </button>
          </div>
        </div>

        <!-- Informations personnage -->
        <div class="space-y-3">
          <div v-if="personnage.level" class="flex items-center gap-2">
            <span class="text-sm font-medium text-gray-700">Niveau :</span>
            <div class="flex">
              <span
                v-for="i in 5"
                :key="i"
                :class="[
                  'w-3 h-3 rounded-full mr-1',
                  i <= (6 - personnage.level) ? 'bg-yellow-400' : 'bg-gray-200'
                ]"
              ></span>
            </div>
            <span class="text-xs text-gray-500">({{ personnage.level }})</span>
          </div>
          
          <div v-if="personnage.background" class="text-sm text-gray-600">
            <span class="font-medium">Background :</span>
            <div v-html="personnage.background.substring(0, 100) + (personnage.background.length > 100 ? '...' : '')" class="mt-1"></div>
          </div>
          
          <div v-if="personnage.analysis" class="text-sm text-gray-600">
            <span class="font-medium">Analyse :</span>
            <div v-html="personnage.analysis.substring(0, 100) + (personnage.analysis.length > 100 ? '...' : '')" class="mt-1"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Personnage -->
    <PersonnageModal
      v-if="personnageModalOpen"
      :personnage="selectedPersonnage || undefined"
      @close="personnageModalOpen = false"
      @save="handleSavePersonnage"
    />
    </div>
  </div>
</template>

<style scoped>
/* Styles spécifiques si nécessaire */
</style>