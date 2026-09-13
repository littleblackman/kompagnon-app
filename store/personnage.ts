import { defineStore } from 'pinia';
import { useAuthStore } from '~/store/auth';
import type { Personnage } from '~/types';

interface CharacterDetectionConfig {
    maxDistance: number; // Distance maximum pour correspondance floue (2-3)
    minLength: number;   // Longueur minimum des mots à analyser (3)
    minConfidence: number; // Confiance minimum (0.6 = 60%)
}

interface DetectedCharacter {
    name: string;
    personnage?: Personnage;
    isExisting: boolean;
    confidence: number;
}

/**
 * Mots courants exclus de la détection.
 *
 * La majuscule de début de phrase suffirait sinon à les prendre pour des
 * noms propres — et « Famille » est à une lettre de « Camille ».
 */
const COMMON_WORDS = new Set([
    'alors', 'après', 'aussi', 'autre', 'autres', 'avant', 'avec', 'bien',
    'cela', 'cette', 'chaque', 'comme', 'dans', 'depuis', 'derrière', 'deux',
    'devant', 'dire', 'donc', 'elle', 'elles', 'encore', 'enfin', 'ensuite',
    'entre', 'était', 'être', 'faire', 'famille', 'fille', 'fils', 'frère',
    'homme', 'jamais', 'jour', 'lorsque', 'lui-même', 'mais', 'maison',
    'maman', 'mère', 'moins', 'monsieur', 'madame', 'mademoiselle', 'nous',
    'papa', 'parce', 'pendant', 'père', 'personne', 'peut', 'plus', 'point',
    'pour', 'pourquoi', 'près', 'puis', 'quand', 'quelle', 'quelqu', 'rien',
    'sans', 'seul', 'sous', 'soudain', 'surtout', 'toujours', 'tous', 'tout',
    'toute', 'très', 'vers', 'voilà', 'vous',
    'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche',
    'janvier', 'février', 'mars', 'avril', 'juin', 'juillet', 'août',
    'septembre', 'octobre', 'novembre', 'décembre'
]);

export const usePersonnageStore = defineStore('personnage', {
    state: () => ({
        personnages: [] as Personnage[],
        detectionConfig: {
            maxDistance: 1,
            minLength: 4,
            minConfidence: 0.8
        } as CharacterDetectionConfig,
        detectedCharacters: [] as DetectedCharacter[],
        showDetectionModal: false,
        currentSequenceId: null as number | null,
        currentSceneId: null as number | null
    }),

    getters: {
        getPersonnagesByProject: (state) => (projectId: number) => {
            return state.personnages.filter(p => p.project_id === projectId);
        },
        
        getPersonnageName: () => (personnage: Personnage) => {
            if (!personnage) return '';
            return [personnage.firstName, personnage.lastName].filter(Boolean).join(' ');
        }
    },

    actions: {
        // Configuration de la détection
        setDetectionConfig(config: Partial<CharacterDetectionConfig>) {
            this.detectionConfig = { ...this.detectionConfig, ...config };
        },

        // Calcul de la distance de Levenshtein
        levenshteinDistance(str1: string, str2: string): number {
            const matrix = [];
            
            // Créer la matrice
            for (let i = 0; i <= str2.length; i++) {
                matrix[i] = [i];
            }
            for (let j = 0; j <= str1.length; j++) {
                matrix[0][j] = j;
            }

            // Remplir la matrice
            for (let i = 1; i <= str2.length; i++) {
                for (let j = 1; j <= str1.length; j++) {
                    if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                        matrix[i][j] = matrix[i - 1][j - 1];
                    } else {
                        matrix[i][j] = Math.min(
                            matrix[i - 1][j - 1] + 1, // substitution
                            matrix[i][j - 1] + 1,     // insertion
                            matrix[i - 1][j] + 1      // deletion
                        );
                    }
                }
            }

            return matrix[str2.length][str1.length];
        },

        /**
         * Analyser le contenu pour détecter les personnages.
         *
         * Seuls les mots capitalisés hors début de phrase sont candidats : dans
         * un récit un personnage s'écrit « Camille », un nom commun « famille ».
         * Passer tout le texte en minuscules détruisait ce signal, et une
         * distance de 1 suffisait alors à confondre les deux — de même pour
         * Marie/mairie ou Julie/jolie.
         */
        analyzeContent(content: string): DetectedCharacter[] {
            if (!content || this.personnages.length === 0) return [];

            const text = content
                .replace(/<[^>]*>/g, ' ')
                .replace(/\s+/g, ' ');

            // Tous les mots capitalisés, débuts de phrase compris : un
            // personnage peut n'apparaître que là — « … son frère. Amara. »
            const pattern = /[A-Z\u00c0-\u00de][a-z\u00e0-\u00ff'\u2019-]+/g;

            const found = new Set<string>();
            for (const raw of text.match(pattern) ?? []) {
                const candidate = raw.toLowerCase();
                if (candidate.length < this.detectionConfig.minLength) continue;
                // Mots courants que la majuscule de début de phrase ferait
                // passer pour des noms propres
                if (COMMON_WORDS.has(candidate)) continue;
                found.add(candidate);
            }

            const words = [...found];

            const detected: DetectedCharacter[] = [];

            // Comparer chaque mot avec les personnages existants
            for (const word of words) {
                for (const personnage of this.personnages) {
                    const firstName = personnage.firstName?.toLowerCase() || '';
                    const lastName = personnage.lastName?.toLowerCase() || '';
                    
                    if (firstName && this.isMatch(word, firstName)) {
                        const distance = this.levenshteinDistance(word, firstName);
                        const confidence = 1 - (distance / Math.max(word.length, firstName.length));
                        detected.push({ name: word, personnage, isExisting: true, confidence });
                    }

                    if (lastName && this.isMatch(word, lastName)) {
                        const distance = this.levenshteinDistance(word, lastName);
                        const confidence = 1 - (distance / Math.max(word.length, lastName.length));
                        detected.push({ name: word, personnage, isExisting: true, confidence });
                    }
                }
            }


            // Filtrer par confiance, dédupliquer par personnage (meilleur match uniquement), trier
            const byPersonnage = new Map<number, DetectedCharacter>();
            for (const item of detected) {
                if (item.confidence < this.detectionConfig.minConfidence) continue;
                const id = item.personnage?.id ?? -1;
                const existing = byPersonnage.get(id);
                if (!existing || item.confidence > existing.confidence) {
                    byPersonnage.set(id, item);
                }
            }

            return [...byPersonnage.values()].sort((a, b) => b.confidence - a.confidence);
        },

        /**
         * Noms propres du texte qui ne correspondent à aucun personnage connu.
         *
         * Heuristique volontairement prudente : en français la majuscule sert
         * aussi à ouvrir une phrase. On écarte donc les débuts de phrase, les
         * mots courants capitalisés, et on exige au moins deux occurrences —
         * un nom qui revient est bien plus probablement un personnage.
         */
        findUnknownNames(content: string, minOccurrences = 2): Array<{ name: string; count: number }> {
            if (!content) return [];

            const text = content
                .replace(/<[^>]*>/g, ' ')
                .replace(/\s+/g, ' ');

            const STOP = new Set([
                'le', 'la', 'les', 'un', 'une', 'des', 'il', 'elle', 'ils', 'elles',
                'je', 'tu', 'nous', 'vous', 'on', 'ce', 'cet', 'cette', 'mais', 'puis',
                'alors', 'quand', 'tout', 'tous', 'toute', 'rien', 'plus', 'moins',
                'oui', 'non', 'monsieur', 'madame', 'docteur', 'dieu',
                'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche',
                'janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet',
                'août', 'septembre', 'octobre', 'novembre', 'décembre'
            ]);

            const known = new Set<string>();
            this.personnages.forEach((p: any) => {
                if (p.firstName) known.add(p.firstName.toLowerCase());
                if (p.lastName) known.add(p.lastName.toLowerCase());
            });

            const counts = new Map<string, number>();
            // Capitale non précédée d'une fin de phrase ni d'un début de texte
            const pattern = /(^|[^.!?…:»"'\n]\s+)([A-ZÀ-Þ][a-zà-ÿ]{2,})/g;

            let match: RegExpExecArray | null;
            while ((match = pattern.exec(text)) !== null) {
                const word = match[2];
                const lower = word.toLowerCase();

                if (STOP.has(lower) || known.has(lower)) continue;
                // Proche d'un personnage connu : c'est une variante, pas un inconnu
                if ([...known].some(k => this.isMatch(lower, k))) continue;

                counts.set(word, (counts.get(word) ?? 0) + 1);
            }

            return [...counts.entries()]
                .filter(([, count]) => count >= minOccurrences)
                .map(([name, count]) => ({ name, count }))
                .sort((a, b) => b.count - a.count);
        },

        /**
         * Correspondance entre un mot du texte et un nom.
         *
         * La tolérance suit la longueur : une lettre d'écart sur cinq
         * caractères change le mot, sur dix ce n'est qu'une coquille. Et un nom
         * trop court, ou composé comme « de K », ne peut produire que du bruit
         * face à un mot isolé.
         */
        isMatch(word1: string, word2: string): boolean {
            const MIN_NAME_LENGTH = 4;
            if (word2.length < MIN_NAME_LENGTH || word2.includes(' ')) return false;

            const tolerance = word2.length >= 6 ? this.detectionConfig.maxDistance : 0;

            return this.levenshteinDistance(word1, word2) <= tolerance;
        },

        // Analyser et proposer l'ajout de personnages
        async detectAndSuggestCharacters(content: string, sequenceId: number, sceneId?: number) {
            const ignoredKey = sceneId ? `kpgn_ignored_scene_${sceneId}` : null;
            const ignoredIds: number[] = ignoredKey
                ? JSON.parse(localStorage.getItem(ignoredKey) || '[]')
                : [];

            const detected = this.analyzeContent(content)
                .filter(d => !ignoredIds.includes(d.personnage?.id ?? -1));

            if (detected.length > 0) {
                this.detectedCharacters = detected;
                this.currentSequenceId = sequenceId;
                this.currentSceneId = sceneId ?? null;
                this.showDetectionModal = true;
            }
        },

        // Fermer la modal de détection
        closeDetectionModal() {
            this.showDetectionModal = false;
            this.detectedCharacters = [];
            this.currentSequenceId = null;
            this.currentSceneId = null;
        },

        // Ignorer ce personnage pour cette scène uniquement
        ignorePersonnageAlways(personnageId: number) {
            if (this.currentSceneId) {
                const key = `kpgn_ignored_scene_${this.currentSceneId}`;
                const current: number[] = JSON.parse(localStorage.getItem(key) || '[]');
                if (!current.includes(personnageId)) {
                    current.push(personnageId);
                    localStorage.setItem(key, JSON.stringify(current));
                }
            }
            this.detectedCharacters = this.detectedCharacters.filter(d => d.personnage?.id !== personnageId);
            if (this.detectedCharacters.length === 0) {
                this.closeDetectionModal();
            }
        },

        // Ajouter un personnage à une séquence
        async addPersonnageToSequence(personnageId: number, sequenceId: number) {
            try {
                const config = useRuntimeConfig();
                const authStore = useAuthStore();

                await $fetch(`${config.public.apiBase}/sequence/personnage/add`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-AUTH-TOKEN': authStore.token!,
                    },
                    body: {
                        sequenceId,
                        personnageId
                    }
                });

                return true;
            } catch (error) {
                console.error("Erreur lors de l'ajout du personnage à la séquence :", error);
                return false;
            }
        },

        // CRUD Personnages (déplacé depuis project.ts)
        async savePersonnage(personnageData: Partial<Personnage>, projectId: number) {
            try {
                const config = useRuntimeConfig();
                const authStore = useAuthStore();

                const dataToSend = {
                    ...personnageData,
                    project_id: projectId
                };

                const savedPersonnage: Personnage = await $fetch(`${config.public.apiBase}/personnage/update`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-AUTH-TOKEN': authStore.token!
                    },
                    body: dataToSend
                });

                // Mise à jour locale de la liste des personnages
                const existingIndex = this.personnages.findIndex(p => p.id === savedPersonnage.id);
                if (existingIndex !== -1) {
                    this.personnages[existingIndex] = savedPersonnage;
                } else {
                    this.personnages.push(savedPersonnage);
                }

                return savedPersonnage;
            } catch (error) {
                console.error("Erreur lors de la sauvegarde d'un personnage :", error);
                return null;
            }
        },

        async deletePersonnage(personnageId: number) {
            try {
                const config = useRuntimeConfig();
                const authStore = useAuthStore();

                await $fetch(`${config.public.apiBase}/personnage/delete/${personnageId}`, {
                    method: 'DELETE',
                    headers: {
                        'X-AUTH-TOKEN': authStore.token!,
                    },
                });

                // Mise à jour locale
                this.personnages = this.personnages.filter(p => p.id !== personnageId);
                return true;
            } catch (error) {
                console.error("Erreur lors de la suppression du personnage :", error);
                return false;
            }
        },

        async removePersonnageFromSequence(sequenceId: number, personnageId: number): Promise<boolean> {
            try {
                const config = useRuntimeConfig();
                const authStore = useAuthStore();

                await $fetch(`${config.public.apiBase}/sequence/personnage/remove/${sequenceId}/${personnageId}`, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-AUTH-TOKEN': authStore.token!,
                    }
                });

                return true;
            } catch (error) {
                console.error("Erreur lors de la suppression de l'assignation personnage-séquence :", error);
                return false;
            }
        },

        // Gestion des images de personnages
        async uploadImages(personnageId: number, files: File[]): Promise<string[]> {
            try {
                const config = useRuntimeConfig();
                const authStore = useAuthStore();
                
                const formData = new FormData();
                files.forEach((file) => {
                    formData.append('images[]', file);
                });

                const response = await $fetch(`${config.public.apiBase}/personnage/${personnageId}/upload-images`, {
                    method: 'POST',
                    headers: {
                        'X-AUTH-TOKEN': authStore.token!,
                    },
                    body: formData
                }) as { images: string[] };

                // Mettre à jour le personnage local
                const personnage = this.personnages.find(p => p.id === personnageId);
                if (personnage) {
                    // S'assurer que personnage.images est un tableau
                    let currentImages = personnage.images || [];
                    if (typeof currentImages === 'string') {
                        try {
                            currentImages = JSON.parse(currentImages);
                        } catch {
                            currentImages = [];
                        }
                    }
                    if (!Array.isArray(currentImages)) {
                        currentImages = [];
                    }

                    // Ajouter les nouvelles images
                    personnage.images = [...currentImages, ...response.images];
                    
                    // Si c'est la première image, la définir comme avatar
                    if (!personnage.avatar && response.images.length > 0) {
                        personnage.avatar = response.images[0];
                    }
                }

                return response.images;
            } catch (error) {
                console.error("Erreur lors de l'upload des images :", error);
                throw error;
            }
        },

        async reorderImages(personnageId: number, orderedImages: string[]): Promise<boolean> {
            try {
                const config = useRuntimeConfig();
                const authStore = useAuthStore();

                await $fetch(`${config.public.apiBase}/personnage/${personnageId}/reorder-images`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-AUTH-TOKEN': authStore.token!,
                    },
                    body: { images: orderedImages }
                });

                // Mettre à jour le personnage local
                const personnage = this.personnages.find(p => p.id === personnageId);
                if (personnage) {
                    personnage.images = orderedImages;
                    // La première image devient l'avatar
                    if (orderedImages.length > 0) {
                        personnage.avatar = orderedImages[0];
                    }
                }

                return true;
            } catch (error) {
                console.error("Erreur lors de la réorganisation des images :", error);
                throw error;
            }
        },

        async deleteImage(personnageId: number, imageUrl: string): Promise<boolean> {
            try {
                const authStore = useAuthStore();
                const config = useRuntimeConfig();
                
                // Appel API pour supprimer l'image côté serveur
                await $fetch(`${config.public.apiBase}/personnage/${personnageId}/delete-image`, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-AUTH-TOKEN': authStore.token!,
                    },
                    body: { imageUrl }
                });

                // Mettre à jour le state local après succès de l'API
                const personnage = this.personnages.find(p => p.id === personnageId);
                if (personnage && personnage.images) {
                    // S'assurer que personnage.images est un tableau
                    let imagesArray = personnage.images;
                    if (typeof imagesArray === 'string') {
                        try {
                            imagesArray = JSON.parse(imagesArray);
                        } catch {
                            imagesArray = [];
                        }
                    }
                    if (!Array.isArray(imagesArray)) {
                        imagesArray = [];
                    }

                    // Supprimer l'image de la liste locale
                    personnage.images = imagesArray.filter(img => img !== imageUrl);
                    
                    // Si c'était l'avatar, prendre la première image restante
                    if (personnage.avatar === imageUrl) {
                        personnage.avatar = personnage.images.length > 0 ? personnage.images[0] : undefined;
                    }
                }

                return true;
            } catch (error) {
                console.error("Erreur lors de la suppression de l'image :", error);
                throw error;
            }
        },

        // Initialiser la table de référence des personnages (une seule fois au chargement)
        setPersonnages(personnages: Personnage[]) {
            console.log('Initializing personnages reference table with:', personnages.length, 'characters');
            this.personnages = personnages || [];
        }
    }
});