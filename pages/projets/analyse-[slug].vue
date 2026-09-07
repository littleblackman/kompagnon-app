<script setup lang="ts">
import { useRoute } from 'vue-router';
import { computed, onMounted, ref } from 'vue';
import { useAuthStore } from '~/store/auth';
import { useProjectStore } from '~/store/project';
import { useMetadataStore } from '~/store/metadata';
import { usePersonnageStore } from '~/store/personnage';
import ProjectSubMenu from '@/components/Project/SubMenu.vue';
import { TableCellsIcon, ChartBarIcon } from '@heroicons/vue/24/outline';
import { toRoman } from '~/utils/roman';

definePageMeta({ middleware: 'auth' });

const auth = useAuthStore();
auth.requireAuth();

const projectStore = useProjectStore();
const metadataStore = useMetadataStore();
const personnageStore = usePersonnageStore();
const route = useRoute();
const slug = route.params.slug as string;

onMounted(() => {
  if (projectStore.project?.slug !== slug) projectStore.fetchProject(slug);
});

/**
 * Les séquences dans l'ordre du récit : c'est l'axe commun aux deux analyses.
 * Le libellé court (I.2) sert d'étiquette d'axe, le nom complet au survol.
 */
const sequences = computed(() => {
  const columns: Array<{ id: number; label: string; name: string; part: string; partIndex: number }> = [];

  projectStore.parts.forEach((part, partIndex) => {
    (part.sequences ?? []).forEach((sequence, sequenceIndex) => {
      columns.push({
        id: sequence.id,
        label: `${toRoman(partIndex + 1)}.${sequenceIndex + 1}`,
        name: sequence.name,
        part: part.name,
        partIndex
      });
    });
  });

  return columns;
});

// ── Apparitions des personnages ───────────────────────────────────────

const characters = computed(() => {
  const presence = new Map<number, { personnage: any; sequences: Set<number> }>();

  projectStore.parts.forEach((part) => {
    (part.sequences ?? []).forEach((sequence: any) => {
      (sequence.sequencePersonnages ?? []).forEach((link: any) => {
        const personnage = link.personnage;
        if (!personnage) return;

        if (!presence.has(personnage.id)) {
          presence.set(personnage.id, { personnage, sequences: new Set() });
        }
        presence.get(personnage.id)!.sequences.add(sequence.id);
      });
    });
  });

  const order = sequences.value;

  return Array.from(presence.values())
    .map(({ personnage, sequences: appearsIn }) => {
      const indices = order
        .map((column, index) => (appearsIn.has(column.id) ? index : -1))
        .filter(index => index !== -1);

      // Plus longue absence entre deux apparitions : c'est là qu'un
      // personnage se fait oublier du lecteur.
      let longestGap = 0;
      for (let i = 1; i < indices.length; i++) {
        longestGap = Math.max(longestGap, indices[i] - indices[i - 1] - 1);
      }

      return {
        id: personnage.id,
        personnage,
        name: personnageStore.getPersonnageName(personnage),
        appearsIn,
        count: indices.length,
        first: indices.length ? order[indices[0]] : null,
        last: indices.length ? order[indices[indices.length - 1]] : null,
        longestGap
      };
    })
    .sort((a, b) => b.count - a.count);
});

/** Parties regroupées, pour l'en-tête en bandes de la grille */
const partBands = computed(() => {
  const bands: Array<{ name: string; label: string; span: number }> = [];

  projectStore.parts.forEach((part, index) => {
    const span = (part.sequences ?? []).length;
    if (span) bands.push({ name: part.name, label: toRoman(index + 1), span });
  });

  return bands;
});

// Première séquence de chaque partie : y poser un trait plus marqué
const partStarts = computed(() => {
  const starts = new Set<number>();
  let cursor = 0;
  partBands.value.forEach((band) => {
    starts.add(cursor);
    cursor += band.span;
  });
  return starts;
});

const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('');

const { getImageUrl } = useImages();

const selectedCharacter = ref<number | null>(null);

// ── KPI par séquence ──────────────────────────────────────────────────

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

const goToSequence = (sequenceId: number) => {
  navigateTo(`/projets/projet-${slug}#sequence-${sequenceId}`);
};
</script>

<template>
  <div v-if="!projectStore.project" class="p-8 text-center text-gray-500">Chargement…</div>

  <div v-else>
    <ProjectSubMenu :project-slug="slug" />

    <main class="mx-auto max-w-7xl p-4 sm:p-6 space-y-10">
      <header>
        <h1 class="text-2xl font-bold text-gray-900">Analyse</h1>
        <p class="text-sm text-gray-500">{{ projectStore.project.name }}</p>
      </header>

      <p v-if="!sequences.length" class="rounded-lg bg-gray-50 p-8 text-center text-gray-500">
        Ce projet ne contient encore aucune séquence.
      </p>

      <template v-else>
        <!-- ── Apparitions des personnages ── -->
        <section>
          <div class="mb-3 flex items-baseline justify-between gap-4">
            <h2 class="text-lg font-semibold text-gray-900">Apparition des personnages</h2>
            <p class="text-sm text-gray-400">
              {{ characters.length }} personnage{{ characters.length > 1 ? 's' : '' }} ·
              {{ sequences.length }} séquence{{ sequences.length > 1 ? 's' : '' }}
            </p>
          </div>

          <p v-if="!characters.length" class="rounded-lg bg-gray-50 p-6 text-center text-sm text-gray-500">
            Aucun personnage n'est encore assigné à une séquence.
          </p>

          <div v-else class="overflow-x-auto rounded-lg border border-gray-200">
            <table class="border-collapse text-sm">
              <thead>
                <!-- Bandes de parties : la structure se lit sans étiqueter chaque colonne -->
                <tr>
                  <th class="sticky left-0 z-20 w-44 min-w-44 bg-gray-50 px-3 py-1.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Personnage
                  </th>
                  <th
                    v-for="(band, index) in partBands"
                    :key="index"
                    :colspan="band.span"
                    class="border-l-2 border-gray-300 bg-gray-50 px-1 py-1.5 text-center text-[11px] font-semibold text-gray-600"
                    data-controller="tooltip"
                    :title="band.name"
                  >
                    <span class="block truncate">{{ band.label }}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="row in characters"
                  :key="row.id"
                  class="border-t border-gray-100 hover:bg-amber-50/40"
                  :class="selectedCharacter === row.id && 'bg-amber-50/60'"
                >
                  <th
                    class="sticky left-0 z-10 w-44 min-w-44 cursor-pointer bg-white px-3 py-1.5 text-left font-medium text-gray-800 hover:text-amber-700"
                    :class="selectedCharacter === row.id && 'bg-amber-50'"
                    @click="selectedCharacter = selectedCharacter === row.id ? null : row.id"
                  >
                    <span class="flex items-center gap-2">
                      <!-- Photo si elle est disponible, initiales sinon -->
                      <img
                        v-if="getImageUrl(row.personnage.avatar)"
                        :src="getImageUrl(row.personnage.avatar)!"
                        alt=""
                        class="h-6 w-6 flex-shrink-0 rounded-full object-cover"
                      />
                      <span
                        v-else
                        class="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-amber-100 text-[10px] font-semibold text-amber-700"
                      >{{ initials(row.name) }}</span>

                      <span class="truncate">{{ row.name }}</span>
                      <span class="ml-auto text-xs font-normal text-gray-400">{{ row.count }}</span>
                    </span>
                  </th>
                  <td
                    v-for="(column, index) in sequences"
                    :key="column.id"
                    class="w-[18px] min-w-[18px] p-0"
                    :class="partStarts.has(index) ? 'border-l-2 border-gray-300' : 'border-l border-gray-100'"
                  >
                    <button
                      type="button"
                      class="flex h-7 w-full items-center justify-center transition-colors hover:bg-gray-100"
                      data-controller="tooltip"
                      :title="column.name"
                      @click="goToSequence(column.id)"
                    >
                      <span
                        class="h-2 w-2 rounded-full transition-colors"
                        :class="row.appearsIn.has(column.id) ? 'bg-amber-500' : 'bg-gray-200'"
                      ></span>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Détail du personnage sélectionné -->
          <div
            v-if="selectedCharacter"
            class="mt-3 rounded-lg border border-amber-200 bg-amber-50/50 p-4"
          >
            <template v-for="row in characters.filter(c => c.id === selectedCharacter)" :key="row.id">
              <h3 class="mb-2 font-semibold text-gray-900">{{ row.name }}</h3>
              <dl class="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
                <div>
                  <dt class="text-xs uppercase tracking-wide text-gray-500">Apparitions</dt>
                  <dd class="font-medium text-gray-900">{{ row.count }} / {{ sequences.length }}</dd>
                </div>
                <div>
                  <dt class="text-xs uppercase tracking-wide text-gray-500">Entrée</dt>
                  <dd class="font-medium text-gray-900">{{ row.first?.name ?? '—' }}</dd>
                </div>
                <div>
                  <dt class="text-xs uppercase tracking-wide text-gray-500">Dernière</dt>
                  <dd class="font-medium text-gray-900">{{ row.last?.name ?? '—' }}</dd>
                </div>
                <div>
                  <dt class="text-xs uppercase tracking-wide text-gray-500">Absence la plus longue</dt>
                  <dd class="font-medium" :class="row.longestGap >= 3 ? 'text-red-600' : 'text-gray-900'">
                    {{ row.longestGap }} séquence{{ row.longestGap > 1 ? 's' : '' }}
                  </dd>
                </div>
              </dl>

              <!-- Les séquences nommées : « I.3 » ne dit rien hors de la grille -->
              <div class="mt-3 flex flex-wrap gap-1.5">
                <button
                  v-for="column in sequences.filter(c => row.appearsIn.has(c.id))"
                  :key="column.id"
                  type="button"
                  class="rounded-full border border-amber-200 bg-white px-2.5 py-1 text-xs text-amber-800 transition-colors hover:border-amber-400 hover:bg-amber-50"
                  data-controller="tooltip"
                  :title="`${column.part} · aller à la séquence`"
                  @click="goToSequence(column.id)"
                >
                  {{ column.name }}
                </button>
              </div>
            </template>
          </div>
        </section>

        <!-- ── KPI par séquence ── -->
        <section class="viz-root">
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
    </main>
  </div>
</template>
