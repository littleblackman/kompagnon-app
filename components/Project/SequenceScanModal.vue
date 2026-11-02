<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { usePersonnageStore } from '~/store/personnage';
import { useProjectStore } from '~/store/project';
import { useToast } from '~/composables/useToast';
import { useConfirm } from '~/composables/useConfirm';

const props = defineProps({
  open: { type: Boolean, default: false },
  sequence: { type: Object, default: null }
});

const emit = defineEmits(['close', 'applied']);

const personnageStore = usePersonnageStore();
const projectStore = useProjectStore();
const toast = useToast();
const { confirm } = useConfirm();

const busy = ref(false);
const scanned = ref(false);

/** Présence par personnage, scène par scène */
const rows = ref<Array<{ id: number; name: string; scenes: Set<number>; assigned: boolean }>>([]);
/** Noms propres absents de la fiche personnages */
const unknown = ref<Array<{ name: string; count: number; keep: boolean }>>([]);

const scenes = computed(() => {
  const list = [...(props.sequence?.scenes ?? [])];
  return list.sort((a: any, b: any) => a.position - b.position);
});

// Repartir d'une feuille blanche à chaque ouverture : un scan périmé
// donnerait un état de présence qui ne correspond plus au texte.
watch(() => props.open, (open) => {
  if (!open) return;
  rows.value = [];
  unknown.value = [];
  scanned.value = false;
});

const scan = () => {
  busy.value = true;

  const result = personnageStore.scanSequence(props.sequence);
  rows.value = result.rows;

  // Un nom qui ne revient pas sur l'ensemble de la séquence est trop
  // incertain pour être proposé comme personnage.
  unknown.value = result.unknown
    .filter(({ count }) => count >= 2)
    .map(candidate => ({ ...candidate, keep: false }));

  scanned.value = true;
  busy.value = false;
};

const toRemove = computed(() => rows.value.filter(r => r.assigned && r.scenes.size === 0));
const toAdd = computed(() => rows.value.filter(r => !r.assigned && r.scenes.size > 0));
const toCreate = computed(() => unknown.value.filter(n => n.keep));

const hasChanges = computed(
  () => toRemove.value.length > 0 || toAdd.value.length > 0 || toCreate.value.length > 0
);

/**
 * Remet les assignations de la séquence en accord avec le texte.
 * Les retraits passent en premier : un personnage absent du texte n'a rien
 * à faire dans la liste, même si l'ajout des autres échoue ensuite.
 */
const apply = async () => {
  const removals = toRemove.value;
  const additions = toAdd.value;
  const creations = toCreate.value;

  if (removals.length) {
    const ok = await confirm({
      title: `Retirer ${removals.length} personnage${removals.length > 1 ? 's' : ''} ?`,
      message: 'Ils sont assignés à cette séquence mais leur nom n\'apparaît dans aucune scène.',
      details: removals.map(r => r.name),
      confirmLabel: 'Appliquer'
    });
    if (!ok) return;
  }

  busy.value = true;

  try {
    for (const row of removals) {
      await personnageStore.removePersonnageFromSequence(props.sequence.id, row.id);
    }
    for (const row of additions) {
      await personnageStore.addPersonnageToSequence(row.id, props.sequence.id);
    }

    for (const candidate of creations) {
      // Un nom seul : l'auteur complétera la fiche, on ne devine pas
      const created = await personnageStore.savePersonnage(
        { firstName: candidate.name, lastName: '' },
        projectStore.project!.id
      );
      if (created?.id) {
        await personnageStore.addPersonnageToSequence(created.id, props.sequence.id);
      }
    }

    await projectStore.fetchProject(projectStore.project!.slug);

    const parts = [
      removals.length && `${removals.length} retiré${removals.length > 1 ? 's' : ''}`,
      additions.length && `${additions.length} ajouté${additions.length > 1 ? 's' : ''}`,
      creations.length && `${creations.length} créé${creations.length > 1 ? 's' : ''}`
    ].filter(Boolean);

    toast.success(parts.join(' · ') || 'Aucun changement');
    emit('applied');
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
    <div v-if="open && sequence" class="fixed inset-0 z-[160] flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/40" @click="emit('close')" />

      <div class="relative z-10 flex max-h-[85vh] w-full max-w-3xl flex-col rounded-2xl bg-white shadow-2xl">
        <div class="flex items-start justify-between gap-4 border-b border-gray-100 px-6 py-4">
          <div>
            <h3 class="text-base font-semibold text-gray-900">Vérifier les personnages</h3>
            <p class="text-sm text-gray-500">{{ sequence.name }}</p>
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
          <p v-if="!scenes.length" class="py-6 text-center text-sm italic text-gray-400">
            Cette séquence ne contient aucune scène.
          </p>

          <template v-else>
            <div v-if="!scanned" class="py-6 text-center">
              <p class="mb-4 text-sm text-gray-500">
                Chaque scène va être relue pour retrouver les personnages nommés,
                et comparer le résultat aux assignations actuelles.
              </p>
              <button
                @click="scan"
                :disabled="busy"
                class="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-600 disabled:opacity-50"
              >
                Relire les {{ scenes.length }} scène{{ scenes.length > 1 ? 's' : '' }}
              </button>
            </div>

            <template v-else>
              <!-- Présence scène par scène -->
              <div class="overflow-x-auto rounded-lg border border-gray-200">
                <table class="w-full border-collapse text-sm">
                  <thead>
                    <tr>
                      <th class="bg-gray-50 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Personnage
                      </th>
                      <th
                        v-for="(scene, index) in scenes"
                        :key="scene.id"
                        class="border-l border-gray-100 bg-gray-50 px-2 py-2 text-center text-[11px] font-medium text-gray-500"
                        data-controller="tooltip"
                        :title="scene.name"
                      >
                        {{ index + 1 }}
                      </th>
                      <th class="border-l border-gray-100 bg-gray-50 px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Verdict
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="row in rows" :key="row.id" class="border-t border-gray-100">
                      <td class="px-3 py-2 font-medium text-gray-800">{{ row.name }}</td>
                      <td
                        v-for="scene in scenes"
                        :key="scene.id"
                        class="border-l border-gray-100 px-2 py-2 text-center"
                      >
                        <span
                          class="inline-block h-2 w-2 rounded-full"
                          :class="row.scenes.has(scene.id) ? 'bg-amber-500' : 'bg-gray-200'"
                        ></span>
                      </td>
                      <td class="border-l border-gray-100 px-3 py-2 text-right text-xs">
                        <span v-if="row.assigned && row.scenes.size === 0" class="font-medium text-red-600">
                          à retirer
                        </span>
                        <span v-else-if="!row.assigned" class="font-medium text-green-700">
                          à ajouter
                        </span>
                        <span v-else class="text-gray-400">confirmé</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <!-- Noms propres inconnus -->
              <div v-if="unknown.length" class="mt-5">
                <h4 class="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Noms repérés, absents de vos personnages
                </h4>
                <p class="mb-2 text-xs text-gray-400">
                  Cochez ceux qui sont des personnages : ils seront créés et assignés à cette séquence.
                </p>
                <div class="flex flex-wrap gap-2">
                  <label
                    v-for="candidate in unknown"
                    :key="candidate.name"
                    class="flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1 text-sm transition-colors"
                    :class="candidate.keep
                      ? 'border-amber-400 bg-amber-50 text-amber-800'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'"
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

          <div class="flex items-center gap-3">
            <span v-if="!hasChanges" class="text-sm text-gray-400">Tout est déjà en accord</span>
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
    </div>
  </Teleport>
</template>
