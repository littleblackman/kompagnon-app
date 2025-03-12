import { defineStore } from 'pinia';
import { ref } from 'vue';
import { useAuthStore } from '~/store/auth';

interface Part {
    id: number;
    name: string;
    description: string;
    position: number;
    sequences?: Sequence[];
}

interface Sequence {
    id: number;
    name: string;
    description: string;
    position: number;
    scenes?: Scene[];
}

interface Scene {
    id: number;
    name: string;
    description: string;
    position: number;
}

interface Project {
    id: number;
    name: string;
    description: string;
    parts: Part[];
}

export const useProjectStore = defineStore('project', () => {
    const authStore = useAuthStore();

    const project = ref<Project | null>(null);
    const parts = ref<Part[]>([]);
    const sequences = ref<Sequence[]>([]);
    const scenes = ref<Scene[]>([]);

    // load project
    async function fetchProject(slug: string) {
        try {
            const config = useRuntimeConfig();
            const response: Project = await $fetch(`${config.public.apiBase}/project/${slug}`, {
                headers: { Authorization: `Bearer ${authStore.token}` },
            });

            project.value = response;
            parts.value = response.parts || [];
            sequences.value = parts.value.flatMap(part => part.sequences || []);
            scenes.value = sequences.value.flatMap(seq => seq.scenes || []);
        } catch (error) {
            console.error("Erreur chargement projet :", error);
        }
    }

    // delete part
    async function deletePart(partId: number) {

        try {
            const config = useRuntimeConfig();
            const authStore = useAuthStore();

            // save in the database
            await $fetch(`${config.public.apiBase}/part/delete/${partId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${authStore.token}`
                }
            });

            // remove the part
            const index = parts.value.findIndex(p => p.id === partId);
            parts.value.splice(index, 1);

            // update project parts

        } catch (error) {
            console.error("Erreur lors de la suppression d'une partie :", error);
        }
    }

    // add a new part
    async function addPart(newPart: Part, orderAfterId?: number) {
        if (!project.value) {
            console.error("Aucun projet chargé.");
            return;
        }

        try {
            const config = useRuntimeConfig();
            const authStore = useAuthStore();

            // save in the database
            const savedPart: Part = await $fetch(`${config.public.apiBase}/part/update`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${authStore.token}`
                },
                body: newPart,
            });

            // check if existing part
            const existingIndex = parts.value.findIndex(p => p.id === savedPart.id);

            if (existingIndex !== -1) {
                // update part name and description
                parts.value[existingIndex] = {
                    ...parts.value[existingIndex],
                    name: savedPart.name,
                    description: savedPart.description
                };

            } else {
                // add the new part
                if (orderAfterId) {
                    const index = parts.value.findIndex(p => p.id === orderAfterId);
                    parts.value.splice(index + 1, 0, savedPart);
                } else {
                    parts.value.unshift(savedPart);
                }
            }

            // update project parts
            project.value.parts = [...parts.value];

        } catch (error) {
            console.error("Erreur lors de l'ajout/mise à jour d'une partie :", error);
        }
    }


    // add sequence
    function addSequence(newSequence: Sequence, partId: number) {
        const part = parts.value.find(p => p.id === partId);
        if (part) {
            part.sequences = part.sequences || [];
            part.sequences.push(newSequence);
            sequences.value.push(newSequence);
        }
    }

    // add scene
    function addScene(newScene: Scene, sequenceId: number) {
        const sequence = sequences.value.find(s => s.id === sequenceId);
        if (sequence) {
            sequence.scenes = sequence.scenes || [];
            sequence.scenes.push(newScene);
            scenes.value.push(newScene);
        }
    }

    return {
        project, parts, sequences, scenes,
        fetchProject, addPart, deletePart, addSequence, addScene
    };
});