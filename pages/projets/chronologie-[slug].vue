<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { SparklesIcon, ArrowPathIcon, CheckIcon, UserGroupIcon, ShieldCheckIcon, PlusIcon, XMarkIcon } from '@heroicons/vue/24/outline';
import { useAuthStore } from '~/store/auth';
import { useProjectStore } from '~/store/project';
import { useTimelineStore } from '~/store/timeline';
import { useToast } from '~/composables/useToast';
import { useConfirm } from '~/composables/useConfirm';
import ProjectSubMenu from '@/components/Project/SubMenu.vue';
import TimelineFrise from '@/components/Timeline/Frise.vue';
import TimelineSequencier from '@/components/Timeline/Sequencier.vue';
import TimelineFactTable from '@/components/Timeline/FactTable.vue';
import TimelineIssueList from '@/components/Timeline/IssueList.vue';
import TimelineItemModal from '@/components/Timeline/ItemModal.vue';
import type { TimelineFactRow, TimelineIssueRow, TimelineNature, TimelineSequenceRow } from '~/types';
import { NATURE_CLASSES, NATURE_LABELS, NATURE_SHORT, CHECK_LABELS, LAYER_LABELS, dayLabel } from '~/utils/timeline';

definePageMeta({ middleware: 'auth' });

const auth = useAuthStore();
auth.requireAuth();

const projectStore = useProjectStore();
const timelineStore = useTimelineStore();
const toast = useToast();
const { confirm } = useConfirm();
const route = useRoute();
const slug = route.params.slug as string;

const timeline = computed(() => timelineStore.timeline);
const busy = computed(() => timelineStore.running !== null);

onMounted(async () => {
  if (projectStore.project?.slug !== slug) await projectStore.fetchProject(slug);
});

watch(() => projectStore.project?.id, (id) => {
  if (id && timelineStore.projectId !== id) timelineStore.fetch(id);
  else if (id && !timelineStore.timeline) timelineStore.fetch(id);
}, { immediate: true });

// ── Onglets, synchronisés avec l'ancre ────────────────────────────────

const TABS = [
  { key: 'frise', label: 'Frise' },
  { key: 'sequencier', label: 'Séquencier' },
  { key: 'tableau', label: 'Tableau' },
  { key: 'incoherences', label: 'Incohérences' },
] as const;
type Tab = typeof TABS[number]['key'];

const tabFromHash = (): Tab => {
  const hash = route.hash.slice(1);
  return (TABS.some(t => t.key === hash) ? hash : 'frise') as Tab;
};
const tab = ref<Tab>(tabFromHash());
watch(() => route.hash, () => { tab.value = tabFromHash(); });
const setTab = (key: Tab) => navigateTo({ hash: `#${key}` }, { replace: true });

// ── Repères A0 / J0 ───────────────────────────────────────────────────

const settingsForm = ref({ yearZero: null as number | null, dayZero: '', dayZeroLabel: '' });
watch(() => timeline.value?.settings, (settings) => {
  if (!settings) return;
  settingsForm.value = {
    yearZero: settings.yearZero,
    dayZero: settings.dayZero ?? '',
    dayZeroLabel: settings.dayZeroLabel ?? '',
  };
}, { immediate: true });

const saveSettings = async () => {
  const result = await timelineStore.saveSettings({
    yearZero: settingsForm.value.yearZero || null,
    dayZero: settingsForm.value.dayZero || null,
    dayZeroLabel: settingsForm.value.dayZeroLabel || null,
  });
  result.success ? toast.success('Repères enregistrés.') : toast.error(result.message!);
};

const formatDay = (iso: string | null) => (iso ? iso.split('-').reverse().join('/') : '—');

// ── Analyse ───────────────────────────────────────────────────────────

/** À lire : jamais analysées, ou réécrites depuis la dernière lecture */
const pending = computed(() => (timeline.value?.sequences ?? []).filter(s => !s.analysed || s.stale));

const report = (done: number, errors: string[]) => {
  if (errors.length) toast.error(`${errors.length} séquence(s) non lue(s). ${errors[0]}`);
  else if (done) toast.success(`${done} séquence(s) lue(s). Vérifiez les propositions avant de valider.`);
};

const extractPending = async () => {
  const { done, errors } = await timelineStore.extractSequences(pending.value.map(s => s.sequenceId));
  report(done, errors);
};

const extractAll = async () => {
  const total = timeline.value?.sequences.length ?? 0;
  const ok = await confirm({
    title: 'Relire tout le manuscrit ?',
    message: `${total} séquences seront relues une à une. Les dates et faits déjà validés sont conservés ; seules les propositions sont remplacées.`,
    confirmLabel: 'Tout relire',
  });
  if (!ok) return;
  const { done, errors } = await timelineStore.extractSequences(timeline.value!.sequences.map(s => s.sequenceId));
  report(done, errors);
};

const extractOne = async (sequenceId: number) => {
  const { errors } = await timelineStore.extractSequences([sequenceId]);
  errors.length ? toast.error(errors[0]) : toast.success('Séquence relue.');
};

const extractFiches = async () => {
  const result = await timelineStore.extractFiches();
  result.success ? toast.success('Fiches lues.') : toast.error(result.message!);
};

const checkCoherence = async () => {
  const result = await timelineStore.checkCoherence();
  if (!result.success) return toast.error(result.message!);
  toast.success(`${timeline.value?.stats.openIssues ?? 0} incohérence(s) ouverte(s).`);
  setTab('incoherences');
};

const validateAll = async () => {
  const ok = await confirm({
    title: 'Tout valider ?',
    message: `${timeline.value?.stats.proposed} proposition(s) de l'analyse deviendront les vôtres. Une nouvelle analyse ne les réécrira plus.`,
    confirmLabel: 'Valider',
  });
  if (!ok) return;
  const result = await timelineStore.validate();
  result.success ? toast.success('Propositions validées.') : toast.error(result.message!);
};

const validateSequence = async (sequenceId: number) => {
  const result = await timelineStore.validate(sequenceId);
  result.success ? toast.success('Séquence validée.') : toast.error(result.message!);
};

// ── Sélection et détail ───────────────────────────────────────────────

const selected = ref<{ type: 'fact' | 'sequence'; id: number } | null>(null);

const selectedFact = computed<TimelineFactRow | null>(() =>
  selected.value?.type === 'fact' ? timeline.value?.facts.find(f => f.id === selected.value!.id) ?? null : null
);
const selectedSequence = computed<TimelineSequenceRow | null>(() =>
  selected.value?.type === 'sequence' ? timeline.value?.sequences.find(s => s.sequenceId === selected.value!.id) ?? null : null
);

const select = (item: { type: 'fact' | 'sequence'; id: number }) => {
  selected.value = item;
  nextTick(() => document.getElementById('timeline-detail')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }));
};

const highlightedIssue = ref<string | null>(null);
const showIssue = async (code: string) => {
  highlightedIssue.value = code;
  await setTab('incoherences');
  nextTick(() => document.getElementById(`issue-${code}`)?.scrollIntoView({ block: 'start', behavior: 'smooth' }));
};

const setFactStatus = async (fact: TimelineFactRow, status: 'validated' | 'rejected' | 'proposed') => {
  const result = status === 'rejected' ? await timelineStore.deleteFact(fact.id) : await timelineStore.setFactStatus(fact.id, status);
  if (!result.success) return toast.error(result.message!);
  if (status === 'rejected' && fact.origin === 'manual') selected.value = null;
};

const setIssueStatus = async (issue: TimelineIssueRow, status: 'open' | 'resolved' | 'dismissed') => {
  if (!issue.id) return;
  const result = await timelineStore.setIssueStatus(issue.id, status);
  if (!result.success) toast.error(result.message!);
};

const goToSequence = (sequenceId: number) => navigateTo(`/projets/projet-${slug}#sequence-${sequenceId}`);

// ── Modale de correction ──────────────────────────────────────────────

const modal = ref<null | { fact?: TimelineFactRow | null; sequence?: TimelineSequenceRow | null }>(null);

const saveItem = async (kind: 'fact' | 'sequence', data: Record<string, any>) => {
  const result = kind === 'sequence' ? await timelineStore.saveSequence(data) : await timelineStore.saveFact(data);
  if (!result.success) return toast.error(result.message!);
  toast.success('Enregistré.');
  modal.value = null;
};

const natures: TimelineNature[] = ['scene', 'evoque', 'fiche'];
</script>

<template>
  <div v-if="!projectStore.project" class="p-8 text-center text-gray-500">Chargement…</div>

  <div v-else>
    <ProjectSubMenu :project-slug="slug" />

    <main class="mx-auto grid max-w-7xl gap-5 px-4 py-6 sm:px-6 lg:px-8">
      <header>
        <h1 class="text-3xl font-extrabold uppercase tracking-tight text-gray-900 md:text-4xl">Chronologie</h1>
        <p class="mt-1 max-w-3xl text-gray-600">
          Chaque fait daté ou datable du manuscrit : vécu en scène, juste évoqué, ou tiré d'une fiche.
          L'analyse propose ; rien ne compte comme acquis tant que vous ne l'avez pas validé.
        </p>
        <p v-if="timeline" class="mt-2 font-mono text-xs text-gray-500">
          {{ timeline.stats.analysed }}/{{ timeline.stats.sequences }} séquences lues
          · {{ timeline.stats.facts }} faits
          · {{ timeline.stats.proposed }} à valider
          · {{ timeline.stats.openIssues }} incohérence(s)
          <template v-if="timeline.stats.stale"> · {{ timeline.stats.stale }} réécrite(s) depuis</template>
        </p>
      </header>

      <div v-if="timelineStore.loading && !timeline" class="text-sm text-gray-500">Chargement de la chronologie…</div>

      <template v-else-if="timeline">
        <!-- Repères -->
        <section class="grid gap-3 rounded-lg border border-gray-200 bg-white p-4 text-sm md:grid-cols-[auto_auto_1fr_auto] md:items-end">
          <div>
            <label class="mb-1 block text-xs font-semibold text-gray-600">Année de référence (A0)</label>
            <input
              v-model.number="settingsForm.yearZero"
              type="number"
              class="w-32 rounded border border-gray-300 p-2"
              :placeholder="timeline.settings.effectiveYearZero ? String(timeline.settings.effectiveYearZero) : 'auto'"
            />
          </div>
          <div>
            <label class="mb-1 block text-xs font-semibold text-gray-600">Jour zéro (J0)</label>
            <input v-model="settingsForm.dayZero" type="date" class="rounded border border-gray-300 p-2" />
          </div>
          <div>
            <label class="mb-1 block text-xs font-semibold text-gray-600">Ce qui se passe à J0</label>
            <input v-model="settingsForm.dayZeroLabel" class="w-full rounded border border-gray-300 p-2" placeholder="première nuit de Keny au bar" />
          </div>
          <button type="button" class="rounded bg-gray-900 px-4 py-2 font-semibold text-white hover:bg-gray-700" @click="saveSettings">
            Enregistrer
          </button>
          <p v-if="timeline.settings.dayZeroSource === 'auto'" class="text-xs text-gray-500 md:col-span-4">
            Sans réglage, J0 est la première date au jour près du récit : <b class="font-mono">{{ formatDay(timeline.settings.effectiveDayZero) }}</b>,
            et A0 son année. Fixez-les pour que l'analyse compte depuis le bon jour.
          </p>
        </section>

        <!-- Actions d'analyse -->
        <section class="flex flex-wrap items-center gap-2">
          <button
            type="button"
            class="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
            :disabled="busy || !pending.length"
            @click="extractPending"
          >
            <SparklesIcon class="h-4 w-4" />
            {{ pending.length ? `Analyser ${pending.length} séquence${pending.length > 1 ? 's' : ''}` : 'Toutes les séquences sont lues' }}
          </button>
          <button type="button" class="action" :disabled="busy" @click="extractAll">
            <ArrowPathIcon class="h-4 w-4" /> Tout relire
          </button>
          <button type="button" class="action" :disabled="busy" @click="extractFiches">
            <UserGroupIcon class="h-4 w-4" /> Lire les fiches
          </button>
          <button type="button" class="action" :disabled="busy || !timeline.stats.analysed" @click="checkCoherence">
            <ShieldCheckIcon class="h-4 w-4" /> Vérifier la cohérence
          </button>
          <button type="button" class="action" :disabled="busy" @click="modal = { fact: null }">
            <PlusIcon class="h-4 w-4" /> Ajouter un fait
          </button>
          <span class="flex-1"></span>
          <button
            v-if="timeline.stats.proposed"
            type="button"
            class="action border-green-600 text-green-700 hover:bg-green-50"
            :disabled="busy"
            @click="validateAll"
          >
            <CheckIcon class="h-4 w-4" /> Tout valider ({{ timeline.stats.proposed }})
          </button>
        </section>

        <!-- Progression -->
        <div v-if="timelineStore.running" class="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
          <div class="mb-2 flex items-center justify-between gap-3">
            <span class="truncate text-amber-900">
              Lecture en cours : <b>{{ timelineStore.running.label }}</b>
              <span v-if="timelineStore.running.total > 1" class="font-mono"> · {{ timelineStore.running.done + 1 }}/{{ timelineStore.running.total }}</span>
            </span>
            <button
              v-if="timelineStore.running.total > 1"
              type="button"
              class="shrink-0 rounded border border-amber-300 px-2 py-0.5 text-xs text-amber-900 hover:bg-amber-100"
              :disabled="timelineStore.cancelRequested"
              @click="timelineStore.cancel()"
            >{{ timelineStore.cancelRequested ? 'Arrêt après celle-ci…' : 'Arrêter' }}</button>
          </div>
          <div class="h-1.5 overflow-hidden rounded bg-amber-100">
            <div
              class="h-full bg-amber-500 transition-all"
              :class="{ 'animate-pulse': timelineStore.running.total === 1 }"
              :style="{ width: `${timelineStore.running.total > 1 ? (timelineStore.running.done / timelineStore.running.total) * 100 : 100}%` }"
            ></div>
          </div>
        </div>

        <!-- Légende -->
        <div class="flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px]">
          <span v-for="nature in natures" :key="nature" class="inline-flex items-center gap-1.5">
            <i class="h-3 w-3 rounded-sm" :class="NATURE_CLASSES[nature].dot"></i>{{ NATURE_LABELS[nature] }}
          </span>
          <span class="inline-flex items-center gap-1.5 text-gray-500">
            <i class="h-3 w-5 rounded-sm border border-dashed border-gray-400"></i>proposé, à valider
          </span>
        </div>

        <!-- Onglets -->
        <nav class="flex flex-wrap gap-1 border-b-2 border-gray-200" aria-label="Vues">
          <button
            v-for="item in TABS"
            :key="item.key"
            type="button"
            class="-mb-0.5 border-b-[3px] px-3.5 py-2.5 text-sm font-bold uppercase tracking-wide transition-colors"
            :class="tab === item.key ? 'border-amber-600 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-800'"
            :aria-current="tab === item.key ? 'page' : undefined"
            @click="setTab(item.key)"
          >
            {{ item.label }}
            <span v-if="item.key === 'incoherences' && timeline.stats.openIssues" class="ml-1 font-mono text-xs text-red-600">{{ timeline.stats.openIssues }}</span>
          </button>
        </nav>

        <!-- Détail de l'élément sélectionné -->
        <section v-if="selectedFact || selectedSequence" id="timeline-detail" class="grid gap-2 rounded-lg border border-amber-200 bg-amber-50/40 p-4 text-sm">
          <div class="flex items-start gap-3">
            <div class="flex flex-1 flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-gray-600">
              <template v-if="selectedFact">
                <span class="font-mono">{{ selectedFact.display.relative }} · {{ selectedFact.display.absolute }}</span>
                <span>{{ selectedFact.display.precision }}</span>
                <span class="inline-flex items-center gap-1.5"><i class="h-2.5 w-2.5 rounded-sm" :class="NATURE_CLASSES[selectedFact.nature].dot"></i>{{ NATURE_SHORT[selectedFact.nature] }}</span>
                <span>{{ LAYER_LABELS[selectedFact.layer] }}</span>
                <span v-if="selectedFact.check" class="rounded border px-1.5 font-mono text-xs font-semibold" :class="CHECK_LABELS[selectedFact.check].classes">{{ CHECK_LABELS[selectedFact.check].label }}</span>
                <span v-if="selectedFact.status !== 'validated'" class="rounded border border-dashed border-gray-400 px-1.5 text-xs">{{ selectedFact.status === 'proposed' ? 'proposé' : 'rejeté' }}</span>
              </template>
              <template v-else-if="selectedSequence?.display">
                <span class="font-mono">{{ selectedSequence.display.relative }} · {{ selectedSequence.display.absolute }}</span>
                <span v-if="selectedSequence.display.weekday">{{ selectedSequence.display.weekday }}</span>
                <span class="font-mono">{{ dayLabel(selectedSequence.dayOffset) }}</span>
                <span v-if="selectedSequence.date?.time">{{ selectedSequence.date.time }}</span>
                <span>{{ selectedSequence.display.precision }}</span>
                <span v-if="selectedSequence.status === 'proposed'" class="rounded border border-dashed border-gray-400 px-1.5 text-xs">proposée</span>
              </template>
            </div>
            <button type="button" class="rounded p-1 text-gray-400 hover:bg-white hover:text-gray-700" title="Fermer" @click="selected = null">
              <XMarkIcon class="h-4 w-4" />
            </button>
          </div>

          <template v-if="selectedFact">
            <p class="text-base text-gray-900">{{ selectedFact.label }}</p>
            <div class="flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-gray-600">
              <span v-if="selectedFact.who.length"><b>Qui :</b> {{ selectedFact.who.join(', ') }}</span>
              <span v-if="selectedFact.date.anchor"><b>Ancrage :</b> {{ selectedFact.date.anchor }}</span>
              <span><b>Source :</b> {{ selectedFact.sequenceLabel ?? (selectedFact.personnageName ? `fiche ${selectedFact.personnageName}` : 'saisi à la main') }}</span>
            </div>
            <p v-if="selectedFact.quote" class="italic text-gray-600">« {{ selectedFact.quote }} »</p>
          </template>
          <template v-else-if="selectedSequence">
            <p class="text-base text-gray-900"><b>{{ selectedSequence.label }} · {{ selectedSequence.name }}</b> — {{ selectedSequence.summary }}</p>
            <div class="flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-gray-600">
              <span v-if="selectedSequence.place"><b>Lieu :</b> {{ selectedSequence.place }}</span>
              <span v-if="selectedSequence.who?.length"><b>Qui :</b> {{ selectedSequence.who.join(', ') }}</span>
              <span v-if="selectedSequence.date?.anchor"><b>Ancrage :</b> {{ selectedSequence.date.anchor }}</span>
            </div>
            <p v-if="selectedSequence.quote" class="italic text-gray-600">« {{ selectedSequence.quote }} »</p>
          </template>

          <div class="flex flex-wrap items-center gap-1.5 pt-1">
            <button
              v-for="code in (selectedFact?.issues ?? selectedSequence?.issues ?? [])"
              :key="code"
              type="button"
              class="rounded border border-red-600 px-1.5 font-mono text-[11px] font-semibold text-red-700"
              @click="showIssue(code)"
            >{{ code }}</button>
            <span class="flex-1"></span>
            <template v-if="selectedFact">
              <button v-if="selectedFact.status !== 'validated'" type="button" class="action border-green-600 text-green-700 hover:bg-green-50" @click="setFactStatus(selectedFact, 'validated')">
                {{ selectedFact.status === 'rejected' ? 'Rétablir' : 'Valider' }}
              </button>
              <button type="button" class="action" @click="modal = { fact: selectedFact }">Corriger</button>
              <button v-if="selectedFact.status !== 'rejected'" type="button" class="action border-red-300 text-red-700 hover:bg-red-50" @click="setFactStatus(selectedFact, 'rejected')">
                {{ selectedFact.origin === 'manual' ? 'Supprimer' : 'Rejeter' }}
              </button>
            </template>
            <template v-else-if="selectedSequence">
              <button v-if="selectedSequence.status === 'proposed'" type="button" class="action border-green-600 text-green-700 hover:bg-green-50" @click="validateSequence(selectedSequence.sequenceId)">Valider</button>
              <button type="button" class="action" @click="modal = { sequence: selectedSequence }">Corriger la date</button>
              <button type="button" class="action" :disabled="busy" @click="extractOne(selectedSequence.sequenceId)">Relire</button>
              <button type="button" class="action" @click="goToSequence(selectedSequence.sequenceId)">Ouvrir la séquence</button>
            </template>
          </div>
        </section>

        <TimelineFrise v-if="tab === 'frise'" :timeline="timeline" :selected="selected" @select="select" />
        <TimelineSequencier
          v-else-if="tab === 'sequencier'"
          :timeline="timeline"
          :busy="busy"
          @select="select"
          @edit="row => (modal = { sequence: row })"
          @extract="extractOne"
          @validate="validateSequence"
          @issue="showIssue"
        />
        <TimelineFactTable v-else-if="tab === 'tableau'" :timeline="timeline" :selected="selected" @select="select" @issue="showIssue" />
        <TimelineIssueList v-else :timeline="timeline" :highlighted="highlightedIssue" @select="select" @status="setIssueStatus" />
      </template>
    </main>

    <TimelineItemModal
      v-if="modal && timeline"
      :timeline="timeline"
      :fact="modal.fact"
      :sequence="modal.sequence"
      @close="modal = null"
      @save="saveItem"
    />
  </div>
</template>

<style scoped>
.action {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  border-radius: 0.5rem;
  border: 1px solid #e5e7eb;
  background: #fff;
  padding: 0.375rem 0.75rem;
  font-size: 0.8125rem;
  color: #374151;
  transition: background-color 0.15s;
}

.action:hover:not(:disabled) {
  background: #f9fafb;
}

.action:disabled {
  opacity: 0.5;
}
</style>
