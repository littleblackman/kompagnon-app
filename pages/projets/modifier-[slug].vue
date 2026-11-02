<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '~/store/auth'
import { useProjectStore } from '~/store/project'
import { useMetadataStore } from '~/store/metadata'
import { onMounted, computed, ref } from 'vue'
import ProjectSubMenu from '@/components/Project/SubMenu.vue'
import RichTextEditor from '@/components/RichTextEditor.vue'
import { TrashIcon, ArrowDownTrayIcon } from '@heroicons/vue/24/solid'
import { useToast } from '~/composables/useToast'
import { useConfirm } from '~/composables/useConfirm'

const { confirm } = useConfirm()
const toast = useToast()

definePageMeta({
  middleware: 'auth'
})

const auth = useAuthStore()
auth.requireAuth()

const projectStore = useProjectStore()
const metadataStore = useMetadataStore()
const route = useRoute()
const router = useRouter()
const slug = route.params.slug as string
const config = useRuntimeConfig()
const authStore = useAuthStore()

// Charger le projet et les métadonnées au montage
onMounted(async () => {
  await projectStore.fetchProject(slug)
  if (!metadataStore.loaded) {
    await metadataStore.fetchMetadata()
  }

  // Initialiser le formulaire avec les données du projet
  if (project.value) {
    formData.value = {
      name: project.value.name || '',
      description: project.value.description || '',
      type_id: project.value.type?.id || null
    }
  }
})

const project = computed(() => projectStore.project)
const types = computed(() => metadataStore.types)
// Données du formulaire
const formData = ref({
  name: '',
  description: '',
  type_id: null as number | null
})

const isLoading = ref(false)
const errorMessage = ref('')
const isDeleting = ref(false)

// Soumission du formulaire
const submitForm = async () => {
  if (!formData.value.name || !formData.value.type_id) {
    errorMessage.value = 'Veuillez remplir tous les champs obligatoires'
    return
  }

  isLoading.value = true
  errorMessage.value = ''

  try {
    // Le cadre narratif (genre, structure) se règle dans Analyse › Structure ;
    // l'API ne le touche pas quand ces champs sont absents.
    const updateData: any = {
      id: project.value?.id,
      name: formData.value.name,
      description: formData.value.description,
      type_id: formData.value.type_id as number
    }

    const result = await projectStore.updateProject(updateData)

    if (result?.slug) {
      router.push(`/projets/projet-${result.slug}`)
    }
  } catch (error) {
    console.error('Erreur lors de la sauvegarde:', error)
    errorMessage.value = 'Erreur lors de la sauvegarde du projet'
  } finally {
    isLoading.value = false
  }
}

// Fonctions de suppression
const deleteProject = async () => {
  if (!project.value?.id) return

  const ok = await confirm({
    title: 'Supprimer le projet',
    message: `« ${project.value.name} » sera supprimé définitivement, avec :`,
    details: [
      'toutes les parties, séquences et scènes',
      'le contenu écrit de chaque scène',
      'tous les personnages et leurs images',
      'toutes les données liées'
    ],
    requireText: 'SUPPRIMER',
    danger: true,
    confirmLabel: 'Supprimer'
  })
  if (!ok) return

  isDeleting.value = true
  errorMessage.value = ''

  try {
    await projectStore.deleteProject(project.value.id)
    router.push('/projets/tous')
  } catch (error) {
    console.error('Erreur lors de la suppression:', error)
    errorMessage.value = 'Erreur lors de la suppression du projet'
  } finally {
    isDeleting.value = false
  }
}
// Instantané : tout le projet en JSON, sans les images des personnages.
// Récupéré avec le token puis proposé au téléchargement, pour ne pas faire
// passer le token dans une URL.
const isExporting = ref(false)

const exportProject = async () => {
  isExporting.value = true
  try {
    const response = await $fetch.raw<Blob>(`${config.public.apiBase}/project/${slug}/export`, {
      headers: { 'X-AUTH-TOKEN': authStore.token || '' },
      responseType: 'blob'
    })

    const disposition = response.headers.get('content-disposition') || ''
    const filename = disposition.match(/filename="([^"]+)"/)?.[1] || `kompagnon-${slug}.json`

    const url = URL.createObjectURL(response._data!)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
    URL.revokeObjectURL(url)
  } catch (error) {
    console.error("Erreur lors de l'export:", error)
    toast.error("L'instantané n'a pas pu être créé.")
  } finally {
    isExporting.value = false
  }
}
</script>

<template>
  <div v-if="!project">
    <ProjectSubMenu :project-slug="slug" />
    <div class="max-w-4xl mx-auto p-8">
      <p class="text-gray-600">Chargement...</p>
    </div>
  </div>
  <div v-else>
    <ProjectSubMenu :project-slug="slug" />
    <div class="max-w-4xl mx-auto p-4 sm:p-8">
      <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sm:p-8">
        <h1 class="text-3xl font-bold text-gray-900 mb-2">Paramètres du projet</h1>
        <p class="text-gray-600 mb-8">Modifiez les informations de votre projet</p>

        <form @submit.prevent="submitForm" class="space-y-6">
          <!-- Nom du projet -->
          <div>
            <label for="name" class="block text-sm font-medium text-gray-700 mb-2">
              Nom du projet *
            </label>
            <input
              id="name"
              v-model="formData.name"
              type="text"
              required
              class="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              placeholder="Nom de votre projet"
            />
          </div>

          <!-- Type -->
          <div>
            <label for="type" class="block text-sm font-medium text-gray-700 mb-2">
              Type de projet *
            </label>
            <select
              id="type"
              v-model="formData.type_id"
              required
              class="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            >
              <option :value="null">Sélectionnez un type</option>
              <option v-for="type in types" :key="type.id" :value="type.id">
                {{ type.name }}
              </option>
            </select>
          </div>

          <!-- Description -->
          <div>
            <label for="description" class="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <RichTextEditor
              v-model="formData.description"
              placeholder="Décrivez votre projet..."
              :height="150"
            />
          </div>

          <p class="text-sm text-gray-500">
            Le genre et la structure narrative se règlent dans
            <NuxtLink :to="`/projets/analyse-${slug}?onglet=structure`" class="font-medium text-amber-700 hover:underline">Analyse › Structure</NuxtLink>.
          </p>

          <!-- Message d'erreur -->
          <div v-if="errorMessage" class="bg-red-50 border border-red-200 rounded-lg p-4">
            <p class="text-red-800 text-sm">{{ errorMessage }}</p>
          </div>

          <div class="pt-2">
            <button
              type="submit"
              :disabled="isLoading"
              class="w-full bg-amber-600 text-white py-3 px-6 rounded-lg hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
            >
              {{ isLoading ? 'Sauvegarde en cours...' : 'Mettre à jour le projet' }}
            </button>
          </div>
        </form>
      </div>

      <!-- Instantanés -->
      <section class="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 p-6 sm:p-8">
        <h2 class="text-lg font-semibold text-gray-900">Instantané</h2>
        <p class="mt-1 text-sm text-gray-600">
          Télécharge tout le projet dans un fichier JSON : parties, séquences, scènes, notes,
          personnages et leurs fiches. Les images ne sont pas incluses.
          Pour le restaurer, importez-le depuis la liste des projets : il est recréé en nouveau projet.
        </p>
        <button
          type="button"
          @click="exportProject"
          :disabled="isExporting"
          class="mt-4 flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-5 py-3 font-medium text-gray-800 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ArrowDownTrayIcon class="w-5 h-5" />
          {{ isExporting ? 'Export en cours…' : 'Exporter le projet' }}
        </button>
      </section>

      <!-- Zone de danger -->
      <section class="mt-6 rounded-lg border border-red-200 bg-red-50/40 p-6 sm:p-8">
        <h2 class="text-lg font-semibold text-red-900">Supprimer le projet</h2>
        <p class="mt-1 text-sm text-red-800">
          Suppression définitive de tout le projet. Pensez à exporter un instantané avant.
        </p>
        <button
          type="button"
          @click="deleteProject"
          :disabled="isDeleting"
          class="mt-4 flex items-center justify-center gap-2 bg-red-600 text-white py-3 px-6 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 font-medium transition-colors disabled:opacity-50"
        >
          <TrashIcon class="w-5 h-5" />
          Supprimer
        </button>
      </section>
    </div>

  </div>
</template>

<style scoped>
/* Styles additionnels si nécessaire */
</style>
