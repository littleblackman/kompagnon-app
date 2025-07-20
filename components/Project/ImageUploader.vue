<template>
  <div class="image-uploader">
    <!-- Galerie d'images existantes -->
    <div v-if="normalizedImages && normalizedImages.length > 0" class="mb-6">
      <h4 class="text-sm font-medium text-gray-700 mb-3">Images actuelles</h4>
      <div class="grid grid-cols-4 gap-4">
        <div
          v-for="(image, index) in normalizedImages"
          :key="index"
          class="image-item"
          :draggable="true"
          @dragstart="handleDragStart(index)"
          @dragover="handleImageDragOver"
          @drop="handleImageDrop(index)"
        >
          <div class="relative group">
            <img
              :src="`${baseUrl}/${image}`"
              :alt="`Image ${index + 1}`"
              class="w-full h-20 object-cover rounded-lg cursor-pointer"
              @click="openLightbox(index)"
            />
            
            <!-- Badge Avatar pour la première image -->
            <div v-if="index === 0" class="absolute top-1 left-1 bg-amber-500 text-white text-xs px-2 py-1 rounded">
              Avatar
            </div>
            
            <!-- Bouton delete au survol -->
            <button
              @click.stop="deleteImage(index)"
              class="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <XMarkIcon class="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Zone de drag & drop -->
    <div
      ref="dropZone"
      @drop="handleDrop"
      @dragover="handleDragOver"
      @dragenter="handleDragEnter"
      @dragleave="handleDragLeave"
      @click="triggerFileInput"
      :class="['drop-zone', { 'drag-active': isDragActive }]"
    >
      <PhotoIcon class="w-12 h-12 text-gray-400 mx-auto mb-4" />
      <p class="text-gray-600 text-center">
        <span class="font-medium">Cliquez pour ajouter</span> ou glissez-déposez des images
      </p>
      <p class="text-sm text-gray-400 text-center mt-2">
        PNG, JPG, GIF - Compression automatique < 1MB
      </p>
    </div>

    <!-- Input file caché -->
    <input
      ref="fileInput"
      type="file"
      multiple
      accept="image/*"
      @change="handleFileInput"
      class="hidden"
    />

    <!-- Lightbox -->
    <div v-if="lightboxIndex !== null" class="lightbox-overlay" @click="closeLightbox">
      <div class="lightbox-content" @click.stop>
        <img
          :src="`${baseUrl}/${normalizedImages[lightboxIndex]}`"
          :alt="`Image ${lightboxIndex + 1}`"
          class="max-w-full max-h-full"
        />
        
        <!-- Navigation -->
        <button
          v-if="lightboxIndex > 0"
          @click="previousImage"
          class="nav-btn nav-prev"
        >
          <ChevronLeftIcon class="w-6 h-6" />
        </button>
        
        <button
          v-if="lightboxIndex < normalizedImages.length - 1"
          @click="nextImage"
          class="nav-btn nav-next"
        >
          <ChevronRightIcon class="w-6 h-6" />
        </button>
        
        <!-- Bouton fermer -->
        <button @click="closeLightbox" class="close-btn">
          <XMarkIcon class="w-6 h-6" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { PhotoIcon, XMarkIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/vue/24/solid';
import { usePersonnageStore } from '~/store/personnage';

interface Props {
  personnageId: number;
  images?: string[];
}

const props = defineProps<Props>();
const emit = defineEmits<{
  imagesUpdated: [images: string[]];
}>();

// Debug: afficher les images reçues
console.log('Images reçues dans ImageUploader:', props.images);
console.log('Type des images:', typeof props.images);
console.log('Est-ce un array?:', Array.isArray(props.images));

// Normaliser les images pour s'assurer qu'on a un tableau
const normalizedImages = computed(() => {
  if (!props.images) return [];
  
  // Si c'est une chaîne, essayer de la parser
  if (typeof props.images === 'string') {
    try {
      const parsed = JSON.parse(props.images);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  
  // Si c'est déjà un tableau, le retourner
  if (Array.isArray(props.images)) {
    return props.images;
  }
  
  return [];
});

const personnageStore = usePersonnageStore();
const config = useRuntimeConfig();
// Pour les images, on utilise la base sans /api
const baseUrl = computed(() => config.public.apiBase.replace('/api', ''));

// Refs
const dropZone = ref<HTMLElement>();
const fileInput = ref<HTMLInputElement>();
const isDragActive = ref(false);
const lightboxIndex = ref<number | null>(null);
const draggedIndex = ref<number | null>(null);

// État de chargement
const isUploading = ref(false);

// Gestion du drag & drop pour upload
const handleDragOver = (e: DragEvent) => {
  e.preventDefault();
};

const handleDragEnter = (e: DragEvent) => {
  e.preventDefault();
  isDragActive.value = true;
};

const handleDragLeave = (e: DragEvent) => {
  e.preventDefault();
  if (!dropZone.value?.contains(e.relatedTarget as Node)) {
    isDragActive.value = false;
  }
};

const handleDrop = (e: DragEvent) => {
  e.preventDefault();
  isDragActive.value = false;
  
  const files = Array.from(e.dataTransfer?.files || []);
  uploadFiles(files);
};

const triggerFileInput = () => {
  fileInput.value?.click();
};

const handleFileInput = (e: Event) => {
  const target = e.target as HTMLInputElement;
  const files = Array.from(target.files || []);
  console.log('Fichiers sélectionnés:', files.length, files);
  uploadFiles(files);
  // Reset de l'input pour permettre la resélection du même fichier
  target.value = '';
};

// Fonction de compression d'image
const compressImage = (file: File, maxSizeKB = 1024): Promise<File> => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      // Calculer les nouvelles dimensions pour maintenir le ratio
      let { width, height } = img;
      const maxDimension = 1920; // Taille max en pixels
      
      if (width > height && width > maxDimension) {
        height = (height * maxDimension) / width;
        width = maxDimension;
      } else if (height > maxDimension) {
        width = (width * maxDimension) / height;
        height = maxDimension;
      }
      
      canvas.width = width;
      canvas.height = height;
      
      // Dessiner l'image redimensionnée
      ctx?.drawImage(img, 0, 0, width, height);
      
      // Fonction pour essayer différentes qualités
      const tryCompress = (quality: number) => {
        canvas.toBlob((blob) => {
          if (blob) {
            const sizeKB = blob.size / 1024;
            console.log(`Compression avec qualité ${quality}: ${sizeKB.toFixed(0)}KB`);
            
            if (sizeKB <= maxSizeKB || quality <= 0.1) {
              // Créer un nouveau fichier avec le blob compressé
              const compressedFile = new File([blob], file.name, {
                type: file.type,
                lastModified: Date.now()
              });
              resolve(compressedFile);
            } else {
              // Réduire la qualité et réessayer
              tryCompress(quality - 0.1);
            }
          }
        }, file.type, quality);
      };
      
      tryCompress(0.8); // Commencer avec 80% de qualité
    };
    
    img.src = URL.createObjectURL(file);
  });
};

// Upload des fichiers
const uploadFiles = async (files: File[]) => {
  if (files.length === 0) return;
  
  // Filtrer les images
  const imageFiles = files.filter(file => file.type.startsWith('image/'));
  if (imageFiles.length === 0) {
    alert('Veuillez sélectionner des fichiers images.');
    return;
  }

  isUploading.value = true;
  
  try {
    // Compresser les images avant upload
    console.log('Compression des images...');
    const compressedFiles = await Promise.all(
      imageFiles.map(async (file) => {
        const sizeKB = file.size / 1024;
        console.log(`Image originale: ${file.name} - ${sizeKB.toFixed(0)}KB`);
        
        if (sizeKB > 1024) {
          const compressed = await compressImage(file);
          const compressedSizeKB = compressed.size / 1024;
          console.log(`Image compressée: ${compressed.name} - ${compressedSizeKB.toFixed(0)}KB`);
          return compressed;
        }
        return file;
      })
    );

    const uploadedImages = await personnageStore.uploadImages(props.personnageId, compressedFiles);
    // Le store met déjà à jour le personnage, on émet juste les nouvelles images
    const personnage = personnageStore.personnages.find(p => p.id === props.personnageId);
    emit('imagesUpdated', personnage?.images || []);
  } catch (error) {
    console.error('Erreur lors de l\'upload:', error);
    alert('Erreur lors de l\'upload des images.');
  } finally {
    isUploading.value = false;
  }
};

// Gestion de la lightbox
const openLightbox = (index: number) => {
  lightboxIndex.value = index;
};

const closeLightbox = () => {
  lightboxIndex.value = null;
};

const previousImage = () => {
  if (lightboxIndex.value !== null && lightboxIndex.value > 0) {
    lightboxIndex.value--;
  }
};

const nextImage = () => {
  if (lightboxIndex.value !== null && lightboxIndex.value < normalizedImages.value.length - 1) {
    lightboxIndex.value++;
  }
};

// Suppression d'image
const deleteImage = async (index: number) => {
  if (!normalizedImages.value || !normalizedImages.value[index]) return;
  
  const confirmDelete = confirm('Êtes-vous sûr de vouloir supprimer cette image ?');
  if (!confirmDelete) return;

  try {
    await personnageStore.deleteImage(props.personnageId, normalizedImages.value[index]);
    const updatedImages = normalizedImages.value.filter((_, i) => i !== index);
    emit('imagesUpdated', updatedImages);
  } catch (error) {
    console.error('Erreur lors de la suppression:', error);
    alert('Erreur lors de la suppression de l\'image.');
  }
};

// Gestion du drag & drop pour réorganisation
const handleDragStart = (index: number) => {
  draggedIndex.value = index;
};

const handleImageDragOver = (e: DragEvent) => {
  e.preventDefault();
};

const handleImageDrop = async (targetIndex: number) => {
  if (draggedIndex.value === null || draggedIndex.value === targetIndex) return;
  
  if (!normalizedImages.value) return;
  
  const newImages = [...normalizedImages.value];
  const draggedImage = newImages[draggedIndex.value];
  
  // Supprimer l'élément de sa position actuelle
  newImages.splice(draggedIndex.value, 1);
  
  // Insérer à la nouvelle position
  newImages.splice(targetIndex, 0, draggedImage);
  
  try {
    await personnageStore.reorderImages(props.personnageId, newImages);
    emit('imagesUpdated', newImages);
  } catch (error) {
    console.error('Erreur lors de la réorganisation:', error);
    alert('Erreur lors de la réorganisation des images.');
  }
  
  draggedIndex.value = null;
};
</script>

<style scoped>
.drop-zone {
  border: 2px dashed #d1d5db;
  border-radius: 8px;
  padding: 2rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
}

.drop-zone:hover,
.drop-zone.drag-active {
  border-color: #79AC78;
  background-color: #f9fafb;
}

.image-item {
  position: relative;
  cursor: move;
}

.lightbox-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.lightbox-content {
  position: relative;
  max-width: 90vw;
  max-height: 90vh;
}

.nav-btn {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  background: rgba(255, 255, 255, 0.9);
  border: none;
  border-radius: 50%;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background-color 0.2s;
}

.nav-btn:hover {
  background: white;
}

.nav-prev {
  left: -60px;
}

.nav-next {
  right: -60px;
}

.close-btn {
  position: absolute;
  top: -60px;
  right: 0;
  background: rgba(255, 255, 255, 0.9);
  border: none;
  border-radius: 50%;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background-color 0.2s;
}

.close-btn:hover {
  background: white;
}
</style>