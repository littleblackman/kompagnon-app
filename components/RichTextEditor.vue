<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import Editor from '@tinymce/tinymce-vue';

const props = defineProps<{
  modelValue: string;
  contentType?: 'organizational' | 'printable';
}>();

const emit = defineEmits(['update:modelValue']);

const LANG_KEY = 'kompagnon_spell_lang';
const savedLang = typeof localStorage !== 'undefined' ? localStorage.getItem(LANG_KEY) : null;
const currentLang = ref<'fr' | 'en'>((savedLang === 'en' ? 'en' : 'fr'));
const editorInstance = ref<any>(null);

const currentDescription = ref(props.modelValue);

watch(() => props.modelValue, (newVal) => {
  if (newVal !== currentDescription.value) {
    currentDescription.value = newVal;
  }
});

watch(currentDescription, (newVal) => {
  emit('update:modelValue', newVal);
});

function applyLang(editor: any, lang: string) {
  const body = editor.getBody();
  if (body) {
    body.setAttribute('lang', lang);
    body.setAttribute('spellcheck', 'true');
  }
}

function onEditorInit(_evt: any, editor: any) {
  editorInstance.value = editor;
  applyLang(editor, currentLang.value);
}

function setLang(lang: 'fr' | 'en') {
  currentLang.value = lang;
  localStorage.setItem(LANG_KEY, lang);
  if (editorInstance.value) {
    applyLang(editorInstance.value, lang);
  }
}

const contentStyle = computed(() => `body {
  font-family: -apple-system, BlinkMacSystemFont, San Francisco, Segoe UI, Roboto, Helvetica Neue, sans-serif;
  font-size: 16px;
  color: #000000;
  ${props.contentType === 'organizational' ? 'color: #9CA3AF !important; font-style: italic;' : ''}
  ${props.contentType === 'printable' ? 'color: #111827 !important;' : ''}
}`);
</script>

<template>
  <div>
    <div class="flex items-center gap-1 mb-1 justify-end">
      <span class="text-xs text-gray-400 mr-1">Correcteur :</span>
      <button
        type="button"
        :class="['px-2 py-0.5 rounded text-xs font-medium transition-colors', currentLang === 'fr' ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200']"
        @click="setLang('fr')"
      >
        FR
      </button>
      <button
        type="button"
        :class="['px-2 py-0.5 rounded text-xs font-medium transition-colors', currentLang === 'en' ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200']"
        @click="setLang('en')"
      >
        EN
      </button>
    </div>
    <ClientOnly>
      <Editor
        v-model="currentDescription"
        api-key="rh94623y86575qrj04nyduzxsrhx2n6v9hi1pwz2c4idlt9i"
        @init="onEditorInit"
        :init="{
          height: 300,
          menubar: false,
          browser_spellcheck: true,
          contextmenu: false,
          plugins: ['lists', 'link', 'emoticons'],
          toolbar: 'styles | bold italic underline | forecolor backcolor | bullist numlist | link emoticons | removeformat',
          quickbars_selection_toolbar: 'bold italic underline | quicklink',
          quickbars_insert_toolbar: false,
          content_style: contentStyle,
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
  </div>
</template>
