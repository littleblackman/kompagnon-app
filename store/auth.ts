import { defineStore } from 'pinia'

export const useAuthStore = defineStore('auth', {
    state: () => ({
        token: process.client ? localStorage.getItem('token') : null,
        user: null as object | null
    }),

    actions: {
        async login(email: string, password: string) {
            try {
                const response = await fetch('http://127.0.0.1:8001/api/login_check', {
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

                navigateTo('/')
            } catch (error) {
                console.error('Erreur de connexion:', error)
                throw error
            }
        },

        async fetchUser() {
            if (!this.token) return

            try {
                const response = await fetch('http://127.0.0.1:8001/api/users/me', {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${this.token}`
                    }
                })

                if (response.ok) {
                    this.user = await response.json();
                }
            } catch (error) {
                console.error("Impossible de récupérer l'utilisateur :", error)
            }
        },

        logout() {
            this.token = null
            this.user = null
            localStorage.removeItem('token')
            navigateTo('/login')
        },

        initAuth() {
            const token = localStorage.getItem('token')
            if (token) {
                this.token = token
                this.fetchUser();
            }
        }
    }
})
