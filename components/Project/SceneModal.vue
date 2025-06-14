<script setup lang="ts">
import { ref } from '#imports'
import { useProjectStore } from '~/store/project'

interface Props {
  projectId: number
  sequenceId?: number
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'close'): void
}>()

const projectStore = useProjectStore()
const name = ref('')
const description = ref('')

const handleSubmit = async () => {
  if (!name.value) return

  const scene = {
    name: name.value,
    description: description.value,
    sequence_id: props.sequenceId,
    project_id: props.projectId
  }

  await projectStore.addScene(scene)
  emit('close')
}
</script>

<template>
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white p-6 rounded-lg w-full max-w-md">
      <h2 class="text-2xl font-bold mb-4">Nouvelle scène</h2>
      
      <form @submit.prevent="handleSubmit" class="space-y-4">
        <div>
          <label for="name" class="block text-sm font-medium text-gray-700">Nom</label>
          <input
            id="name"
            v-model="name"
            type="text"
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-amber-500 focus:ring-amber-500"
            required
          />
        </div>

        <div>
          <label for="description" class="block text-sm font-medium text-gray-700">Description</label>
          <textarea
            id="description"
            v-model="description"
            rows="4"
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-amber-500 focus:ring-amber-500"
          ></textarea>
        </div>

        <div class="flex justify-end space-x-3">
          <button
            type="button"
            @click="emit('close')"
            class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
          >
            Annuler
          </button>
          <button
            type="submit"
            class="px-4 py-2 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-md"
          >
            Créer
          </button>
        </div>
      </form>
    </div>
  </div>
</template> 