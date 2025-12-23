<script setup>
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { usePersonnageStore } from '~/store/personnage';
import { useProjectStore } from '~/store/project';
import { useAuthStore } from '~/store/auth';
import RichTextEditor from '~/components/RichTextEditor.vue';
import ImageUploader from '~/components/Project/ImageUploader.vue';
import ProjectSubMenu from '~/components/Project/SubMenu.vue';
import Lightbox from '~/components/Lightbox.vue';
import { useImages } from '~/composables/useImages';

definePageMeta({
  middleware: 'auth'
});

const route = useRoute();
const router = useRouter();
const personnageStore = usePersonnageStore();
const projectStore = useProjectStore();
const authStore = useAuthStore();

const personnageSlug = route.params.slugPersonnage;
const personnage = ref(null);
const project = ref(null);
const isEditing = ref(false);
const editedPersonnage = ref({});
const lightboxImages = ref([]);
const lightboxIndex = ref(0);
const showLightbox = ref(false);
const loading = ref(true);
const error = ref(null);

// Composable pour gérer les images
const { getImageUrl, getImagesUrls } = useImages();

// Fonction pour ouvrir la lightbox
const openLightbox = (imageIndex) => {
  lightboxImages.value = getImagesUrls(personnage.value?.images);
  lightboxIndex.value = imageIndex;
  showLightbox.value = true;
};

// Fonction pour fermer la lightbox
const closeLightbox = () => {
  showLightbox.value = false;
};

// Fonction pour changer l'index de la lightbox
const updateLightboxIndex = (newIndex) => {
  lightboxIndex.value = newIndex;
};

// Fonction pour charger les détails du personnage depuis l'API
const loadPersonnageDetails = async () => {
  try {
    loading.value = true;
    error.value = null;
    
    const config = useRuntimeConfig();
    
    // Debug pour voir le slug
    console.log('Loading personnage with slug:', personnageSlug);
    
    const response = await $fetch(`${config.public.apiBase}/personnage/${personnageSlug}/details`, {
      headers: { 'X-AUTH-TOKEN': authStore.token || '' },
    });
    
    console.log('API response:', response);
    
    personnage.value = response;
    project.value = response.project;
    editedPersonnage.value = { ...response };
    
  } catch (err) {
    error.value = err;
    console.error('Erreur lors du chargement du personnage:', err);
    // Rediriger vers la liste des projets si erreur
    router.push('/projets/tous');
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  loadPersonnageDetails();
});

const toggleEdit = () => {
  isEditing.value = !isEditing.value;
  if (isEditing.value) {
    editedPersonnage.value = { ...personnage.value };
  }
};

const handleSave = async () => {
  try {
    await personnageStore.savePersonnage(editedPersonnage.value, project.value.id);
    isEditing.value = false;
    // Recharger les détails du personnage
    await loadPersonnageDetails();
  } catch (error) {
    console.error('Erreur lors de la sauvegarde:', error);
  }
};

const handleImagesUpdated = (images) => {
  editedPersonnage.value.images = images;
  // Mettre à jour l'avatar (première image)
  if (images.length > 0) {
    editedPersonnage.value.avatar = images[0];
  } else {
    editedPersonnage.value.avatar = undefined;
  }
};

// Fonction pour créer le schéma actantiel
const createActantielSchema = async () => {
  try {
    console.log('Création du schéma actantiel pour:', personnage.value);
    
    const config = useRuntimeConfig();
    
    const response = await $fetch(`${config.public.apiBase}/personnage/${personnage.value.id}/analyse/actantiel-schema`, {
      method: 'POST',
      headers: {
        'X-AUTH-TOKEN': authStore.token || '',
        'Content-Type': 'application/json'
      },
      body: {
        personnageId: personnage.value.id,
        projectId: project.value.id
      }
    });
    
    console.log('Résultat du schéma actantiel:', response);
    
    // TODO: Afficher le résultat dans l'interface
    
  } catch (error) {
    console.error('Erreur lors de la création du schéma actantiel:', error);
  }
};

const getLevelLabel = (level) => {
  const levels = {
    1: 'Personnage principal',
    2: 'Personnage secondaire', 
    3: 'Figurant',
    4: 'Mention/Référence'
  };
  return levels[level] || 'Non défini';
};

const getLevelColor = (level) => {
  const colors = {
    1: 'text-red-600 bg-red-100',
    2: 'text-orange-600 bg-orange-100',
    3: 'text-yellow-600 bg-yellow-100',
    4: 'text-gray-600 bg-gray-100'
  };
  return colors[level] || 'text-gray-600 bg-gray-100';
};

// Fonction pour obtenir l'avatar du personnage
const getPersonnageAvatar = (personnage) => {
  if (!personnage) return null;
  
  // Si l'API retourne déjà un avatar
  if (personnage.avatar) {
    return getImageUrl(personnage.avatar);
  }
  
  // Sinon on prend la première image
  const images = getImagesUrls(personnage.images);
  return images[0] || null;
};

// Fonction pour obtenir toutes les images du personnage
const getPersonnageImages = (personnage) => {
  return getImagesUrls(personnage?.images);
};
</script>

<template>
  <div>
    <ProjectSubMenu v-if="project" :project-slug="project.slug" />
    
    <!-- Loading state -->
    <div v-if="loading" class="min-h-screen bg-gray-50 flex items-center justify-center">
      <div class="text-center">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto mb-4"></div>
        <p class="text-gray-600">Chargement du personnage...</p>
      </div>
    </div>
    
    <!-- Error state -->
    <div v-else-if="error" class="min-h-screen bg-gray-50 flex items-center justify-center">
      <div class="text-center">
        <div class="text-red-500 text-4xl mb-4">⚠️</div>
        <h2 class="text-xl font-bold text-gray-800 mb-2">Erreur de chargement</h2>
        <p class="text-gray-600 mb-4">Impossible de charger les détails du personnage</p>
        <button 
          @click="loadPersonnageDetails" 
          class="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
        >
          Réessayer
        </button>
      </div>
    </div>
    
    <!-- Main content -->
    <div v-else class="bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div class="max-w-7xl mx-auto">
      
      <!-- Header avec navigation -->
      <div class="mb-8">
        <nav class="flex items-center space-x-2 text-sm text-gray-600 mb-4">
          <NuxtLink :to="`/projets/projet-${project?.slug}`" class="hover:text-amber-600 transition-colors">
            {{ project?.title }}
          </NuxtLink>
          <span>→</span>
          <NuxtLink :to="`/projets/personnages-${project?.slug}`" class="hover:text-amber-600 transition-colors">
            Personnages
          </NuxtLink>
          <span>→</span>
          <span class="text-amber-800 font-medium">{{ personnage?.firstName }} {{ personnage?.lastName }}</span>
        </nav>
        
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-4">
            <!-- Avatar style photo d'identité -->
            <div class="w-32 h-40 rounded-lg overflow-hidden bg-gray-200 border-4 border-white shadow-xl">
              <img 
                v-if="getPersonnageAvatar(personnage)" 
                :src="getPersonnageAvatar(personnage)" 
                :alt="`${personnage.firstName} ${personnage.lastName}`"
                class="w-full h-full object-cover"
              />
              <div v-else class="w-full h-full flex items-center justify-center text-gray-400 text-4xl font-bold">
                {{ personnage?.firstName?.[0] }}{{ personnage?.lastName?.[0] }}
              </div>
            </div>
            
            <div>
              <h1 class="text-3xl font-bold text-amber-900">
                {{ personnage?.firstName }} {{ personnage?.lastName }}
              </h1>
              <div class="flex items-center space-x-3 mt-2">
                <span v-if="personnage?.age" class="text-gray-600">{{ personnage.age }} ans</span>
                <span
                  v-if="personnage?.level"
                  :class="`px-3 py-1 rounded-full text-xs font-medium ${getLevelColor(personnage.level)}`"
                >
                  {{ getLevelLabel(personnage.level) }}
                </span>
              </div>

              <!-- Fonctions dramatiques -->
              <div
                v-if="personnage?.personnageDramaticFunctions && personnage.personnageDramaticFunctions.length > 0"
                class="flex flex-wrap gap-2 mt-3"
              >
                <span
                  v-for="pdf in personnage.personnageDramaticFunctions"
                  :key="pdf.dramaticFunction.id"
                  :title="`${pdf.dramaticFunction.description || ''}\n\nCaractéristiques:\n${Array.isArray(pdf.dramaticFunction.characteristics) ? pdf.dramaticFunction.characteristics.join('\n• ') : pdf.dramaticFunction.characteristics || ''}\n\nTendance: ${pdf.dramaticFunction.tendency || 'N/A'}`"
                  class="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-semibold rounded-full bg-purple-600 text-white hover:bg-purple-700 shadow-sm transition-all cursor-help"
                >
                  <span class="text-base">🎭</span>
                  {{ pdf.dramaticFunction.name }}
                </span>
              </div>
            </div>
          </div>
          
          <div class="flex space-x-3">
            <button 
              v-if="!isEditing"
              @click="toggleEdit"
              class="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium transition-colors"
            >
              Modifier
            </button>
            <button 
              v-if="!isEditing"
              @click="createActantielSchema"
              class="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <span>🎭</span>
              Créer le schéma actantiel
            </button>
            <template v-else>
              <button 
                @click="handleSave"
                class="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
              >
                Sauvegarder
              </button>
              <button 
                @click="toggleEdit"
                class="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-lg font-medium transition-colors"
              >
                Annuler
              </button>
            </template>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        <!-- Colonne gauche - Petite colonne -->
        <div class="space-y-6">
          
          <!-- Forces et Faiblesses -->
          <div class="bg-white rounded-lg shadow-lg p-6 border-l-4 border-orange-500">
            <h2 class="text-lg font-bold text-gray-800 mb-4 flex items-center">
              <span class="mr-2">⚔️</span>
              Forces & Faiblesses
            </h2>
            
            <div class="space-y-3">
              <div>
                <h3 class="font-semibold text-green-700 mb-2 text-sm flex items-center">
                  <span class="mr-1">💪</span>
                  Forces
                </h3>
                <div v-if="!isEditing" class="p-2 bg-green-50 rounded border border-green-200">
                  <p class="text-gray-800 text-sm whitespace-pre-wrap">{{ personnage?.strength || 'Aucune force définie' }}</p>
                </div>
                <textarea
                  v-else
                  v-model="editedPersonnage.strength"
                  class="w-full h-16 p-2 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-amber-500/30 transition-all resize-none"
                  placeholder="Forces..."
                ></textarea>
              </div>
              
              <div>
                <h3 class="font-semibold text-red-700 mb-2 text-sm flex items-center">
                  <span class="mr-1">⚠️</span>
                  Faiblesses
                </h3>
                <div v-if="!isEditing" class="p-2 bg-red-50 rounded border border-red-200">
                  <p class="text-gray-800 text-sm whitespace-pre-wrap">{{ personnage?.weakness || 'Aucune faiblesse définie' }}</p>
                </div>
                <textarea
                  v-else
                  v-model="editedPersonnage.weakness"
                  class="w-full h-16 p-2 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-amber-500/30 transition-all resize-none"
                  placeholder="Faiblesses..."
                ></textarea>
              </div>
            </div>
          </div>

          <!-- Galerie d'images -->
          <div class="bg-white rounded-lg shadow-lg p-6 border-l-4 border-purple-500">
            <h2 class="text-lg font-bold text-gray-800 mb-4 flex items-center">
              <span class="mr-2">🖼️</span>
              Photos
            </h2>
            
            <div v-if="isEditing && personnage?.id">
              <ImageUploader
                :personnage-id="personnage.id"
                :images="editedPersonnage.images || []"
                @images-updated="handleImagesUpdated"
              />
            </div>
            
            <div v-else-if="getPersonnageImages(personnage).length > 0" class="space-y-3 max-h-96 overflow-y-auto">
              <div 
                v-for="(image, index) in getPersonnageImages(personnage)" 
                :key="index"
                class="w-full aspect-square overflow-hidden rounded-lg border border-gray-200 hover:shadow-lg transition-shadow cursor-pointer"
                @click="openLightbox(index)"
              >
                <img 
                  :src="image" 
                  :alt="`Image ${index + 1} de ${personnage.firstName} ${personnage.lastName}`"
                  class="w-full h-full object-cover hover:scale-105 transition-transform"
                />
              </div>
            </div>
            
            <div v-else class="text-center py-6">
              <div class="text-gray-400 text-2xl mb-2">🖼️</div>
              <p class="text-gray-500 text-sm">Aucune image</p>
              <p v-if="!isEditing" class="text-xs text-gray-400 mt-1">Modifier pour ajouter</p>
            </div>
          </div>

          <!-- Statistiques -->
          <div class="bg-white rounded-lg shadow-lg p-6 border-l-4 border-indigo-500">
            <h2 class="text-lg font-bold text-gray-800 mb-4 flex items-center">
              <span class="mr-2">📊</span>
              Stats
            </h2>
            
            <div class="space-y-3">
              <div class="flex justify-between items-center p-2 bg-indigo-50 rounded">
                <span class="text-gray-700 text-sm">Séquences</span>
                <span class="font-bold text-indigo-600">
                  {{ personnage?.stats?.sequenceCount || 0 }}
                </span>
              </div>
              
              <div class="flex justify-between items-center p-2 bg-indigo-50 rounded">
                <span class="text-gray-700 text-sm">Images</span>
                <span class="font-bold text-indigo-600">
                  {{ personnage?.stats?.imageCount || 0 }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Colonne droite - Grande colonne -->
        <div class="lg:col-span-2 space-y-6">
          
      
          <!-- Histoire et Background -->
          <div class="bg-white rounded-lg shadow-lg border-l-4 border-green-500">
            <div class="p-6">
              <h2 class="text-xl font-bold text-gray-800 mb-4 flex items-center">
                <span class="mr-2">📖</span>
                Background
              </h2>
              
              <div v-if="!isEditing" class="bg-green-50 rounded-lg border border-green-200 p-4">
                <div 
                  v-if="personnage?.background"
                  class="prose prose-sm max-w-none"
                  v-html="personnage.background"
                >
                </div>
                <p v-else class="text-gray-500 italic">Aucun background défini</p>
              </div>
              
              <div v-else class="min-h-96">
                <RichTextEditor 
                  v-model="editedPersonnage.background" 
                  class="border border-gray-300 rounded-lg h-96" 
                />
              </div>
            </div>
          </div>

          <!-- Analyse rapide -->
          <div class="bg-white rounded-lg shadow-lg p-6 border-l-4 border-blue-500">
            <h2 class="text-xl font-bold text-gray-800 mb-4 flex items-center">
              <span class="mr-2">🔍</span>
              Analyse rapide
            </h2>
            <div 
              class="p-4 bg-blue-50 rounded-lg border border-blue-200 min-h-[120px]"
              v-html="personnage?.analysis || '<em class=\'text-gray-500\'>Aucune analyse disponible</em>'"
            >
            </div>
          </div>


        </div>
      </div>
    </div>
    </div>
    
    <!-- Lightbox component -->
    <Lightbox
      :images="lightboxImages"
      :current-index="lightboxIndex"
      :show="showLightbox"
      @close="closeLightbox"
      @update:current-index="updateLightboxIndex"
    />
  </div>
</template>

<style scoped>
.prose {
  max-width: none;
}

.prose h1, .prose h2, .prose h3, .prose h4, .prose h5, .prose h6 {
  color: #1f2937;
  font-weight: 600;
}

.prose p {
  color: #374151;
  margin-bottom: 1rem;
}

.prose ul, .prose ol {
  color: #374151;
}

.prose strong {
  color: #111827;
  font-weight: 600;
}

.prose em {
  color: #6b7280;
}
</style>