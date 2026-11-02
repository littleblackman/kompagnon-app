<script setup lang="ts">
import { computed } from 'vue';
import type { Timeline, TimelineNature } from '~/types';
import { NATURE_CLASSES, shorten } from '~/utils/timeline';

/**
 * Frise en zones (colonnes) et couches (lignes). Zones et couches arrivent
 * de l'API ; on ne fait ici que ranger chaque élément dans sa case.
 */
const props = defineProps<{
  timeline: Timeline;
  selected: { type: 'fact' | 'sequence'; id: number } | null;
}>();

const emit = defineEmits<{ select: [item: { type: 'fact' | 'sequence'; id: number }] }>();

interface Chip {
  type: 'fact' | 'sequence';
  id: number;
  date: string;
  label: string;
  nature: TimelineNature;
  proposed: boolean;
  warn: boolean;
  key: number | null;
}

const cells = computed(() => {
  const grid: Record<string, Record<string, Chip[]>> = {};
  const push = (zone: string, layer: string, chip: Chip) => {
    grid[zone] ??= {};
    (grid[zone][layer] ??= []).push(chip);
  };

  props.timeline.sequences.forEach((row) => {
    if (!row.zone || !row.display) return;
    push(row.zone, 'present', {
      type: 'sequence',
      id: row.sequenceId,
      date: row.display.relative,
      label: `${row.label} · ${row.summary || row.name}`,
      nature: 'scene',
      proposed: row.status === 'proposed',
      warn: row.issues.length > 0,
      key: row.key ?? null,
    });
  });

  props.timeline.facts.forEach((fact) => {
    if (fact.status === 'rejected') return;
    push(fact.zone, fact.layer, {
      type: 'fact',
      id: fact.id,
      date: fact.display.relative,
      label: fact.label,
      nature: fact.nature,
      proposed: fact.status === 'proposed',
      warn: fact.issues.length > 0 || fact.check === 'contradicted',
      key: fact.key,
    });
  });

  // Chronologique dans la case ; sans date en fin
  Object.values(grid).forEach(layers => Object.values(layers).forEach(list =>
    list.sort((a, b) => (a.key ?? Infinity) - (b.key ?? Infinity))
  ));

  return grid;
});

const isSelected = (chip: Chip) => props.selected?.type === chip.type && props.selected.id === chip.id;
</script>

<template>
  <div v-if="!timeline.zones.length" class="rounded-lg bg-gray-50 p-6 text-center text-sm text-gray-500">
    Rien à placer pour l'instant. Lancez l'analyse des séquences pour construire la frise.
  </div>

  <div v-else class="overflow-x-auto rounded-lg border border-gray-200 bg-white">
    <div
      class="grid"
      :style="{ gridTemplateColumns: `110px repeat(${timeline.zones.length}, minmax(190px, 1fr))`, minWidth: `${110 + timeline.zones.length * 200}px` }"
    >
      <div class="border-b border-gray-200"></div>
      <div v-for="zone in timeline.zones" :key="zone.key" class="border-b border-l border-gray-200 p-2.5">
        <div class="font-mono text-[11px] font-semibold text-sky-800">{{ zone.count }} élément{{ zone.count > 1 ? 's' : '' }}</div>
        <div class="text-base font-bold uppercase leading-tight tracking-wide text-gray-900">{{ zone.title }}</div>
        <div class="text-xs text-gray-500">{{ zone.range }}</div>
      </div>

      <template v-for="layer in timeline.layers" :key="layer.key">
        <div class="border-b border-gray-200 p-2.5 text-xs font-bold uppercase leading-tight tracking-wide text-gray-500">
          {{ layer.label }}
        </div>
        <div
          v-for="zone in timeline.zones"
          :key="zone.key"
          class="flex min-w-0 flex-col gap-1.5 border-b border-l border-gray-200 p-2"
          :class="{ 'bg-sky-50/40': zone.key === 'present' }"
        >
          <button
            v-for="chip in cells[zone.key]?.[layer.key] ?? []"
            :key="`${chip.type}-${chip.id}`"
            type="button"
            class="block min-w-0 rounded border-l-4 px-2 py-1.5 text-left text-[12.5px] leading-snug transition hover:brightness-95"
            :class="[
              NATURE_CLASSES[chip.nature].chip,
              chip.proposed ? 'border-dashed opacity-80' : '',
              isSelected(chip) ? 'ring-2 ring-amber-500' : '',
            ]"
            @click="emit('select', { type: chip.type, id: chip.id })"
          >
            <span class="block font-mono text-[11px] opacity-80">
              {{ chip.date }}<span v-if="chip.warn" class="ml-1 font-semibold text-red-600">!</span>
            </span>
            {{ shorten(chip.label) }}
          </button>
        </div>
      </template>
    </div>
  </div>
</template>
