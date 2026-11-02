<script setup lang="ts">
import type { Timeline, TimelineIssueRow } from '~/types';
import { SEVERITY_CLASSES, SEVERITY_LABELS } from '~/utils/timeline';

/**
 * Incohérences, de la plus grave à la moins grave. Celles du calendrier
 * (C…) sont recalculées à chaque chargement et disparaissent une fois la
 * date corrigée ; celles de l'analyse (I…) se résolvent ou s'écartent.
 */
const props = defineProps<{
  timeline: Timeline;
  highlighted: string | null;
}>();

const emit = defineEmits<{
  select: [item: { type: 'fact' | 'sequence'; id: number }];
  status: [issue: TimelineIssueRow, status: 'open' | 'resolved' | 'dismissed'];
}>();

const refsOf = (issue: TimelineIssueRow) => [
  ...issue.sequences.map((id) => {
    const row = props.timeline.sequences.find(s => s.sequenceId === id);
    return { type: 'sequence' as const, id, label: row ? `${row.label} · ${row.name}` : `Séquence ${id}` };
  }),
  ...issue.facts.map((id) => {
    const fact = props.timeline.facts.find(f => f.id === id);
    return { type: 'fact' as const, id, label: fact ? `${fact.display.relative} · ${fact.label}` : `Fait ${id}` };
  }),
];
</script>

<template>
  <div>
    <p class="mb-3 max-w-3xl text-sm text-gray-600">
      Le manuscrit prime sur les fiches. <b>Fort</b> casse le calendrier, <b>moyen</b> se voit à la lecture
      attentive, <b>faible</b> se corrige d'un mot. Les codes <span class="font-mono">C…</span> viennent du
      calendrier lui-même (jour de la semaine, date impossible).
    </p>

    <p v-if="!timeline.issues.length" class="rounded-lg bg-gray-50 p-6 text-center text-sm text-gray-500">
      Aucune incohérence relevée. Lancez « Vérifier la cohérence » une fois les séquences analysées.
    </p>

    <div class="grid gap-2.5">
      <article
        v-for="issue in timeline.issues"
        :id="`issue-${issue.code}`"
        :key="issue.code"
        class="grid scroll-mt-24 gap-1.5 rounded-lg border border-gray-200 bg-white p-3.5"
        :class="{ 'ring-2 ring-amber-500': highlighted === issue.code, 'opacity-60': issue.status === 'resolved' }"
      >
        <h3 class="flex flex-wrap items-baseline gap-2 text-base font-semibold">
          <span class="font-mono text-sm">{{ issue.code }}</span>
          <span class="rounded border px-1.5 py-0.5 font-mono text-[11px] uppercase" :class="SEVERITY_CLASSES[issue.severity]">
            {{ SEVERITY_LABELS[issue.severity] }}
          </span>
          <span :class="{ 'line-through': issue.status === 'resolved' }">{{ issue.title }}</span>
        </h3>
        <p v-if="issue.description" class="text-sm text-gray-700">{{ issue.description }}</p>
        <p v-if="issue.fix" class="border-t border-dashed border-gray-200 pt-1.5 text-sm">
          <b class="mr-1 font-mono text-xs text-green-700">CORRECTION</b>{{ issue.fix }}
        </p>
        <div class="flex flex-wrap items-center gap-1.5">
          <button
            v-for="ref in refsOf(issue)"
            :key="`${ref.type}-${ref.id}`"
            type="button"
            class="rounded-full border border-gray-200 px-2.5 py-0.5 text-xs text-gray-600 transition hover:border-amber-400 hover:bg-amber-50"
            @click="emit('select', { type: ref.type, id: ref.id })"
          >{{ ref.label }}</button>
          <span class="flex-1"></span>
          <template v-if="issue.origin === 'ia'">
            <button
              v-if="issue.status === 'open'"
              type="button"
              class="rounded-md border border-green-600 px-2.5 py-1 text-xs text-green-700 hover:bg-green-50"
              @click="emit('status', issue, 'resolved')"
            >Corrigée</button>
            <button
              v-else
              type="button"
              class="rounded-md border border-gray-300 px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-50"
              @click="emit('status', issue, 'open')"
            >Rouvrir</button>
            <button
              type="button"
              class="rounded-md border border-gray-300 px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-50"
              title="Ce n'est pas une incohérence : elle ne sera plus proposée"
              @click="emit('status', issue, 'dismissed')"
            >Écarter</button>
          </template>
        </div>
      </article>
    </div>
  </div>
</template>
