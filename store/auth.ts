import { defineStore } from 'pinia';

export const useAuthStore = defineStore('auth', {
    state: () => ({
        token: process.client ? localStorage.getItem('token') : null,
        user: null as object | null
    }),

    actions: {
        async login(email: string, password: string) {
            try {
                const config = useRuntimeConfig();
                const response = await fetch(`${config.public.apiBase}/login_check`, {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({email, password})
                })

                if (!response.ok) {
                    throw new Error('Login failed')
                }

                const data = await response.json()
                this.token = data.token
                localStorage.setItem('token', data.token)

                await this.fetchUser()
                
                // Charger les metadata après connexion
                const { useMetadataStore } = await import('~/store/metadata');
                const metadataStore = useMetadataStore();
                await metadataStore.fetchMetadata();

                navigateTo('/')
            } catch (error) {
                console.error('Erreur de connexion:', error)
                throw error
            }
        },

        async fetchUser() {
            if (!this.token) return

            try {
                const config = useRuntimeConfig()
                const response = await fetch(`${config.public.apiBase}/users/me`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${this.token}`
                    }
                })

                if (!response.ok) {
                    if (response.status === 401 || response.status === 403) {
                        this.logout()
                    }
                    throw new Error('Token invalide ou utilisateur non autorisé')
                }

                this.user = await response.json()
            } catch (error) {
                console.error("Erreur lors de fetchUser :", error)
                throw error
            }
        },

        logout() {
            this.token = null
            this.user = null
            localStorage.removeItem('token')
            navigateTo('/login')
        },

        async initAuth() {
            const token = localStorage.getItem('token')
            if (token) {
                this.token = token
                await this.fetchUser();
                
                // Charger les metadata si token valide
                const { useMetadataStore } = await import('~/store/metadata');
                const metadataStore = useMetadataStore();
                if (!metadataStore.loaded) {
                    await metadataStore.fetchMetadata();
                }
            }
        },

        // check if the user is authenticated else redirect to login
        requireAuth() {
            if (!this.token) {
                navigateTo('/login')
            }
        }

    }
})
