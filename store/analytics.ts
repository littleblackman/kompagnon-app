import { defineStore } from 'pinia';
import { useAuthStore } from '~/store/auth';
import type { Project, Part, Sequence, Scene } from '~/types';

interface RecentScene extends Scene {
  projectName: string;
  sequenceName: string;
}

interface Statistics {
  totalProjects: number;
  totalParts: number;
  totalSequences: number;
  totalScenes: number;
  totalPersonnages: number;
  averagePartsPerProject: number;
  averageSequencesPerPart: number;
  averageScenesPerSequence: number;
  recentScenes: RecentScene[];
}

interface ProjectWithData extends Project {
  parts: Part[];
}

export const useAnalyticsStore = defineStore('analytics', {
  state: () => ({
    projects: [] as ProjectWithData[],
    isLoading: false as boolean,
    lastUpdated: null as Date | null
  }),

  getters: {
    statistics: (state): Statistics => {
      if (!state.projects || state.projects.length === 0) {
        return {
          totalProjects: 0,
          totalParts: 0,
          totalSequences: 0,
          totalScenes: 0,
          totalPersonnages: 0,
          averagePartsPerProject: 0,
          averageSequencesPerPart: 0,
          averageScenesPerSequence: 0,
          recentScenes: []
        };
      }

      let totalParts = 0;
      let totalSequences = 0;
      let totalScenes = 0;
      let totalPersonnages = 0;
      const recentScenes: RecentScene[] = [];

      state.projects.forEach((project: ProjectWithData) => {
        // Compter les personnages
        if (project.personnages) {
          totalPersonnages += project.personnages.length;
        }

        // Compter les parties
        if (project.parts) {
          totalParts += project.parts.length;
          
          project.parts.forEach((part: Part) => {
            // Compter les séquences
            if (part.sequences) {
              totalSequences += part.sequences.length;
              
              part.sequences.forEach((sequence: Sequence) => {
                // Compter les scènes
                if (sequence.scenes) {
                  totalScenes += sequence.scenes.length;
                  
                  // Collecter les scènes récentes avec le contexte
                  sequence.scenes.forEach((scene: Scene) => {
                    recentScenes.push({
                      ...scene,
                      projectName: project.name,
                      sequenceName: sequence.name
                    });
                  });
                }
              });
            }
          });
        }
      });

      // Trier les scènes par ID (plus récent en premier)
      recentScenes.sort((a, b) => b.id - a.id);

      // Calculer les moyennes
      const totalProjects = state.projects.length;
      const averagePartsPerProject = totalProjects > 0 ? totalParts / totalProjects : 0;
      const averageSequencesPerPart = totalParts > 0 ? totalSequences / totalParts : 0;
      const averageScenesPerSequence = totalSequences > 0 ? totalScenes / totalSequences : 0;

      return {
        totalProjects,
        totalParts,
        totalSequences,
        totalScenes,
        totalPersonnages,
        averagePartsPerProject: Math.round(averagePartsPerProject * 10) / 10,
        averageSequencesPerPart: Math.round(averageSequencesPerPart * 10) / 10,
        averageScenesPerSequence: Math.round(averageScenesPerSequence * 10) / 10,
        recentScenes: recentScenes.slice(0, 10) // Les 10 plus récentes
      };
    },

    // Statistiques par projet
    projectStatistics: (state) => {
      return state.projects.map((project: ProjectWithData) => {
        let parts = 0;
        let sequences = 0;
        let scenes = 0;
        let personnages = project.personnages?.length || 0;

        if (project.parts) {
          parts = project.parts.length;
          
          project.parts.forEach((part: Part) => {
            if (part.sequences) {
              sequences += part.sequences.length;
              
              part.sequences.forEach((sequence: Sequence) => {
                if (sequence.scenes) {
                  scenes += sequence.scenes.length;
                }
              });
            }
          });
        }

        return {
          id: project.id,
          name: project.name,
          slug: project.slug,
          parts,
          sequences,
          scenes,
          personnages
        };
      });
    }
  },

  actions: {
    // Charger tous les projets avec leur hiérarchie complète
    async loadProjectsData() {
      this.isLoading = true;
      
      try {
        const config = useRuntimeConfig();
        const authStore = useAuthStore();
        
        // D'abord récupérer la liste des projets
        const projectsList = await $fetch<Project[]>(`${config.public.apiBase}/projects`, {
          headers: { Authorization: `Bearer ${authStore.token}` }
        });

        // Ensuite charger chaque projet avec sa hiérarchie complète
        const projectsWithData = await Promise.all(
          projectsList.map(async (project: Project) => {
            try {
              const fullProject = await $fetch<ProjectWithData>(`${config.public.apiBase}/project/${project.slug}`, {
                headers: { Authorization: `Bearer ${authStore.token}` }
              });
              return fullProject;
            } catch (error) {
              console.error(`Erreur chargement projet ${project.slug}:`, error);
              // Retourner le projet avec une structure minimale en cas d'erreur
              return {
                ...project,
                parts: []
              } as ProjectWithData;
            }
          })
        );

        this.projects = projectsWithData;
        this.lastUpdated = new Date();
        
      } catch (error) {
        console.error('Erreur chargement projets pour analytics:', error);
        throw error;
      } finally {
        this.isLoading = false;
      }
    },

    // Actualiser les données si elles sont trop anciennes (plus de 5 minutes)
    async refreshIfNeeded() {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      
      if (!this.lastUpdated || this.lastUpdated < fiveMinutesAgo || this.projects.length === 0) {
        await this.loadProjectsData();
      }
    },

    // Forcer l'actualisation des données
    async forceRefresh() {
      await this.loadProjectsData();
    },

    // Obtenir les statistiques d'un projet spécifique
    getProjectStats(projectId: number) {
      const project = this.projects.find(p => p.id === projectId);
      if (!project) return null;

      let parts = 0;
      let sequences = 0;
      let scenes = 0;
      const personnages = project.personnages?.length || 0;

      if (project.parts) {
        parts = project.parts.length;
        
        project.parts.forEach((part: Part) => {
          if (part.sequences) {
            sequences += part.sequences.length;
            
            part.sequences.forEach((sequence: Sequence) => {
              if (sequence.scenes) {
                scenes += sequence.scenes.length;
              }
            });
          }
        });
      }

      return {
        projectName: project.name,
        parts,
        sequences,
        scenes,
        personnages
      };
    },

    // Obtenir les scènes récentes pour un projet spécifique
    getRecentScenesByProject(projectId: number, limit: number = 5): RecentScene[] {
      const project = this.projects.find(p => p.id === projectId);
      if (!project || !project.parts) return [];

      const scenes: RecentScene[] = [];

      project.parts.forEach((part: Part) => {
        if (part.sequences) {
          part.sequences.forEach((sequence: Sequence) => {
            if (sequence.scenes) {
              sequence.scenes.forEach((scene: Scene) => {
                scenes.push({
                  ...scene,
                  projectName: project.name,
                  sequenceName: sequence.name
                });
              });
            }
          });
        }
      });

      // Trier par ID décroissant (plus récent en premier)
      scenes.sort((a, b) => b.id - a.id);
      
      return scenes.slice(0, limit);
    }
  }
});