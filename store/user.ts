import { defineStore } from 'pinia';
import { useAuthStore } from '~/store/auth';

interface User {
  id: number;
  email: string;
  firstName?: string;
  lastName?: string;
  fullName: string;
  avatar?: string;
  bio?: string;
  speciality?: string;
  createdAt?: string;
  lastLoginAt?: string;
}

export const useUserStore = defineStore('user', {
  state: () => ({
    profile: null as User | null,
    isLoading: false,
  }),

  getters: {
    displayName: (state) => {
      if (!state.profile) return '';
      return state.profile.fullName || state.profile.email;
    },

    hasAvatar: (state) => {
      return !!(state.profile?.avatar);
    }
  },

  actions: {
    // Récupérer le profil utilisateur complet
    async fetchProfile() {
      this.isLoading = true;
      
      try {
        const config = useRuntimeConfig();
        const authStore = useAuthStore();

        const response = await $fetch<{ user: User }>(`${config.public.apiBase}/user/profile`, {
          headers: {
            'X-AUTH-TOKEN': authStore.token!
          }
        });

        this.profile = response.user;
        return this.profile;
        
      } catch (error) {
        console.error('Erreur lors du chargement du profil:', error);
        throw error;
      } finally {
        this.isLoading = false;
      }
    },

    // Mettre à jour le profil
    async updateProfile(data: { firstName?: string; lastName?: string; avatar?: string }) {
      this.isLoading = true;
      
      try {
        const config = useRuntimeConfig();
        const authStore = useAuthStore();

        const response = await $fetch<{ message: string; user: User }>(`${config.public.apiBase}/user/profile`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-AUTH-TOKEN': authStore.token!
          },
          body: data
        });

        this.profile = response.user;
        return response;
        
      } catch (error) {
        console.error('Erreur lors de la mise à jour du profil:', error);
        throw error;
      } finally {
        this.isLoading = false;
      }
    },

    // Mettre à jour seulement le prénom
    async updateFirstName(firstName: string) {
      return this.updateProfile({ firstName });
    },

    // Mettre à jour seulement le nom
    async updateLastName(lastName: string) {
      return this.updateProfile({ lastName });
    },

    // Mettre à jour seulement l'avatar
    async updateAvatar(avatar: string) {
      return this.updateProfile({ avatar });
    },

    // Upload avatar
    async uploadAvatar(file: File) {
      this.isLoading = true;
      
      try {
        const config = useRuntimeConfig();
        const authStore = useAuthStore();

        const formData = new FormData();
        formData.append('avatar', file);

        const response = await $fetch<{ message: string; avatar: string; user: User }>(`${config.public.apiBase}/user/upload-avatar`, {
          method: 'POST',
          headers: {
            'X-AUTH-TOKEN': authStore.token!
          },
          body: formData
        });

        this.profile = response.user;
        return response;
        
      } catch (error) {
        console.error('Erreur lors de l\'upload de l\'avatar:', error);
        throw error;
      } finally {
        this.isLoading = false;
      }
    },

    // Nettoyer le store (lors de la déconnexion)
    clearProfile() {
      this.profile = null;
    }
  }
});