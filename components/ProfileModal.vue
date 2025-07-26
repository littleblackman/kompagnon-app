<template>
  <!-- Modal Overlay -->
  <div v-if="isOpen" class="fixed inset-0 z-50 overflow-y-auto">
    <div class="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
      <!-- Background overlay -->
      <div 
        class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
        @click="closeModal"
      ></div>

      <!-- Modal content -->
      <div class="relative bg-white rounded-lg shadow-xl transform transition-all sm:max-w-lg sm:w-full">
        <!-- Header -->
        <div class="px-6 py-4 border-b border-gray-200">
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-medium text-gray-900">Mon Profil</h3>
            <button
              @click="closeModal"
              class="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <XMarkIcon class="w-6 h-6" />
            </button>
          </div>
        </div>

        <!-- Body -->
        <div class="px-6 py-4 space-y-4">
          <!-- Message de feedback -->
          <div v-if="message" :class="[
            'p-3 rounded-lg text-sm',
            messageType === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
          ]">
            {{ message }}
          </div>

          <!-- Avatar -->
          <div class="text-center">
            <div class="relative inline-block">
              <div class="w-20 h-20 rounded-full overflow-hidden bg-gray-200 mx-auto">
                <img 
                  v-if="avatarUrl" 
                  :src="avatarUrl" 
                  :alt="userStore.displayName"
                  class="w-full h-full object-cover"
                  @error="handleImageError"
                >
                <div v-else class="w-full h-full flex items-center justify-center">
                  <UserIcon class="w-10 h-10 text-gray-400" />
                </div>
              </div>
              
              <!-- Bouton upload avatar -->
              <button
                @click="triggerFileInput"
                class="absolute bottom-0 right-0 bg-amber-500 text-white p-2 rounded-full hover:bg-amber-600 transition-colors"
                title="Changer l'avatar"
              >
                <PencilIcon class="w-4 h-4" />
              </button>
            </div>
            
            <!-- Input file caché -->
            <input
              ref="fileInput"
              type="file"
              accept="image/*"
              @change="handleImageUpload"
              class="hidden"
            />
          </div>

          <!-- Email (non modifiable, cliquable) -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <div 
              class="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-600 cursor-pointer hover:bg-gray-100 transition-colors"
              title="Cliquez pour modifier votre profil"
            >
              {{ userStore.profile?.email }}
            </div>
            <p class="mt-1 text-xs text-gray-500">L'email ne peut pas être modifié (clé d'identification)</p>
          </div>

          <!-- Prénom -->
          <div>
            <label for="firstName" class="block text-sm font-medium text-gray-700 mb-2">
              Prénom
            </label>
            <input
              id="firstName"
              v-model="form.firstName"
              type="text"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              placeholder="Votre prénom"
            >
          </div>

          <!-- Nom -->
          <div>
            <label for="lastName" class="block text-sm font-medium text-gray-700 mb-2">
              Nom
            </label>
            <input
              id="lastName"
              v-model="form.lastName"
              type="text"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              placeholder="Votre nom"
            >
          </div>

          <!-- Aperçu du nom complet -->
          <div class="p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p class="text-sm text-amber-800">
              <strong>Nom d'affichage :</strong> 
              {{ (form.firstName || form.lastName) ? `${form.firstName} ${form.lastName}`.trim() : userStore.profile?.email }}
            </p>
          </div>
        </div>

        <!-- Footer -->
        <div class="px-6 py-4 border-t border-gray-200 flex gap-3 justify-end">
          <button
            @click="closeModal"
            :disabled="isSaving"
            class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            @click="saveProfile"
            :disabled="isSaving"
            class="px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <CheckIcon v-if="!isSaving" class="w-4 h-4" />
            <div v-else class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            {{ isSaving ? 'Sauvegarde...' : 'Sauvegarder' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useUserStore } from '~/store/user';
import { UserIcon, PencilIcon, CheckIcon, XMarkIcon } from '@heroicons/vue/24/solid';

interface Props {
  isOpen: boolean;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  close: [];
}>();

const userStore = useUserStore();

// Formulaire
const form = ref({
  firstName: '',
  lastName: '',
  avatar: ''
});

// Refs
const fileInput = ref<HTMLInputElement>();

// États
const isSaving = ref(false);
const message = ref('');
const messageType = ref<'success' | 'error' | ''>('');

// Construire l'URL complète de l'avatar pour l'aperçu
const avatarUrl = computed(() => {
  if (!form.value.avatar) return null;
  
  // Si c'est déjà une URL complète (data: ou http), la retourner telle quelle
  if (form.value.avatar.startsWith('data:') || form.value.avatar.startsWith('http')) {
    return form.value.avatar;
  }
  
  // Sinon construire l'URL avec la base API
  const config = useRuntimeConfig();
  const baseUrl = config.public.apiBase.replace('/api', '');
  return `${baseUrl}/${form.value.avatar}`;
});

// Initialiser le formulaire quand le profil est chargé
watch(() => userStore.profile, (profile) => {
  if (profile) {
    form.value = {
      firstName: profile.firstName || '',
      lastName: profile.lastName || '',
      avatar: profile.avatar || ''
    };
  }
}, { immediate: true });

// Fermer la modal
const closeModal = () => {
  emit('close');
  message.value = '';
  messageType.value = '';
};

// Gestion des erreurs d'image
const handleImageError = () => {
  form.value.avatar = '';
};

// Déclencher l'input file
const triggerFileInput = () => {
  fileInput.value?.click();
};

// Compression d'image
const compressImage = (file: File, maxSizeKB = 500): Promise<File> => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      // Calculer les nouvelles dimensions (carré)
      const size = Math.min(img.width, img.height);
      const offsetX = (img.width - size) / 2;
      const offsetY = (img.height - size) / 2;
      
      canvas.width = 200;
      canvas.height = 200;
      
      // Dessiner l'image en carré
      ctx?.drawImage(img, offsetX, offsetY, size, size, 0, 0, 200, 200);
      
      // Fonction pour essayer différentes qualités
      const tryCompress = (quality: number) => {
        canvas.toBlob((blob) => {
          if (blob) {
            const sizeKB = blob.size / 1024;
            console.log(`Compression avatar qualité ${quality}: ${sizeKB.toFixed(0)}KB`);
            
            if (sizeKB <= maxSizeKB || quality <= 0.1) {
              const compressedFile = new File([blob], file.name, {
                type: file.type,
                lastModified: Date.now()
              });
              resolve(compressedFile);
            } else {
              tryCompress(quality - 0.1);
            }
          }
        }, file.type, quality);
      };
      
      tryCompress(0.8);
    };
    
    img.src = URL.createObjectURL(file);
  });
};

// Upload d'image
const handleImageUpload = async (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  
  if (!file) return;
  
  // Vérifier le type de fichier
  if (!file.type.startsWith('image/')) {
    message.value = 'Veuillez sélectionner un fichier image';
    messageType.value = 'error';
    return;
  }
  
  try {
    isSaving.value = true;
    message.value = 'Upload de l\'avatar...';
    messageType.value = '';
    
    // Compresser l'image
    const compressedFile = await compressImage(file);
    console.log(`Image compressée: ${(compressedFile.size / 1024).toFixed(0)}KB`);
    
    // Upload via l'API
    const response = await userStore.uploadAvatar(compressedFile);
    
    // Mettre à jour le formulaire avec la nouvelle URL
    form.value.avatar = response.avatar;
    
    message.value = 'Avatar mis à jour avec succès !';
    messageType.value = 'success';
    
    // Effacer le message après 2 secondes
    setTimeout(() => {
      message.value = '';
      messageType.value = '';
    }, 2000);
    
  } catch (error) {
    console.error('Erreur upload avatar:', error);
    message.value = 'Erreur lors de l\'upload de l\'avatar';
    messageType.value = 'error';
  } finally {
    isSaving.value = false;
    // Reset l'input
    target.value = '';
  }
};

// Sauvegarder le profil
const saveProfile = async () => {
  isSaving.value = true;
  message.value = '';
  
  try {
    await userStore.updateProfile(form.value);
    message.value = 'Profil mis à jour avec succès !';
    messageType.value = 'success';
    
    // Fermer la modal après 1 seconde
    setTimeout(() => {
      closeModal();
    }, 1000);
    
  } catch (error) {
    console.error('Erreur lors de la sauvegarde:', error);
    message.value = 'Erreur lors de la mise à jour du profil';
    messageType.value = 'error';
  } finally {
    isSaving.value = false;
  }
};
</script>