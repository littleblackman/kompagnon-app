import { reportError, toErrorReport } from '~/utils/errorReporter'

/**
 * Branche la remontée d'erreurs sur tout ce qui peut lever côté client :
 * rendu Vue, erreurs Nuxt, scripts et promesses non attrapées.
 *
 * Les erreurs HTTP de l'API ne sont pas remontées ici : les 5xx sont déjà
 * journalisées par le serveur, et les 4xx sont des réponses attendues
 * (non trouvé, validation, session expirée). Les 502/503/504 et les
 * requêtes sans réponse, que PHP ne voit pas, partent de auth-interceptor.
 */
export default defineNuxtPlugin((nuxtApp) => {
  const isApiError = (err: any) => err?.name === 'FetchError' && typeof err?.statusCode === 'number'

  const currentRoute = () => {
    try {
      return useRouter().currentRoute.value.fullPath
    } catch {
      return undefined
    }
  }

  nuxtApp.hook('vue:error', (err, instance, info) => {
    if (isApiError(err)) return
    reportError(toErrorReport(err, {
      context: {
        origin: 'vue',
        info,
        component: (instance as any)?.$options?.__name ?? (instance as any)?.$options?.name,
        route: currentRoute(),
      },
    }))
  })

  nuxtApp.hook('app:error', (err) => {
    if (isApiError(err)) return
    // Page d'erreur fatale : la plus grave, l'utilisateur est bloqué
    reportError(toErrorReport(err, { level: 'critical', context: { origin: 'nuxt', route: currentRoute() } }))
  })

  window.addEventListener('error', (event) => {
    reportError(toErrorReport(event.error ?? event.message, {
      file: event.filename ? `${new URL(event.filename, location.href).pathname}:${event.lineno}` : undefined,
      context: { origin: 'window', route: currentRoute() },
    }))
  })

  window.addEventListener('unhandledrejection', (event) => {
    if (isApiError(event.reason)) return
    // FetchError sans statut : le réseau ou l'API sont tombés, pas un bug du front
    const level = event.reason?.name === 'FetchError' ? 'warning' : 'error'
    reportError(toErrorReport(event.reason, { level, context: { origin: 'promise', route: currentRoute() } }))
  })
})
