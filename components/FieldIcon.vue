
<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
  icon: any
  text: string
  color?: string
  onSave: (newValue: string) => void
  title?: string  // Nom du critère à afficher
  placeholder?: string  // Texte d'aide
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
        <div class="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-2xl mx-4">
          <div class="flex items-center space-x-3 mb-6">
            <component :is="icon" class="w-6 h-6" :class="color" />
            <h2 class="text-xl font-semibold text-gray-800">{{ title || 'Modifier le contenu' }}</h2>
          </div>
          
          <textarea
              v-model="editedText"
              class="w-full h-40 border-2 border-gray-200 rounded-xl p-4 text-gray-700 placeholder-gray-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all duration-200 resize-none"
              :placeholder="placeholder || 'Écrivez votre contenu ici...'"
          />
          
          <div class="flex justify-end mt-6 space-x-3">
            <button 
              class="px-6 py-2.5 text-gray-600 hover:text-gray-800 transition-colors duration-200 font-medium"
              @click="open = false"
            >
              Annuler
            </button>
            <button 
              class="px-6 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
              @click="save"
            >
              Enregistrer
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>