<script setup lang="ts">
import { ref, watch } from 'vue';
import Editor from '@tinymce/tinymce-vue';

const props = defineProps<{
  modelValue: string;
  contentType?: 'organizational' | 'printable';
}>();

const emit = defineEmits(['update:modelValue']);

// Local editable copy
const currentDescription = ref(props.modelValue);

// Watch prop to keep in sync
watch(() => props.modelValue, (newVal) => {
  if (newVal !== currentDescription.value) {
    currentDescription.value = newVal;
  }
});

// Emit when local changes
watch(currentDescription, (newVal) => {
  emit('update:modelValue', newVal);
});
</script>

<template>
  <ClientOnly>
    <Editor
        v-model="currentDescription"
        api-key="rh94623y86575qrj04nyduzxsrhx2n6v9hi1pwz2c4idlt9i"
        :init="{
        height: 300,
        menubar: false,
        plugins: [
          'lists', 'link', 'emoticons'
        ],
        toolbar: 'styles | bold italic underline | forecolor backcolor | bullist numlist | link emoticons | removeformat',
        quickbars_selection_toolbar: 'bold italic underline | quicklink',
        quickbars_insert_toolbar: false,
        contextmenu: 'link',
        content_style: `body { 
          font-family: -apple-system, BlinkMacSystemFont, San Francisco, Segoe UI, Roboto, Helvetica Neue, sans-serif; 
          font-size: 16px; 
          color: #000000;
          ${props.contentType === 'organizational' ? 'color: #9CA3AF !important; font-style: italic;' : ''}
          ${props.contentType === 'printable' ? 'color: #111827 !important; background-color: #FFFBEB; padding-left: 1.2rem!important; border-left: 4px solid #F59E0B;' : ''}
        }`,
        style_formats: [
          { title: 'Titres', items: [
            { title: 'Titre 1', format: 'h1' },
            { title: 'Titre 2', format: 'h2' },
            { title: 'Titre 3', format: 'h3' },
            { title: 'Paragraphe', format: 'p' }
          ]}
        ]
      }"
    />
  </ClientOnly>
</template>
