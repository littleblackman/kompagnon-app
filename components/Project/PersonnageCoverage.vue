<script setup lang="ts">
import { computed, ref } from 'vue';
import { useProjectStore } from '~/store/project';
import { usePersonnageStore } from '~/store/personnage';
import { useStoryAxis } from '~/composables/useStoryAxis';
import { useToast } from '~/composables/useToast';
import { ExclamationTriangleIcon } from '@heroicons/vue/24/outline';

/**
 * Ce que l'analyse va lire : les séquences où le personnage est assigné, et
 * rien d'autre. Les séquences qui le nomment sans l'assigner sont signalées,
 * sans IA — c'est la même détection par nom que dans l'éditeur.
 */
const props = defineProps<{ personnage: { id: number; firstName?: string; lastName?: string } }>();
const emit = defineEmits<{ assigned: [] }>();

const projectStore = useProjectStore();
const personnageStore = usePersonnageStore();
const toast = useToast();
const { sequences: axis } = useStoryAxis();

const labelOf = computed(() => new Map(axis.value.map(column => [column.id, column.label])));

const allSequences = computed(() =>
  projectStore.parts.flatMap((part: any) => part.sequences ?? [])
);

const isAssigned = (sequence: any) =>
  (sequence.sequencePersonnages ?? []).some((sp: any) => sp.personnage?.id === props.personnage.id);

const assignedCount = computed(() => allSequences.value.filter(isAssigned).length);

/** Séquences non assignées dont au moins une scène nomme le personnage */
const unassignedMentions = computed(() =>
  allSequences.value
    .filter(sequence => !isAssigned(sequence))
    .map((sequence: any) => {
      const scenes = (sequence.scenes ?? []).filter((scene: any) =>
        personnageStore.analyzeContent(scene.content ?? '')
          .some((hit: any) => hit.personnage?.id === props.personnage.id)
      );
      return { id: sequence.id, name: sequence.name, label: labelOf.value.get(sequence.id) ?? '', scenes: scenes.length };
    })
    .filter(row => row.scenes > 0)
);

const name = computed(() => props.personnage.firstName || 'Ce personnage');

const assigning = ref<number | 'all' | null>(null);

/** Le store est mis à jour sur place : le relevé se recalcule sans recharger le projet */
const markAssigned = (sequenceId: number) => {
  const sequence: any = allSequences.value.find((s: any) => s.id === sequenceId);
  if (!sequence) return;
  sequence.sequencePersonnages = [...(sequence.sequencePersonnages ?? []), { personnage: props.personnage }];
};

const assign = async (sequenceIds: number[], key: number | 'all') => {
  assigning.value = key;
  let failures = 0;

  for (const sequenceId of sequenceIds) {
    const ok = await personnageStore.addPersonnageToSequence(props.personnage.id, sequenceId);
    ok ? markAssigned(sequenceId) : failures++;
  }

  assigning.value = null;
  const done = sequenceIds.length - failures;
  if (done) {
    toast.success(done > 1 ? `Personnage ajouté à ${done} séquences.` : 'Personnage ajouté à la séquence.');
    emit('assigned');
  }
  if (failures) toast.error(`${failures} ajout${failures > 1 ? 's ont' : ' a'} échoué.`);
};
</script>

<template>
  <div class="rounded-lg bg-white p-4 shadow">
    <p class="text-sm text-gray-700">
      L'analyse lit les
      <strong class="tabular-nums">{{ assignedCount }}</strong>
      séquence{{ assignedCount > 1 ? 's' : '' }} qui {{ assignedCount > 1 ? 'ont' : 'a' }} {{ name }} dans {{ assignedCount > 1 ? 'leurs' : 'ses' }} personnages, et seulement celles-là.
    </p>

    <div
      v-if="unassignedMentions.length"
      class="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3"
    >
      <div class="flex items-start gap-2">
        <ExclamationTriangleIcon class="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
        <div class="min-w-0 flex-1">
          <p class="text-sm font-medium text-amber-900">
            {{ unassignedMentions.length }} séquence{{ unassignedMentions.length > 1 ? 's nomment' : ' nomme' }}
            {{ name }} sans l'avoir dans {{ unassignedMentions.length > 1 ? 'leurs' : 'ses' }} personnages.
          </p>
          <p class="mt-0.5 text-xs text-amber-800">
            L'analyse ne {{ unassignedMentions.length > 1 ? 'les' : 'la' }} lira pas. Vérifiez qu'il s'agit bien de ce personnage, puis ajoutez-le.
          </p>

          <ul class="mt-2 space-y-1.5">
            <li
              v-for="row in unassignedMentions"
              :key="row.id"
              class="flex flex-wrap items-center justify-between gap-2 rounded-md bg-white px-3 py-2 text-sm"
            >
              <span class="min-w-0">
                <span class="mr-1.5 text-xs tabular-nums text-gray-400">{{ row.label }}</span>
                <span class="font-medium text-gray-900">{{ row.name }}</span>
                <span class="text-xs text-gray-500"> · cité dans {{ row.scenes }} scène{{ row.scenes > 1 ? 's' : '' }}</span>
              </span>
              <span class="flex shrink-0 gap-2">
                <NuxtLink
                  :to="`/projets/projet-${projectStore.project?.slug}#sequence-${row.id}`"
                  class="rounded-md px-2.5 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-100"
                >
                  Voir
                </NuxtLink>
                <button
                  type="button"
                  :disabled="assigning !== null"
                  class="rounded-md bg-amber-600 px-2.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-amber-700 disabled:opacity-50"
                  @click="assign([row.id], row.id)"
                >
                  {{ assigning === row.id ? 'Ajout…' : 'Ajouter' }}
                </button>
              </span>
            </li>
          </ul>

          <button
            v-if="unassignedMentions.length > 1"
            type="button"
            :disabled="assigning !== null"
            class="mt-2 text-sm font-medium text-amber-800 hover:text-amber-900 disabled:opacity-50"
            @click="assign(unassignedMentions.map(r => r.id), 'all')"
          >
            {{ assigning === 'all' ? 'Ajout…' : `Tout ajouter (${unassignedMentions.length})` }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
