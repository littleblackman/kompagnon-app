<script setup lang="ts">
import { computed, ref } from 'vue';
import { useProjectDiagnostics, type Finding, type FindingLevel } from '~/composables/useProjectDiagnostics';
import { CheckCircleIcon } from '@heroicons/vue/24/outline';

/**
 * Constats calculés sur le projet (voir useProjectDiagnostics) : ce qui
 * manque ou se répète, jamais un jugement sur le texte lui-même.
 */
const props = defineProps({
  projectSlug: { type: String, required: true }
});

const { sequences, findingsBySequence, globalFindings, personnageFindings, allFindings } = useProjectDiagnostics();

const LEVELS: Record<FindingLevel, { label: string; dot: string }> = {
  serious: { label: 'Important', dot: 'bg-red-500' },
  warning: { label: 'À regarder', dot: 'bg-amber-500' },
  info: { label: 'Pour info', dot: 'bg-gray-300' }
};

// Les simples remarques sont repliées par défaut : elles noieraient le reste
const showInfo = ref(false);

const visible = (list: Finding[]) =>
  showInfo.value ? list : list.filter(f => f.level !== 'info');

const counts = computed(() => {
  const result = { serious: 0, warning: 0, info: 0 } as Record<FindingLevel, number>;
  allFindings.value.forEach(f => result[f.level]++);
  return result;
});

const sequenceGroups = computed(() =>
  sequences.value
    .map(row => ({ ...row, findings: visible(findingsBySequence.value.get(row.id) ?? []) }))
    .filter(row => row.findings.length)
);

const groups = computed(() => [
  { title: 'Récit', findings: visible(globalFindings.value) },
  { title: 'Personnages', findings: visible(personnageFindings.value) }
].filter(group => group.findings.length));

const goToSequence = (sequenceId: number) =>
  navigateTo(`/projets/projet-${props.projectSlug}#sequence-${sequenceId}`);

const open = (finding: Finding) => {
  if (finding.personnageSlug) {
    navigateTo(`/projets/detail-${finding.personnageSlug}`);
  } else if (finding.sequenceId) {
    goToSequence(finding.sequenceId);
  }
};
</script>

<template>
  <section>
    <div class="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
      <h2 class="text-lg font-semibold text-gray-900">Points à vérifier</h2>
      <div class="flex flex-wrap items-center gap-3 text-sm text-gray-500">
        <span v-for="(meta, level) in LEVELS" :key="level" v-show="counts[level]" class="flex items-center gap-1.5">
          <span class="h-2 w-2 rounded-full" :class="meta.dot"></span>
          {{ counts[level] }} {{ meta.label.toLowerCase() }}
        </span>
        <label v-if="counts.info" class="flex cursor-pointer items-center gap-1.5 text-gray-600">
          <input v-model="showInfo" type="checkbox" class="rounded border-gray-300 text-amber-600 focus:ring-amber-500" />
          Afficher les remarques
        </label>
      </div>
    </div>

    <p v-if="!allFindings.length" class="flex items-center justify-center gap-2 rounded-lg bg-gray-50 p-6 text-sm text-gray-500">
      <CheckCircleIcon class="h-5 w-5 text-green-600" />
      Rien à signaler.
    </p>

    <p
      v-else-if="!groups.length && !sequenceGroups.length"
      class="rounded-lg bg-gray-50 p-6 text-center text-sm text-gray-500"
    >
      Aucun point important. {{ counts.info }} remarque{{ counts.info > 1 ? 's' : '' }} masquée{{ counts.info > 1 ? 's' : '' }}.
    </p>

    <div v-else class="grid gap-4 lg:grid-cols-2">
      <div v-for="group in groups" :key="group.title" class="rounded-lg border border-gray-200 bg-white">
        <h3 class="border-b border-gray-100 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
          {{ group.title }}
        </h3>
        <ul class="divide-y divide-gray-100">
          <li v-for="finding in group.findings" :key="finding.id">
            <button
              type="button"
              class="flex w-full items-start gap-3 px-4 py-2.5 text-left transition-colors hover:bg-gray-50 disabled:cursor-default disabled:hover:bg-transparent"
              :disabled="!finding.personnageSlug && !finding.sequenceId"
              @click="open(finding)"
            >
              <span class="mt-1.5 h-2 w-2 shrink-0 rounded-full" :class="LEVELS[finding.level].dot"></span>
              <span>
                <span class="block text-sm font-medium text-gray-900">{{ finding.title }}</span>
                <span v-if="finding.detail" class="block text-xs text-gray-500">{{ finding.detail }}</span>
              </span>
            </button>
          </li>
        </ul>
      </div>

      <div v-if="sequenceGroups.length" class="rounded-lg border border-gray-200 bg-white lg:col-span-2">
        <h3 class="border-b border-gray-100 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
          Séquences
        </h3>
        <ul class="divide-y divide-gray-100">
          <li v-for="row in sequenceGroups" :key="row.id">
            <button
              type="button"
              class="flex w-full flex-col gap-1 px-4 py-2.5 text-left transition-colors hover:bg-gray-50 sm:flex-row sm:items-start sm:gap-4"
              @click="goToSequence(row.id)"
            >
              <span class="shrink-0 text-sm font-medium text-gray-900 sm:w-56">
                <span class="mr-1.5 text-xs tabular-nums text-gray-400">{{ row.label }}</span>
                {{ row.name }}
              </span>
              <span class="flex flex-wrap gap-1.5">
                <span
                  v-for="finding in row.findings"
                  :key="finding.id"
                  class="inline-flex items-center gap-1.5 rounded-full border border-gray-200 px-2.5 py-0.5 text-xs text-gray-700"
                  data-controller="tooltip"
                  :title="finding.detail"
                >
                  <span class="h-1.5 w-1.5 rounded-full" :class="LEVELS[finding.level].dot"></span>
                  {{ finding.title }}
                </span>
              </span>
            </button>
          </li>
        </ul>
      </div>
    </div>
  </section>
</template>
