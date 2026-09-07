import { defineStore } from 'pinia';
import { ref } from 'vue';
import { useAuthStore } from '~/store/auth';
import { usePersonnageStore } from '~/store/personnage';
import type { Project, Part, Sequence, Scene, Personnage } from '~/types';
import { applyPositions, move, resequence } from '~/utils/position';

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
        },

        // Dérivés de project.parts, jamais dupliqués : deux copies à
        // resynchroniser à la main finissent toujours par diverger.
        // Les objets restent les mêmes références, les mutations en place marchent.
        parts: (state): Part[] => state.project?.parts ?? [],

        sequences: (state): Sequence[] =>
            (state.project?.parts ?? []).flatMap(part => part.sequences ?? []),

        scenes: (state): Scene[] =>
            (state.project?.parts ?? [])
                .flatMap(part => part.sequences ?? [])
                .flatMap(sequence => sequence.scenes ?? [])
    },

    actions: {
        // Gestion du projet
        async fetchProject(slug: string) {
            try {
                const config = useRuntimeConfig();
                const authStore = useAuthStore();
                const response: Project = await $fetch(`${config.public.apiBase}/project/${slug}`, {
                    headers: { 'X-AUTH-TOKEN': authStore.token! },
                });

                // Trier les parties par position et leurs sous-éléments
                const sortedParts = (response.parts || []).sort((a, b) => a.position - b.position).map(part => ({
                    ...part,
                    sequences: (part.sequences || []).sort((a, b) => a.position - b.position).map(seq => ({
                        ...seq,
                        scenes: (seq.scenes || []).sort((a, b) => a.position - b.position)
                    }))
                }));
                
                this.project = {
                    ...response,
                    parts: sortedParts
                };
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
            // Développer la nouvelle partie
            this.expandedParts.add(part.id);
        },

        updatePart(part: Part) {
            if (!this.project) return;
            const index = this.project.parts.findIndex(p => p.id === part.id);
            if (index !== -1) {
                this.project.parts[index] = part;
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

        // Localisation dans l'arbre — évite de re-boucler à trois niveaux partout
        findSequenceContext(sequenceId: number): { part: Part; sequence: Sequence; index: number } | null {
            for (const part of this.project?.parts ?? []) {
                const index = (part.sequences ?? []).findIndex(s => s.id === sequenceId);
                if (index !== -1) return { part, sequence: part.sequences![index], index };
            }
            return null;
        },

        findSceneContext(sceneId: number): { part: Part; sequence: Sequence; scene: Scene; index: number } | null {
            for (const part of this.project?.parts ?? []) {
                for (const sequence of part.sequences ?? []) {
                    const index = (sequence.scenes ?? []).findIndex(s => s.id === sceneId);
                    if (index !== -1) return { part, sequence, scene: sequence.scenes![index], index };
                }
            }
            return null;
        },

        /**
         * Déplace une scène d'un cran dans sa séquence.
         * Mise à jour optimiste, annulée si le serveur refuse.
         */
        async moveScene(sceneId: number, direction: 'up' | 'down'): Promise<void> {
            const found = this.findSceneContext(sceneId);
            if (!found?.sequence.scenes) return;

            const before = found.sequence.scenes.map(s => ({ id: s.id, position: s.position }));
            const positions = move(found.sequence.scenes, sceneId, direction);
            if (!positions) return; // déjà en bout de liste

            try {
                await this.saveSceneOrder(found.sequence.scenes);
            } catch (error) {
                applyPositions(found.sequence.scenes, before);
                throw error;
            }
        },

        /**
         * Déplace une séquence d'un cran dans sa partie.
         */
        async moveSequence(sequenceId: number, direction: 'up' | 'down'): Promise<void> {
            const found = this.findSequenceContext(sequenceId);
            if (!found?.part.sequences) return;

            const before = found.part.sequences.map(s => ({ id: s.id, position: s.position }));
            const positions = move(found.part.sequences, sequenceId, direction);
            if (!positions) return;

            try {
                await this.saveSequenceOrder(found.part.sequences);
            } catch (error) {
                applyPositions(found.part.sequences, before);
                throw error;
            }
        },

        /**
         * Enregistre la note d'une scène.
         * Payload minimal : le serveur applique une sémantique patch, donc
         * envoyer la scène entière risquerait d'écraser un contenu en cours
         * d'édition ailleurs.
         */
        async updateSceneNotes(sceneId: number, notes: string): Promise<void> {
            const found = this.findSceneContext(sceneId);
            if (!found) return;

            const previous = found.scene.notes ?? null;
            const value = notes.trim() ? notes : null;

            // Optimiste : la note s'affiche tout de suite
            found.scene.notes = value;

            try {
                const config = useRuntimeConfig();
                const authStore = useAuthStore();

                await $fetch(`${config.public.apiBase}/scene/update`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-AUTH-TOKEN': authStore.token!,
                    },
                    body: { id: sceneId, notes: value },
                });
            } catch (error) {
                found.scene.notes = previous;
                console.error("Erreur lors de l'enregistrement de la note :", error);
                throw error;
            }
        },

        /**
         * Déplace une scène vers une autre séquence (ou la repositionne dans
         * la sienne). Le serveur renumérote les deux conteneurs et renvoie
         * leurs positions finales.
         */
        async moveSceneToSequence(sceneId: number, targetSequenceId: number, afterSceneId?: number): Promise<void> {
            const found = this.findSceneContext(sceneId);
            if (!found?.sequence.scenes) return;

            try {
                const config = useRuntimeConfig();
                const authStore = useAuthStore();

                const result: any = await $fetch(`${config.public.apiBase}/scene/move`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-AUTH-TOKEN': authStore.token!,
                    },
                    body: { sceneId, targetSequenceId, afterSceneId },
                });

                const scene = found.scene;
                found.sequence.scenes.splice(found.index, 1);

                const target = this.sequences.find(s => s.id === targetSequenceId);
                if (target) {
                    if (!target.scenes) target.scenes = [];
                    target.scenes.push(scene);
                    scene.sequence_id = targetSequenceId;
                }

                // Source et cible ont toutes deux bougé. Quand c'est la même
                // séquence, les deux appels portent sur le même tableau.
                applyPositions(found.sequence.scenes, result.sourcePositions);
                if (target?.scenes) applyPositions(target.scenes, result.targetPositions);

                this.calculateStats();
            } catch (error) {
                console.error("Erreur lors du déplacement de la scène :", error);
                throw error;
            }
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
                        'X-AUTH-TOKEN': authStore.token!
                    }
                });

                // remove the part
                const parts = this.project?.parts;
                if (!parts) return;

                const index = parts.findIndex(p => p.id === partId);
                if (index === -1) return; // sans garde, splice(-1) supprimerait la dernière partie

                parts.splice(index, 1);
                resequence(parts);
                this.expandedParts.delete(partId);
                this.calculateStats();

            } catch (error) {
                console.error("Erreur lors de la suppression d'une partie :", error);
                throw error;
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
                        'X-AUTH-TOKEN': authStore.token!
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
                        'X-AUTH-TOKEN': authStore.token!
                    },
                    body: newPart,
                });

                const { part: savedPart, positions } = result;

                const parts = this.project.parts;
                const existingIndex = parts.findIndex(p => p.id === savedPart.id);

                if (existingIndex !== -1) {
                    // update part name and description
                    parts[existingIndex] = {
                        ...parts[existingIndex],
                        name: savedPart.name,
                        description: savedPart.description
                    };

                } else {
                    // add the new part — la hiérarchie vide évite un `undefined` dans les getters
                    const created = { ...savedPart, sequences: savedPart.sequences ?? [] };
                    const index = afterPartId ? parts.findIndex(p => p.id === afterPartId) : -1;
                    if (index !== -1) {
                        parts.splice(index + 1, 0, created);
                    } else {
                        parts.unshift(created);
                    }
                    this.expandedParts.add(created.id);
                }

                // L'API renvoie ici les ids dans leur nouvel ordre, pas des {id, position}
                if (positions && positions.length > 0) {
                    parts.sort((a, b) => positions.indexOf(a.id) - positions.indexOf(b.id));
                    parts.forEach((part, i) => { part.position = i + 1; });
                }

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
                        'X-AUTH-TOKEN': authStore.token!,
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
                        'X-AUTH-TOKEN': authStore.token!,
                    },
                    body: newSequence,
                });

                const savedSequence = result.sequence;

                const part = this.project?.parts.find(p => p.id === partId);
                if (part) {
                    if (!part.sequences) part.sequences = [];

                    const existing = part.sequences.find(s => s.id === savedSequence.id);
                    if (existing) {
                        // Mutation en place : ne pas écraser les scènes déjà chargées
                        Object.assign(existing, { ...savedSequence, scenes: existing.scenes });
                    } else {
                        part.sequences.push({ ...savedSequence, scenes: savedSequence.scenes ?? [] });
                    }

                    // Le serveur fait autorité sur les positions
                    applyPositions(part.sequences, result.positions);
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
                        'X-AUTH-TOKEN': authStore.token!,
                    },
                });

                const found = this.findSequenceContext(sequenceId);
                if (found) {
                    found.part.sequences!.splice(found.index, 1);
                    // Sans ça, les positions locales restent trouées jusqu'au prochain fetch
                    resequence(found.part.sequences!);
                }

                this.calculateStats();
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
                        'X-AUTH-TOKEN': authStore.token!,
                    },
                    body: newScene,
                });

                const savedScene = result.scene;

                const sequence = this.sequences.find(s => s.id === sequenceId);
                if (sequence) {
                    if (!sequence.scenes) sequence.scenes = [];

                    const existing = sequence.scenes.find(s => s.id === savedScene.id);
                    if (existing) {
                        Object.assign(existing, savedScene);
                    } else {
                        sequence.scenes.push(savedScene);
                    }

                    // Le serveur fait autorité : il a décalé les scènes suivantes
                    // en cas d'insertion via afterSceneId.
                    applyPositions(sequence.scenes, result.positions);
                }

                this.calculateStats();

                return savedScene;
            } catch (error) {
                console.error("Erreur lors de la sauvegarde d'une scène :", error);
                // Remonter l'échec : renvoyer null en silence faisait afficher
                // un faux succès à l'appelant.
                throw error;
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
                        'X-AUTH-TOKEN': authStore.token!,
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
                        'X-AUTH-TOKEN': authStore.token!,
                    },
                    body: { sequences: sequencePositions },
                });

            } catch (error) {
                console.error("Erreur lors de la sauvegarde de l'ordre des séquences :", error);
                throw error;
            }
        },

        async updateSequenceMetadata(sequenceId: number, metadata: { intention?: string, aesthetic_idea?: string, information?: string }): Promise<void> {
            try {
                const config = useRuntimeConfig();
                const authStore = useAuthStore();

                // Appeler la nouvelle route dédiée aux métadonnées
                const result: any = await $fetch(`${config.public.apiBase}/sequence/${sequenceId}/metadata`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-AUTH-TOKEN': authStore.token!,
                    },
                    body: metadata,
                });

                // Mise à jour locale de la séquence
                if (this.project && this.project.parts) {
                    for (const part of this.project.parts) {
                        if (part.sequences) {
                            const sequenceIndex = part.sequences.findIndex(s => s.id === sequenceId);
                            if (sequenceIndex !== -1) {
                                // Mettre à jour uniquement les champs de métadonnées
                                if (metadata.intention !== undefined) {
                                    part.sequences[sequenceIndex].intention = metadata.intention;
                                }
                                if (metadata.aesthetic_idea !== undefined) {
                                    part.sequences[sequenceIndex].aesthetic_idea = metadata.aesthetic_idea;
                                }
                                if (metadata.information !== undefined) {
                                    part.sequences[sequenceIndex].information = metadata.information;
                                }
                                break;
                            }
                        }
                    }
                }

            } catch (error) {
                console.error("Erreur lors de la mise à jour des métadonnées de la séquence :", error);
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
                        'X-AUTH-TOKEN': authStore.token!,
                    },
                });

                const found = this.findSceneContext(sceneId);
                if (found) {
                    found.sequence.scenes!.splice(found.index, 1);
                    resequence(found.sequence.scenes!);
                }

                this.calculateStats();
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
                        'X-AUTH-TOKEN': authStore.token!
                    },
                    body: projectData
                });

                return result;
            } catch (error) {
                console.error("Erreur lors de la création du projet :", error);
                throw error;
            }
        },

        async updateProject(projectData: {
            id: number;
            name: string;
            description: string;
            type_id: number;
            genre_id?: number;
            subgenre_id?: number;
            narrative_structure_id?: number;
        }) {
            try {
                const config = useRuntimeConfig();
                const authStore = useAuthStore();

                const result: any = await $fetch(`${config.public.apiBase}/project/update`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-AUTH-TOKEN': authStore.token!
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
                        'X-AUTH-TOKEN': authStore.token!
                    }
                });

                // Nettoyer le store si c'est le projet actuellement chargé
                if (this.project && this.project.id === projectId) {
                    this.project = null;
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