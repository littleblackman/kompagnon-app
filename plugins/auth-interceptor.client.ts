import { ofetch } from 'ofetch'
import { useAuthStore } from '~/store/auth'

export default defineNuxtPlugin(() => {
    globalThis.$fetch = ofetch.create({
        onResponseError({ response }) {
            if (response.status === 401) {
                try {
                    const authStore = useAuthStore()
                    if (authStore.user !== null && !authStore.sessionExpired) {
                        authStore.setSessionExpired()
                    }
                } catch {
                    // Store pas encore disponible
                }
            }
        }
    }) as typeof $fetch
})
