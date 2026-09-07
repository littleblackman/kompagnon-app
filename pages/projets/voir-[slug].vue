<script setup lang="ts">
import { useRoute } from 'vue-router';
import { useAuthStore } from '~/store/auth';
import { useProjectStore } from '~/store/project';
import { useUserStore } from '~/store/user';
import { onMounted, computed, ref, watch, nextTick } from "vue";
import { PencilIcon } from '@heroicons/vue/24/solid';
import ProjectSubMenu from "@/components/Project/SubMenu.vue";
import SceneModal from "@/components/Project/SceneModal.vue";
import PersonnageDetectionModal from "@/components/Project/PersonnageDetectionModal.vue";
import InsertDivider from "@/components/Project/InsertDivider.vue";
import { toRoman } from '~/utils/roman';

const auth = useAuthStore();
auth.requireAuth();

const projectStore = useProjectStore();
const userStore   = useUserStore();
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
const tocOpen = ref(false);

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
  | { kind: 'cover'; title: string; author: string }
  | { kind: 'title'; cls: 'bp-part' | 'bp-seq' | 'bp-scene'; text: string; sceneId?: number }
  | { kind: 'para';  html: string }

const allBlocks = computed((): Block[] => {
  if (!projectStore.parts) return [];
  const blocks: Block[] = [];

  // Page de garde
  blocks.push({
    kind: 'cover',
    title:  projectStore.project?.name ?? '',
    author: userStore.displayName ?? '',
  });

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
          blocks.push({ kind: 'title', cls: 'bp-scene', text: scene.name, sceneId: scene.id });
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

function makeBlockEl(block: Exclude<Block, { kind: 'cover' }>): HTMLElement {
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
  const pageNumberZone = 56;
  const contentW = fmt.widthPx  - fmt.padH * 2;
  const contentH = fmt.heightPx - fmt.padV - Math.round(fmt.padV * 0.75) - pageNumberZone;

  const box = measureRef.value;
  box.style.width  = `${contentW}px`;
  box.style.height = `${contentH}px`;
  box.innerHTML = '';

  const pages: Block[][] = [];
  let currentPage: Block[] = [];

  const flushPage = () => {
    if (currentPage.length > 0) { pages.push(currentPage); currentPage = []; box.innerHTML = ''; }
  };

  for (const block of allBlocks.value) {
    // Cover → page seule, jamais mesurée
    if (block.kind === 'cover') {
      flushPage();
      pages.push([block]);
      continue;
    }

    // Partie → toujours nouvelle page
    if (block.kind === 'title' && block.cls === 'bp-part') {
      flushPage();
      const el = makeBlockEl(block);
      box.appendChild(el);
      currentPage.push(block);
      continue;
    }

    // Bloc normal : mesure de débordement
    const el = makeBlockEl(block);
    box.appendChild(el);

    if (box.scrollHeight > box.clientHeight) {
      box.removeChild(el);
      flushPage();
      box.appendChild(el);
      currentPage.push(block);
    } else {
      currentPage.push(block);
    }
  }

  flushPage();
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

// ── Édition depuis la lecture ─────────────────────────────────────────
// On repère un passage en lisant, on veut l'éditer sans avoir à le
// rechercher dans l'écran d'écriture.

type EditingState = {
  scene: any;
  sequenceId: number;
  scenes: any[];
  insertAfterId: number | null;
  focusParagraph: number | null;
};

const editing = ref<EditingState | null>(null);

const openScene = (scene: any, sequence: any, focusParagraph: number | null = null) => {
  editing.value = {
    scene: { ...scene },
    sequenceId: sequence.id,
    scenes: sequence.scenes ?? [],
    insertAfterId: null,
    focusParagraph
  };
};

const insertSceneAfter = (scene: any, sequence: any) => {
  editing.value = {
    scene: { id: undefined, name: '', description: '', content: '', status: [], sequenceId: sequence.id },
    sequenceId: sequence.id,
    scenes: sequence.scenes ?? [],
    insertAfterId: scene?.id ?? null,
    focusParagraph: null
  };
};

/**
 * Ouvre l'éditeur sur le paragraphe cliqué.
 * L'index se calcule sur le DOM rendu, dans le même ordre que les <p> de
 * l'éditeur, puisque les deux viennent du même HTML.
 */
const editFromParagraph = (event: MouseEvent, scene: any, sequence: any) => {
  const container = event.currentTarget as HTMLElement;
  const paragraph = (event.target as HTMLElement).closest('p');

  if (!paragraph || !container.contains(paragraph)) {
    openScene(scene, sequence);
    return;
  }

  const index = Array.from(container.querySelectorAll('p')).indexOf(paragraph);
  openScene(scene, sequence, index >= 0 ? index : null);
};

// Mode livre : les blocs sont aplatis, on retrouve la séquence par la scène
const openSceneById = (sceneId: number) => {
  const found = projectStore.findSceneContext(sceneId);
  if (found) openScene(found.scene, found.sequence);
};

// Le store mute l'arbre en place et parts/allBlocks sont des computed :
// inutile de recharger le projet, ce qui ferait perdre la position de lecture.
const closeEditor = () => { editing.value = null; };

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

// ── Helpers ───────────────────────────────────────────────────────────
function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── Export PDF — fenêtre propre, auto-print ───────────────────────────
async function exportPdf() {
  if (viewMode.value !== 'book') {
    viewMode.value = 'book';
    await nextTick();
    await new Promise(r => setTimeout(r, 600));
  }

  const fmt = currentFormat.value;
  const name = escapeHtml(project.value?.name ?? 'Export');

  const pagesHtml = bookPages.value.map((page) => {
    const isCover = page[0]?.kind === 'cover';
    const isPart  = page[0]?.kind === 'title' && (page[0] as any).cls === 'bp-part';
    const inner   = page.map(block => {
      if (block.kind === 'cover')
        return `<div class="cover-title">${escapeHtml(block.title)}</div>`
             + `<div class="cover-author">${escapeHtml(block.author)}</div>`;
      if (block.kind === 'title')
        return `<div class="${block.cls}">${escapeHtml(block.text)}</div>`;
      return `<div class="bp-para">${block.html}</div>`;
    }).join('');
    const cls = ['page', isCover && 'page-cover', isPart && 'page-part'].filter(Boolean).join(' ');
    return `<div class="${cls}">${inner}<div class="pnum"></div></div>`;
  }).join('');

  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${name}</title>
<style>
@page{size:${pageFormat.value} portrait;margin:0}
*{box-sizing:border-box}
body{background:#555;margin:0;padding:32px;font-family:Georgia,serif}
.page{background:#fff;width:${fmt.widthPx}px;min-height:${fmt.heightPx}px;
  padding:${fmt.padV}px ${fmt.padH}px ${Math.round(fmt.padV*.75)}px;
  margin:0 auto 40px;font-size:16px;line-height:1.75;display:flex;flex-direction:column}
.page-cover{justify-content:center;align-items:center}
.cover-title{font-size:2.4em;font-weight:bold;text-align:center;margin-bottom:.8em}
.cover-author{font-size:1.15em;font-style:italic;text-align:center;color:#555}
.bp-part{font-size:1.6em;font-weight:bold;text-align:center;text-transform:uppercase;
  letter-spacing:.25em;padding-bottom:.5em;border-bottom:2px solid #222;margin-bottom:1.5em}
.bp-seq{font-size:1.05em;font-weight:bold;font-style:italic;text-align:center;margin:1em 0 .5em}
.bp-scene{font-size:.9em;font-style:italic;text-align:center;color:#666;margin:.8em 0 .4em}
.bp-para{flex:1}.bp-para p{margin:0 0 .5em;text-align:justify}
.pnum{text-align:center;font-size:13px;color:#999;letter-spacing:.15em;margin-top:auto;padding-top:20px}
@media print{
  body{background:#fff;padding:0}
  .page{margin:0;page-break-after:always;width:100%!important;min-height:100vh!important}
  .page:last-child{page-break-after:auto}
}
</style></head><body>${pagesHtml}
<script>window.onload=()=>window.print()<\/script></body></html>`);
  win.document.close();
}

// ── Export DOC (HTML Word-compatible) ────────────────────────────────
function downloadDoc() {
  const title = project.value?.name ?? 'Document';
  let body = '';

  for (const block of allBlocks.value) {
    if (block.kind === 'cover') {
      body += `<div style="height:40%;display:flex;flex-direction:column;justify-content:center;align-items:center">
        <h1 style="text-align:center;font-size:32pt;margin:0 0 20pt">${escapeHtml(block.title)}</h1>
        ${block.author ? `<p style="text-align:center;font-size:14pt;font-style:italic">${escapeHtml(block.author)}</p>` : ''}
      </div>`;
    } else if (block.kind === 'title') {
      if (block.cls === 'bp-part') {
        body += `<h1 style="page-break-before:always;text-align:center;font-size:22pt;font-weight:bold;
          text-transform:uppercase;letter-spacing:3pt;padding-bottom:6pt;
          border-bottom:2pt solid #222;margin:0 0 18pt">${escapeHtml(block.text)}</h1>`;
      } else if (block.cls === 'bp-seq') {
        body += `<h2 style="text-align:center;font-size:16pt;font-style:italic;margin:14pt 0 6pt">${escapeHtml(block.text)}</h2>`;
      } else {
        body += `<h3 style="text-align:center;font-size:13pt;font-style:italic;color:#555;margin:10pt 0 4pt">${escapeHtml(block.text)}</h3>`;
      }
    } else {
      // HTML natif TinyMCE — formatage préservé intégralement
      body += block.html;
    }
  }

  const html = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8">
<meta name="ProgId" content="Word.Document">
<title>${escapeHtml(title)}</title>
<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View>
<w:Zoom>100</w:Zoom><w:DoNotOptimizeForBrowser/></w:WordDocument></xml><![endif]-->
<style>
  @page WordSection1 { size:21cm 29.7cm; margin:2.54cm; }
  div.WordSection1 { page:WordSection1; }
  body { font-family:"Times New Roman",serif; font-size:12pt; line-height:1.5; color:#000; }
  p { margin:0 0 6pt; text-align:justify; }
  h1,h2,h3 { font-family:"Times New Roman",serif; }
</style>
</head>
<body>
<div class="WordSection1">
${body}
</div>
</body>
</html>`;

  const blob = new Blob([html], { type: 'application/msword;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `${title}.doc`;
  a.click();
  URL.revokeObjectURL(url);
}
</script>

<template>
  <div v-if="!project" class="flex justify-center items-center min-h-screen">
    <div class="text-lg">Chargement...</div>
  </div>

  <div v-else>
    <!-- Div de mesure invisible pour la pagination DOM-based -->
    <div ref="measureRef" style="position:fixed;top:-9999px;left:-9999px;visibility:hidden;pointer-events:none;overflow:hidden;font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:1.75;box-sizing:border-box;"></div>

    <ProjectSubMenu :project-slug="slug" />

    <!-- Backdrop TOC mobile/tablette -->
    <div v-if="tocOpen" class="lg:hidden fixed inset-0 z-40" style="background:rgba(0,0,0,0.4)" @click="tocOpen = false" />

    <!-- Drawer TOC mobile/tablette -->
    <aside
      v-if="tocOpen"
      class="lg:hidden fixed left-0 top-0 h-full w-72 z-50 overflow-y-auto border-r border-gray-200 bg-blue-50 shadow-xl"
    >
      <div class="flex items-center justify-between p-4 border-b border-blue-100">
        <span class="font-bold text-blue-800">📋 Plan du projet</span>
        <button @click="tocOpen = false" class="text-gray-500 hover:text-gray-700 text-xl leading-none">&times;</button>
      </div>
      <div class="p-4 space-y-3 text-sm">
        <div v-for="(part, partIndex) in parts" :key="part.id">
          <button v-if="showTitles.h2" @click="scrollToElement(`part-${part.id}`); tocOpen = false"
            class="w-full text-left font-semibold text-blue-700 flex items-center gap-2 mb-2 hover:bg-blue-100 p-2 rounded">
            📖 <span v-if="numberParts">{{ toRoman(partIndex + 1) }}. </span>{{ part.name }}
          </button>
          <div v-if="part.sequences" class="ml-4 space-y-1">
            <div v-for="sequence in part.sequences" :key="sequence.id">
              <button v-if="showTitles.h3" @click="scrollToElement(`sequence-${sequence.id}`); tocOpen = false"
                class="w-full text-left text-amber-700 font-medium flex items-center gap-2 hover:bg-amber-100 p-1.5 rounded">
                🎯 {{ sequence.name }}
              </button>
              <div v-if="showTitles.h4 && sequence.scenes" class="ml-4 space-y-1">
                <button v-for="scene in sequence.scenes" :key="scene.id"
                  @click="scrollToElement(`scene-${scene.id}`); tocOpen = false"
                  class="w-full text-left text-gray-600 flex items-center gap-2 hover:bg-gray-100 p-1 px-2 rounded">
                  🎪 {{ scene.name }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>

    <div class="flex">

      <!-- Sommaire (caché sur tablette portrait/mobile, affiché en overlay) -->
      <aside class="hidden lg:block w-80 h-screen sticky top-0 overflow-y-auto border-r border-gray-200 bg-blue-50">
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
            <div class="flex items-center gap-3 mb-4 flex-wrap">
              <button
                @click="tocOpen = true"
                class="lg:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
              >
                📋 Plan
              </button>
              <h1 class="font-extrabold text-3xl sm:text-4xl">{{ project.name }}</h1>
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

              <!-- Exports -->
              <div class="flex items-center gap-2 ml-auto">
                <button
                  @click="exportPdf"
                  class="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-gray-200 bg-white text-gray-700 hover:bg-red-50 hover:border-red-300 hover:text-red-700 transition-colors"
                  title="Exporter en PDF (impression)"
                >
                  🖨 PDF
                </button>
                <button
                  @click="downloadDoc"
                  class="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-gray-200 bg-white text-gray-700 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-colors"
                  title="Exporter en Word / Google Docs (.doc)"
                >
                  📝 Word
                </button>
              </div>
            </div>
          </div>

          <!-- ── VUE SCROLL (existante) ── -->
          <div v-if="viewMode === 'scroll'" class="space-y-8">
            <div v-for="(part, index) in parts" :key="part.id">
              <h2 v-if="showTitles.h2" :id="`part-${part.id}`" class="text-2xl font-bold mb-4 text-blue-700">
                <span v-if="numberParts">{{ toRoman(index + 1) }}. </span>{{ part.name }}
              </h2>
              <div v-if="showOrganizational && part.description" v-html="part.description" class="organizational-text mb-6"></div>
              <div class="space-y-6">
                <div v-for="sequence in part.sequences" :key="sequence.id">
                  <h3 v-if="showTitles.h3" :id="`sequence-${sequence.id}`" class="text-xl font-semibold mb-3 text-amber-700">{{ sequence.name }}</h3>
                  <div v-if="showOrganizational && sequence.description" v-html="sequence.description" class="organizational-text mb-4"></div>
                  <div class="space-y-4">
                    <template v-for="scene in sequence.scenes" :key="scene.id">
                      <div>
                        <h4
                          v-if="showTitles.h4"
                          :id="`scene-${scene.id}`"
                          class="text-lg font-bold mb-2 text-gray-800 cursor-pointer hover:text-amber-700 transition-colors print:cursor-auto"
                          title="Éditer cette scène"
                          @click="openScene(scene, sequence)"
                        >
                          {{ scene.name }}
                        </h4>
                        <div
                          v-if="showPrintable && scene.content"
                          v-html="scene.content"
                          class="scene-content editable-content prose prose-sm max-w-none text-justify"
                          @click="editFromParagraph($event, scene, sequence)"
                        ></div>
                      </div>

                      <InsertDivider
                        label="Scène"
                        dense
                        @insert="insertSceneAfter(scene, sequence)"
                      />
                    </template>
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
              :class="[
                'book-page',
                page[0]?.kind === 'cover'                              && 'book-page--cover',
                page[0]?.kind === 'title' && page[0]?.cls === 'bp-part' && 'book-page--part',
              ]"
              :style="`width:${currentFormat.widthPx}px; min-height:${currentFormat.heightPx}px; padding:${currentFormat.padV}px ${currentFormat.padH}px ${Math.round(currentFormat.padV * 0.75)}px`"
            >
              <div class="book-page-content">
                <template v-for="(block, i) in page" :key="i">
                  <!-- Page de garde -->
                  <template v-if="block.kind === 'cover'">
                    <div class="bp-cover-title">{{ block.title }}</div>
                    <div class="bp-cover-author">{{ block.author }}</div>
                  </template>
                  <!-- Titres -->
                  <div
                    v-else-if="block.kind === 'title'"
                    :class="[block.cls, block.sceneId && 'cursor-pointer hover:text-amber-700 transition-colors print:cursor-auto']"
                    :title="block.sceneId ? 'Éditer cette scène' : null"
                    @click="block.sceneId && openSceneById(block.sceneId)"
                  >{{ block.text }}</div>
                  <!-- Contenu HTML -->
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

    <!-- Édition depuis la lecture -->
    <SceneModal
      v-if="editing"
      :scene="editing.scene"
      :projectId="project?.id ?? 0"
      :sequenceId="editing.sequenceId"
      :availableScenes="editing.scenes"
      :insert-after-id="editing.insertAfterId"
      :focus-paragraph="editing.focusParagraph"
      @close="closeEditor"
      @save="closeEditor"
      @delete="closeEditor"
    />

    <!--
      SceneModal déclenche la détection de personnages à sa fermeture.
      Sans cette modale montée ici, le drapeau resterait armé et la fenêtre
      surgirait sur une autre page.
    -->
    <PersonnageDetectionModal />
  </div>
</template>

<style scoped>
/* Le texte de lecture est éditable au clic : sans repère, personne ne le devine */
.editable-content {
  cursor: text;
}

.editable-content :deep(p) {
  border-radius: 0.25rem;
  transition: background-color 150ms ease, box-shadow 150ms ease;
}

.editable-content :deep(p:hover) {
  background-color: rgba(251, 191, 36, 0.10);
  box-shadow: -0.5rem 0 0 rgba(251, 191, 36, 0.10), 0.5rem 0 0 rgba(251, 191, 36, 0.10);
  cursor: pointer;
}

@media print {
  .editable-content :deep(p:hover) {
    background-color: transparent;
    box-shadow: none;
  }
}

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

/* Paragraphes riches */
:deep(.bp-para) { margin: 0 0 0.6em 0; text-align: justify; }
:deep(.bp-para p) { margin: 0; text-align: justify; }

/* ── Page de garde ── */
.book-page--cover {
  display: flex !important;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}
.book-page--cover .book-page-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  text-align: center;
}
.bp-cover-title {
  font-family: 'Georgia', serif;
  font-size: 2.4em;
  font-weight: bold;
  line-height: 1.2;
  color: #111;
  margin-bottom: 1.2em;
  text-align: center;
}
.bp-cover-author {
  font-family: 'Georgia', serif;
  font-size: 1.15em;
  font-style: italic;
  color: #555;
  text-align: center;
}

/* ── Page de partie (style2) ── */
.book-page--part .bp-part {
  font-size: 1.6em;
  margin-top: 0;
  padding-bottom: 0.6em;
  border-bottom: 2px solid #222;
  margin-bottom: 1.8em;
  letter-spacing: 0.25em;
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

<!-- CSS print global (non-scopé pour atteindre le layout parent) -->
<style>
@media print {
  @page { size: A4 portrait; margin: 0; }

  /* Cache tout le chrome de l'appli */
  aside, header, nav,
  .sidebar-container, .header,
  [class*="submenu"], [class*="SubMenu"] { display: none !important; }

  main { padding: 0 !important; overflow: visible !important; }

  .book-reader {
    background: transparent !important;
    padding: 0 !important;
    gap: 0 !important;
  }

  /* Chaque page → saut imprimante, taille A4 forcée */
  .book-page {
    box-shadow: none !important;
    border: none !important;
    margin: 0 !important;
    width: 210mm !important;
    min-height: 297mm !important;
    page-break-after: always;
    break-after: page;
  }
  .book-page:last-child {
    page-break-after: auto;
    break-after: auto;
  }

  .book-page-number { color: #6b7280; }
}
</style>
