import { useAuthStore } from "~/store/auth";

export default defineNuxtRouteMiddleware(async () => {
    const auth = useAuthStore()

    if (process.client) {
        // Récupérer le token depuis localStorage si absent
        if (!auth.token) {
            const token = localStorage.getItem('token')
            if (token) {
                auth.token = token
            }
        }

        // Si on a un token, on vérifie s’il est encore valide
        if (auth.token) {
            try {
                await auth.fetchUser()
            } catch (error) {
                console.warn("Token invalide, suppression et redirection vers /login")
                auth.logout()
                return navigateTo('/login')
            }
        }

        // Si toujours pas de token après tentative → redirection
        if (!auth.token) {
            console.warn("Pas de token dispo, redirection vers /login")
            return navigateTo('/login')
        }
    }
})
