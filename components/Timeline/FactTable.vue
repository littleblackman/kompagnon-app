<script setup lang="ts">
import { computed, reactive, watch } from 'vue';
import type { Timeline, TimelineFactRow, TimelineLayer, TimelineNature } from '~/types';
import { NATURE_CLASSES, NATURE_SHORT, LAYER_LABELS, CHECK_LABELS } from '~/utils/timeline';

/** Tous les faits, filtrables. Les filtres se souviennent d'une visite à l'autre. */
const props = defineProps<{
  timeline: Timeline;
  selected: { type: 'fact' | 'sequence'; id: number } | null;
}>();

const emit = defineEmits<{
  select: [item: { type: 'fact'; id: number }];
  issue: [code: string];
}>();

const STORAGE_KEY = 'kpgn_timeline_filters';

const filters = reactive({
  natures: ['evoque', 'fiche'] as TimelineNature[],
  layer: 'all' as 'all' | TimelineLayer,
  status: 'active' as 'active' | 'proposed' | 'rejected',
  contradicted: false,
  withIssues: false,
  search: '',
});

try {
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
  if (saved) Object.assign(filters, saved, { search: '' });
} catch { /* préférences illisibles : on garde les défauts */ }

watch(filters, () => {
  try {
    const { search, ...kept } = filters;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(kept));
  } catch { /* stockage indisponible */ }
});

const toggleNature = (nature: TimelineNature) => {
  const index = filters.natures.indexOf(nature);
  if (index === -1) filters.natures.push(nature);
  else filters.natures.splice(index, 1);
};

const rows = computed(() => {
  const query = filters.search.trim().toLowerCase();

  return props.timeline.facts.filter((fact: TimelineFactRow) => {
    if (!filters.natures.includes(fact.nature)) return false;
    if (filters.layer !== 'all' && fact.layer !== filters.layer) return false;
    if (filters.status === 'active' && fact.status === 'rejected') return false;
    if (filters.status !== 'active' && fact.status !== filters.status) return false;
    if (filters.contradicted && fact.check !== 'contradicted') return false;
    if (filters.withIssues && !fact.issues.length) return false;
    if (query) {
      const haystack = [fact.label, fact.who.join(' '), fact.quote, fact.date.anchor, fact.sequenceLabel, fact.personnageName]
        .filter(Boolean).join(' ').toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });
});

const pill = (on: boolean) =>
  ['inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors',
    on ? 'border-gray-800 font-semibold text-gray-900' : 'border-gray-200 text-gray-600 hover:bg-gray-50'];
</script>

<template>
  <div>
    <div class="mb-3 flex flex-wrap items-center gap-2">
      <button
        v-for="nature in (['evoque', 'fiche'] as TimelineNature[])"
        :key="nature"
        type="button"
        :class="pill(filters.natures.includes(nature))"
        @click="toggleNature(nature)"
      >
        <i class="h-2.5 w-2.5 rounded-sm" :class="NATURE_CLASSES[nature].dot"></i>{{ NATURE_SHORT[nature] }}
      </button>
      <span class="mx-1 h-4 w-px bg-gray-200"></span>
      <button type="button" :class="pill(filters.layer === 'all')" @click="filters.layer = 'all'">Toutes les couches</button>
      <button
        v-for="(label, key) in LAYER_LABELS"
        :key="key"
        type="button"
        :class="pill(filters.layer === key)"
        @click="filters.layer = key"
      >{{ label }}</button>
      <span class="mx-1 h-4 w-px bg-gray-200"></span>
      <button type="button" :class="pill(filters.status === 'proposed')" @click="filters.status = filters.status === 'proposed' ? 'active' : 'proposed'">À valider</button>
      <button type="button" :class="pill(filters.status === 'rejected')" @click="filters.status = filters.status === 'rejected' ? 'active' : 'rejected'">Rejetés</button>
      <button type="button" :class="pill(filters.contradicted)" @click="filters.contradicted = !filters.contradicted">Fiche contredite</button>
      <button type="button" :class="pill(filters.withIssues)" @click="filters.withIssues = !filters.withIssues">Avec alerte</button>
      <input
        v-model="filters.search"
        type="search"
        placeholder="Chercher un nom, un mot…"
        aria-label="Chercher"
        class="min-w-0 flex-1 basis-48 rounded-md border border-gray-200 px-3 py-1.5 text-sm"
      />
    </div>

    <div class="overflow-x-auto rounded-lg border border-gray-200 bg-white">
      <table class="w-full min-w-[900px] border-collapse text-[13.5px]">
        <thead>
          <tr class="text-left font-mono text-[11px] uppercase tracking-wider text-gray-500">
            <th class="border-b border-gray-200 px-2.5 py-2">Date</th>
            <th class="border-b border-gray-200 px-2.5 py-2">Précision</th>
            <th class="border-b border-gray-200 px-2.5 py-2">Ancrage</th>
            <th class="border-b border-gray-200 px-2.5 py-2">Fait</th>
            <th class="border-b border-gray-200 px-2.5 py-2">Qui</th>
            <th class="border-b border-gray-200 px-2.5 py-2">Source</th>
            <th class="border-b border-gray-200 px-2.5 py-2">Alertes</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="fact in rows"
            :key="fact.id"
            class="cursor-pointer border-b border-gray-100 align-top hover:bg-gray-50"
            :class="[
              fact.nature === 'fiche' ? 'bg-amber-50/50' : '',
              selected?.type === 'fact' && selected.id === fact.id ? 'bg-amber-100/60' : '',
              fact.status === 'rejected' ? 'text-gray-400 line-through' : '',
            ]"
            @click="emit('select', { type: 'fact', id: fact.id })"
          >
            <td class="whitespace-nowrap px-2.5 py-2 font-mono" :class="NATURE_CLASSES[fact.nature].row">
              {{ fact.display.relative }}
              <small class="block text-gray-500">{{ fact.display.absolute }}</small>
            </td>
            <td class="px-2.5 py-2">{{ fact.display.precision }}</td>
            <td class="px-2.5 py-2 text-[12.5px] text-gray-500">{{ fact.date.anchor }}</td>
            <td class="px-2.5 py-2">
              <span
                v-if="fact.check"
                class="mr-1 whitespace-nowrap rounded border px-1.5 font-mono text-xs font-semibold"
                :class="CHECK_LABELS[fact.check].classes"
              >{{ CHECK_LABELS[fact.check].label }}</span>
              <span v-if="fact.status === 'proposed'" class="mr-1 rounded border border-dashed border-gray-400 px-1.5 text-[11px] text-gray-500">proposé</span>
              {{ fact.label }}
            </td>
            <td class="px-2.5 py-2 text-[12.5px] text-gray-500">{{ fact.who.join(', ') }}</td>
            <td class="px-2.5 py-2 text-[12.5px] text-gray-500">
              {{ fact.sequenceLabel ?? (fact.personnageName ? `Fiche ${fact.personnageName}` : 'Saisi') }}
              <span v-if="fact.quote" class="block italic">« {{ fact.quote }} »</span>
            </td>
            <td class="px-2.5 py-2">
              <button
                v-for="code in fact.issues"
                :key="code"
                type="button"
                class="mb-1 mr-1 rounded border border-red-600 px-1 font-mono text-[11px] font-semibold text-red-700"
                @click.stop="emit('issue', code)"
              >{{ code }}</button>
            </td>
          </tr>
          <tr v-if="!rows.length">
            <td colspan="7" class="px-2.5 py-6 text-center text-sm text-gray-500">Aucun fait ne correspond à ces filtres.</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
