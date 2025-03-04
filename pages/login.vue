<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-100">
    <div class="bg-white p-8 rounded-lg shadow-lg w-96">
      <h2 class="text-2xl font-bold text-center mb-4">Connexion</h2>
      <form @submit.prevent="login">
        <div class="mb-4">
          <label class="block text-gray-700">Email</label>
          <input type="email" v-model="email" required
                 class="w-full p-2 border border-gray-300 rounded mt-1" />
        </div>
        <div class="mb-4">
          <label class="block text-gray-700">Mot de passe</label>
          <input type="password" v-model="password" required
                 class="w-full p-2 border border-gray-300 rounded mt-1" />
        </div>
        <button type="submit"
                class="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600">
          Se connecter
        </button>
      </form>
      <p v-if="errorMessage" class="text-red-500 mt-4 text-center">{{ errorMessage }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useAuthStore } from '~/store/auth'

const email = ref('')
const password = ref('')
const errorMessage = ref('')
const authStore = useAuthStore()

const login = async () => {
  try {
    await authStore.login(email.value, password.value)
  } catch (error) {
    errorMessage.value = "Échec de l'authentification. Vérifiez vos identifiants."
  }
}
</script>
