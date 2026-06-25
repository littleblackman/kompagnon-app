<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="authStore.sessionExpired" class="fixed inset-0 z-[300] flex items-center justify-center p-4">
        <!-- Backdrop non cliquable -->
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" />

        <Transition
          enter-active-class="transition duration-200 ease-out"
          enter-from-class="opacity-0 scale-95"
          enter-to-class="opacity-100 scale-100"
        >
          <div v-if="authStore.sessionExpired" class="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 z-10">

            <!-- Icône -->
            <div class="flex flex-col items-center mb-5">
              <div class="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center mb-3">
                <LockClosedIcon class="w-7 h-7 text-amber-600" />
              </div>
              <h3 class="text-lg font-semibold text-gray-900">Session expirée</h3>
              <p class="text-sm text-gray-500 text-center mt-1">
                Votre session a expiré. Reconnectez-vous pour continuer — votre travail est intact.
              </p>
            </div>

            <!-- Formulaire -->
            <form @submit.prevent="handleRelogin" class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  v-model="email"
                  type="email"
                  required
                  autocomplete="email"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Mot de passe</label>
                <input
                  v-model="password"
                  type="password"
                  required
                  autocomplete="current-password"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
                />
              </div>

              <p v-if="error" class="text-sm text-red-600">{{ error }}</p>

              <button
                type="submit"
                :disabled="loading"
                class="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <span v-if="loading" class="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                {{ loading ? 'Connexion...' : 'Se reconnecter' }}
              </button>
            </form>

            <!-- Lien de secours -->
            <p class="text-center text-xs text-gray-400 mt-4">
              Problème ?
              <NuxtLink to="/login" class="text-amber-600 hover:underline">
                Aller à la page de connexion
              </NuxtLink>
            </p>

          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { LockClosedIcon } from '@heroicons/vue/24/solid'
import { useAuthStore } from '~/store/auth'

const authStore = useAuthStore()

const email = ref(authStore.lastEmail)
const password = ref('')
const loading = ref(false)
const error = ref('')

// Pré-remplir l'email dès que la modale s'ouvre
watch(() => authStore.sessionExpired, (val) => {
    if (val) {
        email.value = authStore.lastEmail
        password.value = ''
        error.value = ''
    }
})

async function handleRelogin() {
    error.value = ''
    loading.value = true
    try {
        await authStore.relogin(email.value, password.value)
    } catch {
        error.value = 'Identifiants incorrects, veuillez réessayer.'
    } finally {
        loading.value = false
    }
}
</script>
