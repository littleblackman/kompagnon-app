<script setup lang="ts">
import RatingStars from "@/components/Project/RatingStars.vue";
import SequenceModal from "~/components/Project/SequenceModal.vue";
import PersonnageModal from "~/components/Project/PersonnageModal.vue";
import PersonnageDetectionModal from "~/components/Project/PersonnageDetectionModal.vue";
import PersonnageConfigModal from "~/components/Project/PersonnageConfigModal.vue";
import FieldIcon from '@/components/FieldIcon.vue'
import SceneList from '@/components/Project/SceneList.vue'
import { 
  LightBulbIcon,      // Pour intention
  EyeIcon,            // Pour idée esthétique  
  InformationCircleIcon 
} from '@heroicons/vue/24/solid'
import { ArrowUpIcon, ArrowDownIcon, PencilIcon } from '@heroicons/vue/24/outline'

import { useProjectStore } from "~/store/project";
import { useMetadataStore } from "~/store/metadata";
import { usePersonnageStore } from "~/store/personnage";

const projectStore = useProjectStore();
const metadataStore = useMetadataStore();
const personnageStore = usePersonnageStore();

// Metadata sont maintenant chargées au login dans auth.ts

const props = defineProps({
  sequences: Array,
  projectId: Number,
  partId: Number
});

// Les personnages sont maintenant gérés via les séquences

// Trier les séquences par position
const sortedSequences = computed(() => {
  if (!props.sequences) return [];
  return [...props.sequences].sort((a, b) => a.position - b.position);
});

const sequenceModalOpen = ref(false);
const currentSequence = ref(null);
const personnageModalOpen = ref(false);
const selectedPersonnage = ref(null);
const showPersonnageConfig = ref(false);


/**** SEQUENCES & SAVE PART ****/

const openSequenceModal = (sequence = null) => {
  if (!sequence) {
    sequence = {
      name: '',
      description: '',
      part_id: props.partId
    };
  } else {
    // S'assurer que la séquence a bien le part_id
    sequence = {
      ...sequence,
      part_id: props.partId
    };
  }
  currentSequence.value = sequence;
  sequenceModalOpen.value = true;
};

const handleSaveSequence = async ({ sequence, afterSequenceId }) => {
  try {
    const savedSequence = await projectStore.saveSequence(sequence, props.partId, afterSequenceId);
    sequenceModalOpen.value = false;

    // Si c'est une nouvelle séquence, recharger la partie pour avoir les bonnes positions
    if (!sequence.id) {
      await projectStore.reloadPart(props.partId);
    } else {
      // Mise à jour locale pour modification existante
      if (props.sequences) {
        const existingIndex = props.sequences.findIndex(seq => seq.id === savedSequence.id);
        if (existingIndex !== -1) {
          props.sequences[existingIndex] = savedSequence;
        }
      }
    }
  } catch (error) {
    console.error("Erreur lors de la sauvegarde :", error);
  }
};

const handleDeleteSequence = async (sequence) => {
  try {
    await projectStore.deleteSequence(sequence.id);
    sequenceModalOpen.value = false;
    
    // Mise à jour locale des séquences
    if (props.sequences) {
      const index = props.sequences.findIndex(seq => seq.id === sequence.id);
      if (index !== -1) {
        props.sequences.splice(index, 1);
      }
    }
  } catch (error) {
    console.error("Erreur lors de la suppression :", error);
  }
};

const handleMoveSequence = async (sequence, direction) => {
  const currentIndex = sortedSequences.value.findIndex(s => s.id === sequence.id);
  
  try {
    if (direction === 'up' && currentIndex > 0) {
      // Échanger avec la séquence précédente
      const sequencesCopy = [...sortedSequences.value];
      
      [sequencesCopy[currentIndex], sequencesCopy[currentIndex - 1]] = 
      [sequencesCopy[currentIndex - 1], sequencesCopy[currentIndex]];
      
      // Recalculer les positions
      sequencesCopy.forEach((s, index) => {
        s.position = index + 1;
      });
      
      // Sauvegarder le nouvel ordre
      await projectStore.saveSequenceOrder(sequencesCopy);
      
    } else if (direction === 'down' && currentIndex < sortedSequences.value.length - 1) {
      // Échanger avec la séquence suivante
      const sequencesCopy = [...sortedSequences.value];
      
      [sequencesCopy[currentIndex], sequencesCopy[currentIndex + 1]] = 
      [sequencesCopy[currentIndex + 1], sequencesCopy[currentIndex]];
      
      // Recalculer les positions
      sequencesCopy.forEach((s, index) => {
        s.position = index + 1;
      });
      
      // Sauvegarder le nouvel ordre
      await projectStore.saveSequenceOrder(sequencesCopy);
    }
    
    // Recharger le projet pour voir les changements
    if (projectStore.project?.slug) {
      await projectStore.fetchProject(projectStore.project.slug);
    }
  } catch (error) {
    console.error('Erreur lors du déplacement de la séquence:', error);
  }
};

/*** Icon field ***/
async function updateField(field: string, value: string, sequenceId: number) {
  try {
    const sequence = props.sequences.find(s => s.id === sequenceId);
    if (!sequence) return;

    // Mise à jour locale immédiate
    sequence[field] = value;

    // Utiliser la nouvelle route pour ne sauvegarder que les métadonnées
    const metadataToSave = {
      [field]: value
    };

    // Sauvegarde via la nouvelle route dédiée
    await projectStore.updateSequenceMetadata(sequenceId, metadataToSave);
  } catch (error) {
    console.error(`Erreur lors de la mise à jour du champ ${field}:`, error);
  }
}



/**** PERSONNAGES PART ****/

const updatePersonnage = (personnage = null, sequenceId = null) => {
  if(!personnage) {
    personnage = {
      firstName: '',
      lastName: '',
      age: 0,
      background: ''
    };
  }

  selectedPersonnage.value = { ...personnage, sequenceId };
  personnageModalOpen.value = true;
};

const handleSavePersonnage = async (personnage) => {
  try {
    if (!projectStore.project?.id) {
      console.error('Aucun projet chargé');
      return;
    }
    
    const savedPersonnage = await personnageStore.savePersonnage(personnage, projectStore.project.id);
    if (savedPersonnage) {
      console.log('Personnage sauvegardé :', savedPersonnage);
      // Recharger le projet pour mettre à jour les relations
      if (projectStore.project) {
        await projectStore.fetchProject(projectStore.project.slug);
      }
    }
  } catch (error) {
    console.error('Erreur lors de la sauvegarde du personnage :', error);
  }
  personnageModalOpen.value = false;
};

const getPersonnageName = (p) => {
  return personnageStore.getPersonnageName(p);
};

const removePersonnageFromSequence = async (sequencePersonnageId, sequenceId) => {
  try {
    // Trouver le personnageId depuis le sequencePersonnage
    const sequence = props.sequences?.find(s => s.id === sequenceId);
    const sequencePersonnage = sequence?.sequencePersonnages?.find(sp => sp.id === sequencePersonnageId);
    
    if (sequencePersonnage && sequencePersonnage.personnage) {
      await personnageStore.removePersonnageFromSequence(sequenceId, sequencePersonnage.personnage.id);
      
      // Recharger le projet pour mettre à jour l'affichage
      if (projectStore.project?.slug) {
        await projectStore.fetchProject(projectStore.project.slug);
      }
    }
  } catch (error) {
    console.error('Erreur lors de la suppression du personnage de la séquence :', error);
  }
};



/**** CRITERIAS PART ****/
// Ces critères seront automatiquement analysés par l'IA
// Affichage en lecture seule uniquement

// get note by criteria
const getCriteriaRating = (sequence, criteriaId) => {
  const sequenceCriteria = sequence.sequenceCriterias?.find(sc => sc.criteria?.id === criteriaId);
  return sequenceCriteria?.rating || 0;
};

// Fonction vide pour éviter les erreurs (les clics sont désactivés dans RatingStars)
const updateRating = () => {
  // Désactivé - sera géré par l'IA automatiquement
};




</script>

<template>
  <ul class="bg-white">


    <SequenceModal v-if="sequenceModalOpen"
                   :sequence="currentSequence"
                   :projectId="projectId"
                   @close="sequenceModalOpen = false"
                   @save="handleSaveSequence"
                   @delete="handleDeleteSequence"
              />

    <PersonnageModal
        v-if="personnageModalOpen"
        :personnage="selectedPersonnage"
        @close="personnageModalOpen = false"
        @save="handleSavePersonnage"
    />
    
    <PersonnageDetectionModal />
    
    <PersonnageConfigModal v-model:showConfig="showPersonnageConfig" />


    <li v-for="sequence in sortedSequences" :key="sequence.id" class="pl-6 pr-3 pt-6 pb-6">

      <div class="flex items-center justify-between mb-2">
        <h3 :id="`sequence-${sequence.id}`" class="font-bold text-black text-xl">
          {{ sequence.name }}
        </h3>
        
        <div class="flex items-center space-x-2">
          <!-- Boutons d'action -->
          <div class="flex items-center space-x-1">
            <!-- Bouton Éditer -->
            <button 
              class="p-1 rounded text-gray-600 hover:text-gray-800 hover:bg-gray-50"
              @click="openSequenceModal(sequence)"
              title="Éditer la séquence"
            >
              <PencilIcon class="h-4 w-4" />
            </button>
            
            <!-- Boutons de réorganisation -->
            <button 
              :disabled="sortedSequences.findIndex(s => s.id === sequence.id) === 0"
              :class="['p-1 rounded', sortedSequences.findIndex(s => s.id === sequence.id) === 0 ? 'text-gray-300 cursor-not-allowed' : 'text-blue-500 hover:text-blue-700 hover:bg-blue-50']"
              @click="handleMoveSequence(sequence, 'up')"
              title="Déplacer vers le haut"
            >
              <ArrowUpIcon class="h-4 w-4" />
            </button>
            
            <button 
              :disabled="sortedSequences.findIndex(s => s.id === sequence.id) === sortedSequences.length - 1"
              :class="['p-1 rounded', sortedSequences.findIndex(s => s.id === sequence.id) === sortedSequences.length - 1 ? 'text-gray-300 cursor-not-allowed' : 'text-blue-500 hover:text-blue-700 hover:bg-blue-50']"
              @click="handleMoveSequence(sequence, 'down')"
              title="Déplacer vers le bas"
            >
              <ArrowDownIcon class="h-4 w-4" />
            </button>
          </div>
          
          <!-- Boutons d'édition des métadonnées -->
          <div class="flex items-center space-x-2">
          <div class="flex items-center space-x-1 text-xs text-gray-500">
            <span>Intention</span>
            <FieldIcon
                :icon="LightBulbIcon"
                :text="sequence.intention ?? ''"
                color="text-amber-500"
                title="Intention"
                placeholder="Indiquez les émotions et sensations que doit ressentir votre public durant cette séquence..."
                :onSave="(val) => updateField('intention', val, sequence.id)"
            />
          </div>
          
          <div class="flex items-center space-x-1 text-xs text-gray-500">
            <span>Esthétique</span>
            <FieldIcon
                :icon="EyeIcon"
                :text="sequence.aesthetic_idea ?? ''"
                color="text-purple-500"
                title="Idée esthétique"
                placeholder="Décrivez l'approche artistique et visuelle que vous souhaitez mettre en œuvre pour cette séquence..."
                :onSave="(val) => updateField('aesthetic_idea', val, sequence.id)"
            />
          </div>
          
          <div class="flex items-center space-x-1 text-xs text-gray-500">
            <span>Info</span>
            <FieldIcon
                :icon="InformationCircleIcon"
                :text="sequence.information ?? ''"
                color="text-blue-500"
                title="Information"
                placeholder="Précisez les informations narratives essentielles qui justifient cette séquence..."
                :onSave="(val) => updateField('information', val, sequence.id)"
            />
          </div>
          </div>
        </div>
      </div>
      <div class="flex">
        <div class="text-justify w-3/4 mr-3">
          <div class="bg-secondary flex justify-between">
            <i>Personnages :
              <template v-if="sequence.sequencePersonnages && sequence.sequencePersonnages.length">
                  <span
                      v-for="(sp, index) in sequence.sequencePersonnages"
                      :key="sp.id"
                      class="inline-flex items-center mr-1"
                  >
                    <span 
                      class="text-blue-600 hover:underline cursor-pointer mr-1"
                      @click="updatePersonnage(sp.personnage, sequence.id)"
                    >
                      {{ getPersonnageName(sp.personnage) }}
                    </span>
                    <button
                      @click="removePersonnageFromSequence(sp.id, sequence.id)"
                      class="text-red-500 hover:text-red-700 text-xs ml-1 cursor-pointer"
                      title="Retirer de cette séquence"
                    >
                      ×
                    </button>
                    <span v-if="index < sequence.sequencePersonnages.length - 1" class="mr-1">, </span>
                  </span>
              </template>
              <span v-else>Aucun personnage</span>
            </i>
            <div class="flex items-center space-x-1">
              <div class="font-bold cursor-pointer" @click="updatePersonnage(null, sequence.id)">+</div>
              <button 
                @click="showPersonnageConfig = true"
                class="text-xs text-gray-500 hover:text-gray-700 cursor-pointer"
                title="Configurer la détection automatique"
              >
                ⚙️
              </button>
            </div>
          </div>
          <div v-html="sequence.description" class="text-gray-500 organizational-text"></div>
          
          <SceneList 
            :scenes="sequence.scenes" 
            :projectId="projectId"
            :sequenceId="sequence.id"
          />
        </div>

        <div>

          <!-- Critères - Seront analysés automatiquement par l'IA -->
          <div v-for="criteria in metadataStore.criterias" :key="criteria.id">
            {{ criteria.name }}
            <RatingStars
                :rating="getCriteriaRating(sequence, criteria.id)"
                :sequenceId="sequence.id"
                :criteriaId="criteria.id"
                @rate="updateRating"
            />
          </div>

        </div>
      </div>
    </li>
  </ul>
</template>

<style scoped>
/* Contenu organisationnel (Sequences) */
.organizational-text {
  color: #9CA3AF !important; /* gray-400 */
  font-style: italic;
}

.organizational-text * {
  color: #9CA3AF !important;
}

/* Amélioration des tooltips natifs */
[title] {
  position: relative;
}

[title]:hover::after {
  content: attr(title);
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  padding: 0.5rem 0.75rem;
  background-color: rgba(0, 0, 0, 0.9);
  color: white;
  font-size: 0.875rem;
  border-radius: 0.375rem;
  white-space: normal;
  max-width: 300px;
  z-index: 50;
  pointer-events: none;
  margin-bottom: 0.5rem;
  line-height: 1.4;
}

[title]:hover::before {
  content: '';
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-style: solid;
  border-width: 6px 6px 0 6px;
  border-color: rgba(0, 0, 0, 0.9) transparent transparent transparent;
  margin-bottom: 0.125rem;
  z-index: 50;
}
</style>
