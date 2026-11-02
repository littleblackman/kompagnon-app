<script setup lang="ts">
import SequenceRefText from '~/components/Project/SequenceRefText.vue';

/**
 * Ce qui manque au texte, lu par l'analyse : pour faire avancer puis boucler
 * un arc, ou pour remplir une fonction dramatique. Chaque élément peut viser
 * la séquence où il s'insérerait le mieux.
 */
defineProps({
  title: { type: String, required: true },
  items: { type: Array as () => Array<{ text: string; sequenceId: number | null }>, default: () => [] }
});
</script>

<template>
  <div v-if="items.length" class="mt-3 rounded-lg border border-dashed border-amber-300 bg-amber-50/60 p-3">
    <p class="mb-1.5 text-xs font-semibold text-amber-800">🤖 {{ title }}</p>
    <ol class="list-decimal space-y-1 pl-5 text-sm text-gray-800">
      <li v-for="(item, i) in items" :key="i">
        <SequenceRefText :text="item.text" />
        <span v-if="item.sequenceId" class="ml-1 text-xs text-gray-500">
          → <SequenceRefText :ids="[item.sequenceId]" />
        </span>
      </li>
    </ol>
  </div>
</template>
