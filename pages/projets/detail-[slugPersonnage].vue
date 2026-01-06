<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { usePersonnageStore } from '~/store/personnage';
import { useProjectStore } from '~/store/project';
import { useAuthStore } from '~/store/auth';
import { useMetadataStore } from '~/store/metadata';
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
const metadataStore = useMetadataStore();

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

// Gestion des arcs narratifs
const showNarrativeArcModal = ref(false);
const editingNarrativeArc = ref(null);
const projectSequences = ref([]);

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

onMounted(async () => {
  await Promise.all([
    loadPersonnageDetails(),
    metadataStore.fetchMetadata(),
  ]);

  // Charger les séquences du projet
  if (project.value?.slug) {
    await loadProjectSequences();
  }
});

// Charger les séquences du projet
const loadProjectSequences = async () => {
  try {
    await projectStore.fetchProject(project.value.slug);
    // Extraire toutes les séquences de toutes les parties
    const sequences = [];
    projectStore.parts.forEach(part => {
      if (part.sequences && part.sequences.length > 0) {
        part.sequences.forEach(sequence => {
          sequences.push({
            id: sequence.id,
            name: sequence.name,
            partName: part.name
          });
        });
      }
    });
    projectSequences.value = sequences;
  } catch (error) {
    console.error('Erreur lors du chargement des séquences:', error);
  }
};

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

// Gestion des arcs narratifs
const openNarrativeArcModal = (arc = null) => {
  if (arc) {
    editingNarrativeArc.value = {
      id: arc.id,
      narrativeArcId: arc.narrativeArc.id,
      steps: arc.steps || [],
      fromSequenceId: arc.fromSequence?.id || null,
      toSequenceId: arc.toSequence?.id || null,
      weight: arc.weight || 50,
      comment: arc.comment || ''
    };
  } else {
    editingNarrativeArc.value = {
      narrativeArcId: null,
      steps: [],
      fromSequenceId: null,
      toSequenceId: null,
      weight: 50,
      comment: ''
    };
  }
  showNarrativeArcModal.value = true;
};

const closeNarrativeArcModal = () => {
  showNarrativeArcModal.value = false;
  editingNarrativeArc.value = null;
};

const saveNarrativeArc = async () => {
  try {
    const config = useRuntimeConfig();

    const payload = {
      personnageId: personnage.value.id,
      narrativeArcId: editingNarrativeArc.value.narrativeArcId,
      steps: editingNarrativeArc.value.steps,
      fromSequenceId: editingNarrativeArc.value.fromSequenceId,
      toSequenceId: editingNarrativeArc.value.toSequenceId,
      weight: editingNarrativeArc.value.weight,
      comment: editingNarrativeArc.value.comment
    };

    const url = editingNarrativeArc.value.id
      ? `${config.public.apiBase}/personnage/${personnage.value.id}/narrative-arc/${editingNarrativeArc.value.id}/update`
      : `${config.public.apiBase}/personnage/${personnage.value.id}/narrative-arc/add`;

    await $fetch(url, {
      method: 'POST',
      headers: {
        'X-AUTH-TOKEN': authStore.token || '',
        'Content-Type': 'application/json'
      },
      body: payload
    });

    await loadPersonnageDetails();
    closeNarrativeArcModal();
  } catch (error) {
    console.error('Erreur lors de la sauvegarde de l\'arc narratif:', error);
  }
};

const deleteNarrativeArc = async (arcId) => {
  if (!confirm('Êtes-vous sûr de vouloir supprimer cet arc narratif ?')) return;

  try {
    const config = useRuntimeConfig();

    await $fetch(`${config.public.apiBase}/personnage/${personnage.value.id}/narrative-arc/${arcId}/delete`, {
      method: 'DELETE',
      headers: {
        'X-AUTH-TOKEN': authStore.token || ''
      }
    });

    await loadPersonnageDetails();
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'arc narratif:', error);
  }
};

// Computed pour obtenir les steps de l'arc sélectionné
const selectedArcSteps = computed(() => {
  if (!editingNarrativeArc.value?.narrativeArcId) return [];

  const arc = metadataStore.narrativeArcs.find(a => a.id === editingNarrativeArc.value.narrativeArcId);
  return arc?.steps || [];
});

// Initialiser les steps avec les étapes de l'arc
const initializeStepsFromArc = () => {
  if (!editingNarrativeArc.value?.narrativeArcId) return;

  const arc = metadataStore.narrativeArcs.find(a => a.id === editingNarrativeArc.value.narrativeArcId);
  if (!arc || !arc.steps) return;

  // Si aucun step n'est défini, créer un tableau vide pour chaque étape
  if (!editingNarrativeArc.value.steps || editingNarrativeArc.value.steps.length === 0) {
    editingNarrativeArc.value.steps = arc.steps.map(step => ({
      step: step,
      fromSequenceId: null,
      toSequenceId: null
    }));
  }
};

// Ajouter/modifier un step
const updateStep = (index, field, value) => {
  // S'assurer que le tableau steps existe
  if (!editingNarrativeArc.value.steps) {
    editingNarrativeArc.value.steps = [];
  }

  // Créer l'objet step s'il n'existe pas
  if (!editingNarrativeArc.value.steps[index]) {
    editingNarrativeArc.value.steps[index] = {
      step: selectedArcSteps.value[index],
      fromSequenceId: null,
      toSequenceId: null
    };
  }

  // Mettre à jour le champ
  editingNarrativeArc.value.steps[index][field] = value;
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

              <!-- Arcs narratifs -->
              <div
                v-if="personnage?.personnageNarrativeArcs && personnage.personnageNarrativeArcs.length > 0"
                class="flex flex-wrap gap-2 mt-3"
              >
                <span
                  v-for="pna in personnage.personnageNarrativeArcs"
                  :key="pna.id"
                  :title="`${pna.narrativeArc.description || ''}\n\nÉtapes:\n${Array.isArray(pna.narrativeArc.steps) ? pna.narrativeArc.steps.map((s, i) => `${i + 1}. ${s}`).join('\n') : ''}\n\nTendance: ${pna.narrativeArc.tendency === 'positive' ? '↗️ Positive' : pna.narrativeArc.tendency === 'negative' ? '↘️ Négative' : '↔️ Ambiguë'}`"
                  class="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-semibold rounded-full bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm transition-all cursor-help"
                >
                  <span class="text-base">
                    {{ pna.narrativeArc.tendency === 'positive' ? '↗️' : pna.narrativeArc.tendency === 'negative' ? '↘️' : '↔️' }}
                  </span>
                  {{ pna.narrativeArc.name }}
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

          <!-- Arcs narratifs détaillés -->
          <div class="bg-white rounded-lg shadow-lg p-6 border-l-4 border-indigo-500">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-xl font-bold text-gray-800 flex items-center">
                <span class="mr-2">📈</span>
                Arcs narratifs
              </h2>
              <button
                @click="openNarrativeArcModal()"
                class="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-lg font-medium transition-colors flex items-center gap-1"
              >
                <span>+</span>
                Ajouter un arc
              </button>
            </div>

            <div v-if="personnage?.personnageNarrativeArcs && personnage.personnageNarrativeArcs.length > 0" class="space-y-6">
              <div
                v-for="pna in personnage.personnageNarrativeArcs"
                :key="pna.id"
                class="p-4 bg-indigo-50 rounded-lg border border-indigo-200"
              >
                <!-- En-tête de l'arc -->
                <div class="flex items-start justify-between mb-3">
                  <div class="flex-1">
                    <h3 class="text-lg font-semibold text-indigo-900 flex items-center gap-2">
                      <span class="text-xl">
                        {{ pna.narrativeArc.tendency === 'positive' ? '↗️' : pna.narrativeArc.tendency === 'negative' ? '↘️' : '↔️' }}
                      </span>
                      {{ pna.narrativeArc.name }}
                    </h3>
                    <p class="text-sm text-gray-700 mt-1 italic">{{ pna.narrativeArc.description }}</p>
                  </div>
                  <div class="flex items-center gap-2">
                    <span class="px-2 py-1 text-xs font-medium rounded bg-indigo-200 text-indigo-800">
                      Poids: {{ pna.weight }}%
                    </span>
                    <button
                      @click="openNarrativeArcModal(pna)"
                      class="px-2 py-1 text-xs bg-white hover:bg-indigo-100 text-indigo-700 rounded border border-indigo-300 transition-colors"
                      title="Modifier"
                    >
                      ✏️
                    </button>
                    <button
                      @click="deleteNarrativeArc(pna.id)"
                      class="px-2 py-1 text-xs bg-white hover:bg-red-100 text-red-700 rounded border border-red-300 transition-colors"
                      title="Supprimer"
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                <!-- Séquences globales (si définies) -->
                <div v-if="pna.fromSequence || pna.toSequence" class="mb-3 p-2 bg-indigo-50 rounded text-xs text-gray-700">
                  <span class="font-semibold">Arc complet:</span>
                  <span v-if="pna.fromSequence" class="ml-2">De: <strong>{{ pna.fromSequence.name }}</strong></span>
                  <span v-if="pna.fromSequence && pna.toSequence" class="mx-2">→</span>
                  <span v-if="pna.toSequence">À: <strong>{{ pna.toSequence.name }}</strong></span>
                </div>

                <!-- Étapes de l'arc avec séquences -->
                <div v-if="pna.steps && pna.steps.length > 0" class="mb-3">
                  <h4 class="text-sm font-semibold text-gray-800 mb-2">Progression de l'arc :</h4>
                  <div class="space-y-2">
                    <div
                      v-for="(stepData, index) in pna.steps"
                      :key="index"
                      class="p-2 bg-white rounded border border-indigo-200"
                    >
                      <div class="text-sm font-medium text-indigo-900 mb-1">
                        {{ index + 1 }}. {{ stepData.step }}
                      </div>
                      <div v-if="stepData.fromSequenceId || stepData.toSequenceId" class="text-xs text-gray-600 ml-4">
                        <span v-if="stepData.fromSequenceId">
                          Seq. {{ projectSequences.find(s => s.id === stepData.fromSequenceId)?.name || stepData.fromSequenceId }}
                        </span>
                        <span v-if="stepData.fromSequenceId && stepData.toSequenceId"> → </span>
                        <span v-if="stepData.toSequenceId">
                          Seq. {{ projectSequences.find(s => s.id === stepData.toSequenceId)?.name || stepData.toSequenceId }}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Variantes -->
                <div v-if="pna.narrativeArc.variants && pna.narrativeArc.variants.length > 0">
                  <h4 class="text-sm font-semibold text-gray-800 mb-2">Variantes :</h4>
                  <div class="space-y-2">
                    <div
                      v-for="(variant, index) in pna.narrativeArc.variants"
                      :key="index"
                      class="p-2 bg-white rounded border border-indigo-100"
                    >
                      <h5 class="text-xs font-semibold text-indigo-700">{{ variant.name }}</h5>
                      <p class="text-xs text-gray-600 mt-1">{{ variant.description }}</p>
                    </div>
                  </div>
                </div>

                <!-- Commentaire (si présent) -->
                <div v-if="pna.comment" class="mt-3 pt-3 border-t border-indigo-200">
                  <p class="text-xs text-gray-600 italic">💬 {{ pna.comment }}</p>
                </div>
              </div>
            </div>

            <!-- Message si aucun arc -->
            <div v-else class="text-center py-8 text-gray-500">
              <p class="text-sm">Aucun arc narratif défini pour ce personnage.</p>
              <p class="text-xs mt-1">Cliquez sur "+ Ajouter un arc" pour commencer.</p>
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

    <!-- Modal Arc Narratif -->
    <div
      v-if="showNarrativeArcModal"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      @click.self="closeNarrativeArcModal"
    >
      <div class="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div class="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h3 class="text-xl font-bold text-gray-900">
            {{ editingNarrativeArc?.id ? 'Modifier l\'arc narratif' : 'Ajouter un arc narratif' }}
          </h3>
          <button
            @click="closeNarrativeArcModal"
            class="text-gray-400 hover:text-gray-600 transition-colors"
          >
            ✕
          </button>
        </div>

        <div class="p-6 space-y-4">
          <!-- Sélection de l'arc -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Arc narratif <span class="text-red-500">*</span>
            </label>
            <select
              v-model="editingNarrativeArc.narrativeArcId"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            >
              <option :value="null">Sélectionnez un arc narratif</option>
              <option
                v-for="arc in metadataStore.narrativeArcs"
                :key="arc.id"
                :value="arc.id"
              >
                {{ arc.name }} ({{ arc.tendency === 'positive' ? '↗️' : arc.tendency === 'negative' ? '↘️' : '↔️' }})
              </option>
            </select>
          </div>

          <!-- Séquences globales de l'arc -->
          <div class="border-t border-b border-gray-200 py-4 my-4">
            <label class="block text-sm font-medium text-gray-700 mb-3">
              Séquences globales de l'arc complet (optionnel)
            </label>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs text-gray-600 mb-1">De (séquence)</label>
                <select
                  v-model="editingNarrativeArc.fromSequenceId"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                >
                  <option :value="null">Aucune</option>
                  <option
                    v-for="seq in projectSequences"
                    :key="seq.id"
                    :value="seq.id"
                  >
                    {{ seq.partName }} → {{ seq.name }}
                  </option>
                </select>
              </div>

              <div>
                <label class="block text-xs text-gray-600 mb-1">À (séquence)</label>
                <select
                  v-model="editingNarrativeArc.toSequenceId"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                >
                  <option :value="null">Aucune</option>
                  <option
                    v-for="seq in projectSequences"
                    :key="seq.id"
                    :value="seq.id"
                  >
                    {{ seq.partName }} → {{ seq.name }}
                  </option>
                </select>
              </div>
            </div>
          </div>

          <!-- Étapes détaillées avec séquences -->
          <div v-if="selectedArcSteps.length > 0">
            <div class="flex items-center justify-between mb-3">
              <label class="block text-sm font-medium text-gray-700">
                Définir les séquences pour chaque étape
              </label>
              <button
                type="button"
                @click="initializeStepsFromArc"
                class="text-xs px-3 py-1 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded transition-colors"
              >
                Initialiser toutes les étapes
              </button>
            </div>

            <div class="space-y-3 max-h-96 overflow-y-auto border border-gray-200 rounded-lg p-3 bg-gray-50">
              <div
                v-for="(stepName, index) in selectedArcSteps"
                :key="index"
                class="p-3 bg-white rounded-md border border-gray-300"
              >
                <div class="text-sm font-medium text-gray-900 mb-2">
                  {{ index + 1 }}. {{ stepName }}
                </div>

                <div class="grid grid-cols-2 gap-2">
                  <div>
                    <label class="block text-xs text-gray-600 mb-1">De</label>
                    <select
                      :value="editingNarrativeArc.steps[index]?.fromSequenceId || null"
                      @change="updateStep(index, 'fromSequenceId', parseInt($event.target.value) || null)"
                      class="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option :value="null">-</option>
                      <option
                        v-for="seq in projectSequences"
                        :key="seq.id"
                        :value="seq.id"
                      >
                        {{ seq.name }}
                      </option>
                    </select>
                  </div>

                  <div>
                    <label class="block text-xs text-gray-600 mb-1">À</label>
                    <select
                      :value="editingNarrativeArc.steps[index]?.toSequenceId || null"
                      @change="updateStep(index, 'toSequenceId', parseInt($event.target.value) || null)"
                      class="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option :value="null">-</option>
                      <option
                        v-for="seq in projectSequences"
                        :key="seq.id"
                        :value="seq.id"
                      >
                        {{ seq.name }}
                      </option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Poids -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Poids (importance) : {{ editingNarrativeArc.weight }}%
            </label>
            <input
              v-model.number="editingNarrativeArc.weight"
              type="range"
              min="0"
              max="100"
              class="w-full"
            />
          </div>

          <!-- Commentaire -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Commentaire
            </label>
            <textarea
              v-model="editingNarrativeArc.comment"
              rows="3"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Notes sur cet arc narratif..."
            ></textarea>
          </div>
        </div>

        <div class="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
          <button
            @click="closeNarrativeArcModal"
            class="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-lg font-medium transition-colors"
          >
            Annuler
          </button>
          <button
            @click="saveNarrativeArc"
            :disabled="!editingNarrativeArc?.narrativeArcId"
            class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            Enregistrer
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