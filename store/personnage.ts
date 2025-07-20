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

export const usePersonnageStore = defineStore('personnage', {
    state: () => ({
        personnages: [] as Personnage[],
        detectionConfig: {
            maxDistance: 3,
            minLength: 3,
            minConfidence: 0.6  // Confiance minimum 60%
        } as CharacterDetectionConfig,
        detectedCharacters: [] as DetectedCharacter[],
        showDetectionModal: false,
        currentSequenceId: null as number | null
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

        // Analyser le contenu pour détecter les personnages
        analyzeContent(content: string): DetectedCharacter[] {
            console.log('analyzeContent called with content length:', content.length);
            console.log('Available personnages from store:', this.personnages.map(p => ({ id: p.id, firstName: p.firstName, lastName: p.lastName })));
            
            if (!content || this.personnages.length === 0) {
                console.log('No content or no personnages available');
                return [];
            }

            // Convertir en minuscules et nettoyer le HTML
            const cleanContent = content.toLowerCase()
                .replace(/<[^>]*>/g, ' ') // Supprimer les balises HTML
                .replace(/[^\w\s]/g, ' ') // Supprimer la ponctuation
                .replace(/\s+/g, ' ')     // Normaliser les espaces
                .trim();

            console.log('Clean content:', cleanContent.substring(0, 200));

            // Extraire les mots uniques de longueur suffisante
            const words = [...new Set(
                cleanContent.split(' ').filter(word => 
                    word.length >= this.detectionConfig.minLength
                )
            )];

            console.log('Words to analyze:', words);

            const detected: DetectedCharacter[] = [];

            // Comparer chaque mot avec les personnages existants
            for (const word of words) {
                for (const personnage of this.personnages) {
                    const firstName = personnage.firstName?.toLowerCase() || '';
                    const lastName = personnage.lastName?.toLowerCase() || '';
                    
                    console.log(`Comparing word "${word}" with ${firstName}/${lastName}`);
                    
                    // Vérifier correspondance avec prénom
                    if (firstName && this.isMatch(word, firstName)) {
                        const distance = this.levenshteinDistance(word, firstName);
                        const confidence = 1 - (distance / Math.max(word.length, firstName.length));
                        
                        console.log(`Match found: ${word} -> ${firstName} (distance: ${distance}, confidence: ${confidence})`);
                        
                        detected.push({
                            name: word,
                            personnage,
                            isExisting: true,
                            confidence
                        });
                    }
                    
                    // Vérifier correspondance avec nom de famille
                    if (lastName && this.isMatch(word, lastName)) {
                        const distance = this.levenshteinDistance(word, lastName);
                        const confidence = 1 - (distance / Math.max(word.length, lastName.length));
                        
                        console.log(`Match found: ${word} -> ${lastName} (distance: ${distance}, confidence: ${confidence})`);
                        
                        detected.push({
                            name: word,
                            personnage,
                            isExisting: true,
                            confidence
                        });
                    }
                }
            }

            console.log('All detected before filtering:', detected);

            // Supprimer les doublons, filtrer par confiance et trier
            const uniqueDetected = detected
                .filter(item => item.confidence >= this.detectionConfig.minConfidence) // Filtrer par confiance
                .filter((item, index, self) => 
                    index === self.findIndex(t => 
                        t.personnage?.id === item.personnage?.id && t.name === item.name
                    )
                )
                .sort((a, b) => b.confidence - a.confidence);

            console.log('Final unique detected:', uniqueDetected);
            return uniqueDetected;
        },

        // Vérifier si deux mots correspondent selon les critères
        isMatch(word1: string, word2: string): boolean {
            const distance = this.levenshteinDistance(word1, word2);
            return distance <= this.detectionConfig.maxDistance;
        },

        // Analyser et proposer l'ajout de personnages
        async detectAndSuggestCharacters(content: string, sequenceId: number) {
            console.log('detectAndSuggestCharacters called with:', { content: content.substring(0, 100), sequenceId, personnagesCount: this.personnages.length });
            
            const detected = this.analyzeContent(content);
            console.log('Detected characters:', detected);
            
            if (detected.length > 0) {
                this.detectedCharacters = detected;
                this.currentSequenceId = sequenceId;
                this.showDetectionModal = true;
                console.log('Modal should be shown now');
            } else {
                console.log('No characters detected');
            }
        },

        // Fermer la modal de détection
        closeDetectionModal() {
            this.showDetectionModal = false;
            this.detectedCharacters = [];
            this.currentSequenceId = null;
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
                        Authorization: `Bearer ${authStore.token}`,
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
                        Authorization: `Bearer ${authStore.token}`
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
                        Authorization: `Bearer ${authStore.token}`,
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
                        Authorization: `Bearer ${authStore.token}`,
                    }
                });

                return true;
            } catch (error) {
                console.error("Erreur lors de la suppression de l'assignation personnage-séquence :", error);
                return false;
            }
        },

        // Initialiser la table de référence des personnages (une seule fois au chargement)
        setPersonnages(personnages: Personnage[]) {
            console.log('Initializing personnages reference table with:', personnages.length, 'characters');
            this.personnages = personnages || [];
        }
    }
});