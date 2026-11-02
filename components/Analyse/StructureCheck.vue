<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useAuthStore } from '~/store/auth';
import { useActivityStore } from '~/store/activity';
import { useToast } from '~/composables/useToast';
import SequenceRefText from '~/components/Project/SequenceRefText.vue';
import MissingList from '~/components/Project/MissingList.vue';

/**
 * Le texte suit-il la structure choisie ? Chaque séquence est d'abord lue
 * (une requête chacune, mise en cache côté API tant que son texte ne change
 * pas), puis une synthèse confronte ces lectures à la structure. Rien n'est
 * réécrit : on signale ce qui est joué et ce qui manque.
 */
const props = defineProps<{ projectId: number; projectName?: string }>();

const config = useRuntimeConfig();
const authStore = useAuthStore();
const activityStore = useActivityStore();
const toast = useToast();

/** Lectures menées de front : assez pour aller vite, pas assez pour saturer l'API */
const PARALLEL_READINGS = 3;

const state = ref<any>(null);
const loading = ref(true);
const running = ref(false);
const progress = ref({ done: 0, total: 0, step: '' as '' | 'lecture' | 'synthese' });

const headers = () => ({ 'X-AUTH-TOKEN': authStore.token || '' });

const loadState = async () => {
  try {
    state.value = await $fetch(`${config.public.apiBase}/project/${props.projectId}/analyse/structure`, { headers: headers() });
  } catch (error) {
    console.error('Erreur lors du chargement de l\'analyse de structure:', error);
  } finally {
    loading.value = false;
  }
};

onMounted(loadState);

const verification = computed(() => state.value?.verification ?? null);

// Sans beat, il n'y a rien à confronter : les beats viennent du sous-genre
const hasBeats = computed(() => (state.value?.frame?.beats?.length ?? 0) > 0);
const staleCount = computed(() => (state.value?.sequences ?? []).filter((s: any) => !s.fresh).length);

/** Lit les séquences données, quelques-unes à la fois ; rend celles qui ont échoué */
const readSequences = async (ids: number[]) => {
  const failed: number[] = [];
  let next = 0;
  progress.value = { done: 0, total: ids.length, step: 'lecture' };

  const worker = async () => {
    while (next < ids.length) {
      const id = ids[next++];
      try {
        await $fetch(`${config.public.apiBase}/sequence/${id}/analyse/structure-reading`, { method: 'POST', headers: headers() });
      } catch {
        failed.push(id);
      }
      progress.value.done++;
    }
  };

  await Promise.all(Array.from({ length: Math.min(PARALLEL_READINGS, ids.length) }, worker));
  return failed;
};

const run = async () => {
  if (running.value || !state.value) return;
  running.value = true;

  try {
    await activityStore.track(`Structure de ${props.projectName ?? 'projet'}…`, async () => {
      const toRead = state.value.sequences.filter((s: any) => !s.fresh).map((s: any) => s.id);
      if (toRead.length) {
        // Une lecture ratée (délai, réponse illisible) a droit à un second essai
        const failed = await readSequences(toRead);
        if (failed.length && (await readSequences(failed)).length) {
          throw new Error(`${failed.length} séquence(s) n'ont pas pu être lues. Relancez l'analyse.`);
        }
      }

      progress.value = { done: 0, total: 1, step: 'synthese' };
      await $fetch(`${config.public.apiBase}/project/${props.projectId}/analyse/structure`, { method: 'POST', headers: headers() });
    });

    await loadState();
    toast.success('Analyse de structure enregistrée.');
  } catch (err: any) {
    toast.error(err?.data?.message || err?.message || 'L\'analyse de structure n\'a pas pu aboutir.');
    await loadState();
  } finally {
    running.value = false;
    progress.value = { done: 0, total: 0, step: '' };
  }
};

const BEAT_STATUS: Record<string, { label: string; classes: string }> = {
  joue: { label: 'Joué', classes: 'bg-green-100 text-green-800' },
  esquisse: { label: 'Esquissé', classes: 'bg-amber-100 text-amber-800' },
  absent: { label: 'Absent', classes: 'bg-red-100 text-red-700' }
};

const SECTION_STATUS: Record<string, { label: string; classes: string }> = {
  couverte: { label: 'Couverte', classes: 'bg-green-100 text-green-800' },
  partielle: { label: 'Partielle', classes: 'bg-amber-100 text-amber-800' },
  absente: { label: 'Absente', classes: 'bg-red-100 text-red-700' }
};

// Les beats manquants d'abord : c'est ce que l'auteur vient chercher
const STATUS_ORDER: Record<string, number> = { absent: 0, esquisse: 1, joue: 2 };
const sortedBeats = computed(() =>
  [...(verification.value?.beats ?? [])].sort((a: any, b: any) =>
    (STATUS_ORDER[a.status] - STATUS_ORDER[b.status]) || (Number(b.mandatory) - Number(a.mandatory))
  )
);

const counts = computed(() => {
  const beats = verification.value?.beats ?? [];
  return {
    joue: beats.filter((b: any) => b.status === 'joue').length,
    esquisse: beats.filter((b: any) => b.status === 'esquisse').length,
    absent: beats.filter((b: any) => b.status === 'absent').length,
    mandatoryMissing: beats.filter((b: any) => b.mandatory && b.status !== 'joue').length
  };
});

const showWarnings = ref(false);
</script>

<template>
  <div class="rounded-lg border border-gray-200 bg-white p-5 sm:p-6">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h2 class="text-lg font-semibold text-gray-900">🤖 Le texte suit-il la structure ?</h2>
        <p class="text-sm text-gray-500">
          Chaque séquence est lue en entier, puis confrontée à la structure et aux beats du sous-genre.
          Les séquences inchangées ne sont pas relues.
        </p>
      </div>
      <button
        type="button"
        @click="run"
        :disabled="running || loading || !state?.frame || !hasBeats"
        class="shrink-0 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-wait disabled:opacity-60"
      >
        <template v-if="running && progress.step === 'lecture'">Lecture {{ progress.done }}/{{ progress.total }}…</template>
        <template v-else-if="running">Synthèse…</template>
        <template v-else>{{ verification ? 'Relancer l\'analyse' : 'Lancer l\'analyse' }}</template>
      </button>
    </div>

    <!-- Progression : la lecture d'un roman prend une à deux minutes -->
    <div v-if="running" class="mt-4">
      <div class="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
        <div
          class="h-1.5 rounded-full bg-indigo-500 transition-all"
          :style="{ width: progress.step === 'synthese' ? '100%' : `${progress.total ? (progress.done / progress.total) * 90 : 0}%` }"
        ></div>
      </div>
      <p class="mt-1 text-xs text-gray-500">
        {{ progress.step === 'synthese'
          ? 'Synthèse de toutes les lectures (environ une minute)…'
          : `Lecture des séquences : ${progress.done} sur ${progress.total}` }}
      </p>
    </div>

    <p v-if="loading" class="mt-4 text-sm text-gray-400">Chargement…</p>

    <template v-else-if="state?.frame">
      <!-- Le référentiel comporte des incohérences : on les montre, sans bloquer -->
      <div v-if="state.frame.warnings?.length" class="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs text-gray-600">
        <button type="button" @click="showWarnings = !showWarnings" class="font-medium text-gray-700 hover:underline">
          ⚠ {{ state.frame.warnings.length }} incohérence{{ state.frame.warnings.length > 1 ? 's' : '' }} dans le référentiel de la structure
          {{ showWarnings ? '▲' : '▼' }}
        </button>
        <ul v-if="showWarnings" class="mt-2 list-disc space-y-0.5 pl-5">
          <li v-for="(warning, i) in state.frame.warnings" :key="i">{{ warning }}</li>
        </ul>
      </div>

      <div v-if="!hasBeats" class="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
        Le sous-genre « {{ state.frame.subgenre.name }} » n'a aucun beat défini : il n'y a rien à vérifier.
        Ajoutez-lui des types de beats dans l'admin (Genres &amp; Sous-genres), ou choisissez un autre sous-genre avec « Modifier ».
      </div>

      <p v-else-if="!verification && !running" class="mt-4 text-sm italic text-gray-500">
        Aucune analyse pour l'instant.
        {{ staleCount ? `${staleCount} séquence${staleCount > 1 ? 's' : ''} à lire.` : '' }}
      </p>

      <template v-if="verification">
        <p class="mt-4 text-xs text-gray-400">
          Analyse du {{ new Date(verification.analyzedAt).toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' }) }}
          — {{ verification.structure?.name }}, {{ verification.subgenre?.name }}
        </p>

        <div
          v-if="state.frameChanged || state.changedSinceSynthesis?.length"
          class="mt-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"
        >
          <template v-if="state.frameChanged">Le cadre narratif a changé depuis cette analyse : relancez-la.</template>
          <template v-else>
            {{ state.changedSinceSynthesis.length }} séquence{{ state.changedSinceSynthesis.length > 1 ? 's ont' : ' a' }}
            changé depuis cette analyse (<SequenceRefText :ids="state.changedSinceSynthesis" />) : relancez-la pour en tenir compte.
          </template>
        </div>

        <!-- Bilan -->
        <div class="mt-4 grid grid-cols-3 gap-2 text-center sm:max-w-md">
          <div class="rounded-lg bg-green-50 p-2"><p class="text-xl font-bold text-green-700">{{ counts.joue }}</p><p class="text-xs text-green-800">beats joués</p></div>
          <div class="rounded-lg bg-amber-50 p-2"><p class="text-xl font-bold text-amber-700">{{ counts.esquisse }}</p><p class="text-xs text-amber-800">esquissés</p></div>
          <div class="rounded-lg bg-red-50 p-2"><p class="text-xl font-bold text-red-700">{{ counts.absent }}</p><p class="text-xs text-red-800">absents</p></div>
        </div>
        <p v-if="counts.mandatoryMissing" class="mt-2 text-sm font-medium text-red-700">
          ★ {{ counts.mandatoryMissing }} beat{{ counts.mandatoryMissing > 1 ? 's' : '' }} obligatoire{{ counts.mandatoryMissing > 1 ? 's' : '' }} pas encore joué{{ counts.mandatoryMissing > 1 ? 's' : '' }}.
        </p>

        <p v-if="verification.comment" class="mt-4 text-sm leading-relaxed text-gray-800">
          <SequenceRefText :text="verification.comment" />
        </p>

        <MissingList title="Pour tenir la structure" :items="verification.missing ?? []" />

        <div v-if="verification.orderIssues?.length" class="mt-3 rounded-lg border border-dashed border-orange-300 bg-orange-50/60 p-3">
          <p class="mb-1.5 text-xs font-semibold text-orange-800">🤖 Ordre du récit</p>
          <ul class="list-disc space-y-1 pl-5 text-sm text-gray-800">
            <li v-for="(issue, i) in verification.orderIssues" :key="i"><SequenceRefText :text="issue" /></li>
          </ul>
        </div>

        <!-- Sections de la structure -->
        <h3 class="mb-2 mt-6 text-sm font-semibold uppercase tracking-wide text-gray-500">Sections</h3>
        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div v-for="section in verification.sections" :key="section.name" class="rounded-lg border border-gray-200 p-3">
            <div class="flex items-baseline justify-between gap-2">
              <p class="font-semibold text-gray-900">{{ section.name }}</p>
              <span class="rounded-full px-2 py-0.5 text-xs font-medium" :class="SECTION_STATUS[section.status]?.classes">
                {{ SECTION_STATUS[section.status]?.label }}
              </span>
            </div>
            <p class="text-xs text-gray-500">{{ section.segments.map((s: any) => s.name ?? s.code).join(', ') }}</p>
            <p v-if="section.sequenceIds?.length" class="mt-1 text-xs"><SequenceRefText :ids="section.sequenceIds" /></p>
            <p v-if="section.comment" class="mt-1 text-sm text-gray-700"><SequenceRefText :text="section.comment" /></p>
          </div>
        </div>

        <!-- Beats du sous-genre -->
        <h3 class="mb-2 mt-6 text-sm font-semibold uppercase tracking-wide text-gray-500">Beats du sous-genre</h3>
        <ol class="space-y-2">
          <li v-for="beat in sortedBeats" :key="beat.eventTypeId" class="rounded-lg border border-gray-200 p-3">
            <div class="flex flex-wrap items-baseline gap-2">
              <span class="rounded-full px-2 py-0.5 text-xs font-medium" :class="BEAT_STATUS[beat.status]?.classes">
                {{ BEAT_STATUS[beat.status]?.label }}
              </span>
              <span class="font-medium text-gray-900">{{ beat.name }}</span>
              <span v-if="beat.mandatory" class="text-xs font-semibold text-red-700" data-controller="tooltip" title="Beat obligatoire pour ce sous-genre">★ obligatoire</span>
              <span class="text-xs text-gray-500">
                {{ beat.segmentName }}{{ beat.sections?.length ? ` · ${beat.sections.join(', ')}` : ' · hors structure' }}
              </span>
              <span v-if="beat.sequenceIds?.length" class="text-xs">— <SequenceRefText :ids="beat.sequenceIds" /></span>
            </div>
            <p v-if="beat.comment" class="mt-1 text-sm text-gray-700"><SequenceRefText :text="beat.comment" /></p>
            <p v-if="beat.suggestion" class="mt-1.5 rounded border border-dashed border-amber-300 bg-amber-50/60 px-3 py-1.5 text-xs text-amber-900">
              <span class="font-semibold text-amber-700">Piste<template v-if="beat.suggestion.sequenceId"> (<SequenceRefText :ids="[beat.suggestion.sequenceId]" />)</template> :</span>
              <SequenceRefText :text="beat.suggestion.text" />
            </p>
          </li>
        </ol>
      </template>
    </template>
  </div>
</template>
