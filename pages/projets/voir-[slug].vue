<script setup lang="ts">
import { useRoute } from 'vue-router';
import { useAuthStore } from '~/store/auth';
import { useProjectStore } from '~/store/project';
import { onMounted, computed, ref, watch, nextTick } from "vue";
import { PencilIcon } from '@heroicons/vue/24/solid';
import ProjectSubMenu from "@/components/Project/SubMenu.vue";
import { toRoman } from '~/utils/roman';

const auth = useAuthStore();
auth.requireAuth();

const projectStore = useProjectStore();
const route = useRoute();
const slug = route.params.slug as string;

const STORAGE_KEY = 'kompagnon-reading-preferences';

const loadPreferences = () => {
  if (import.meta.client) {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
  }
  return {
    showOrganizational: true,
    showPrintable: true,
    showTitles: { h2: true, h3: true, h4: true },
    numberParts: false,
    viewMode: 'scroll',
    pageFormat: 'A4',
  };
};

const savePreferences = (prefs: any) => {
  if (import.meta.client) localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
};

const preferences = loadPreferences();
const showOrganizational = ref(preferences.showOrganizational);
const showPrintable = ref(preferences.showPrintable);
const showTitles = ref(preferences.showTitles || { h2: true, h3: true, h4: true });
const numberParts = ref(preferences.numberParts);
const viewMode = ref<'scroll' | 'book'>(preferences.viewMode || 'scroll');
const pageFormat = ref<'A3' | 'A4' | 'A5'>(preferences.pageFormat || 'A4');

// px à 96dpi, marges en px
const PAGE_FORMATS = {
  A3: { label: 'A3 vertical', widthPx: 1122, heightPx: 1587, padV: 96, padH: 96 },
  A4: { label: 'A4 vertical', widthPx: 794,  heightPx: 1123, padV: 96, padH: 96 },
  A5: { label: 'A5 vertical', widthPx: 559,  heightPx: 794,  padV: 48, padH: 52 },
};

const currentFormat = computed(() => PAGE_FORMATS[pageFormat.value]);

// Découpe un contenu HTML en paragraphes (garde le HTML intact, retire les <hr>)
function htmlToParas(html: string): string[] {
  if (!html) return [];
  const clean = html.replace(/<hr\s*\/?>/gi, '');
  const matches = clean.match(/<p[^>]*>[\s\S]*?<\/p>/gi);
  if (matches?.length) return matches.filter(p => p.replace(/<[^>]+>/g, '').trim().length > 0);
  return clean.trim() ? [clean] : [];
}

type Block =
  | { kind: 'title'; cls: 'bp-part' | 'bp-seq' | 'bp-scene'; text: string }
  | { kind: 'para';  html: string }

const allBlocks = computed((): Block[] => {
  if (!projectStore.parts) return [];
  const blocks: Block[] = [];

  for (const part of projectStore.parts) {
    if (showTitles.value.h2)
      blocks.push({ kind: 'title', cls: 'bp-part', text: part.name });
    if (showOrganizational.value && part.description)
      htmlToParas(part.description).forEach(p => blocks.push({ kind: 'para', html: p }));

    for (const seq of (part.sequences || [])) {
      if (showTitles.value.h3)
        blocks.push({ kind: 'title', cls: 'bp-seq', text: seq.name });
      if (showOrganizational.value && seq.description)
        htmlToParas(seq.description).forEach(p => blocks.push({ kind: 'para', html: p }));

      for (const scene of (seq.scenes || [])) {
        if (showTitles.value.h4)
          blocks.push({ kind: 'title', cls: 'bp-scene', text: scene.name });
        if (showPrintable.value && scene.content)
          htmlToParas(scene.content).forEach(p => blocks.push({ kind: 'para', html: p }));
      }
    }
  }
  return blocks;
});

// ── Pagination DOM-based ──────────────────────────────────────────────
// Styles inline qui reflètent exactement les :deep CSS des pages
const BLOCK_STYLES: Record<string, string> = {
  'bp-part':  'display:block;font-family:Georgia,serif;font-size:1.2em;font-weight:700;text-align:center;text-transform:uppercase;letter-spacing:0.2em;margin:1.5em 0 0.8em;color:#111',
  'bp-seq':   'display:block;font-family:Georgia,serif;font-size:1em;font-weight:700;font-style:italic;text-align:center;margin:1.2em 0 0.6em;color:#333',
  'bp-scene': 'display:block;font-family:Georgia,serif;font-size:0.9em;text-align:center;font-style:italic;color:#666;margin:1em 0 0.5em;letter-spacing:0.05em',
  'para':     'display:block;margin:0 0 0.6em 0;text-align:justify;font-family:Georgia,serif;font-size:16px;line-height:1.75',
};

function makeBlockEl(block: Block): HTMLElement {
  const el = document.createElement('div');
  if (block.kind === 'title') {
    el.style.cssText = BLOCK_STYLES[block.cls];
    el.textContent = block.text;
  } else {
    el.style.cssText = BLOCK_STYLES['para'];
    el.innerHTML = block.html;
    el.querySelectorAll('p').forEach(p => {
      p.style.margin = '0';
      p.style.textAlign = 'justify';
    });
  }
  return el;
}

const measureRef = ref<HTMLElement | null>(null);
const bookPages = ref<Block[][]>([]);

function paginate() {
  if (!import.meta.client || !measureRef.value || !allBlocks.value.length) {
    bookPages.value = [];
    return;
  }
  const fmt = currentFormat.value;
  const pageNumberZone = 56; // espace réservé au numéro de page
  const contentW = fmt.widthPx  - fmt.padH * 2;
  const contentH = fmt.heightPx - fmt.padV - Math.round(fmt.padV * 0.75) - pageNumberZone;

  const box = measureRef.value;
  box.style.width  = `${contentW}px`;
  box.style.height = `${contentH}px`;
  box.innerHTML = '';

  const pages: Block[][] = [];
  let currentPage: Block[] = [];

  for (const block of allBlocks.value) {
    const el = makeBlockEl(block);
    box.appendChild(el);

    if (box.scrollHeight > box.clientHeight) {
      // Ce bloc cause un débordement → on le retire et on clôt la page courante
      box.removeChild(el);

      if (currentPage.length > 0) {
        pages.push(currentPage);
        currentPage = [];
        box.innerHTML = '';
      }

      // On place ce bloc en tête de la nouvelle page
      box.appendChild(el);
      currentPage.push(block);

      // Si même seul il déborde (bloc trop long), on l'accepte quand même
    } else {
      currentPage.push(block);
    }
  }

  if (currentPage.length > 0) pages.push(currentPage);
  box.innerHTML = '';
  bookPages.value = pages;
}

watch(allBlocks, () => { if (viewMode.value === 'book') nextTick(paginate); });
watch(currentFormat, () => { if (viewMode.value === 'book') nextTick(paginate); });
watch(viewMode, (mode) => { if (mode === 'book') nextTick(paginate); });

const scrollToElement = (elementId: string) => {
  const element = document.getElementById(elementId);
  if (element) element.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

onMounted(() => projectStore.fetchProject(slug));
const project = computed(() => projectStore.project);
const parts = computed(() => projectStore.parts);

const updateStats = () => projectStore.calculateStats();

watch([showOrganizational, showPrintable, showTitles, numberParts, viewMode, pageFormat], () => {
  savePreferences({
    showOrganizational: showOrganizational.value,
    showPrintable: showPrintable.value,
    showTitles: showTitles.value,
    numberParts: numberParts.value,
    viewMode: viewMode.value,
    pageFormat: pageFormat.value,
  });
  updateStats();
}, { deep: true });
</script>

<template>
  <div v-if="!project" class="flex justify-center items-center min-h-screen">
    <div class="text-lg">Chargement...</div>
  </div>

  <div v-else>
    <!-- Div de mesure invisible pour la pagination DOM-based -->
    <div ref="measureRef" style="position:fixed;top:-9999px;left:-9999px;visibility:hidden;pointer-events:none;overflow:hidden;font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:1.75;box-sizing:border-box;"></div>

    <ProjectSubMenu :project-slug="slug" />
    <div class="flex">

      <!-- Sommaire -->
      <aside class="w-80 h-screen sticky top-0 overflow-y-auto border-r border-gray-200 bg-blue-50">
        <div class="p-6">
          <h3 class="font-bold mb-4 text-blue-800 text-lg flex items-center gap-2">📋 Plan du projet</h3>
          <div class="space-y-3">
            <div v-for="(part, partIndex) in parts" :key="part.id" class="text-sm">
              <button
                v-if="showTitles.h2"
                @click="scrollToElement(`part-${part.id}`)"
                class="w-full text-left font-semibold text-blue-700 flex items-center gap-2 mb-2 hover:text-blue-800 hover:bg-blue-100 p-2 rounded transition-colors cursor-pointer"
              >
                📖 <span v-if="numberParts">{{ toRoman(partIndex + 1) }}. </span>{{ part.name }}
              </button>
              <div v-if="part.sequences" class="ml-4 space-y-2">
                <div v-for="sequence in part.sequences" :key="sequence.id">
                  <button
                    v-if="showTitles.h3"
                    @click="scrollToElement(`sequence-${sequence.id}`)"
                    class="w-full text-left text-amber-700 flex items-center gap-2 font-medium hover:text-amber-800 hover:bg-amber-100 p-2 rounded transition-colors cursor-pointer"
                  >
                    🎯 {{ sequence.name }}
                  </button>
                  <div v-if="showTitles.h4 && sequence.scenes" class="ml-4 space-y-1">
                    <button
                      v-for="scene in sequence.scenes"
                      :key="scene.id"
                      @click="scrollToElement(`scene-${scene.id}`)"
                      class="w-full text-left text-gray-600 flex items-center gap-2 hover:text-gray-800 hover:bg-gray-100 p-1 px-2 rounded transition-colors cursor-pointer"
                    >
                      🎪 {{ scene.name }}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <!-- Contenu principal -->
      <main class="flex-1 p-6 overflow-auto">
        <div :class="viewMode === 'book' ? 'max-w-none' : 'max-w-4xl mx-auto'">

          <!-- En-tête du projet -->
          <div class="mb-8">
            <div class="flex items-center gap-3 mb-4">
              <h1 class="font-extrabold text-4xl">{{ project.name }}</h1>
              <NuxtLink :to="`/projets/projet-${slug}`" class="px-2" title="Mode Édition">
                <PencilIcon class="w-4 h-4 link" />
              </NuxtLink>
            </div>
            <div v-if="project.description" v-html="project.description" class="italic text-gray-600 text-lg text-justify"></div>
          </div>

          <!-- Contrôles -->
          <div class="mb-8 p-6 bg-gradient-to-r from-blue-50 to-amber-50 rounded-xl border border-gray-200 shadow-sm">
            <h3 class="font-bold mb-4 text-gray-800 text-lg flex items-center gap-2">🎭 Que souhaitez-vous afficher ?</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
              <label class="flex items-center cursor-pointer p-3 rounded-lg bg-white hover:bg-gray-50 transition-colors border border-gray-100 shadow-sm">
                <input type="checkbox" v-model="showOrganizational" class="mr-3 w-5 h-5 text-gray-500 rounded focus:ring-gray-400" />
                <span class="text-gray-600 font-medium flex items-center gap-2">📝 Notes d'organisation</span>
              </label>
              <label class="flex items-center cursor-pointer p-3 rounded-lg bg-white hover:bg-amber-50 transition-colors border border-gray-100 shadow-sm">
                <input type="checkbox" v-model="showPrintable" class="mr-3 w-5 h-5 text-amber-500 rounded focus:ring-amber-400" />
                <span class="text-gray-800 font-medium flex items-center gap-2">🎬 Contenu de scènes</span>
              </label>
              <label class="flex items-center cursor-pointer p-3 rounded-lg bg-white hover:bg-blue-50 transition-colors border border-gray-100 shadow-sm">
                <input type="checkbox" v-model="showTitles.h2" class="mr-3 w-5 h-5 text-blue-500 rounded focus:ring-blue-400" />
                <span class="text-blue-700 font-medium flex items-center gap-2">📖 Titres des parties</span>
              </label>
              <label class="flex items-center cursor-pointer p-3 rounded-lg bg-white hover:bg-amber-50 transition-colors border border-gray-100 shadow-sm">
                <input type="checkbox" v-model="showTitles.h3" class="mr-3 w-5 h-5 text-amber-500 rounded focus:ring-amber-400" />
                <span class="text-amber-700 font-medium flex items-center gap-2">🎯 Titres des séquences</span>
              </label>
              <label class="flex items-center cursor-pointer p-3 rounded-lg bg-white hover:bg-gray-50 transition-colors border border-gray-100 shadow-sm">
                <input type="checkbox" v-model="showTitles.h4" class="mr-3 w-5 h-5 text-gray-500 rounded focus:ring-gray-400" />
                <span class="text-gray-800 font-medium flex items-center gap-2">🎪 Titres des scènes</span>
              </label>
              <label class="flex items-center cursor-pointer p-3 rounded-lg bg-white hover:bg-purple-50 transition-colors border border-gray-100 shadow-sm">
                <input type="checkbox" v-model="numberParts" class="mr-3 w-5 h-5 text-purple-500 rounded focus:ring-purple-400" />
                <span class="text-purple-700 font-medium flex items-center gap-2">🔢 Numéroter les parties</span>
              </label>
            </div>

            <!-- Toggle mode livre -->
            <div class="flex items-center gap-3 pt-3 border-t border-gray-200 flex-wrap">
              <button
                @click="viewMode = viewMode === 'scroll' ? 'book' : 'scroll'"
                class="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors border"
                :style="viewMode === 'book'
                  ? 'background:#1e3a8a;color:white;border-color:#1e3a8a'
                  : 'background:white;color:#374151;border-color:#e5e7eb'"
              >
                📄 {{ viewMode === 'book' ? 'Mode Livre actif' : 'Mode Livre' }}
              </button>

              <template v-if="viewMode === 'book'">
                <select
                  v-model="pageFormat"
                  class="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white text-gray-700"
                >
                  <option value="A3">A3 vertical</option>
                  <option value="A4">A4 vertical</option>
                  <option value="A5">A5 vertical</option>
                </select>
                <span class="text-sm text-gray-500">
                  {{ bookPages.length }} page{{ bookPages.length > 1 ? 's' : '' }}
                </span>
              </template>
            </div>
          </div>

          <!-- ── VUE SCROLL (existante) ── -->
          <div v-if="viewMode === 'scroll'" class="space-y-8">
            <div v-for="(part, index) in parts" :key="part.id" class="pl-6">
              <h2 v-if="showTitles.h2" :id="`part-${part.id}`" class="text-2xl font-bold mb-4 text-blue-700">
                <span v-if="numberParts">{{ toRoman(index + 1) }}. </span>{{ part.name }}
              </h2>
              <div v-if="showOrganizational && part.description" v-html="part.description" class="organizational-text mb-6"></div>
              <div class="space-y-6">
                <div v-for="sequence in part.sequences" :key="sequence.id" class="ml-4 pl-4">
                  <h3 v-if="showTitles.h3" :id="`sequence-${sequence.id}`" class="text-xl font-semibold mb-3 text-amber-700">{{ sequence.name }}</h3>
                  <div v-if="showOrganizational && sequence.description" v-html="sequence.description" class="organizational-text mb-4"></div>
                  <div class="space-y-4">
                    <div v-for="scene in sequence.scenes" :key="scene.id" class="ml-4">
                      <h4 v-if="showTitles.h4" :id="`scene-${scene.id}`" class="text-lg font-bold mb-2 text-gray-800">{{ scene.name }}</h4>
                      <div v-if="showPrintable && scene.content" v-html="scene.content" class="scene-content prose prose-sm max-w-none text-justify"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div v-if="!parts || parts.length === 0" class="text-center text-gray-500 py-12">
              <p>Aucun contenu disponible pour ce projet</p>
            </div>
          </div>

          <!-- ── VUE LIVRE (pages) ── -->
          <div v-if="viewMode === 'book'" class="book-reader">
            <div
              v-for="(page, pageIndex) in bookPages"
              :key="pageIndex"
              class="book-page"
              :style="`width:${currentFormat.widthPx}px; min-height:${currentFormat.heightPx}px; padding:${currentFormat.padV}px ${currentFormat.padH}px ${Math.round(currentFormat.padV * 0.75)}px`"
            >
              <div class="book-page-content">
                <template v-for="(block, i) in page" :key="i">
                  <div v-if="block.kind === 'title'" :class="block.cls">{{ block.text }}</div>
                  <div v-else v-html="block.html" class="bp-para"></div>
                </template>
              </div>
              <div class="book-page-number">— {{ pageIndex + 1 }} / {{ bookPages.length }} —</div>
            </div>

            <div v-if="bookPages.length === 0" class="text-center text-gray-400 py-20">
              Aucun contenu à afficher.
            </div>
          </div>

        </div>
      </main>
    </div>
  </div>
</template>

<style scoped>
.link { text-decoration: none; color: #79AC78; transition: color 0.3s ease-in-out; }
.link:hover { color: #FF9B9B; transform: scale(1.4); }

.organizational-text { color: #9CA3AF; font-style: italic; }
.organizational-text * { color: #9CA3AF !important; font-style: italic !important; }

.scene-content { color: #111827; padding: 1rem 0; line-height: 1.7; text-align: justify; }
.scene-content * { color: #111827 !important; text-align: justify !important; }

/* ── Mode livre ── */
.book-reader {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 48px;
  padding: 48px 24px;
  background: #4b5563;
  border-radius: 8px;
  min-height: 400px;
}

.book-page {
  background: #ffffff;
  box-shadow: 0 6px 32px rgba(0, 0, 0, 0.4);
  position: relative;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  border-radius: 1px;
}

.book-page-content {
  flex: 1;
  font-family: 'Georgia', 'Times New Roman', serif;
  font-size: 16px;
  line-height: 1.75;
  color: #1a1a1a;
  text-align: justify;
  word-break: break-word;
}

/* Titres dans les pages */
:deep(.bp-part) {
  font-family: 'Georgia', serif;
  font-size: 1.2em;
  font-weight: bold;
  text-align: center;
  text-transform: uppercase;
  letter-spacing: 0.2em;
  margin: 1.5em 0 0.8em;
  color: #111;
}
:deep(.bp-seq) {
  font-family: 'Georgia', serif;
  font-size: 1em;
  font-weight: bold;
  font-style: italic;
  text-align: center;
  margin: 1.2em 0 0.6em;
  color: #333;
}
:deep(.bp-scene) {
  font-family: 'Georgia', serif;
  font-size: 0.9em;
  text-align: center;
  font-style: italic;
  color: #666;
  margin: 1em 0 0.5em;
  letter-spacing: 0.05em;
}

/* Paragraphes riches (bold, italic, etc. préservés) */
:deep(.bp-para) {
  margin: 0 0 0.6em 0;
  text-align: justify;
}
:deep(.bp-para p) {
  margin: 0;
  text-align: justify;
}

.book-page-number {
  text-align: center;
  font-size: 13px;
  color: #9ca3af;
  margin-top: 32px;
  letter-spacing: 0.15em;
  font-family: 'Georgia', serif;
}
</style>
