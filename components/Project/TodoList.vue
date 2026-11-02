<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useProjectStore } from '~/store/project';
import { useTodoStore, TODO_CATEGORIES } from '~/store/todo';
import { toRoman } from '~/utils/roman';
import type { ProjectTodo, TodoCategory } from '~/types';

const emit = defineEmits(['open-scene']);

const projectStore = useProjectStore();
const todoStore = useTodoStore();

type SortMode = 'sequence' | 'alpha' | 'category';
type Filter = 'open' | 'done' | 'all';

const STORAGE_KEY = 'kompagnon-todo-preferences';

const readPreferences = (): { sort: SortMode; filter: Filter } => {
  try {
    return { sort: 'sequence', filter: 'open', ...JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') };
  } catch {
    return { sort: 'sequence', filter: 'open' };
  }
};

const preferences = readPreferences();
const sortMode = ref<SortMode>(preferences.sort);
const filter = ref<Filter>(preferences.filter);

watch([sortMode, filter], () => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ sort: sortMode.value, filter: filter.value }));
  } catch { /* stockage indisponible : on garde le choix en mémoire */ }
});

watch(() => projectStore.project?.id, (id) => {
  if (id) todoStore.fetchTodos(id);
}, { immediate: true });

// ── Saisie ──────────────────────────────────────────────────────────────

const newLabel = ref('');
const newCategory = ref<TodoCategory>('autre');

const add = async () => {
  const label = newLabel.value.trim();
  if (!label || !projectStore.project?.id) return;
  const saved = await todoStore.saveTodo({ projectId: projectStore.project.id, label, category: newCategory.value });
  if (saved) newLabel.value = '';
};

// ── Classement ──────────────────────────────────────────────────────────

/** Rang et chemin de chaque séquence dans le récit */
const sequenceOrder = computed(() => {
  const map = new Map<number, { index: number; path: string }>();
  let index = 0;
  projectStore.parts.forEach((part, partIndex) => {
    (part.sequences ?? []).forEach((sequence: any) => {
      map.set(sequence.id, { index: index++, path: `${toRoman(partIndex + 1)}. ${part.name} › ${sequence.name}` });
    });
  });
  return map;
});

const sceneNames = computed(() => {
  const map = new Map<number, string>();
  projectStore.scenes.forEach((scene: any) => map.set(scene.id, scene.name || 'Sans titre'));
  return map;
});

const visible = computed(() => todoStore.todos.filter(t =>
  filter.value === 'all' || (filter.value === 'done' ? t.done : !t.done)
));

const byLabel = (a: ProjectTodo, b: ProjectTodo) => a.label.localeCompare(b.label, 'fr', { sensitivity: 'base' });

const groups = computed(() => {
  const todos = visible.value;

  if (sortMode.value === 'alpha') {
    return [{ key: 'all', title: null as string | null, todos: [...todos].sort(byLabel) }];
  }

  if (sortMode.value === 'category') {
    return (Object.keys(TODO_CATEGORIES) as TodoCategory[])
      .map(category => ({
        key: category,
        title: TODO_CATEGORIES[category],
        todos: todos.filter(t => t.category === category).sort(byLabel)
      }))
      .filter(g => g.todos.length);
  }

  // Par séquence : dans l'ordre du récit, le reste en tête sous « Général »
  const general = todos.filter(t => !t.sequenceId || !sequenceOrder.value.has(t.sequenceId));
  const bySequence = new Map<number, ProjectTodo[]>();
  todos.forEach((t) => {
    if (!t.sequenceId || !sequenceOrder.value.has(t.sequenceId)) return;
    if (!bySequence.has(t.sequenceId)) bySequence.set(t.sequenceId, []);
    bySequence.get(t.sequenceId)!.push(t);
  });

  return [
    ...(general.length ? [{ key: 'general', title: 'Général', todos: general }] : []),
    ...[...bySequence.entries()]
      .sort(([a], [b]) => sequenceOrder.value.get(a)!.index - sequenceOrder.value.get(b)!.index)
      .map(([id, list]) => ({ key: `seq-${id}`, title: sequenceOrder.value.get(id)!.path, todos: list }))
  ];
});

/** Tâche née d'une note : on relit la note telle qu'elle est aujourd'hui */
const sceneNotes = computed(() => {
  const map = new Map<number, string>();
  projectStore.scenes.forEach((scene: any) => { if (scene.notes?.trim()) map.set(scene.id, scene.notes); });
  return map;
});
const openedNotes = ref(new Set<number>());
const toggleNote = (id: number) => {
  const next = new Set(openedNotes.value);
  next.has(id) ? next.delete(id) : next.add(id);
  openedNotes.value = next;
};

const contextOf = (todo: ProjectTodo) => {
  const parts: string[] = [];
  if (sortMode.value !== 'sequence' && todo.sequenceId && sequenceOrder.value.has(todo.sequenceId)) {
    parts.push(sequenceOrder.value.get(todo.sequenceId)!.path);
  }
  if (todo.sceneId && sceneNames.value.has(todo.sceneId)) parts.push(sceneNames.value.get(todo.sceneId)!);
  if (todo.personnage) parts.push(todo.personnage.name);
  return parts.join(' · ');
};
</script>

<template>
  <section>
    <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
      <h4 class="text-sm font-semibold uppercase tracking-wide text-gray-500">
        À faire
        <span v-if="todoStore.openCount" class="ml-1 font-normal normal-case text-gray-400">{{ todoStore.openCount }}</span>
      </h4>

      <div class="flex items-center gap-2 text-xs">
        <select v-model="filter" class="rounded-md border border-gray-200 bg-white py-1 pl-2 pr-7 text-xs text-gray-700">
          <option value="open">À faire</option>
          <option value="done">Faites</option>
          <option value="all">Toutes</option>
        </select>
        <select v-model="sortMode" class="rounded-md border border-gray-200 bg-white py-1 pl-2 pr-7 text-xs text-gray-700">
          <option value="sequence">Par séquence</option>
          <option value="alpha">Ordre alphabétique</option>
          <option value="category">Par catégorie</option>
        </select>
      </div>
    </div>

    <form class="mb-4 flex gap-2" @submit.prevent="add">
      <input
        v-model="newLabel"
        type="text"
        placeholder="Ajouter une tâche…"
        class="min-w-0 flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
      />
      <select v-model="newCategory" class="rounded-lg border border-gray-200 bg-white py-2 pl-2 pr-7 text-sm text-gray-700">
        <option v-for="(label, key) in TODO_CATEGORIES" :key="key" :value="key">{{ label }}</option>
      </select>
      <button
        type="submit"
        :disabled="!newLabel.trim()"
        class="rounded-lg bg-amber-500 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-600 disabled:opacity-40"
      >
        Ajouter
      </button>
    </form>

    <p v-if="todoStore.isLoading && !todoStore.todos.length" class="py-4 text-center text-sm text-gray-400">Chargement…</p>
    <p v-else-if="!visible.length" class="py-4 text-center text-sm italic text-gray-400">
      {{ filter === 'done' ? 'Aucune tâche faite.' : 'Rien à faire pour l\'instant.' }}
    </p>

    <div v-else class="space-y-4">
      <div v-for="group in groups" :key="group.key">
        <p v-if="group.title" class="mb-1.5 text-[11px] uppercase tracking-wide text-gray-400">{{ group.title }}</p>
        <ul class="space-y-1">
          <li
            v-for="todo in group.todos"
            :key="todo.id"
            class="group flex items-start gap-3 rounded-lg px-2 py-1.5 hover:bg-gray-50"
          >
            <input
              type="checkbox"
              :checked="todo.done"
              class="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-gray-300 text-amber-500 focus:ring-amber-400"
              @change="todoStore.toggleTodo(todo)"
            />
            <div class="min-w-0 flex-1">
              <p class="text-sm" :class="todo.done ? 'text-gray-400 line-through' : 'text-gray-800'">
                {{ todo.label }}
              </p>
              <p class="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-gray-400">
                <span
                  v-if="todo.source === 'ia'"
                  class="rounded bg-indigo-50 px-1.5 py-px font-medium text-indigo-600"
                  data-controller="tooltip"
                  title="Ajoutée par une analyse"
                >IA</span>
                <span v-if="sortMode !== 'category'">{{ TODO_CATEGORIES[todo.category] }}</span>
                <span v-if="contextOf(todo)">{{ contextOf(todo) }}</span>
                <button
                  v-if="todo.origin === 'note' && todo.sceneId && sceneNotes.has(todo.sceneId)"
                  class="text-amber-600 hover:underline"
                  @click="toggleNote(todo.id)"
                >{{ openedNotes.has(todo.id) ? 'Masquer la note' : 'Voir la note' }}</button>
                <button
                  v-if="todo.sceneId"
                  class="text-amber-600 hover:underline"
                  @click="emit('open-scene', todo.sceneId)"
                >Ouvrir la scène</button>
              </p>
              <p
                v-if="openedNotes.has(todo.id) && todo.sceneId && sceneNotes.has(todo.sceneId)"
                class="mt-1.5 whitespace-pre-wrap rounded-sm bg-amber-100/70 px-3 py-2 text-xs leading-relaxed text-amber-950/90"
              >{{ sceneNotes.get(todo.sceneId) }}</p>
            </div>
            <button
              class="shrink-0 rounded p-1 text-gray-300 transition hover:bg-gray-100 hover:text-red-500 focus:opacity-100 md:opacity-0 md:group-hover:opacity-100"
              data-controller="tooltip"
              title="Supprimer la tâche"
              aria-label="Supprimer la tâche"
              @click="todoStore.deleteTodo(todo.id)"
            >
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </li>
        </ul>
      </div>
    </div>
  </section>
</template>
