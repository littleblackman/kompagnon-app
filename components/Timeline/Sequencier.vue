<script setup lang="ts">
import { computed } from 'vue';
import { ArrowPathIcon, PencilSquareIcon, CheckIcon, SparklesIcon } from '@heroicons/vue/24/outline';
import type { Timeline, TimelineSequenceRow } from '~/types';
import { dayLabel } from '~/utils/timeline';

/**
 * Les séquences dans l'ordre du livre face au calendrier. ↺ et J+n
 * arrivent calculés de l'API.
 */
const props = defineProps<{
  timeline: Timeline;
  busy: boolean;
}>();

const emit = defineEmits<{
  select: [item: { type: 'sequence'; id: number }];
  edit: [row: TimelineSequenceRow];
  extract: [sequenceId: number];
  validate: [sequenceId: number];
  issue: [code: string];
}>();

/** Lignes regroupées par partie, pour l'intertitre */
const groups = computed(() => {
  const list: Array<{ part: string; rows: TimelineSequenceRow[] }> = [];
  props.timeline.sequences.forEach((row) => {
    const last = list[list.length - 1];
    if (last && last.part === row.part) last.rows.push(row);
    else list.push({ part: row.part, rows: [row] });
  });
  return list;
});

const hasProposed = (row: TimelineSequenceRow) =>
  row.status === 'proposed' || props.timeline.facts.some(f => f.sequenceId === row.sequenceId && f.status === 'proposed');
</script>

<template>
  <div>
    <p class="mb-3 max-w-3xl text-sm text-gray-600">
      Les séquences dans l'ordre du livre. <b>J</b> compte les jours depuis le jour zéro.
      <span class="rounded border border-amber-500 bg-amber-50 px-1 font-mono text-xs text-amber-800">↺</span>
      signale une séquence qui revient avant une scène déjà lue.
    </p>

    <div class="overflow-x-auto rounded-lg border border-gray-200 bg-white">
      <table class="w-full min-w-[1100px] border-collapse text-[13.5px]">
        <thead>
          <tr class="text-left font-mono text-[11px] uppercase tracking-wider text-gray-500">
            <th class="border-b border-gray-200 px-2.5 py-2">N°</th>
            <th class="border-b border-gray-200 px-2.5 py-2">Séquence</th>
            <th class="border-b border-gray-200 px-2.5 py-2">Date</th>
            <th class="border-b border-gray-200 px-2.5 py-2">J</th>
            <th class="border-b border-gray-200 px-2.5 py-2">Moment</th>
            <th class="border-b border-gray-200 px-2.5 py-2">Lieu</th>
            <th class="border-b border-gray-200 px-2.5 py-2">Personnages</th>
            <th class="border-b border-gray-200 px-2.5 py-2">Ce qui se passe</th>
            <th class="border-b border-gray-200 px-2.5 py-2">Alertes</th>
            <th class="border-b border-gray-200 px-2.5 py-2"></th>
          </tr>
        </thead>
        <tbody>
          <template v-for="group in groups" :key="group.part">
            <tr>
              <td colspan="10" class="bg-sky-50 px-2.5 py-2 text-base font-bold uppercase tracking-wide text-sky-900">
                {{ group.part }}
              </td>
            </tr>
            <tr
              v-for="row in group.rows"
              :key="row.sequenceId"
              class="border-b border-gray-100 align-top"
              :class="row.analysed ? 'cursor-pointer hover:bg-gray-50' : 'text-gray-400'"
              @click="row.analysed && emit('select', { type: 'sequence', id: row.sequenceId })"
            >
              <td class="px-2.5 py-2 font-mono">{{ String(row.number).padStart(2, '0') }}</td>
              <td class="px-2.5 py-2 font-semibold">
                {{ row.label }} · {{ row.name }}
                <span v-if="row.flashback" class="ml-1 whitespace-nowrap rounded border border-amber-500 bg-amber-50 px-1 font-mono text-xs text-amber-800">↺</span>
                <span v-if="row.stale" class="ml-1 whitespace-nowrap rounded bg-gray-100 px-1.5 text-[11px] font-normal text-gray-600" title="Une scène a été réécrite depuis la dernière lecture">réécrite</span>
                <span v-if="row.status === 'proposed'" class="ml-1 whitespace-nowrap rounded border border-dashed border-gray-400 px-1.5 text-[11px] font-normal text-gray-500">proposée</span>
              </td>
              <template v-if="row.analysed && row.display">
                <td class="whitespace-nowrap px-2.5 py-2 font-mono">
                  {{ row.display.relative }}
                  <small class="block text-gray-500">
                    {{ row.display.weekday ? row.display.weekday.slice(0, 3) + '.' : '' }} {{ row.display.absolute }}
                  </small>
                </td>
                <td class="whitespace-nowrap px-2.5 py-2 font-mono">{{ dayLabel(row.dayOffset) }}</td>
                <td class="px-2.5 py-2 text-gray-600">{{ row.date?.time }}</td>
                <td class="px-2.5 py-2 text-gray-600">{{ row.place }}</td>
                <td class="px-2.5 py-2 text-gray-600">{{ row.who?.join(', ') }}</td>
                <td class="px-2.5 py-2">{{ row.summary }}</td>
              </template>
              <td v-else colspan="6" class="px-2.5 py-2 italic">Pas encore analysée</td>
              <td class="px-2.5 py-2">
                <button
                  v-for="code in row.issues"
                  :key="code"
                  type="button"
                  class="mb-1 mr-1 rounded border border-red-600 px-1 font-mono text-[11px] font-semibold text-red-700"
                  @click.stop="emit('issue', code)"
                >{{ code }}</button>
              </td>
              <td class="whitespace-nowrap px-2.5 py-2 text-right">
                <button
                  type="button"
                  class="rounded p-1.5 text-gray-500 transition hover:bg-amber-50 hover:text-amber-700 disabled:opacity-40"
                  :title="row.analysed ? 'Relire cette séquence' : 'Analyser cette séquence'"
                  :disabled="busy"
                  @click.stop="emit('extract', row.sequenceId)"
                >
                  <component :is="row.analysed ? ArrowPathIcon : SparklesIcon" class="h-4 w-4" />
                </button>
                <template v-if="row.analysed">
                  <button
                    type="button"
                    class="rounded p-1.5 text-gray-500 transition hover:bg-amber-50 hover:text-amber-700"
                    title="Corriger la date"
                    @click.stop="emit('edit', row)"
                  >
                    <PencilSquareIcon class="h-4 w-4" />
                  </button>
                  <button
                    v-if="hasProposed(row)"
                    type="button"
                    class="rounded p-1.5 text-gray-500 transition hover:bg-green-50 hover:text-green-700"
                    title="Valider la séquence et ses faits"
                    @click.stop="emit('validate', row.sequenceId)"
                  >
                    <CheckIcon class="h-4 w-4" />
                  </button>
                </template>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
  </div>
</template>
