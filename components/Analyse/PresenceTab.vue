<script setup lang="ts">
import { computed, ref } from 'vue';
import { useProjectStore } from '~/store/project';
import { usePersonnageStore } from '~/store/personnage';
import { useStoryAxis } from '~/composables/useStoryAxis';
import { toRoman } from '~/utils/roman';

const props = defineProps<{ projectSlug: string }>();

const projectStore = useProjectStore();
const personnageStore = usePersonnageStore();
const { sequences } = useStoryAxis();

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

const selectedCharacter = ref<number | null>(null);

const goToSequence = (sequenceId: number) => {
  navigateTo(`/projets/projet-${props.projectSlug}#sequence-${sequenceId}`);
};
</script>

<template>
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
            <th class="sticky left-0 z-20 w-12 min-w-12 bg-gray-50 px-2 py-1.5"></th>
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
            <!--
              Initiales seules : le nom en toutes lettres tenait la
              largeur d'une dizaine de séquences pour une information
              qu'un survol suffit à rappeler.
            -->
            <th
              class="sticky left-0 z-10 w-12 min-w-12 cursor-pointer bg-white px-2 py-1.5"
              :class="selectedCharacter === row.id && 'bg-amber-50'"
              @click="selectedCharacter = selectedCharacter === row.id ? null : row.id"
            >
              <span
                class="flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-semibold transition-colors"
                :class="selectedCharacter === row.id
                  ? 'bg-amber-500 text-white'
                  : 'bg-amber-100 text-amber-800 hover:bg-amber-200'"
                data-controller="tooltip"
                :title="`${row.name} · ${row.count} apparition${row.count > 1 ? 's' : ''}`"
              >{{ initials(row.name) }}</span>
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
</template>
