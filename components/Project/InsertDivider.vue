<script setup lang="ts">
import { computed } from 'vue';
import { PlusIcon } from '@heroicons/vue/24/outline';

const props = defineProps({
  /** Ce qu'on insère : « Scène », « Séquence », « Partie » */
  label: {
    type: String,
    required: true
  },
  /**
   * Rendu compact : un simple « + » et le libellé en tooltip.
   * Pour les listes denses (scènes), où une pastille texte entre chaque
   * élément alourdirait la lecture.
   */
  dense: {
    type: Boolean,
    default: false
  }
});

defineEmits(['insert']);

const tooltip = computed(() => `Insérer une ${props.label.toLowerCase()} ici`);
</script>

<template>
  <!--
    Zone d'insertion entre deux éléments : une ligne fine et un simple « + ».
    Le libellé passe dans un tooltip maison — data-tooltip et non title,
    sinon l'infobulle native se superpose à la nôtre.
  -->
  <div
    :class="[
      'group/divider relative flex items-center gap-2 print:hidden cursor-pointer',
      dense ? 'py-1' : 'py-1.5'
    ]"
    @click="$emit('insert')"
  >
    <span class="h-px flex-1 bg-amber-200 group-hover/divider:bg-amber-400 transition-colors"></span>

    <button
      type="button"
      @click.stop="$emit('insert')"
      :data-tooltip="tooltip"
      :aria-label="tooltip"
      :class="[
        'tooltip-anchor inline-flex items-center justify-center rounded-full',
        'border border-amber-200 bg-white text-amber-500 whitespace-nowrap',
        'group-hover/divider:border-amber-400 group-hover/divider:text-amber-700',
        'group-hover/divider:bg-amber-50 transition-colors',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400',
        dense ? 'h-5 w-5' : 'gap-1 px-2 py-0.5 text-[11px] font-medium'
      ]"
    >
      <PlusIcon class="h-3 w-3" />
      <span v-if="!dense">{{ label }}</span>
    </button>

    <span class="h-px flex-1 bg-amber-200 group-hover/divider:bg-amber-400 transition-colors"></span>
  </div>
</template>

<style scoped>
.tooltip-anchor {
  position: relative;
}

.tooltip-anchor:hover::after {
  content: attr(data-tooltip);
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  margin-bottom: 0.5rem;
  padding: 0.375rem 0.625rem;
  background-color: rgba(0, 0, 0, 0.9);
  color: #fff;
  font-size: 0.75rem;
  line-height: 1.3;
  border-radius: 0.375rem;
  white-space: nowrap;
  pointer-events: none;
  z-index: 50;
}

.tooltip-anchor:hover::before {
  content: '';
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  margin-bottom: 0.125rem;
  width: 0;
  height: 0;
  border-style: solid;
  border-width: 6px 6px 0 6px;
  border-color: rgba(0, 0, 0, 0.9) transparent transparent transparent;
  pointer-events: none;
  z-index: 50;
}
</style>
