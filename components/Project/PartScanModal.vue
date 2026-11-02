<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { usePersonnageStore } from '~/store/personnage';
import { useProjectStore } from '~/store/project';
import { useToast } from '~/composables/useToast';
import { useConfirm } from '~/composables/useConfirm';

/**
 * Vérification des personnages sur toute une partie : la relecture de
 * SequenceScanModal, appliquée à chaque séquence, sans la grille par scène
 * — illisible à cette échelle. On ne montre que les écarts.
 */
const props = defineProps({
  open: { type: Boolean, default: false },
  part: { type: Object, default: null }
});

const emit = defineEmits(['close']);

const personnageStore = usePersonnageStore();
const projectStore = useProjectStore();
const toast = useToast();
const { confirm } = useConfirm();

type Change = { id: number; name: string; scenes: number; keep: boolean };

const busy = ref(false);
const scanned = ref(false);

/** Écarts par séquence ; les séquences déjà en accord n'y figurent pas */
const changes = ref<Array<{ id: number; name: string; add: Change[]; remove: Change[] }>>([]);
/** Noms propres inconnus, cumulés sur la partie */
const unknown = ref<Array<{ name: string; count: number; sequenceIds: number[]; keep: boolean }>>([]);

const sequences = computed(() =>
  [...(props.part?.sequences ?? [])].sort((a: any, b: any) => a.position - b.position)
);

watch(() => props.open, (open) => {
  if (!open) return;
  changes.value = [];
  unknown.value = [];
  scanned.value = false;
});

const scan = () => {
  busy.value = true;

  const names = new Map<string, { count: number; sequenceIds: Set<number> }>();
  const next: typeof changes.value = [];

  sequences.value.forEach((sequence: any) => {
    const { rows, unknown: found } = personnageStore.scanSequence(sequence);

    const add = rows
      .filter(r => !r.assigned && r.scenes.size > 0)
      .map(r => ({ id: r.id, name: r.name, scenes: r.scenes.size, keep: true }));
    const remove = rows
      .filter(r => r.assigned && r.scenes.size === 0)
      .map(r => ({ id: r.id, name: r.name, scenes: 0, keep: true }));

    if (add.length || remove.length) {
      next.push({ id: sequence.id, name: sequence.name, add, remove });
    }

    found.forEach(({ name, count }) => {
      const entry = names.get(name) ?? { count: 0, sequenceIds: new Set<number>() };
      entry.count += count;
      entry.sequenceIds.add(sequence.id);
      names.set(name, entry);
    });
  });

  changes.value = next;

  // Même seuil que pour une séquence, compté sur la partie entière
  unknown.value = [...names.entries()]
    .filter(([, { count }]) => count >= 2)
    .map(([name, { count, sequenceIds }]) => ({ name, count, sequenceIds: [...sequenceIds], keep: false }))
    .sort((a, b) => b.count - a.count);

  scanned.value = true;
  busy.value = false;
};

const removals = computed(() =>
  changes.value.flatMap(seq => seq.remove.filter(r => r.keep).map(r => ({ ...r, sequenceId: seq.id, sequenceName: seq.name })))
);
const additions = computed(() =>
  changes.value.flatMap(seq => seq.add.filter(r => r.keep).map(r => ({ ...r, sequenceId: seq.id })))
);
const creations = computed(() => unknown.value.filter(n => n.keep));

const hasChanges = computed(
  () => removals.value.length > 0 || additions.value.length > 0 || creations.value.length > 0
);

const plural = (n: number, word: string) => `${n} ${word}${n > 1 ? 's' : ''}`;

const apply = async () => {
  const toRemove = removals.value;
  const toAdd = additions.value;
  const toCreate = creations.value;

  if (toRemove.length) {
    const ok = await confirm({
      title: `Retirer ${plural(toRemove.length, 'assignation')} ?`,
      message: 'Ces personnages sont assignés à une séquence où leur nom n\'apparaît dans aucune scène.',
      details: toRemove.map(r => `${r.name} — ${r.sequenceName}`),
      confirmLabel: 'Appliquer'
    });
    if (!ok) return;
  }

  busy.value = true;

  try {
    for (const row of toRemove) {
      await personnageStore.removePersonnageFromSequence(row.sequenceId, row.id);
    }
    for (const row of toAdd) {
      await personnageStore.addPersonnageToSequence(row.id, row.sequenceId);
    }

    for (const candidate of toCreate) {
      const created = await personnageStore.savePersonnage(
        { firstName: candidate.name, lastName: '' },
        projectStore.project!.id
      );
      if (!created?.id) continue;
      // Assigné partout où le nom a été relevé dans la partie
      for (const sequenceId of candidate.sequenceIds) {
        await personnageStore.addPersonnageToSequence(created.id, sequenceId);
      }
    }

    await projectStore.fetchProject(projectStore.project!.slug);

    const parts = [
      toRemove.length && `${toRemove.length} retiré${toRemove.length > 1 ? 's' : ''}`,
      toAdd.length && `${toAdd.length} ajouté${toAdd.length > 1 ? 's' : ''}`,
      toCreate.length && `${toCreate.length} créé${toCreate.length > 1 ? 's' : ''}`
    ].filter(Boolean);

    toast.success(parts.join(' · ') || 'Aucun changement');
    emit('close');
  } catch (error) {
    console.error('Erreur lors de la mise à jour des personnages :', error);
    toast.error('La mise à jour a échoué.');
  } finally {
    busy.value = false;
  }
};
</script>

<template>
  <Teleport to="body">
    <div v-if="open && part" class="fixed inset-0 z-[160] flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/40" @click="emit('close')" />

      <div class="relative z-10 flex max-h-[85vh] w-full max-w-3xl flex-col rounded-2xl bg-white shadow-2xl">
        <div class="flex items-start justify-between gap-4 border-b border-gray-100 px-6 py-4">
          <div>
            <h3 class="text-base font-semibold text-gray-900">Vérifier les personnages de la partie</h3>
            <p class="text-sm text-gray-500">{{ part.name }}</p>
          </div>
          <button
            @click="emit('close')"
            class="rounded-full p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            data-controller="tooltip"
            title="Fermer"
          >
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="flex-1 overflow-y-auto px-6 py-4">
          <p v-if="!sequences.length" class="py-6 text-center text-sm italic text-gray-400">
            Cette partie ne contient aucune séquence.
          </p>

          <template v-else>
            <div v-if="!scanned" class="py-6 text-center">
              <p class="mb-4 text-sm text-gray-500">
                Chaque scène de chaque séquence va être relue, et les personnages
                trouvés comparés aux assignations actuelles.
              </p>
              <button
                @click="scan"
                :disabled="busy"
                class="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-600 disabled:opacity-50"
              >
                Relire les {{ plural(sequences.length, 'séquence') }}
              </button>
            </div>

            <template v-else>
              <p v-if="!changes.length" class="py-4 text-center text-sm text-gray-500">
                Les assignations de toutes les séquences sont en accord avec le texte.
              </p>

              <!-- Écarts, séquence par séquence ; décocher pour garder en l'état -->
              <div v-for="seq in changes" :key="seq.id" class="mb-4 rounded-lg border border-gray-200 px-4 py-3">
                <h4 class="mb-2 text-sm font-semibold text-gray-800">{{ seq.name }}</h4>
                <div class="flex flex-wrap gap-2">
                  <label
                    v-for="row in seq.add"
                    :key="`add-${row.id}`"
                    class="flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1 text-sm transition-colors"
                    :class="row.keep ? 'border-green-300 bg-green-50 text-green-800' : 'border-gray-200 text-gray-400'"
                    data-controller="tooltip"
                    :title="`Nommé dans ${plural(row.scenes, 'scène')}, pas assigné`"
                  >
                    <input v-model="row.keep" type="checkbox" class="accent-green-600" />
                    + {{ row.name }}
                  </label>
                  <label
                    v-for="row in seq.remove"
                    :key="`remove-${row.id}`"
                    class="flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1 text-sm transition-colors"
                    :class="row.keep ? 'border-red-300 bg-red-50 text-red-700' : 'border-gray-200 text-gray-400'"
                    data-controller="tooltip"
                    title="Assigné, mais nommé dans aucune scène"
                  >
                    <input v-model="row.keep" type="checkbox" class="accent-red-600" />
                    − {{ row.name }}
                  </label>
                </div>
              </div>

              <div v-if="unknown.length" class="mt-5">
                <h4 class="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Noms repérés, absents de vos personnages
                </h4>
                <p class="mb-2 text-xs text-gray-400">
                  Cochez ceux qui sont des personnages : ils seront créés et assignés aux séquences où ils apparaissent.
                </p>
                <div class="flex flex-wrap gap-2">
                  <label
                    v-for="candidate in unknown"
                    :key="candidate.name"
                    class="flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1 text-sm transition-colors"
                    :class="candidate.keep
                      ? 'border-amber-400 bg-amber-50 text-amber-800'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'"
                    data-controller="tooltip"
                    :title="plural(candidate.sequenceIds.length, 'séquence')"
                  >
                    <input v-model="candidate.keep" type="checkbox" class="accent-amber-500" />
                    {{ candidate.name }}
                    <span class="text-xs text-gray-400">×{{ candidate.count }}</span>
                  </label>
                </div>
              </div>
            </template>
          </template>
        </div>

        <div v-if="scanned" class="flex items-center justify-between gap-3 border-t border-gray-100 px-6 py-4">
          <button
            @click="scan"
            :disabled="busy"
            class="rounded-lg px-3 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50"
          >
            Relire
          </button>

          <button
            @click="apply"
            :disabled="busy || !hasChanges"
            class="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-600 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            {{ busy ? 'Application…' : 'Appliquer' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
