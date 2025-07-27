<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue';

const props = defineProps({
  images: {
    type: Array,
    required: true
  },
  currentIndex: {
    type: Number,
    default: 0
  },
  show: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['close', 'update:currentIndex']);

const currentImageIndex = ref(props.currentIndex);

watch(() => props.currentIndex, (newIndex) => {
  currentImageIndex.value = newIndex;
});

watch(() => props.show, (isVisible) => {
  if (isVisible) {
    document.body.style.overflow = 'hidden';
  } else {
    document.body.style.overflow = '';
  }
});

const close = () => {
  emit('close');
};

const previousImage = () => {
  if (currentImageIndex.value > 0) {
    currentImageIndex.value--;
    emit('update:currentIndex', currentImageIndex.value);
  }
};

const nextImage = () => {
  if (currentImageIndex.value < props.images.length - 1) {
    currentImageIndex.value++;
    emit('update:currentIndex', currentImageIndex.value);
  }
};

const handleKeydown = (event) => {
  if (!props.show) return;
  
  switch (event.key) {
    case 'Escape':
      close();
      break;
    case 'ArrowLeft':
      previousImage();
      break;
    case 'ArrowRight':
      nextImage();
      break;
  }
};

onMounted(() => {
  document.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown);
  document.body.style.overflow = '';
});
</script>

<template>
  <div 
    v-if="show && images.length > 0" 
    class="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50"
    @click="close"
  >
    <div class="relative w-full h-full flex items-center justify-center p-4">
      
      <!-- Image principale -->
      <div class="relative max-w-full max-h-full flex items-center justify-center">
        <img 
          :src="images[currentImageIndex]" 
          :alt="`Image ${currentImageIndex + 1}`"
          class="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
          @click.stop
        />
      </div>

      <!-- Bouton fermer -->
      <button 
        @click="close"
        class="absolute top-4 right-4 text-white bg-black bg-opacity-50 hover:bg-opacity-75 rounded-full w-12 h-12 flex items-center justify-center text-2xl transition-colors z-10"
        title="Fermer (Escape)"
      >
        ×
      </button>

      <!-- Navigation précédent -->
      <button 
        v-if="currentImageIndex > 0"
        @click.stop="previousImage"
        class="absolute left-4 top-1/2 transform -translate-y-1/2 text-white bg-black bg-opacity-50 hover:bg-opacity-75 rounded-full w-12 h-12 flex items-center justify-center text-xl transition-colors"
        title="Image précédente (←)"
      >
        ←
      </button>

      <!-- Navigation suivant -->
      <button 
        v-if="currentImageIndex < images.length - 1"
        @click.stop="nextImage"
        class="absolute right-4 top-1/2 transform -translate-y-1/2 text-white bg-black bg-opacity-50 hover:bg-opacity-75 rounded-full w-12 h-12 flex items-center justify-center text-xl transition-colors"
        title="Image suivante (→)"
      >
        →
      </button>

      <!-- Compteur d'images -->
      <div class="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white bg-black bg-opacity-50 px-3 py-1 rounded-full text-sm">
        {{ currentImageIndex + 1 }} / {{ images.length }}
      </div>

      <!-- Miniatures (si plus de 1 image) -->
      <div 
        v-if="images.length > 1" 
        class="absolute bottom-16 left-1/2 transform -translate-x-1/2 flex space-x-2 max-w-full overflow-x-auto px-4"
      >
        <div 
          v-for="(image, index) in images" 
          :key="index"
          class="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 cursor-pointer transition-all"
          :class="index === currentImageIndex ? 'border-white' : 'border-transparent opacity-70 hover:opacity-100'"
          @click.stop="currentImageIndex = index; emit('update:currentIndex', index)"
        >
          <img 
            :src="image" 
            :alt="`Miniature ${index + 1}`"
            class="w-full h-full object-cover"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Animation d'entrée */
.lightbox-enter-active, .lightbox-leave-active {
  transition: opacity 0.3s ease;
}
.lightbox-enter-from, .lightbox-leave-to {
  opacity: 0;
}
</style>