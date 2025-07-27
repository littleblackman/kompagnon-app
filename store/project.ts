import { defineStore } from 'pinia';
import { ref } from 'vue';
import { useAuthStore } from '~/store/auth';
import { usePersonnageStore } from '~/store/personnage';
import type { Project, Part, Sequence, Scene, Personnage } from '~/types';

interface UpdatePartResponse {
    part: Part;
    positions: number[];
}

interface CriteriaResponse {
    sequenceId: number;
    criteriaId: number;
    value: number
}

export const useProjectStore = defineStore('project', {
    state: () => ({
        project: null as Project | null,
        parts: [] as Part[],
        sequences: [] as Sequence[],
        scenes: [] as Scene[],
        personnages: [] as Personnage[],
        expandedParts: new Set<number>(),
        sortOrder: 'position' as 'position' | 'name' | 'date',
        filters: {
            search: '',
            status: 'all' as 'all' | 'completed' | 'in-progress'
        },
        // Statistiques de mots/caractères
        stats: {
            wordCount: 0,
            charCount: 0
        }
    }),

    getters: {
        isPartExpanded: (state) => (partId: number) => {
            return state.expandedParts.has(partId);
        }
    },

    actions: {
        // Gestion du projet
        async fetchProject(slug: string) {
            try {
                const config = useRuntimeConfig();
                const authStore = useAuthStore();
                const response: Project = await $fetch(`${config.public.apiBase}/project/${slug}`, {
                    headers: { Authorization: `Bearer ${authStore.token}` },
                });

                this.project = response;
                this.parts = response.parts || [];
                this.sequences = this.parts.flatMap(part => part.sequences || []);
                this.scenes = this.sequences.flatMap(seq => seq.scenes || []);
                this.personnages = response.personnages || [];
                
                // Initialiser la table de référence des personnages
                const personnageStore = usePersonnageStore();
                personnageStore.personnages = response.personnages || [];
                
                // Développer toutes les parties par défaut
                this.expandAllParts();
                
                // Calculer les statistiques
                this.calculateStats();
                
                // Sauvegarder le dernier projet visité
                if (typeof window !== 'undefined' && response) {
                    localStorage.setItem('lastVisitedProject', JSON.stringify({
                        id: response.id,
                        name: response.name,
                        slug: response.slug,
                        timestamp: new Date().toISOString()
                    }));
                }
            } catch (error) {
                console.error("Erreur chargement projet :", error);
            }
        },

        // Gestion des parties
        addPartToState(part: Part) {
            if (!this.project) return;
            this.project.parts.push(part);
            this.parts.push(part);
            // Développer la nouvelle partie
            this.expandedParts.add(part.id);
        },

        updatePart(part: Part) {
            if (!this.project) return;
            const index = this.project.parts.findIndex(p => p.id === part.id);
            if (index !== -1) {
                this.project.parts[index] = part;
                const partsIndex = this.parts.findIndex(p => p.id === part.id);
                if (partsIndex !== -1) {
                    this.parts[partsIndex] = part;
                }
            }
        },

        // Gestion des séquences
        addSequence(sequence: Sequence) {
            if (!this.project) return;
            const part = this.project.parts.find(p => p.id === sequence.part_id);
            if (part) {
                if (!part.sequences) part.sequences = [];
                part.sequences.push(sequence);
            }
        },

        // Gestion des scènes
        addScene(scene: Scene) {
            if (!this.project) return;
            for (const part of this.project.parts) {
                if (part.sequences) {
                    for (const sequence of part.sequences) {
                        if (sequence.id === scene.sequence_id) {
                            if (!sequence.scenes) sequence.scenes = [];
                            sequence.scenes.push(scene);
                            return;
                        }
                    }
                }
            }
        },

        // Gestion de l'expansion
        togglePart(partId: number) {
            if (this.expandedParts.has(partId)) {
                this.expandedParts.delete(partId);
            } else {
                this.expandedParts.add(partId);
            }
        },

        collapseAllParts() {
            this.expandedParts.clear();
        },

        expandAllParts() {
            if (!this.project) return;
            this.project.parts.forEach(part => {
                this.expandedParts.add(part.id);
            });
        },

        // Gestion du tri
        toggleSort() {
            const orders = ['position', 'name', 'date'];
            const currentIndex = orders.indexOf(this.sortOrder);
            this.sortOrder = orders[(currentIndex + 1) % orders.length] as 'position' | 'name' | 'date';
            this.sortParts();
        },

        sortParts() {
            if (!this.project) return;
            this.project.parts.sort((a, b) => {
                switch (this.sortOrder) {
                    case 'name':
                        return a.name.localeCompare(b.name);
                    case 'date':
                        return b.id - a.id;
                    default:
                        return a.position - b.position;
                }
            });
        },

        // Gestion des filtres
        toggleFilter() {
            const statuses = ['all', 'completed', 'in-progress'];
            const currentIndex = statuses.indexOf(this.filters.status);
            this.filters.status = statuses[(currentIndex + 1) % statuses.length] as 'all' | 'completed' | 'in-progress';
        },

        setSearchFilter(search: string) {
            this.filters.search = search;
        },

        // delete part
        async deletePart(partId: number) {
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
                const index = this.parts.findIndex(p => p.id === partId);
                this.parts.splice(index, 1);

            } catch (error) {
                console.error("Erreur lors de la suppression d'une partie :", error);
            }
        },

        async saveCriteria(value: number, sequenceId: number, criteriaId: number) {
            try {
                const config = useRuntimeConfig();
                const authStore = useAuthStore();

                const criteriaData: CriteriaResponse = {
                    sequenceId: sequenceId,
                    criteriaId: criteriaId,
                    value: value
                }

                const result: CriteriaResponse = await $fetch(`${config.public.apiBase}/criteria/update`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${authStore.token}`
                    },
                    body: criteriaData,
                });

            } catch (error) {
                console.error("Erreur lors de l'ajout/mise à jour d'une partie :", error);
            }
        },

        // add a new part
        async addPart(newPart: Part, afterPartId?: number) {
            if (!this.project) {
                console.error("Aucun projet chargé.");
                return;
            }

            try {
                const config = useRuntimeConfig();
                const authStore = useAuthStore();

                // add afterPartId to the new part
                if (afterPartId) {
                    newPart.afterPartId = afterPartId;
                }

                // save in the database
                const result: UpdatePartResponse = await $fetch(`${config.public.apiBase}/part/update`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${authStore.token}`
                    },
                    body: newPart,
                });

                const { part: savedPart, positions } = result;

                // check if existing part
                const existingIndex = this.parts.findIndex(p => p.id === savedPart.id);

                if (existingIndex !== -1) {
                    // update part name and description
                    this.parts[existingIndex] = {
                        ...this.parts[existingIndex],
                        name: savedPart.name,
                        description: savedPart.description
                    };

                } else {
                    // add the new part
                    if (afterPartId) {
                        const index = this.parts.findIndex(p => p.id === afterPartId);
                        this.parts.splice(index + 1, 0, savedPart);
                    } else {
                        this.parts.unshift(savedPart);
                    }
                }

                // Reorder parts
                if (positions && positions.length > 0) {
                    this.parts.sort((a, b) => {
                        return positions.indexOf(a.id) - positions.indexOf(b.id);
                    });
                }

                // project.parts
                this.project.parts = [...this.parts];

            } catch (error) {
                console.error("Erreur lors de l'ajout/mise à jour d'une partie :", error);
            }
        },

        // Mettre à jour le contenu d'une séquence (sans changer l'ordre)
        async updateSequenceContent(sequence: Sequence): Promise<Sequence | null> {
            try {
                const config = useRuntimeConfig();
                const authStore = useAuthStore();

                const result = await $fetch(`${config.public.apiBase}/sequence/update`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${authStore.token}`,
                    },
                    body: sequence,
                });

                const savedSequence = result.sequence;

                // Mise à jour locale simple (SANS toucher aux scènes)
                const part = this.project?.parts.find(p => p.id === sequence.part_id);
                if (part && part.sequences) {
                    const index = part.sequences.findIndex(s => s.id === savedSequence.id);
                    if (index !== -1) {
                        // Mettre à jour UNIQUEMENT les propriétés de la séquence, pas les scènes
                        const existingSequence = part.sequences[index];
                        existingSequence.name = savedSequence.name;
                        existingSequence.description = savedSequence.description;
                        existingSequence.intention = savedSequence.intention;
                        existingSequence.aesthetic_idea = savedSequence.aesthetic_idea;
                        existingSequence.information = savedSequence.information;
                        existingSequence.status = savedSequence.status;
                        // NE PAS toucher à existingSequence.scenes !
                    }
                }

                return savedSequence;
            } catch (error) {
                console.error("Erreur lors de la mise à jour de la séquence :", error);
                return null;
            }
        },

        // Réorganiser une séquence (change l'ordre)
        async reorderSequence(sequenceId: number, partId: number, afterSequenceId?: number): Promise<boolean> {
            try {
                const config = useRuntimeConfig();
                const authStore = useAuthStore();

                const sequence = { id: sequenceId, part_id: partId };
                if (afterSequenceId) {
                    (sequence as any).afterSequenceId = afterSequenceId;
                }

                await $fetch(`${config.public.apiBase}/sequence/update`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${authStore.token}`,
                    },
                    body: sequence,
                });

                // Recharger toute la partie depuis l'API pour garantir la cohérence
                await this.reloadPart(partId);
                
                return true;
            } catch (error) {
                console.error("Erreur lors de la réorganisation de la séquence :", error);
                return false;
            }
        },

        // Méthode pour recharger une partie complète
        async reloadPart(partId: number): Promise<void> {
            try {
                const config = useRuntimeConfig();
                const authStore = useAuthStore();

                const result = await $fetch(`${config.public.apiBase}/part/${partId}`, {
                    headers: {
                        Authorization: `Bearer ${authStore.token}`,
                    },
                });

                // Mettre à jour la partie dans le projet local
                if (this.project && this.project.parts) {
                    const index = this.project.parts.findIndex(p => p.id === partId);
                    if (index !== -1) {
                        this.project.parts[index] = result.part;
                    }
                }

                // Mettre à jour les données globales
                this.sequences = this.parts.flatMap(part => part.sequences || []);
                this.scenes = this.sequences.flatMap(seq => seq.scenes || []);
                
            } catch (error) {
                console.error("Erreur lors du rechargement de la partie :", error);
            }
        },

        // DEPRECATED: Ancienne méthode saveSequence - garder pour compatibilité
        async saveSequence(newSequence: Sequence, partId: number, afterSequenceId?: number): Promise<Sequence | null> {
            try {
                const config = useRuntimeConfig();
                const authStore = useAuthStore();

                newSequence.part_id = partId;

                if (afterSequenceId) {
                    (newSequence as any).afterSequenceId = afterSequenceId;
                }

                const result = await $fetch(`${config.public.apiBase}/sequence/update`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${authStore.token}`,
                    },
                    body: newSequence,
                });

                const savedSequence = result.sequence;

                // Mise à jour locale dans part
                const part = this.project?.parts.find(p => p.id === partId);
                if (part) {
                    if (!part.sequences) {
                        part.sequences = [];
                    }
                    // On vire l'ancienne si elle existe
                    part.sequences = part.sequences.filter(s => s.id !== savedSequence.id);
                    // On ajoute la nouvelle
                    part.sequences.push(savedSequence);
                    // Trier les séquences par position
                    part.sequences.sort((a, b) => a.position - b.position);
                }

                // Mise à jour globale
                this.sequences = this.sequences.filter(s => s.id !== savedSequence.id);
                this.sequences.push(savedSequence);
                // Trier les séquences globales par position
                this.sequences.sort((a, b) => a.position - b.position);

                // Mettre à jour le projet pour refléter les changements
                if (this.project) {
                    const projectPart = this.project.parts.find(p => p.id === partId);
                    if (projectPart) {
                        projectPart.sequences = part?.sequences || [];
                    }
                }

                return savedSequence;
            } catch (error) {
                console.error("Erreur lors de la sauvegarde d'une séquence :", error);
                return null;
            }
        },

        async deleteSequence(sequenceId: number) {
            try {
                const config = useRuntimeConfig();
                const authStore = useAuthStore();

                await $fetch(`${config.public.apiBase}/sequence/delete/${sequenceId}`, {
                    method: 'DELETE',
                    headers: {
                        Authorization: `Bearer ${authStore.token}`,
                    },
                });

                // Mise à jour locale
                if (this.project) {
                    for (const part of this.project.parts) {
                        if (part.sequences) {
                            const index = part.sequences.findIndex(s => s.id === sequenceId);
                            if (index !== -1) {
                                part.sequences.splice(index, 1);
                                break;
                            }
                        }
                    }
                }

                // Mise à jour de la liste globale des séquences
                const index = this.sequences.findIndex(s => s.id === sequenceId);
                if (index !== -1) {
                    this.sequences.splice(index, 1);
                }
            } catch (error) {
                console.error("Erreur lors de la suppression de la séquence :", error);
                throw error;
            }
        },

        async saveScene(newScene: Scene, sequenceId: number, afterSceneId?: number): Promise<Scene | null> {
            try {
                const config = useRuntimeConfig();
                const authStore = useAuthStore();

                newScene.sequence_id = sequenceId;

                if (afterSceneId) {
                    (newScene as any).afterSceneId = afterSceneId;
                }

                const result = await $fetch(`${config.public.apiBase}/scene/update`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${authStore.token}`,
                    },
                    body: newScene,
                });

                const savedScene = result.scene;

                // Mise à jour locale dans sequence
                const sequence = this.sequences.find(s => s.id === sequenceId);
                if (sequence) {
                    if (!sequence.scenes) {
                        sequence.scenes = [];
                    }
                    // On vire l'ancienne si elle existe
                    sequence.scenes = sequence.scenes.filter(s => s.id !== savedScene.id);
                    // On ajoute la nouvelle
                    sequence.scenes.push(savedScene);
                    // Trier les scènes par position
                    sequence.scenes.sort((a, b) => a.position - b.position);
                }

                // Mise à jour dans le projet
                if (this.project) {
                    for (const part of this.project.parts) {
                        if (part.sequences) {
                            for (const seq of part.sequences) {
                                if (seq.id === sequenceId) {
                                    if (!seq.scenes) {
                                        seq.scenes = [];
                                    }
                                    seq.scenes = seq.scenes.filter(s => s.id !== savedScene.id);
                                    seq.scenes.push(savedScene);
                                    seq.scenes.sort((a, b) => a.position - b.position);
                                    break;
                                }
                            }
                        }
                    }
                }

                // Mise à jour globale
                this.scenes = this.scenes.filter(s => s.id !== savedScene.id);
                this.scenes.push(savedScene);
                // Trier les scènes globales par position
                this.scenes.sort((a, b) => a.position - b.position);

                // Recalculer les stats après sauvegarde
                this.calculateStats();
                
                return savedScene;
            } catch (error) {
                console.error("Erreur lors de la sauvegarde d'une scène :", error);
                return null;
            }
        },

        async saveSceneOrder(scenes: Scene[]) {
            try {
                const config = useRuntimeConfig();
                const authStore = useAuthStore();

                // Préparer les données pour l'API (juste ID et position)
                const scenePositions = scenes.map(scene => ({
                    id: scene.id,
                    position: scene.position
                }));

                // Appeler la nouvelle route /api/scene/order
                await $fetch(`${config.public.apiBase}/scene/order`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${authStore.token}`,
                    },
                    body: { scenes: scenePositions },
                });

            } catch (error) {
                console.error("Erreur lors de la sauvegarde de l'ordre des scènes :", error);
                throw error;
            }
        },

        async saveSequenceOrder(sequences: Sequence[]) {
            try {
                const config = useRuntimeConfig();
                const authStore = useAuthStore();

                // Préparer les données pour l'API (juste ID et position)
                const sequencePositions = sequences.map(sequence => ({
                    id: sequence.id,
                    position: sequence.position
                }));

                // Appeler la nouvelle route /api/sequence/order
                await $fetch(`${config.public.apiBase}/sequence/order`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${authStore.token}`,
                    },
                    body: { sequences: sequencePositions },
                });

            } catch (error) {
                console.error("Erreur lors de la sauvegarde de l'ordre des séquences :", error);
                throw error;
            }
        },

        async deleteScene(sceneId: number) {
            try {
                const config = useRuntimeConfig();
                const authStore = useAuthStore();

                await $fetch(`${config.public.apiBase}/scene/delete/${sceneId}`, {
                    method: 'DELETE',
                    headers: {
                        Authorization: `Bearer ${authStore.token}`,
                    },
                });

                // Mise à jour locale
                if (this.project) {
                    for (const part of this.project.parts) {
                        if (part.sequences) {
                            for (const sequence of part.sequences) {
                                if (sequence.scenes) {
                                    const index = sequence.scenes.findIndex(s => s.id === sceneId);
                                    if (index !== -1) {
                                        sequence.scenes.splice(index, 1);
                                        break;
                                    }
                                }
                            }
                        }
                    }
                }

                // Mise à jour de la liste globale des scènes
                const index = this.scenes.findIndex(s => s.id === sceneId);
                if (index !== -1) {
                    this.scenes.splice(index, 1);
                }
            } catch (error) {
                console.error("Erreur lors de la suppression de la scène :", error);
                throw error;
            }
        },

        // Gestion des projets
        async createProject(projectData: { name: string; description: string; type_id: number }) {
            try {
                const config = useRuntimeConfig();
                const authStore = useAuthStore();

                const result = await $fetch(`${config.public.apiBase}/project/update`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${authStore.token}`
                    },
                    body: projectData
                });

                return result;
            } catch (error) {
                console.error("Erreur lors de la création du projet :", error);
                throw error;
            }
        },

        async updateProject(projectData: { id: number; name: string; description: string; type_id: number }) {
            try {
                const config = useRuntimeConfig();
                const authStore = useAuthStore();

                const result = await $fetch(`${config.public.apiBase}/project/update`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${authStore.token}`
                    },
                    body: projectData
                });

                // Mettre à jour le projet local si c'est le projet actuellement chargé
                if (this.project && this.project.id === projectData.id) {
                    this.project.name = projectData.name;
                    this.project.description = projectData.description;
                    // Note: le type sera mis à jour lors du prochain fetchProject
                }

                return result;
            } catch (error) {
                console.error("Erreur lors de la mise à jour du projet :", error);
                throw error;
            }
        },

        async deleteProject(projectId: number) {
            try {
                const config = useRuntimeConfig();
                const authStore = useAuthStore();

                await $fetch(`${config.public.apiBase}/project/delete/${projectId}`, {
                    method: 'DELETE',
                    headers: {
                        Authorization: `Bearer ${authStore.token}`
                    }
                });

                // Nettoyer le store si c'est le projet actuellement chargé
                if (this.project && this.project.id === projectId) {
                    this.project = null;
                    this.parts = [];
                    this.sequences = [];
                    this.scenes = [];
                    this.personnages = [];
                    this.expandedParts.clear();
                }

                return true;
            } catch (error) {
                console.error("Erreur lors de la suppression du projet :", error);
                throw error;
            }
        },

        // Les méthodes de gestion des personnages ont été déplacées vers le store personnage

        // Méthode pour calculer les statistiques de mots/caractères
        calculateStats() {
            if (!this.project) {
                this.stats = { wordCount: 0, charCount: 0 };
                return;
            }

            // Lire les préférences de localStorage
            const getReadingPreferences = () => {
                if (typeof window === 'undefined') return { showTitles: { h2: true, h3: true, h4: true } };
                
                const stored = localStorage.getItem('kompagnon-reading-preferences');
                if (!stored) return { showTitles: { h2: true, h3: true, h4: true } };
                
                try {
                    return JSON.parse(stored);
                } catch {
                    return { showTitles: { h2: true, h3: true, h4: true } };
                }
            };

            const preferences = getReadingPreferences();
            let totalContent = '';
            
            // Parcourir toutes les parties
            for (const part of this.project.parts || []) {
                // Ajouter le titre de partie si activé dans les préférences
                if (preferences.showTitles?.h2 && part.name) {
                    totalContent += part.name + ' ';
                }
                
                // Parcourir toutes les séquences de la partie
                for (const sequence of part.sequences || []) {
                    // Ajouter le titre de séquence si activé dans les préférences
                    if (preferences.showTitles?.h3 && sequence.name) {
                        totalContent += sequence.name + ' ';
                    }
                    
                    // Parcourir toutes les scènes de la séquence
                    for (const scene of sequence.scenes || []) {
                        // Ajouter le titre de scène si activé dans les préférences
                        if (preferences.showTitles?.h4 && scene.name) {
                            totalContent += scene.name + ' ';
                        }
                        
                        if (scene.content) {
                            // Nettoyer le HTML et ajouter le contenu
                            const cleanContent = scene.content.replace(/<[^>]*>/g, '');
                            totalContent += cleanContent + ' ';
                        }
                    }
                }
            }
            
            // Compter les mots (séparer par espaces, supprimer les vides)
            const words = totalContent.trim() ? totalContent.trim().split(/\s+/).length : 0;
            
            // Compter les caractères (espaces compris)
            const chars = totalContent.length;
            
            this.stats = { wordCount: words, charCount: chars };
        },
    }
});