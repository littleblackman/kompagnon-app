import { ofetch } from 'ofetch'
import { useAuthStore } from '~/store/auth'
import { reportError } from '~/utils/errorReporter'

// Réponses du serveur web, pas de PHP : l'API n'a rien pu journaliser
const GATEWAY_ERRORS = [502, 503, 504]

export default defineNuxtPlugin(() => {
    globalThis.$fetch = ofetch.create({
        onRequestError({ request, error }) {
            // Réseau coupé ou délai dépassé côté navigateur : aucune réponse
            reportError({
                message: `Requête sans réponse : ${error?.message ?? 'erreur réseau'}`,
                level: 'warning',
                name: 'FetchError',
                context: { origin: 'fetch', request: String(request) },
            })
        },
        onResponseError({ request, response }) {
            if (GATEWAY_ERRORS.includes(response.status)) {
                reportError({
                    message: `Réponse ${response.status} du serveur web (délai dépassé ou API indisponible)`,
                    name: 'FetchError',
                    // Une entrée par route : l'id de l'URL ne doit pas éclater le regroupement
                    file: String(request).replace(/^https?:\/\/[^/]+/, '').replace(/\/\d+(?=\/|$)/g, '/{id}'),
                    context: { origin: 'fetch', request: String(request), status: response.status },
                })
            }
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
