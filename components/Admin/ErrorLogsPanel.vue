<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useAuthStore } from '~/store/auth'
import { useConfirm } from '~/composables/useConfirm'
import { useToast } from '~/composables/useToast'

/**
 * Onglet « Logs & erreurs » de l'admin : erreurs API et front regroupées
 * par empreinte (une ligne = une erreur, avec son nombre d'occurrences).
 */

interface ErrorLog {
  id: number
  source: 'api' | 'front'
  level: 'critical' | 'error' | 'warning'
  message: string
  exceptionClass: string | null
  statusCode: number | null
  method: string | null
  url: string | null
  file: string | null
  trace: string | null
  context: Record<string, unknown> | null
  userEmail: string | null
  occurrences: number
  resolved: boolean
  createdAt: string
  lastSeenAt: string
}

const authStore = useAuthStore()
const config = useRuntimeConfig()
const { confirm } = useConfirm()
const toast = useToast()

const LEVELS = {
  critical: { label: 'Critique', badge: 'bg-red-600 text-white border-red-600' },
  error: { label: 'Erreur', badge: 'bg-red-50 text-red-700 border-red-300' },
  warning: { label: 'Alerte', badge: 'bg-amber-50 text-amber-700 border-amber-300' },
} as const

const logs = ref<ErrorLog[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(50)
const unresolved = ref<Record<string, number>>({ critical: 0, error: 0, warning: 0 })
const isLoading = ref(false)
const forbidden = ref(false)
const expanded = ref<Set<number>>(new Set())

const filters = ref({
  resolved: '0' as '' | '0' | '1',
  source: '',
  level: '',
  q: '',
})

const headers = () => ({ 'X-AUTH-TOKEN': authStore.token || '' })

const fetchLogs = async (append = false) => {
  isLoading.value = true
  try {
    const query = Object.fromEntries(
      Object.entries({ ...filters.value, page: page.value }).filter(([, v]) => v !== '')
    )
    const data: any = await $fetch(`${config.public.apiBase}/admin/error-log`, { headers: headers(), query })
    logs.value = append ? [...logs.value, ...data.items] : data.items
    total.value = data.total
    pageSize.value = data.pageSize
    unresolved.value = data.unresolved
    forbidden.value = false
  } catch (error: any) {
    if (error?.statusCode === 403) {
      forbidden.value = true
    } else {
      console.error('Erreur lors du chargement des logs:', error)
      toast.error('Impossible de charger les logs')
    }
  } finally {
    isLoading.value = false
  }
}

const reload = () => {
  page.value = 1
  expanded.value = new Set()
  fetchLogs()
}

const loadMore = () => {
  page.value++
  fetchLogs(true)
}

// Recherche tapée au clavier : on attend la fin de la frappe
let searchTimer: ReturnType<typeof setTimeout> | undefined
watch(() => filters.value.q, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(reload, 300)
})
watch(() => [filters.value.resolved, filters.value.source, filters.value.level], reload)

const toggle = (id: number) => {
  const next = new Set(expanded.value)
  next.has(id) ? next.delete(id) : next.add(id)
  expanded.value = next
}

const setResolved = async (log: ErrorLog, resolved: boolean) => {
  try {
    const updated: ErrorLog = await $fetch(`${config.public.apiBase}/admin/error-log/${log.id}`, {
      method: 'PUT',
      headers: headers(),
      body: { resolved },
    })
    // Hors du filtre courant : la ligne disparaît de la liste
    if (filters.value.resolved !== '' && filters.value.resolved !== (resolved ? '1' : '0')) {
      logs.value = logs.value.filter(l => l.id !== log.id)
      total.value--
    } else {
      Object.assign(log, updated)
    }
    unresolved.value[log.level] += resolved ? -1 : 1
    toast.success(resolved ? 'Erreur marquée résolue' : 'Erreur rouverte')
  } catch (error) {
    console.error('Erreur lors de la mise à jour:', error)
    toast.error('Mise à jour impossible')
  }
}

const deleteLog = async (log: ErrorLog) => {
  const ok = await confirm({ title: 'Supprimer cette erreur ?', message: log.message.slice(0, 200), danger: true, confirmLabel: 'Supprimer' })
  if (!ok) return
  try {
    await $fetch(`${config.public.apiBase}/admin/error-log/${log.id}`, { method: 'DELETE', headers: headers() })
    logs.value = logs.value.filter(l => l.id !== log.id)
    total.value--
    if (!log.resolved) unresolved.value[log.level]--
  } catch (error) {
    console.error('Erreur lors de la suppression:', error)
    toast.error('Suppression impossible')
  }
}

const purgeResolved = async () => {
  const ok = await confirm({
    title: 'Purger les erreurs résolues ?',
    message: 'Toutes les erreurs marquées résolues seront supprimées définitivement.',
    danger: true,
    confirmLabel: 'Purger',
  })
  if (!ok) return
  try {
    const { deleted }: any = await $fetch(`${config.public.apiBase}/admin/error-log/resolved`, { method: 'DELETE', headers: headers() })
    toast.success(`${deleted} erreur(s) supprimée(s)`)
    reload()
  } catch (error) {
    console.error('Erreur lors de la purge:', error)
    toast.error('Purge impossible')
  }
}

const unresolvedTotal = computed(() => Object.values(unresolved.value).reduce((a, b) => a + b, 0))
const hasMore = computed(() => logs.value.length < total.value)

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })

const formatContext = (context: Record<string, unknown> | null) => JSON.stringify(context, null, 2)

onMounted(fetchLogs)
</script>

<template>
  <div>
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
      <div>
        <h2 class="text-2xl font-bold text-gray-900">Logs & erreurs</h2>
        <p v-if="!forbidden" class="text-sm text-gray-600 mt-1">
          <template v-if="unresolvedTotal">
            {{ unresolvedTotal }} non résolue(s) :
            <span class="text-red-700 font-medium">{{ unresolved.critical }} critique(s)</span>,
            {{ unresolved.error }} erreur(s), {{ unresolved.warning }} alerte(s)
          </template>
          <template v-else>Aucune erreur en attente.</template>
        </p>
      </div>
      <div v-if="!forbidden" class="flex gap-3">
        <button
          @click="reload"
          class="min-h-[44px] px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
        >
          Actualiser
        </button>
        <button
          @click="purgeResolved"
          class="min-h-[44px] px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
        >
          Purger les résolues
        </button>
      </div>
    </div>

    <div v-if="forbidden" class="p-6 bg-gray-50 border border-gray-200 rounded-lg text-gray-700">
      Les logs sont réservés aux comptes administrateurs.
    </div>

    <template v-else>
      <!-- Filtres -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <input
          v-model="filters.q"
          type="search"
          placeholder="Rechercher (message, URL, utilisateur…)"
          class="w-full min-h-[44px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 lg:col-span-1"
        />
        <select v-model="filters.resolved" class="w-full min-h-[44px] px-3 py-2 border border-gray-300 rounded-lg bg-white">
          <option value="0">Non résolues</option>
          <option value="1">Résolues</option>
          <option value="">Toutes</option>
        </select>
        <select v-model="filters.source" class="w-full min-h-[44px] px-3 py-2 border border-gray-300 rounded-lg bg-white">
          <option value="">API et front</option>
          <option value="api">API</option>
          <option value="front">Front</option>
        </select>
        <select v-model="filters.level" class="w-full min-h-[44px] px-3 py-2 border border-gray-300 rounded-lg bg-white">
          <option value="">Tous niveaux</option>
          <option v-for="(def, key) in LEVELS" :key="key" :value="key">{{ def.label }}</option>
        </select>
      </div>

      <div v-if="isLoading && !logs.length" class="text-center py-8">
        <p class="text-gray-600">Chargement...</p>
      </div>

      <div v-else-if="!logs.length" class="text-center py-12 text-gray-500">
        Aucune erreur ne correspond à ces filtres.
      </div>

      <div v-else class="space-y-3">
        <div
          v-for="log in logs"
          :key="log.id"
          class="border rounded-lg overflow-hidden"
          :class="log.resolved ? 'border-gray-200 bg-gray-50 opacity-75' : 'border-gray-200 bg-white'"
        >
          <!-- Ligne résumée -->
          <button @click="toggle(log.id)" class="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors">
            <div class="flex flex-wrap items-center gap-2 mb-1">
              <span class="text-xs font-medium px-2 py-0.5 rounded border" :class="LEVELS[log.level].badge">
                {{ LEVELS[log.level].label }}
              </span>
              <span class="text-xs font-medium px-2 py-0.5 rounded bg-gray-100 text-gray-600 uppercase">{{ log.source }}</span>
              <span v-if="log.statusCode" class="text-xs text-gray-500 tabular-nums">{{ log.statusCode }}</span>
              <span v-if="log.occurrences > 1" class="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 tabular-nums">
                ×{{ log.occurrences }}
              </span>
              <span v-if="log.resolved" class="text-xs font-medium px-2 py-0.5 rounded bg-green-50 text-green-700 border border-green-300">Résolue</span>
              <span class="ml-auto text-xs text-gray-500 tabular-nums">{{ formatDate(log.lastSeenAt) }}</span>
            </div>
            <p class="text-sm font-medium text-gray-900 break-words line-clamp-2">{{ log.message }}</p>
            <p class="text-xs text-gray-500 mt-1 truncate">
              <span v-if="log.exceptionClass">{{ log.exceptionClass }} · </span>
              <span v-if="log.method">{{ log.method }} </span>{{ log.url || '—' }}
              <span v-if="log.userEmail"> · {{ log.userEmail }}</span>
            </p>
          </button>

          <!-- Détail -->
          <div v-if="expanded.has(log.id)" class="px-4 pb-4 border-t border-gray-100 space-y-3">
            <dl class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-xs text-gray-600 pt-3">
              <div v-if="log.file"><dt class="inline font-medium">Emplacement :</dt> <dd class="inline break-all">{{ log.file }}</dd></div>
              <div><dt class="inline font-medium">Première fois :</dt> <dd class="inline">{{ formatDate(log.createdAt) }}</dd></div>
              <div v-if="log.userEmail"><dt class="inline font-medium">Utilisateur :</dt> <dd class="inline">{{ log.userEmail }}</dd></div>
              <div v-if="log.url"><dt class="inline font-medium">URL :</dt> <dd class="inline break-all">{{ log.url }}</dd></div>
            </dl>

            <p class="text-sm text-gray-900 whitespace-pre-wrap break-words">{{ log.message }}</p>

            <div v-if="log.trace">
              <p class="text-xs font-medium text-gray-700 mb-1">Pile d'appels</p>
              <pre class="text-xs bg-gray-900 text-gray-100 rounded p-3 overflow-x-auto max-h-80">{{ log.trace }}</pre>
            </div>

            <div v-if="log.context">
              <p class="text-xs font-medium text-gray-700 mb-1">Contexte</p>
              <pre class="text-xs bg-gray-100 text-gray-800 rounded p-3 overflow-x-auto max-h-60">{{ formatContext(log.context) }}</pre>
            </div>

            <div class="flex gap-3 justify-end">
              <button
                @click="deleteLog(log)"
                class="min-h-[44px] px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors text-sm"
              >
                Supprimer
              </button>
              <button
                @click="setResolved(log, !log.resolved)"
                class="min-h-[44px] px-4 py-2 rounded-lg transition-colors text-sm font-medium"
                :class="log.resolved ? 'border border-gray-300 text-gray-700 hover:bg-gray-100' : 'bg-green-600 text-white hover:bg-green-700'"
              >
                {{ log.resolved ? 'Rouvrir' : 'Marquer résolue' }}
              </button>
            </div>
          </div>
        </div>

        <div v-if="hasMore" class="text-center pt-2">
          <button
            @click="loadMore"
            :disabled="isLoading"
            class="min-h-[44px] px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            {{ isLoading ? 'Chargement...' : `Charger plus (${total - logs.length} restantes)` }}
          </button>
        </div>
      </div>
    </template>
  </div>
</template>
