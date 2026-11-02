import { defineStore } from 'pinia';
import { useAuthStore } from '~/store/auth';
import type { Timeline } from '~/types';

type Result = { success: boolean; message?: string };

/**
 * Chronologie du projet. L'API renvoie la chronologie complète après chaque
 * écriture : le store la remplace, il ne recalcule rien.
 */
export const useTimelineStore = defineStore('timeline', {
    state: () => ({
        projectId: null as number | null,
        timeline: null as Timeline | null,
        loading: false,
        /** Analyse en cours : « séquence 4 / 12 », la cohérence… */
        running: null as null | { label: string; done: number; total: number },
        cancelRequested: false,
    }),

    actions: {
        async request(path: string, options: { method?: string; body?: any } = {}): Promise<any> {
            const config = useRuntimeConfig();
            const authStore = useAuthStore();

            return $fetch(`${config.public.apiBase}${path}`, {
                method: (options.method ?? 'GET') as any,
                headers: { 'X-AUTH-TOKEN': authStore.token! },
                body: options.body,
            });
        },

        /** Écriture qui renvoie la chronologie recalculée */
        async write(path: string, options: { method?: string; body?: any } = {}): Promise<Result> {
            try {
                this.timeline = await this.request(path, { method: 'POST', ...options });
                return { success: true };
            } catch (error: any) {
                console.error('Erreur chronologie :', error);
                return { success: false, message: error?.data?.message ?? error?.data?.error ?? "L'enregistrement a échoué." };
            }
        },

        async fetch(projectId: number) {
            this.projectId = projectId;
            this.loading = true;
            try {
                this.timeline = await this.request(`/project/${projectId}/timeline`);
            } catch (error) {
                console.error('Erreur lors du chargement de la chronologie :', error);
            } finally {
                this.loading = false;
            }
        },

        /** Analyse IA : renvoie { success, timeline } ou un message en 422 */
        async analyse(path: string): Promise<Result> {
            try {
                const result = await this.request(path, { method: 'POST' });
                this.timeline = result.timeline;
                return { success: true };
            } catch (error: any) {
                return { success: false, message: error?.data?.message ?? "L'analyse a échoué." };
            }
        },

        /**
         * Lit les séquences une à une, dans l'ordre du livre : chacune se date
         * à partir de la précédente (« le lendemain »). Une séquence vide est
         * passée sans interrompre la série.
         */
        async extractSequences(sequenceIds: number[]): Promise<{ done: number; errors: string[] }> {
            const errors: string[] = [];
            const total = sequenceIds.length;
            let done = 0;
            this.cancelRequested = false;

            for (const sequenceId of sequenceIds) {
                if (this.cancelRequested) break;

                const row = this.timeline?.sequences.find(s => s.sequenceId === sequenceId);
                this.running = { label: row ? `${row.label} · ${row.name}` : 'Séquence', done, total };

                const result = await this.analyse(`/sequence/${sequenceId}/timeline/extract`);
                if (!result.success && row) errors.push(`${row.label} : ${result.message}`);
                done++;
            }

            this.running = null;
            return { done, errors };
        },

        cancel() {
            this.cancelRequested = true;
        },

        async extractFiches(): Promise<Result> {
            this.running = { label: 'Fiches personnages', done: 0, total: 1 };
            const result = await this.analyse(`/project/${this.projectId}/timeline/extract-fiches`);
            this.running = null;
            return result;
        },

        async checkCoherence(): Promise<Result> {
            this.running = { label: 'Vérification de la cohérence', done: 0, total: 1 };
            const result = await this.analyse(`/project/${this.projectId}/timeline/coherence`);
            this.running = null;
            return result;
        },

        saveSettings(settings: { yearZero?: number | null; dayZero?: string | null; dayZeroLabel?: string | null }) {
            return this.write(`/project/${this.projectId}/timeline/settings`, { body: settings });
        },

        validate(sequenceId?: number) {
            return this.write(`/project/${this.projectId}/timeline/validate`, { body: sequenceId ? { sequenceId } : {} });
        },

        saveFact(fact: Record<string, any>) {
            return this.write('/timeline/fact/update', { body: { projectId: this.projectId, ...fact } });
        },

        setFactStatus(id: number, status: 'proposed' | 'validated' | 'rejected') {
            return this.write('/timeline/fact/update', { body: { id, status } });
        },

        /** Un fait de l'analyse est rejeté côté serveur, un fait saisi est effacé */
        deleteFact(id: number) {
            return this.write(`/timeline/fact/delete/${id}`, { method: 'DELETE' });
        },

        saveSequence(data: Record<string, any>) {
            return this.write('/timeline/sequence/update', { body: data });
        },

        setIssueStatus(id: number, status: 'open' | 'resolved' | 'dismissed') {
            return this.write('/timeline/issue/update', { body: { id, status } });
        },
    },
});
