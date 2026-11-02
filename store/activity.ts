import { defineStore } from 'pinia';

/**
 * Tâches longues en cours (analyses IA…), affichées dans le header : on voit
 * que ça tourne même après avoir quitté la page qui les a lancées.
 */
export const useActivityStore = defineStore('activity', {
  state: () => ({
    tasks: [] as Array<{ id: number; label: string }>,
    nextId: 1 as number
  }),

  getters: {
    isBusy: (state) => state.tasks.length > 0,
    // La plus ancienne d'abord : c'est elle qu'on attend depuis le plus longtemps
    label: (state) => state.tasks[0]?.label ?? ''
  },

  actions: {
    async track<T>(label: string, work: () => Promise<T>): Promise<T> {
      const id = this.nextId++;
      this.tasks.push({ id, label });
      try {
        return await work();
      } finally {
        this.tasks = this.tasks.filter(t => t.id !== id);
      }
    }
  }
});
