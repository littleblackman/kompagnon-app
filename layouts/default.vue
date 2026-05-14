<script setup>
import { useAuthStore } from '~/store/auth'
import { useAnalyticsStore } from '~/store/analytics'
import { useUserStore } from '~/store/user'
import { HomeIcon, UserIcon, PowerIcon, FolderIcon, PlusIcon, Bars3Icon, XMarkIcon, Cog6ToothIcon } from '@heroicons/vue/24/solid'
import { onMounted, computed, ref } from 'vue'
import ProfileModal from '~/components/ProfileModal.vue'

const auth = useAuthStore()
const analyticsStore = useAnalyticsStore()
const userStore = useUserStore()

const isMenuOpen = ref(false)
const isProfileModalOpen = ref(false)
const isDev = ref(true)

const devFavicon = "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='6' fill='%232563EB'/><text x='16' y='23' font-family='system-ui,sans-serif' font-size='19' font-weight='bold' text-anchor='middle' fill='white'>K</text></svg>"

useHead(computed(() => ({
  title: isDev.value ? '[DEV] Kompagnon' : 'Kompagnon App - Écrivez vos projets',
  meta: [
    { name: 'description', content: "Application Kompagnon pour gérer efficacement vos projets d'écriture" },
    { charset: 'utf-8' },
    { name: 'viewport', content: 'width=device-width, initial-scale=1' }
  ],
  link: [
    { rel: 'icon', type: isDev.value ? 'image/svg+xml' : 'image/png', href: isDev.value ? devFavicon : '/logo-kpgn.png' }
  ]
})))

const toggleMenu = () => {
  isMenuOpen.value = !isMenuOpen.value
}

const openProfileModal = () => {
  isProfileModalOpen.value = true
  isMenuOpen.value = false
}

const closeProfileModal = () => {
  isProfileModalOpen.value = false
}

onMounted(async () => {
  isDev.value = ['localhost', '127.0.0.1'].includes(window.location.hostname)

  if (auth.token) {
    await analyticsStore.refreshIfNeeded()
    await userStore.fetchProfile()
  }
})

const recentProjects = computed(() =>
  analyticsStore.projectStatistics.slice(0, 3)
)

const avatarUrl = computed(() => {
  if (!userStore.profile?.avatar) return null;
  const config = useRuntimeConfig();
  const baseUrl = config.public.apiBase.replace('/api', '');
  return `${baseUrl}/${userStore.profile.avatar}`;
})
</script>

<template>
  <div class="flex h-screen overflow-hidden bg-light text-color">

    <!-- Sidebar -->
    <aside :class="['sidebar-container', { 'sidebar-expanded': isMenuOpen }]">
      <!-- Sidebar fermé (icônes seulement) -->
      <div class="sidebar-collapsed">
        <!-- Bouton toggle -->
        <button
          @click="toggleMenu"
          class="sidebar-toggle"
          :title="isMenuOpen ? 'Fermer le menu' : 'Ouvrir le menu'"
        >
          <Bars3Icon v-if="!isMenuOpen" class="w-5 h-5" />
          <XMarkIcon v-else class="w-5 h-5" />
        </button>

        <!-- Logo compact -->
        <div class="sidebar-logo">
          <div class="w-10 h-10 rounded-lg flex items-center justify-center" :style="isDev ? 'background:#2563EB' : 'background:linear-gradient(135deg,#fbbf24,#d97706)'">
            <span class="text-white font-bold text-lg">K</span>
          </div>
        </div>

        <!-- Navigation icônes -->
        <nav class="sidebar-nav">
          <NuxtLink
            to="/"
            class="sidebar-icon"
            :class="{ 'sidebar-icon-active': $route.path === '/' }"
            title="Tableau de bord"
          >
            <HomeIcon class="w-5 h-5" />
          </NuxtLink>

          <NuxtLink
            to="/projets/tous"
            class="sidebar-icon"
            :class="{ 'sidebar-icon-active': $route.path === '/projets/tous' }"
            title="Tous les projets"
          >
            <FolderIcon class="w-5 h-5" />
          </NuxtLink>

          <NuxtLink
            to="/projets/creer"
            class="sidebar-icon"
            :class="{ 'sidebar-icon-active': $route.path === '/projets/creer' }"
            title="Nouveau projet"
          >
            <PlusIcon class="w-5 h-5" />
          </NuxtLink>
        </nav>

        <!-- Utilisateur en bas -->
        <div class="sidebar-user">
          <button
            v-if="auth.user"
            @click="openProfileModal"
            class="w-8 h-8 rounded-full overflow-hidden bg-gray-300 flex items-center justify-center hover:bg-gray-400 transition-colors"
            :title="userStore.displayName"
          >
            <img
              v-if="avatarUrl"
              :src="avatarUrl"
              :alt="userStore.displayName"
              class="w-full h-full object-cover"
            >
            <UserIcon v-else class="w-4 h-4 text-gray-600" />
          </button>
          <NuxtLink v-else to="/login" class="sidebar-icon" title="Connexion">
            <PowerIcon class="w-5 h-5" />
          </NuxtLink>
        </div>
      </div>

      <!-- Sidebar étendu (avec texte) -->
      <div v-if="isMenuOpen" class="sidebar-expanded-content">
        <!-- Header sidebar -->
        <div class="p-6 border-b border-gray-100">
          <div class="flex items-center space-x-3">
            <div class="w-10 h-10 rounded-lg flex items-center justify-center" :style="isDev ? 'background:#2563EB' : 'background:linear-gradient(135deg,#fbbf24,#d97706)'">
              <span class="text-white font-bold text-lg">K</span>
            </div>
            <div>
              <h2 class="text-lg font-semibold text-gray-900">Kompagnon</h2>
              <p class="text-sm" :style="isDev ? 'color:#2563EB;font-weight:600' : 'color:#6b7280'">
                {{ isDev ? 'localhost' : 'Assistant créatif' }}
              </p>
            </div>
          </div>
        </div>

        <!-- Navigation avec texte -->
        <nav class="p-4 space-y-2">
          <NuxtLink
            to="/"
            class="nav-item"
            :class="{ 'nav-item-active': $route.path === '/' }"
            @click="isMenuOpen = false"
          >
            <HomeIcon class="w-5 h-5" />
            <span>Tableau de bord</span>
          </NuxtLink>

          <NuxtLink
            to="/projets/tous"
            class="nav-item"
            :class="{ 'nav-item-active': $route.path === '/projets/tous' }"
            @click="isMenuOpen = false"
          >
            <FolderIcon class="w-5 h-5" />
            <span>Tous les projets</span>
          </NuxtLink>

          <NuxtLink
            to="/projets/creer"
            class="nav-item"
            :class="{ 'nav-item-active': $route.path === '/projets/creer' }"
            @click="isMenuOpen = false"
          >
            <PlusIcon class="w-5 h-5" />
            <span>Nouveau projet</span>
          </NuxtLink>

          <NuxtLink
            to="/admin"
            class="nav-item"
            :class="{ 'nav-item-active': $route.path.startsWith('/admin') }"
            @click="isMenuOpen = false"
          >
            <Cog6ToothIcon class="w-5 h-5" />
            <span>Administration</span>
          </NuxtLink>
        </nav>

        <!-- Projets récents -->
        <div v-if="auth.token && recentProjects.length > 0" class="px-4 pb-4">
          <div class="border-t border-gray-100 pt-4">
            <h3 class="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">
              Projets récents
            </h3>
            <div class="space-y-1">
              <NuxtLink
                v-for="project in recentProjects"
                :key="project.id"
                :to="`/projets/projet-${project.slug}`"
                class="project-item"
                :class="{ 'project-item-active': $route.path.includes(`projet-${project.slug}`) }"
                @click="isMenuOpen = false"
              >
                <div class="flex items-center justify-between">
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium text-gray-900 truncate">
                      {{ project.name }}
                    </p>
                    <p class="text-xs text-gray-500">
                      {{ project.scenes }} scènes
                    </p>
                  </div>
                  <div class="w-2 h-2 bg-green-400 rounded-full flex-shrink-0 ml-2"></div>
                </div>
              </NuxtLink>
            </div>
          </div>
        </div>

        <!-- Utilisateur étendu -->
        <div class="mt-auto p-4 border-t border-gray-100">
          <div v-if="auth.user" class="flex items-center justify-between">
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-gray-900 truncate">
                {{ userStore.displayName }}
              </p>
              <button
                @click="openProfileModal"
                class="text-xs text-gray-500 truncate hover:text-amber-600 transition-colors cursor-pointer"
                title="Cliquez pour modifier votre profil"
              >
                {{ userStore.profile?.email }}
              </button>
            </div>
            <NuxtLink to="/logout" class="text-gray-400 hover:text-gray-600" title="Déconnexion">
              <PowerIcon class="w-5 h-5" />
            </NuxtLink>
          </div>
        </div>
      </div>
    </aside>

    <!-- Main -->
    <main class="flex-1 flex flex-col overflow-auto bg-light text-color">

      <!-- Header -->
      <header class="header bg-cta flex justify-between items-center" :style="isDev ? 'background:#2563EB' : ''">
        <h1 class="font-bold text-2xl text-left flex items-center gap-3">
          <NuxtLink to="/" :style="isDev ? 'color:white' : ''">Kompagnon</NuxtLink>
          <span v-if="isDev" style="font-size:0.7rem;font-weight:700;background:#1e40af;color:#dbeafe;padding:2px 8px;border-radius:999px;letter-spacing:0.05em;text-transform:uppercase">localhost</span>
        </h1>

        <!-- Avatar + nom en haut à droite -->
        <div v-if="auth.user" class="flex items-center space-x-3">
          <div class="text-right">
            <p class="text-sm font-medium" :style="isDev ? 'color:white' : 'color:#111827'">
              {{ userStore.displayName }}
            </p>
            <p class="text-xs" :style="isDev ? 'color:#bfdbfe' : 'color:#4b5563'">
              {{ userStore.profile?.email }}
            </p>
          </div>
          <button
            @click="openProfileModal"
            class="w-10 h-10 rounded-full overflow-hidden bg-gray-300 flex items-center justify-center hover:bg-gray-400 transition-colors"
            :title="userStore.displayName"
          >
            <img
              v-if="avatarUrl"
              :src="avatarUrl"
              :alt="userStore.displayName"
              class="w-full h-full object-cover"
            >
            <UserIcon v-else class="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </header>

      <!-- Contenu -->
      <div class="flex-1">
        <slot />
      </div>

    </main>

    <!-- Modal de profil -->
    <ProfileModal
      :is-open="isProfileModalOpen"
      @close="closeProfileModal"
    />

  </div>
</template>
