<script setup lang="ts">
import { computed, ref } from 'vue';
import { useProjectStore } from '~/store/project';
import { useTodoStore, TODO_CATEGORIES } from '~/store/todo';
import type { TodoCategory } from '~/types';
import { toRoman } from '~/utils/roman';

defineProps({
  /** Titre « Notes » au-dessus de la liste, inutile quand un onglet le porte déjà */
  heading: { type: Boolean, default: true }
});

const emit = defineEmits(['open-scene']);

const projectStore = useProjectStore();
const todoStore = useTodoStore();

/**
 * Toutes les notes du projet, dans l'ordre du récit, avec leur chemin.
 * Sans le chemin, une note sortie de son contexte ne veut plus rien dire.
 */
const notes = computed(() => {
  const rows: Array<{
    sequenceId: number;
    sceneId: number;
    sceneName: string;
    path: string;
    note: string;
  }> = [];

  projectStore.parts.forEach((part, partIndex) => {
    (part.sequences ?? []).forEach((sequence) => {
      (sequence.scenes ?? []).forEach((scene: any) => {
        if (!scene.notes?.trim()) return;
        rows.push({
          sequenceId: sequence.id,
          sceneId: scene.id,
          sceneName: scene.name || 'Sans titre',
          path: `${toRoman(partIndex + 1)}. ${part.name} › ${sequence.name}`,
          note: scene.notes
        });
      });
    });
  });

  return rows;
});

// ── Filtre ──────────────────────────────────────────────────────────────

const search = ref('');
const sequenceFilter = ref<number | null>(null);

/** Seules les séquences qui portent des notes valent d'être proposées */
const sequenceOptions = computed(() => {
  const seen = new Map<number, string>();
  notes.value.forEach(row => seen.set(row.sequenceId, row.path));
  return [...seen.entries()].map(([id, path]) => ({ id, path }));
});

const normalize = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

const filtered = computed(() => {
  const needle = normalize(search.value.trim());
  return notes.value.filter(row =>
    (!sequenceFilter.value || row.sequenceId === sequenceFilter.value)
    && (!needle || normalize(`${row.sceneName} ${row.note}`).includes(needle))
  );
});

// ── Note → tâche ────────────────────────────────────────────────────────

/** La note reste en place : la tâche en reprend le texte, ou une partie */
const drafting = ref<{ sceneId: number; label: string; category: TodoCategory } | null>(null);

const plainText = (html: string) => html.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

const startDraft = (row: { sceneId: number; note: string }) => {
  drafting.value = { sceneId: row.sceneId, label: plainText(row.note), category: 'autre' };
};

const tasksFromNote = (sceneId: number) =>
  todoStore.todos.filter(t => t.origin === 'note' && t.sceneId === sceneId).length;

const createTask = async () => {
  const draft = drafting.value;
  if (!draft?.label.trim() || !projectStore.project?.id) return;
  const saved = await todoStore.saveTodo({
    projectId: projectStore.project.id,
    label: draft.label.trim(),
    category: draft.category,
    origin: 'note',
    sceneId: draft.sceneId
  });
  if (saved) drafting.value = null;
};
</script>

<template>
  <section>
    <h4 v-if="heading" class="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
      Notes
      <span v-if="notes.length" class="ml-1 font-normal normal-case text-gray-400">{{ notes.length }}</span>
    </h4>

    <div v-if="notes.length" class="mb-4 flex flex-wrap gap-2">
      <input
        v-model="search"
        type="search"
        placeholder="Chercher dans les notes…"
        class="min-w-0 flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
      />
      <select
        v-if="sequenceOptions.length > 1"
        v-model="sequenceFilter"
        class="min-w-0 max-w-full rounded-lg border border-gray-200 bg-white py-2 pl-2 pr-7 text-sm text-gray-700"
      >
        <option :value="null">Toutes les séquences</option>
        <option v-for="option in sequenceOptions" :key="option.id" :value="option.id">{{ option.path }}</option>
      </select>
    </div>

    <p v-if="!notes.length" class="py-8 text-center text-sm italic text-gray-400">
      Aucune note pour l'instant.
    </p>
    <p v-else-if="!filtered.length" class="py-8 text-center text-sm italic text-gray-400">
      Aucune note ne correspond.
    </p>

    <ul v-else class="space-y-3">
      <li
        v-for="row in filtered"
        :key="row.sceneId"
        class="cursor-pointer rounded-sm bg-amber-100/70 p-4 shadow-sm transition-shadow hover:shadow-md"
        @click="emit('open-scene', row.sceneId)"
      >
        <p class="mb-1 text-[11px] uppercase tracking-wide text-amber-700/70">
          {{ row.path }}
        </p>
        <p class="mb-2 text-sm font-semibold text-amber-950">{{ row.sceneName }}</p>
        <p class="whitespace-pre-wrap text-sm leading-relaxed text-amber-950/90">{{ row.note }}</p>

        <form
          v-if="drafting?.sceneId === row.sceneId"
          class="mt-3 space-y-2 border-t border-amber-200/70 pt-3"
          @click.stop
          @submit.prevent="createTask"
        >
          <textarea
            v-model="drafting.label"
            rows="2"
            class="w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
          />
          <div class="flex flex-wrap items-center gap-2">
            <select v-model="drafting.category" class="rounded-lg border border-amber-200 bg-white py-1.5 pl-2 pr-7 text-sm text-gray-700">
              <option v-for="(label, key) in TODO_CATEGORIES" :key="key" :value="key">{{ label }}</option>
            </select>
            <button
              type="submit"
              :disabled="!drafting.label.trim()"
              class="rounded-lg bg-amber-500 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-amber-600 disabled:opacity-40"
            >Créer la tâche</button>
            <button type="button" class="text-sm text-gray-500 hover:text-gray-700" @click="drafting = null">Annuler</button>
          </div>
        </form>

        <div v-else class="mt-2 flex items-center gap-3 text-xs">
          <button class="font-medium text-amber-700 hover:underline" @click.stop="startDraft(row)">→ En faire une tâche</button>
          <span v-if="tasksFromNote(row.sceneId)" class="text-amber-700/70">
            ✓ {{ tasksFromNote(row.sceneId) > 1 ? `${tasksFromNote(row.sceneId)} tâches` : '1 tâche' }}
          </span>
        </div>
      </li>
    </ul>
  </section>
</template>
