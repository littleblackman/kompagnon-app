<script setup lang="ts">
import RatingStars from "@/components/Project/RatingStars.vue";
import SequenceModal from "~/components/Project/SequenceModal.vue";
import PersonnageModal from "~/components/Project/PersonnageModal.vue";
import PersonnageDetectionModal from "~/components/Project/PersonnageDetectionModal.vue";
import PersonnageConfigModal from "~/components/Project/PersonnageConfigModal.vue";
import FieldIcon from '@/components/FieldIcon.vue'
import SceneList from '@/components/Project/SceneList.vue'
import { SparklesIcon,  PaintBrushIcon,  InformationCircleIcon } from '@heroicons/vue/24/solid'

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
      description: ''
    };
  }
  currentSequence.value = sequence;
  sequenceModalOpen.value = true;
};

const handleSaveSequence = async ({ sequence, afterSequenceId }) => {
  try {
    const savedSequence = await projectStore.saveSequence(sequence, props.partId, afterSequenceId);
    sequenceModalOpen.value = false;

    // Mise à jour locale des séquences
    if (props.sequences) {
      const existingIndex = props.sequences.findIndex(seq => seq.id === savedSequence.id);
      if (existingIndex !== -1) {
        props.sequences[existingIndex] = savedSequence;
      } else {
        props.sequences.push(savedSequence);
      }
      // Trier les séquences par position
      props.sequences.sort((a, b) => a.position - b.position);
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

/*** Icon field ***/
async function updateField(field: string, value: string, sequenceId: number) {
  try {
    const sequence = props.sequences.find(s => s.id === sequenceId);
    if (!sequence) return;


    // Mise à jour locale immédiate
    sequence[field] = value;
    

    // Sauvegarde via API
    await projectStore.saveSequence(sequence, props.partId);
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

// get note by criteria
const getCriteriaRating = (sequence, criteriaId) => {
  const sequenceCriteria = sequence.sequenceCriterias?.find(sc => sc.criteria?.id === criteriaId);
  return sequenceCriteria?.rating || 0;
};

const updateRating = async ({ value, sequenceId, criteriaId }) => {
  try {
    await projectStore.saveCriteria(value, sequenceId, criteriaId);
    
    // Mise à jour locale immédiate
    const sequence = props.sequences?.find(s => s.id === sequenceId);
    if (sequence && sequence.sequenceCriterias) {
      let sequenceCriteria = sequence.sequenceCriterias.find(sc => sc.criteria?.id === criteriaId);
      if (sequenceCriteria) {
        // Mettre à jour l'existant
        sequenceCriteria.rating = value;
      } else {
        // Créer nouvelle entrée (si elle n'existe pas localement)
        sequence.sequenceCriterias.push({
          criteria: { id: criteriaId },
          rating: value
        });
      }
    }

  } catch (error) {
    console.error("Erreur lors de la sauvegarde :", error);
  }
}




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

      <h3 :id="`sequence-${sequence.id}`" class="font-bold cursor-pointer text-black text-lg" @click="openSequenceModal(sequence)">
        {{ sequence.name }}
      </h3>
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

          <div class="flex">
            <FieldIcon
                :icon="SparklesIcon"
                :text="sequence.intention ?? ''"
                color="text-pink-500"
                :onSave="(val) => updateField('intention', val, sequence.id)"
            />

            <FieldIcon
                :icon="PaintBrushIcon"
                :text="sequence.aesthetic_idea ?? ''  "
                color="text-blue-500"
                :onSave="(val) => updateField('aesthetic_idea', val, sequence.id)"
            />

            <FieldIcon
                :icon="InformationCircleIcon"
                :text="sequence.information ?? ''"
                color="text-yellow-500"
                :onSave="(val) => updateField('information', val, sequence.id)"
            />
          </div>

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
</style>
