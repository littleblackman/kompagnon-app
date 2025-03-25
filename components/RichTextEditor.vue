<script setup lang="ts">
import { ref, watch } from 'vue';
import Editor from '@tinymce/tinymce-vue';

const props = defineProps<{
  modelValue: string
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
          'lists', 'link', 'charmap', 'preview', 'anchor',
          'searchreplace', 'visualblocks', 'code', 'fullscreen',
          'insertdatetime', 'table', 'help', 'wordcount'
        ],
        toolbar: 'undo redo | bold italic underline | alignleft aligncenter alignright | bullist numlist | removeformat'
      }"
    />
  </ClientOnly>
</template>
