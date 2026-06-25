import { defineStore } from 'pinia';

export const useAuthStore = defineStore('auth', {
    state: () => ({
        token: process.client ? localStorage.getItem('token') : null,
        user: null as object | null,
        lastEmail: process.client ? (localStorage.getItem('lastEmail') || '') : '',
        sessionExpired: false,
        pingInterval: null as NodeJS.Timeout | null,
        lastActivity: Date.now()
    }),

    actions: {
        async register(email: string, password: string) {
            try {
                const config = useRuntimeConfig();
                const response = await fetch(`${config.public.apiBase}/register`, {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({email, password})
                })

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Registration failed')
                }

                await this.login(email, password)
            } catch (error) {
                console.error('Erreur d\'inscription:', error)
                throw error
            }
        },

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
                this.lastEmail = email
                localStorage.setItem('token', data.token)
                localStorage.setItem('lastEmail', email)

                await this.fetchUser()

                const { useMetadataStore } = await import('~/store/metadata');
                const metadataStore = useMetadataStore();
                await metadataStore.fetchMetadata();

                this.startSessionPing()
                navigateTo('/')
            } catch (error) {
                console.error('Erreur de connexion:', error)
                throw error
            }
        },

        // Reconnexion depuis la modale sans naviguer
        async relogin(email: string, password: string) {
            const config = useRuntimeConfig();
            const response = await fetch(`${config.public.apiBase}/login_check`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({email, password})
            })

            if (!response.ok) {
                throw new Error('Identifiants incorrects')
            }

            const data = await response.json()
            this.token = data.token
            this.lastEmail = email
            localStorage.setItem('token', data.token)
            localStorage.setItem('lastEmail', email)

            await this.fetchUser()
            this.clearSessionExpired()
            this.startSessionPing()
        },

        async fetchUser() {
            if (!this.token) return

            try {
                const config = useRuntimeConfig()
                const response = await fetch(`${config.public.apiBase}/users/me`, {
                    method: 'GET',
                    headers: { 'X-AUTH-TOKEN': this.token },
                    body: null
                })

                if (!response.ok) {
                    if (response.status === 401 || response.status === 403) {
                        if (this.user !== null) {
                            // Session expirée en cours de travail → modale, pas de redirection
                            this.setSessionExpired()
                            return
                        }
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

        setSessionExpired() {
            this.sessionExpired = true
            this.token = null
            this.stopSessionPing()
            localStorage.removeItem('token')
        },

        clearSessionExpired() {
            this.sessionExpired = false
        },

        startSessionPing() {
            this.stopSessionPing()
            this.pingInterval = setInterval(() => {
                if (this.token) {
                    this.fetchUser().catch(() => {})
                }
            }, 10 * 60 * 1000)
        },

        stopSessionPing() {
            if (this.pingInterval) {
                clearInterval(this.pingInterval)
                this.pingInterval = null
            }
        },

        logout() {
            this.stopSessionPing()
            this.token = null
            this.user = null
            this.sessionExpired = false
            localStorage.removeItem('token')
            navigateTo('/login')
        },

        async initAuth() {
            const token = localStorage.getItem('token')
            if (token) {
                this.token = token
                await this.fetchUser();

                const { useMetadataStore } = await import('~/store/metadata');
                const metadataStore = useMetadataStore();
                if (!metadataStore.loaded) {
                    await metadataStore.fetchMetadata();
                }

                this.startSessionPing()
            }
        },

        requireAuth() {
            if (!this.token) {
                navigateTo('/login')
            }
        }
    }
})
