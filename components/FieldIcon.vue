
<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
  icon: any
  text: string
  color?: string
  onSave: (newValue: string) => void
}>()

const open = ref(false)
const editedText = ref(props.text)

watch(() => props.text, () => {
  editedText.value = props.text
})

function save() {
  props.onSave(editedText.value)
  open.value = false
}
</script>
<template>
  <div class="relative group cursor-pointer" @click="open = true">
    <component
        :is="icon"
        class="w-7 h-7 mr-2 transition-transform duration-200 group-hover:scale-110"
        :class="color"
    />
    <!-- Tooltip -->
    <div
        v-if="text"
        class="absolute top-full mt-1 left-1/2 -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10"
    >
      {{ text }}
    </div>

    <!-- Modal -->
    <Teleport to="body">
      <div
          v-if="open"
          class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          @click.self="open = false"
      >
        <div class="bg-white rounded-xl p-6 w-full max-w-md">
          <h2 class="text-lg font-semibold mb-4">Modifier</h2>
          <textarea
              v-model="editedText"
              class="w-full h-32 border border-gray-300 rounded p-2"
              placeholder="Saisis ton texte ici..."
          />
          <div class="flex justify-end mt-4 gap-2">
            <button class="text-gray-500" @click="open = false">Annuler</button>
            <button class="bg-pink-500 text-white px-4 py-2 rounded" @click="save">Enregistrer</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>