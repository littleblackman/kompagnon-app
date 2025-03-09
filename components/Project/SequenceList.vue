<script setup>
import RatingStars from "@/components/Project/RatingStars.vue";

const props = defineProps({
  sequences: Array,
  criterias: Array,
  personnages: Array,
});

// retrieve personnage names in line
const showPersonnages = (sequencePersonnages) => {
  if (!sequencePersonnages || !Array.isArray(sequencePersonnages)) {
    return 'Aucun personnage';
  }
  return sequencePersonnages
      .map(sp => sp.personnage ? `${sp.personnage.firstName} ${sp.personnage.lastName}` : null)
      .filter(Boolean)
      .join(', ') || 'Aucun personnage';
};

// get note by criteria
const getCriteriaRating = (sequence, criteriaId) => {
  const sequenceCriteria = sequence.sequenceCriterias?.find(sc => sc.id === criteriaId);
  return sequenceCriteria?.rating || 0;
};
</script>

<template>
  <ul>
    <li v-for="sequence in sequences" :key="sequence.id" class="pl-6 pr-3 pt-6 pb-6 bg-white">
      <h3 class="font-bold">{{ sequence.name }}</h3>

      <div class="flex">
        <div class="text-justify w-3/4 mr-3">
          <div class="bg-primary">
            <i>Personnages: {{ showPersonnages(sequence.sequencePersonnages) }}</i>
          </div>
          <p v-html="sequence.description"></p>
        </div>

        <div>
          <table class="w-full border-collapse">
            <tbody>
            <tr v-for="criteria in criterias" :key="criteria.id">
              <td class="text-xs p-2 align-top w-[100px] break-words">
                {{ criteria.name }}
              </td>
              <td class="p-2">
                <RatingStars :rating="getCriteriaRating(sequence, criteria.id)" />
              </td>
            </tr>
            </tbody>
          </table>
        </div>
      </div>
    </li>
  </ul>
</template>
