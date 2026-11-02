import { defineStore } from 'pinia';
import { useAuthStore } from '~/store/auth';
import type { ProjectTodo, TodoCategory, TodoDraft } from '~/types';

export const TODO_CATEGORIES: Record<TodoCategory, string> = {
  personnage: 'Personnage',
  structure: 'Structure',
  continuite: 'Continuité',
  style: 'Style',
  recherche: 'Recherche',
  autre: 'Autre'
};

/**
 * Todo du projet. Les tâches d'analyse arrivent par `addFromAnalysis` :
 * le serveur ignore celles déjà connues, même cochées ou supprimées.
 */
export const useTodoStore = defineStore('todo', {
  state: () => ({
    projectId: null as number | null,
    todos: [] as ProjectTodo[],
    isLoading: false as boolean
  }),

  getters: {
    openCount: (state) => state.todos.filter(t => !t.done).length
  },

  actions: {
    headers() {
      return { 'Content-Type': 'application/json', 'X-AUTH-TOKEN': useAuthStore().token || '' };
    },

    async fetchTodos(projectId: number, force = false) {
      if (!force && this.projectId === projectId) return;
      const config = useRuntimeConfig();
      this.isLoading = true;
      try {
        this.todos = await $fetch<ProjectTodo[]>(`${config.public.apiBase}/project/${projectId}/todos`, {
          headers: this.headers()
        });
        this.projectId = projectId;
      } catch (error) {
        console.error('Erreur lors du chargement de la todo:', error);
      } finally {
        this.isLoading = false;
      }
    },

    async saveTodo(data: Partial<ProjectTodo> & { projectId?: number; personnageId?: number | null }) {
      const config = useRuntimeConfig();
      try {
        const saved = await $fetch<ProjectTodo>(`${config.public.apiBase}/todo/update`, {
          method: 'POST',
          headers: this.headers(),
          body: data
        });
        const index = this.todos.findIndex(t => t.id === saved.id);
        if (index === -1) this.todos.push(saved);
        else this.todos[index] = saved;
        return saved;
      } catch (error) {
        console.error('Erreur lors de l\'enregistrement de la tâche:', error);
        return null;
      }
    },

    /** Coche tout de suite, revient en arrière si le serveur refuse */
    async toggleTodo(todo: ProjectTodo) {
      todo.done = !todo.done;
      const saved = await this.saveTodo({ id: todo.id, done: todo.done });
      if (!saved) todo.done = !todo.done;
    },

    async deleteTodo(id: number) {
      const config = useRuntimeConfig();
      try {
        await $fetch(`${config.public.apiBase}/todo/delete/${id}`, {
          method: 'DELETE',
          headers: this.headers()
        });
        this.todos = this.todos.filter(t => t.id !== id);
        return true;
      } catch (error) {
        console.error('Erreur lors de la suppression de la tâche:', error);
        return false;
      }
    },

    /** Renvoie le nombre de tâches réellement ajoutées */
    async addFromAnalysis(projectId: number, drafts: TodoDraft[]) {
      if (!drafts.length) return 0;
      const config = useRuntimeConfig();
      try {
        const created = await $fetch<ProjectTodo[]>(`${config.public.apiBase}/project/${projectId}/todos/batch`, {
          method: 'POST',
          headers: this.headers(),
          body: { todos: drafts }
        });
        if (this.projectId === projectId) this.todos.push(...created);
        return created.length;
      } catch (error) {
        console.error('Erreur lors de l\'ajout des tâches d\'analyse:', error);
        return 0;
      }
    }
  }
});
