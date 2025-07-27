<script setup>
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { usePersonnageStore } from '~/store/personnage';
import { useProjectStore } from '~/store/project';
import RichTextEditor from '~/components/RichTextEditor.vue';
import ImageUploader from '~/components/Project/ImageUploader.vue';
import ProjectSubMenu from '~/components/Project/SubMenu.vue';

definePageMeta({
  middleware: 'auth'
});

const route = useRoute();
const router = useRouter();
const personnageStore = usePersonnageStore();
const projectStore = useProjectStore();

const personnageSlug = route.params.slugPersonnage;
const personnage = ref(null);
const project = ref(null);
const isEditing = ref(false);
const editedPersonnage = ref({});
const lightboxImage = ref(null);
const showLightbox = ref(false);

// Fonction pour ouvrir la lightbox
const openLightbox = (image) => {
  lightboxImage.value = image;
  showLightbox.value = true;
};

// Fonction pour fermer la lightbox
const closeLightbox = () => {
  showLightbox.value = false;
  lightboxImage.value = null;
};

// Fonction pour créer un slug à partir du nom/prénom
const createPersonnageSlug = (firstName, lastName) => {
  const fullName = `${firstName || ''} ${lastName || ''}`.trim();
  return fullName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Supprimer les accents
    .replace(/[^a-z0-9\s-]/g, '') // Garder seulement lettres, chiffres, espaces et tirets
    .replace(/\s+/g, '-') // Remplacer espaces par tirets
    .replace(/-+/g, '-') // Remplacer tirets multiples par un seul
    .replace(/^-|-$/g, ''); // Supprimer tirets en début/fin
};

// Fonction pour trouver un personnage par son slug
const findPersonnageBySlug = (personnages, slug) => {
  return personnages?.find(p => {
    const personSlug = createPersonnageSlug(p.firstName, p.lastName);
    return personSlug === slug;
  });
};

onMounted(async () => {
  // Utiliser le projet déjà en mémoire dans le store
  project.value = projectStore.project;
  
  if (!project.value) {
    // Si pas de projet en mémoire, rediriger vers la liste des projets
    router.push('/projets/tous');
    return;
  }
  
  // Trouver le personnage par son slug
  personnage.value = findPersonnageBySlug(projectStore.personnages, personnageSlug);
  
  if (!personnage.value) {
    // Rediriger vers la page personnages du projet actuel
    router.push(`/projets/personnages-${project.value.slug}`);
    return;
  }
  
  editedPersonnage.value = { ...personnage.value };
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
    personnage.value = { ...editedPersonnage.value };
    isEditing.value = false;
    // Recharger le projet pour avoir les données à jour
    await projectStore.fetchProject(project.value.slug);
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

// Fonction pour obtenir toutes les images traitées
const getPersonnageImages = (personnage) => {
  if (!personnage || !personnage.images) return [];
  
  let images = personnage.images;
  if (typeof images === 'string') {
    try {
      images = JSON.parse(images);
    } catch {
      return [];
    }
  }
  
  if (Array.isArray(images)) {
    const config = useRuntimeConfig();
    const baseUrl = config.public.apiBase.replace('/api', '');
    return images.map(img => `${baseUrl}/${img}`);
  }
  
  return [];
};
</script>

<template>
  <div>
    <ProjectSubMenu :project-slug="project?.slug" />
    <div class="bg-gray-50 p-4 sm:p-6 lg:p-8">
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
                @click="openLightbox(image)"
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
                  {{ personnage?.sequencePersonnages?.length || 0 }}
                </span>
              </div>
              
              <div class="flex justify-between items-center p-2 bg-indigo-50 rounded">
                <span class="text-gray-700 text-sm">Images</span>
                <span class="font-bold text-indigo-600">
                  {{ getPersonnageImages(personnage).length }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Colonne droite - Grande colonne -->
        <div class="lg:col-span-2 space-y-6">
          
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

          <!-- Histoire et Background -->
          <div class="bg-white rounded-lg shadow-lg border-l-4 border-green-500">
            <div class="p-6">
              <h2 class="text-xl font-bold text-gray-800 mb-4 flex items-center">
                <span class="mr-2">📖</span>
                Histoire & Background
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
        </div>
      </div>
    </div>
    
    <!-- Lightbox pour les images -->
    <div 
      v-if="showLightbox" 
      class="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
      @click="closeLightbox"
    >
      <div class="relative max-w-4xl max-h-full">
        <img 
          :src="lightboxImage" 
          :alt="'Image de ' + personnage?.firstName + ' ' + personnage?.lastName"
          class="max-w-full max-h-full object-contain rounded-lg"
        />
        <button 
          @click="closeLightbox"
          class="absolute top-4 right-4 text-white bg-black bg-opacity-50 hover:bg-opacity-75 rounded-full w-10 h-10 flex items-center justify-center text-xl transition-colors"
        >
          ×
        </button>
      </div>
    </div>
  </div>
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