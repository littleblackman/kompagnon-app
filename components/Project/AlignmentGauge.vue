<script setup lang="ts">
import { computed } from 'vue';

/**
 * Curseur à trois crans : le contenu tient-il ce que le champ annonce ?
 *
 * Le verdict vient de l'analyse par modèle ; tant qu'elle n'a pas tourné,
 * le curseur reste à « non évalué » plutôt que d'afficher un avis par défaut,
 * qui serait pris pour un jugement.
 */
const props = defineProps({
  /** 1 pas bon · 2 moyen · 3 validé · null non évalué */
  level: { type: Number, default: null },
  /** Ce qui est jugé : « intention », « idée esthétique »… */
  label: { type: String, required: true },
  /** Justification renvoyée par l'analyse, affichée en infobulle */
  comment: { type: String, default: '' }
});

const STEPS = [
  { level: 1, name: 'Ne colle pas', color: 'bg-red-500' },
  { level: 2, name: 'Partiellement', color: 'bg-amber-500' },
  { level: 3, name: 'Validé', color: 'bg-green-600' }
];

const current = computed(() => STEPS.find(s => s.level === props.level) ?? null);

const tooltip = computed(() => {
  const verdict = current.value
    ? `${props.label} — ${current.value.name}`
    : `${props.label} — non évalué`;
  return props.comment ? `${verdict} · ${props.comment}` : verdict;
});
</script>

<template>
  <span
    class="inline-flex items-center gap-1"
    data-controller="tooltip"
    :title="tooltip"
  >
    <!-- Trois crans : la position porte le sens autant que la couleur -->
    <span
      v-for="step in STEPS"
      :key="step.level"
      :class="[
        'h-1.5 rounded-full transition-colors',
        step.level === 2 ? 'w-3' : 'w-2',
        level === null
          ? 'bg-gray-200'
          : level >= step.level ? step.color : 'bg-gray-200'
      ]"
    ></span>

    <!-- Le verdict est aussi écrit : une couleur seule ne se lit pas -->
    <span
      v-if="current"
      class="text-[10px] font-medium"
      :class="{
        'text-red-600': level === 1,
        'text-amber-600': level === 2,
        'text-green-700': level === 3
      }"
    >{{ current.name }}</span>
    <span v-else class="text-[10px] text-gray-400">non évalué</span>
  </span>
</template>
