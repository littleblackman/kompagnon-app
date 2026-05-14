<template>
  <div class="flex h-screen overflow-hidden">
    <!-- Colonne formulaire -->
    <div class="w-full lg:w-1/2 flex flex-col items-center justify-center px-6">

      <h2 class="text-2xl font-bold text-center mb-4">Connexion</h2>
      <form @submit.prevent="login">
        <div class="mb-4">
          <label class="block text-gray-700">Email</label>
          <input type="email" v-model="email" required
                 class="w-full p-2 border border-gray-300 rounded mt-1" />
        </div>
        <div class="mb-4">
          <label class="block text-gray-700">Mot de passe</label>
          <div class="relative">
            <input :type="showPassword ? 'text' : 'password'" v-model="password" required
                   class="w-full p-2 border border-gray-300 rounded mt-1 pr-10" />
            <button type="button" @click="showPassword = !showPassword"
                    class="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700">
              <svg v-if="!showPassword" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <svg v-else xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
              </svg>
            </button>
          </div>
        </div>
        <button type="submit"
                class="w-full bg-amber-600 text-white py-2 rounded hover:bg-amber-700">
          Se connecter
        </button>
      </form>
      <p v-if="errorMessage" class="text-red-500 mt-4 text-center">{{ errorMessage }}</p>

      <p class="mt-6 text-gray-600 text-center">
        Pas encore de compte ?
        <NuxtLink to="/signin" class="text-amber-600 hover:underline">S'inscrire</NuxtLink>
      </p>

    </div>

    <!-- Colonne image (masquée sur tablette/mobile) -->
    <div class="hidden lg:block lg:w-1/2 h-screen overflow-hidden">
      <img src="/images/tana.jpg"
           class="w-full h-full object-cover"
           alt="Tana le Kompagnon idéal">
    </div>
  </div>
</template>

<script setup>
  definePageMeta({
    layout: 'home'
  });
  import { ref } from 'vue'
  import { useAuthStore } from '~/store/auth'

  const email = ref('')
  const password = ref('')
  const errorMessage = ref('')
  const showPassword = ref(false)
  const authStore = useAuthStore()

  const login = async () => {
    try {
      await authStore.login(email.value, password.value)
    } catch (error) {
      errorMessage.value = "Échec de l'authentification. Vérifiez vos identifiants."
    }
  }
</script>
