<script setup lang="ts">
import { computed, ref } from 'vue';
import { useProjectStore } from '~/store/project';
import { useMetadataStore } from '~/store/metadata';
import { useStoryAxis } from '~/composables/useStoryAxis';
import { TableCellsIcon, ChartBarIcon } from '@heroicons/vue/24/outline';

const projectStore = useProjectStore();
const metadataStore = useMetadataStore();
const { sequences } = useStoryAxis();

// Ordre fixe, jamais recyclé : la couleur suit le critère, pas son rang
// dans une liste filtrée.
const SERIES_COLORS = [
  '#2a78d6', '#eb6834', '#1baf7a', '#eda100',
  '#e87ba4', '#008300', '#4a3aa7', '#e34948'
];

/**
 * Notes indexées par séquence puis par critère, construites en un seul
 * parcours : les relire une par une reviendrait à retraverser l'arbre pour
 * chaque couple séquence × critère.
 */
const ratings = computed(() => {
  const index = new Map<number, Map<number, number>>();

  projectStore.parts.forEach((part) => {
    (part.sequences ?? []).forEach((sequence: any) => {
      const byCriteria = new Map<number, number>();
      (sequence.sequenceCriterias ?? []).forEach((link: any) => {
        if (link.criteria?.id != null && typeof link.rating === 'number') {
          byCriteria.set(link.criteria.id, link.rating);
        }
      });
      index.set(sequence.id, byCriteria);
    });
  });

  return index;
});

const series = computed(() =>
  (metadataStore.criterias ?? []).map((criteria: any, index: number) => ({
    id: criteria.id,
    name: criteria.name,
    color: SERIES_COLORS[index % SERIES_COLORS.length],
    points: sequences.value.map(
      column => ratings.value.get(column.id)?.get(criteria.id) ?? null
    )
  }))
);

const hiddenSeries = ref<Set<number>>(new Set());

const toggleSeries = (id: number) => {
  const next = new Set(hiddenSeries.value);
  next.has(id) ? next.delete(id) : next.add(id);
  hiddenSeries.value = next;
};

const visibleSeries = computed(() => series.value.filter(s => !hiddenSeries.value.has(s.id)));

const hasRatings = computed(() => series.value.some(s => s.points.some(p => p !== null)));

// ── Géométrie du graphe ───────────────────────────────────────────────

const CHART = { width: 900, height: 320, top: 16, right: 16, bottom: 44, left: 34 };
const MAX_RATING = 10;

const plotWidth = CHART.width - CHART.left - CHART.right;
const plotHeight = CHART.height - CHART.top - CHART.bottom;

const xFor = (index: number) => {
  const count = sequences.value.length;
  if (count <= 1) return CHART.left + plotWidth / 2;
  return CHART.left + (index / (count - 1)) * plotWidth;
};

const yFor = (value: number) => CHART.top + plotHeight - (value / MAX_RATING) * plotHeight;

/**
 * Une note manquante coupe la ligne au lieu d'être lue comme un zéro :
 * « pas encore évalué » et « nul » ne disent pas la même chose.
 */
const pathFor = (points: Array<number | null>) => {
  let path = '';
  let drawing = false;

  points.forEach((value, index) => {
    if (value === null) {
      drawing = false;
      return;
    }
    path += `${drawing ? 'L' : 'M'}${xFor(index).toFixed(1)} ${yFor(value).toFixed(1)} `;
    drawing = true;
  });

  return path.trim();
};

// Étiquettes d'axe allégées quand les séquences s'accumulent
const labelStep = computed(() => Math.ceil(sequences.value.length / 14) || 1);

const hoverIndex = ref<number | null>(null);
const showTable = ref(false);

const hoveredColumn = computed(() =>
  hoverIndex.value !== null ? sequences.value[hoverIndex.value] : null
);

const onChartMove = (event: MouseEvent) => {
  const svg = event.currentTarget as SVGSVGElement;
  const rect = svg.getBoundingClientRect();
  const ratio = (event.clientX - rect.left) / rect.width;
  const x = ratio * CHART.width;

  const count = sequences.value.length;
  if (!count) return;

  const position = ((x - CHART.left) / plotWidth) * (count - 1);
  hoverIndex.value = Math.max(0, Math.min(count - 1, Math.round(position)));
};
</script>

<template>
  <section>
    <div class="mb-3 flex items-baseline justify-between gap-4">
      <h2 class="text-lg font-semibold text-gray-900">Intensités par séquence</h2>
      <button
        @click="showTable = !showTable"
        class="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 transition-colors hover:bg-gray-50"
      >
        <component :is="showTable ? ChartBarIcon : TableCellsIcon" class="h-4 w-4" />
        {{ showTable ? 'Graphique' : 'Tableau' }}
      </button>
    </div>

    <p v-if="!hasRatings" class="rounded-lg bg-gray-50 p-6 text-center text-sm text-gray-500">
      Aucune intensité n'a encore été notée. Elles se saisissent depuis l'étoile d'une séquence.
    </p>

    <template v-else>
      <!-- Légende, qui sert aussi de filtre -->
      <div class="mb-3 flex flex-wrap gap-2">
        <button
          v-for="entry in series"
          :key="entry.id"
          @click="toggleSeries(entry.id)"
          :class="['flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                   hiddenSeries.has(entry.id)
                     ? 'border-gray-200 text-gray-400'
                     : 'border-gray-300 text-gray-700 hover:bg-gray-50']"
        >
          <span
            class="h-2.5 w-2.5 rounded-full"
            :style="{ backgroundColor: hiddenSeries.has(entry.id) ? '#d1d5db' : entry.color }"
          ></span>
          {{ entry.name }}
        </button>
      </div>

      <!-- Vue tableau : exigée par le contraste de certaines teintes -->
      <div v-if="showTable" class="overflow-x-auto rounded-lg border border-gray-200">
        <table class="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th class="sticky left-0 bg-gray-50 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Critère
              </th>
              <th
                v-for="column in sequences"
                :key="column.id"
                class="border-l border-gray-100 bg-gray-50 px-2 py-2 text-center text-[11px] font-medium text-gray-500"
                data-controller="tooltip" :title="column.name"
              >
                {{ column.label }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="entry in visibleSeries" :key="entry.id" class="border-t border-gray-100">
              <th class="sticky left-0 bg-white px-3 py-2 text-left font-medium text-gray-800">
                <span class="mr-2 inline-block h-2.5 w-2.5 rounded-full align-middle" :style="{ backgroundColor: entry.color }"></span>
                {{ entry.name }}
              </th>
              <td
                v-for="(value, index) in entry.points"
                :key="index"
                class="border-l border-gray-100 px-2 py-2 text-center tabular-nums"
                :class="value === null ? 'text-gray-300' : 'text-gray-800'"
              >
                {{ value ?? '–' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Graphique -->
      <div v-else class="rounded-lg border border-gray-200 bg-white p-2">
        <svg
          :viewBox="`0 0 ${CHART.width} ${CHART.height}`"
          class="w-full"
          role="img"
          aria-label="Intensités notées, par séquence"
          @mousemove="onChartMove"
          @mouseleave="hoverIndex = null"
        >
          <!-- Grille, volontairement en retrait -->
          <g>
            <template v-for="value in [0, 2, 4, 6, 8, 10]" :key="value">
              <line
                :x1="CHART.left" :x2="CHART.width - CHART.right"
                :y1="yFor(value)" :y2="yFor(value)"
                stroke="#e5e7eb" stroke-width="1"
              />
              <text
                :x="CHART.left - 8" :y="yFor(value) + 4"
                text-anchor="end" font-size="11" fill="#9ca3af"
              >{{ value }}</text>
            </template>
          </g>

          <!-- Repère de survol -->
          <line
            v-if="hoverIndex !== null"
            :x1="xFor(hoverIndex)" :x2="xFor(hoverIndex)"
            :y1="CHART.top" :y2="CHART.top + plotHeight"
            stroke="#9ca3af" stroke-width="1" stroke-dasharray="3 3"
          />

          <!-- Séries -->
          <g v-for="entry in visibleSeries" :key="entry.id">
            <path
              :d="pathFor(entry.points)"
              fill="none"
              :stroke="entry.color"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <template v-for="(value, index) in entry.points" :key="index">
              <circle
                v-if="value !== null"
                :cx="xFor(index)" :cy="yFor(value)" r="4"
                :fill="entry.color"
                stroke="#ffffff" stroke-width="2"
              />
            </template>
          </g>

          <!-- Étiquettes de séquence -->
          <g>
            <text
              v-for="(column, index) in sequences"
              :key="column.id"
              :x="xFor(index)"
              :y="CHART.height - 24"
              text-anchor="middle" font-size="11"
              :fill="hoverIndex === index ? '#111827' : '#9ca3af'"
            >{{ index % labelStep === 0 || hoverIndex === index ? column.label : '' }}</text>
          </g>
        </svg>

        <!-- Valeurs au survol -->
        <div class="min-h-[3.5rem] px-2 pb-1 pt-2">
          <template v-if="hoveredColumn">
            <p class="mb-1 text-xs font-semibold text-gray-700">
              {{ hoveredColumn.label }} · {{ hoveredColumn.name }}
            </p>
            <div class="flex flex-wrap gap-x-4 gap-y-1">
              <span
                v-for="entry in visibleSeries"
                :key="entry.id"
                class="flex items-center gap-1.5 text-xs text-gray-600"
              >
                <span class="h-2 w-2 rounded-full" :style="{ backgroundColor: entry.color }"></span>
                {{ entry.name }}
                <strong class="tabular-nums text-gray-900">
                  {{ entry.points[hoverIndex!] ?? '–' }}
                </strong>
              </span>
            </div>
          </template>
          <p v-else class="text-xs text-gray-400">
            Survolez le graphique pour lire les valeurs d'une séquence.
          </p>
        </div>
      </div>
    </template>
  </section>
</template>
