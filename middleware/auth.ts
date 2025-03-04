import { useAuthStore } from "~/store/auth";

export default defineNuxtRouteMiddleware(async (to, from) => {
    const auth = useAuthStore()
    if (!auth.token) {
        console.warn("Redirection vers /login car aucun token trouvé")
        return navigateTo('/login')
    }
})
