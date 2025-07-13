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
          'insertdatetime', 'table', 'help', 'wordcount',
          'emoticons', 'image', 'media', 'codesample',
          'pagebreak', 'nonbreaking', 'visualchars',
          'quickbars', 'autoresize'
        ],
        toolbar: [
          'undo redo | styles | bold italic underline strikethrough | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | link image media table codesample',
          'forecolor backcolor | fontfamily fontsize | removeformat | charmap emoticons | hr pagebreak nonbreaking | toc visualchars | fullscreen code | help'
        ],
        quickbars_selection_toolbar: 'bold italic | quicklink h2 h3 blockquote',
        quickbars_insert_toolbar: 'quickimage quicktable',
        contextmenu: 'link image table',
        content_style: 'body { font-family: -apple-system, BlinkMacSystemFont, San Francisco, Segoe UI, Roboto, Helvetica Neue, sans-serif; font-size: 14px; }',
        style_formats: [
          { title: 'Headings', items: [
            { title: 'Heading 1', format: 'h1' },
            { title: 'Heading 2', format: 'h2' },
            { title: 'Heading 3', format: 'h3' },
            { title: 'Heading 4', format: 'h4' },
            { title: 'Heading 5', format: 'h5' },
            { title: 'Heading 6', format: 'h6' }
          ]},
          { title: 'Inline', items: [
            { title: 'Bold', format: 'bold' },
            { title: 'Italic', format: 'italic' },
            { title: 'Underline', format: 'underline' },
            { title: 'Strikethrough', format: 'strikethrough' },
            { title: 'Superscript', format: 'superscript' },
            { title: 'Subscript', format: 'subscript' },
            { title: 'Code', format: 'code' }
          ]},
          { title: 'Blocks', items: [
            { title: 'Paragraph', format: 'p' },
            { title: 'Blockquote', format: 'blockquote' },
            { title: 'Div', format: 'div' },
            { title: 'Pre', format: 'pre' }
          ]},
          { title: 'Alignment', items: [
            { title: 'Left', format: 'alignleft' },
            { title: 'Center', format: 'aligncenter' },
            { title: 'Right', format: 'alignright' },
            { title: 'Justify', format: 'alignjustify' }
          ]}
        ]
      }"
    />
  </ClientOnly>
</template>
