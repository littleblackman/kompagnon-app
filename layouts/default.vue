<script setup>
useHead({
  title: 'Kompagnon App - Écrivez vos projets',
  meta: [
    { name: 'description', content: 'Application Kompagnon pour gérer efficacement vos projets d’écriture' },
    { charset: 'utf-8' },
    { name: 'viewport', content: 'width=device-width, initial-scale=1' }
  ],
  link: [
    { rel: 'icon', type: 'image/png', href: '/logo-kpgn.png' }
  ]
})

import { useAuthStore } from '~/store/auth'
import { useAnalyticsStore } from '~/store/analytics'
import { useUserStore } from '~/store/user'
import { HomeIcon, UserIcon, PowerIcon, FolderIcon, PlusIcon, Bars3Icon, XMarkIcon } from '@heroicons/vue/24/solid'
import { onMounted, computed, ref } from 'vue'
import ProfileModal from '~/components/ProfileModal.vue'

const auth = useAuthStore()
const analyticsStore = useAnalyticsStore()
const userStore = useUserStore()

// État du menu (ouvert/fermé)
const isMenuOpen = ref(false)
// État de la modal profil
const isProfileModalOpen = ref(false)

// Toggle du menu
const toggleMenu = () => {
  isMenuOpen.value = !isMenuOpen.value
}

// Ouvrir/fermer modal profil
const openProfileModal = () => {
  isProfileModalOpen.value = true
  isMenuOpen.value = false // Fermer le menu latéral
}

const closeProfileModal = () => {
  isProfileModalOpen.value = false
}

// Charger les projets et le profil pour le menu
onMounted(async () => {
  if (auth.token) {
    await analyticsStore.refreshIfNeeded()
    await userStore.fetchProfile()
  }
})

// Limiter à 3 projets récents dans le menu
const recentProjects = computed(() => 
  analyticsStore.projectStatistics.slice(0, 3)
)

// Construire l'URL complète de l'avatar
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
          <div class="w-10 h-10 bg-gradient-to-br from-amber-400 to-amber-600 rounded-lg flex items-center justify-center">
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
        <!-- Header -->
        <div class="p-6 border-b border-gray-100">
          <div class="flex items-center space-x-3">
            <div class="w-10 h-10 bg-gradient-to-br from-amber-400 to-amber-600 rounded-lg flex items-center justify-center">
              <span class="text-white font-bold text-lg">K</span>
            </div>
            <div>
              <h2 class="text-lg font-semibold text-gray-900">Kompagnon</h2>
              <p class="text-sm text-gray-500">Assistant créatif</p>
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
          <div v-if="auth.user" class="flex items-center space-x-3">
            <button
              @click="openProfileModal"
              class="w-8 h-8 rounded-full overflow-hidden bg-gray-300 flex items-center justify-center hover:bg-gray-400 transition-colors"
            >
              <img
                v-if="avatarUrl"
                :src="avatarUrl"
                :alt="userStore.displayName"
                class="w-full h-full object-cover"
              >
              <UserIcon v-else class="w-4 h-4 text-gray-600" />
            </button>
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
            <NuxtLink to="/logout" class="text-gray-400 hover:text-gray-600">
              <PowerIcon class="w-4 h-4" />
            </NuxtLink>
          </div>
        </div>
      </div>
    </aside>

    <!-- Main -->
    <main class="flex-1 flex flex-col overflow-auto bg-light text-color">

      <!-- Header -->
      <header class="header bg-cta flex justify-between items-center">
        <h1 class="font-bold text-2xl text-left">
          <NuxtLink to="/">Kompagnon</NuxtLink>
        </h1>
        
        <!-- Avatar + nom en haut à droite -->
        <div v-if="auth.user" class="flex items-center space-x-3">
          <div class="text-right">
            <p class="text-sm font-medium text-gray-900">
              {{ userStore.displayName }}
            </p>
            <p class="text-xs text-gray-600">
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