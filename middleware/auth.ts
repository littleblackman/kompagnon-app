import { useAuthStore } from "~/store/auth";

export default defineNuxtRouteMiddleware(async () => {
    const auth = useAuthStore()

    if (process.client) {
        // Session expirée → la modale gère la reconnexion, on laisse passer
        if (auth.sessionExpired) return

        if (!auth.token) {
            const token = localStorage.getItem('token')
            if (token) {
                auth.token = token
            }
        }

        if (auth.token) {
            try {
                await auth.fetchUser()
            } catch (error) {
                console.warn("Token invalide, redirection vers /login")
                auth.logout()
                return navigateTo('/login')
            }
        }

        // Session expirée détectée par fetchUser → modale, pas de redirection
        if (auth.sessionExpired) return

        if (!auth.token) {
            console.warn("Pas de token dispo, redirection vers /login")
            return navigateTo('/login')
        }
    }
})
