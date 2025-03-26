<script setup>
import RatingStars from "@/components/Project/RatingStars.vue";
import SequenceModal from "~/components/Project/SequenceModal.vue";
import PersonnageModal from "~/components/Project/PersonnageModal.vue";
import { useProjectStore } from "~/store/project";
import { useMetadataStore } from "~/store/metadata";
const projectStore = useProjectStore();
const metadataStore = useMetadataStore();

onMounted(() => {
  if (!metadataStore.loaded) {
    metadataStore.fetchMetadata();
  }
});

const props = defineProps({
  sequences: Array,
  personnages: Array,
  projectId: Number,
});

const sequenceModalOpen = ref(false);
const currentSequence = ref(null);
const personnageModalOpen = ref(false);
const selectedPersonnage = ref(null);

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
    const savedSequence = await projectStore.saveSequence(sequence, props.projectId, afterSequenceId);
    sequenceModalOpen.value = false;

    const existingIndex = props.sequences.findIndex(seq => seq.id === savedSequence.id);
    if (existingIndex !== -1) {
      props.sequences[existingIndex] = savedSequence;
    } else {
      props.sequences.push(savedSequence);
    }
  } catch (error) {
    console.error("Erreur lors de la sauvegarde :", error);
  }
};





// retrieve personnage names in line
const showPersonnages = (sequencePersonnages) => {
  if (!sequencePersonnages || !Array.isArray(sequencePersonnages)) {
    return 'Aucun personnage';
  }
  return sequencePersonnages
      .map(sp => sp.personnage ? [sp.personnage.firstName, sp.personnage.lastName].filter(Boolean).join(' ') : null)
      .filter(Boolean)
      .join(', ') || 'Aucun personnage';
};

const updatePersonnage = (personnage = null) => {

  if(!personnage) {
    personnage = {
      firstName: '',
      lastName: '',
      age: 0
    };
  }

  selectedPersonnage.value = personnage;
  personnageModalOpen.value = true;
};

const handleSavePersonnage = (personnage) => {
  console.log('personnage modifié :', personnage);
  personnageModalOpen.value = false;
};

const getPersonnageName = (p) => {
  return [p.firstName, p.lastName].filter(Boolean).join(' ');
};

// get note by criteria
const getCriteriaRating = (sequence, criteriaId) => {
  const sequenceCriteria = sequence.sequenceCriterias?.find(sc => sc.id === criteriaId);
  return sequenceCriteria?.rating || 0;
};

const updateRating = async ({ value, sequenceId, criteriaId }) => {
  console.log('update rating', value, sequenceId, criteriaId);
  try {
    await projectStore.saveCriteria(value, sequenceId, criteriaId);

  } catch (error) {
    console.error("Erreur lors de la sauvegarde :", error);
  }
}



</script>

<template>
  <ul class="bg-white">

    <button class="px-3 py-2 rounded bg-primary mt-4 cursor-pointer" @click="openSequenceModal()">
      + Ajouter une séquence
    </button>

    <SequenceModal v-if="sequenceModalOpen"
                   :sequence="currentSequence"
                   :projectId="projectId"
                   @close="sequenceModalOpen = false"
                   @save="handleSaveSequence"
              />

    <PersonnageModal
        v-if="personnageModalOpen"
        :personnage="selectedPersonnage"
        @close="personnageModalOpen = false"
        @save="handleSavePersonnage"
    />


    <li v-for="sequence in sequences" :key="sequence.id" class="pl-6 pr-3 pt-6 pb-6">
      <h3 class="font-bold cursor-pointer" @click="openSequenceModal(sequence)">{{ sequence.name }}</h3>

      <div class="flex">
        <div class="text-justify w-3/4 mr-3">
          <div class="bg-primary flex justify-between">
            <i>Personnages :
              <template v-if="sequence.sequencePersonnages && sequence.sequencePersonnages.length">
                  <span
                      v-for="(sp, index) in sequence.sequencePersonnages"
                      :key="sp.id"
                      class="text-blue-600 hover:underline cursor-pointer"
                      @click="updatePersonnage(sp.personnage)"
                  >
                    {{ getPersonnageName(sp.personnage) }}<span v-if="index < sequence.sequencePersonnages.length - 1">, </span>
                  </span>
              </template>
              <span v-else>Aucun personnage</span>
            </i>
            <div class="font-bold mr-1 cursor-pointer" @click="updatePersonnage()">+</div>
          </div>
          <p v-html="sequence.description"></p>
        </div>

        <div>
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
