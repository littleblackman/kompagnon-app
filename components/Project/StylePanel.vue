<script setup lang="ts">
import { computed, ref } from 'vue';
import { useProjectStore } from '~/store/project';
import { toRoman } from '~/utils/roman';
import {
  analyseStyle, htmlToText, per1000, everyNWords,
  THRESHOLDS, LONG_SENTENCE, REPETITION_WINDOW, type StyleReport
} from '~/utils/styleAnalysis';
import { ChevronDownIcon } from '@heroicons/vue/24/outline';

/**
 * Relevé stylistique du roman (voir utils/styleAnalysis) : d'abord le livre
 * entier, puis les séquences qui s'en écartent. Des chiffres et des mots
 * repérés, jamais de texte proposé à la place.
 */
const props = defineProps({
  projectSlug: { type: String, required: true }
});

const projectStore = useProjectStore();

/** Une page de roman, à peu près */
const WORDS_PER_PAGE = 250;
/** Une séquence « s'écarte » quand elle dépasse le livre de 30 % */
const DEVIATION = 1.3;

// Les noms des personnages reviennent forcément : ce ne sont pas des répétitions
const names = computed(() => {
  const set = new Set<string>();
  (projectStore.personnages ?? []).forEach((p: any) => {
    `${p.firstName ?? ''} ${p.lastName ?? ''}`
      .toLowerCase()
      .split(/[\s'’-]+/)
      .filter(Boolean)
      .forEach(word => set.add(word));
  });
  return set;
});

/** Texte de chaque séquence, extrait une seule fois pour les deux échelles */
const sequenceTexts = computed(() => {
  const list: Array<{ id: number; label: string; name: string; text: string }> = [];

  projectStore.parts.forEach((part, partIndex) => {
    (part.sequences ?? []).forEach((sequence: any, index: number) => {
      const text = (sequence.scenes ?? []).map((scene: any) => htmlToText(scene.content)).join('\n');
      list.push({ id: sequence.id, label: `${toRoman(partIndex + 1)}.${index + 1}`, name: sequence.name, text });
    });
  });

  return list;
});

// ── Le roman entier ───────────────────────────────────────────────────

const book = computed(() =>
  analyseStyle(sequenceTexts.value.map(s => s.text).join('\n'), names.value, 15)
);

const pages = computed(() => Math.max(1, Math.round(book.value.words / WORDS_PER_PAGE)));

/** « 1 tous les 90 mots », ou « aucun » */
const frequency = (count: number, words: number, noun: string) =>
  count ? `1 ${noun} tous les ${everyNWords(count, words).toLocaleString()} mots` : `aucun ${noun}`;

const indicators = computed(() => {
  const r = book.value;
  const adverbRate = per1000(r.adverbCount, r.words);
  const repetitionRate = per1000(r.repetitionCount, r.words);

  return [
    {
      key: 'sentence',
      label: 'Longueur des phrases',
      value: `${r.avgSentence} mots`,
      detail: `en moyenne · ${r.longSentenceCount.toLocaleString()} phrase${r.longSentenceCount > 1 ? 's' : ''} de plus de ${LONG_SENTENCE} mots`,
      high: r.avgSentence > THRESHOLDS.avgSentence,
      hint: `Au-delà de ${THRESHOLDS.avgSentence} mots en moyenne, la lecture ralentit.`
    },
    {
      key: 'adverbs',
      label: 'Adverbes en -ment',
      value: frequency(r.adverbCount, r.words, 'adverbe'),
      detail: `${r.adverbCount.toLocaleString()} au total`,
      high: adverbRate > THRESHOLDS.adverbsPer1000,
      hint: `L'usage courant reste sous 1 tous les ${Math.round(1000 / THRESHOLDS.adverbsPer1000)} mots.`
    },
    {
      key: 'repetitions',
      label: 'Mots repris de près',
      value: frequency(r.repetitionCount, r.words, 'reprise'),
      detail: `même mot à moins de ${REPETITION_WINDOW} mots d'écart`,
      high: repetitionRate > THRESHOLDS.repetitionsPer1000,
      hint: `L'usage courant reste sous 1 tous les ${Math.round(1000 / THRESHOLDS.repetitionsPer1000)} mots.`
    },
    {
      key: 'dialogue',
      label: 'Dialogue',
      value: `${Math.round(r.dialogueShare * 100)} %`,
      detail: 'des mots, dans les répliques',
      high: false,
      hint: 'Paragraphes ouverts par un tiret ou un guillemet. Aucun seuil : cela dépend du livre.'
    }
  ];
});

// ── Où ça se concentre ────────────────────────────────────────────────

const showSequences = ref(false);
const expanded = ref<number | null>(null);

const rows = computed(() =>
  sequenceTexts.value
    .map(sequence => ({ ...sequence, report: analyseStyle(sequence.text, names.value) }))
    .filter(row => row.report.words)
);

/** Plus haut que le livre lui-même : c'est là qu'il faut regarder */
const above = (value: number, reference: number) => reference > 0 && value > reference * DEVIATION;

const flags = (r: StyleReport) => ({
  sentence: above(r.avgSentence, book.value.avgSentence),
  adverbs: above(per1000(r.adverbCount, r.words), per1000(book.value.adverbCount, book.value.words)),
  repetitions: above(per1000(r.repetitionCount, r.words), per1000(book.value.repetitionCount, book.value.words))
});

const flaggedCount = computed(() =>
  rows.value.filter(row => Object.values(flags(row.report)).some(Boolean)).length
);

const cell = (flag: boolean) => (flag ? 'font-semibold text-amber-700' : 'text-gray-800');

const goToSequence = (sequenceId: number) =>
  navigateTo(`/projets/projet-${props.projectSlug}#sequence-${sequenceId}`);
</script>

<template>
  <section class="space-y-8">
    <div>
      <h2 class="text-lg font-semibold text-gray-900">Relevé stylistique</h2>
      <p class="text-sm text-gray-500">
        Des repères sur votre écriture, pas des fautes : un adverbe ou une reprise peuvent être voulus.
        Rien n'est réécrit, c'est à vous de trancher.
      </p>
    </div>

    <p v-if="!book.words" class="rounded-lg bg-gray-50 p-6 text-center text-sm text-gray-500">
      Aucune scène n'est encore écrite.
    </p>

    <template v-else>
      <!-- ── 1. Le roman entier ── -->
      <div>
        <h3 class="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">Le roman entier</h3>

        <p class="mb-4 text-gray-800">
          <strong class="text-2xl font-bold tabular-nums text-gray-900">{{ book.words.toLocaleString() }}</strong> mots,
          soit environ <strong class="tabular-nums">{{ pages.toLocaleString() }}</strong> pages
          et <strong class="tabular-nums">{{ book.sentences.toLocaleString() }}</strong> phrases.
        </p>

        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div
            v-for="item in indicators"
            :key="item.key"
            class="rounded-lg border p-4"
            :class="item.high ? 'border-amber-300 bg-amber-50' : 'border-gray-200 bg-white'"
          >
            <p class="text-xs font-semibold uppercase tracking-wide text-gray-500">{{ item.label }}</p>
            <p class="mt-1 text-lg font-bold" :class="item.high ? 'text-amber-700' : 'text-gray-900'">{{ item.value }}</p>
            <p class="text-xs text-gray-500">{{ item.detail }}</p>
            <p class="mt-2 text-xs" :class="item.high ? 'font-medium text-amber-800' : 'text-gray-400'">
              {{ item.high ? 'Au-dessus de l\'usage courant. ' : '' }}{{ item.hint }}
            </p>
          </div>
        </div>
      </div>

      <!-- ── 2. Les tics du livre ── -->
      <div>
        <h3 class="mb-1 text-sm font-semibold uppercase tracking-wide text-gray-500">Les habitudes du livre</h3>
        <p class="mb-3 text-sm text-gray-500">Ce qui revient le plus, sur tout le texte. Les noms des personnages sont exclus.</p>

        <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div class="rounded-lg border border-gray-200 bg-white p-4">
            <h4 class="mb-2 text-sm font-semibold text-gray-900">Adverbes favoris</h4>
            <p v-if="!book.adverbs.length" class="text-xs italic text-gray-400">Aucun</p>
            <ul v-else class="flex flex-wrap gap-1.5">
              <li v-for="item in book.adverbs" :key="item.word" class="rounded-full bg-gray-100 px-2.5 py-1 text-sm text-gray-700">
                {{ item.word }} <span class="text-xs tabular-nums text-gray-400">×{{ item.count }}</span>
              </li>
            </ul>
          </div>

          <div class="rounded-lg border border-gray-200 bg-white p-4">
            <h4 class="mb-0.5 text-sm font-semibold text-gray-900">Mots repris de près</h4>
            <p class="mb-2 text-xs text-gray-400">Nombre de fois où le mot revient à moins de {{ REPETITION_WINDOW }} mots.</p>
            <p v-if="!book.repetitions.length" class="text-xs italic text-gray-400">Aucun</p>
            <ul v-else class="flex flex-wrap gap-1.5">
              <li v-for="item in book.repetitions" :key="item.word" class="rounded-full bg-gray-100 px-2.5 py-1 text-sm text-gray-700">
                {{ item.word }} <span class="text-xs tabular-nums text-gray-400">×{{ item.count }}</span>
              </li>
            </ul>
          </div>

          <div class="rounded-lg border border-gray-200 bg-white p-4">
            <h4 class="mb-0.5 text-sm font-semibold text-gray-900">Formules à surveiller</h4>
            <p class="mb-2 text-xs text-gray-400">Souvent signalées en atelier : elles disent au lieu de montrer.</p>
            <p v-if="!book.watch.length" class="text-xs italic text-gray-400">Aucune</p>
            <ul v-else class="space-y-1 text-sm text-gray-700">
              <li v-for="item in book.watch" :key="item.word" class="flex justify-between gap-3">
                <span>{{ item.word }}</span>
                <span class="text-xs tabular-nums text-gray-400">×{{ item.count }}</span>
              </li>
            </ul>
          </div>
        </div>

        <div v-if="book.longSentences.length" class="mt-4 rounded-lg border border-gray-200 bg-white p-4">
          <h4 class="mb-2 text-sm font-semibold text-gray-900">
            Phrases de plus de {{ LONG_SENTENCE }} mots
            <span class="font-normal text-gray-400">· {{ book.longSentenceCount }} en tout, les premières :</span>
          </h4>
          <ul class="space-y-1.5 text-sm text-gray-600">
            <li v-for="(sentence, index) in book.longSentences" :key="index" class="italic">« {{ sentence }} »</li>
          </ul>
        </div>
      </div>

      <!-- ── 3. Où ça se concentre ── -->
      <div>
        <button
          type="button"
          class="flex w-full items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 text-left transition-colors hover:bg-gray-50"
          :aria-expanded="showSequences"
          @click="showSequences = !showSequences"
        >
          <span>
            <span class="block text-sm font-semibold text-gray-900">Séquence par séquence</span>
            <span class="block text-xs text-gray-500">
              {{ flaggedCount ? `${flaggedCount} séquence${flaggedCount > 1 ? 's' : ''} au-dessus de la moyenne du livre` : 'Aucune séquence ne s\'écarte nettement du livre' }}
            </span>
          </span>
          <ChevronDownIcon class="h-5 w-5 shrink-0 text-gray-400 transition-transform" :class="showSequences && 'rotate-180'" />
        </button>

        <div v-if="showSequences" class="mt-2">
          <p class="mb-2 text-xs text-gray-500">
            En orange : plus de 30 % au-dessus de la moyenne du livre. Cliquez une ligne pour voir ses mots.
          </p>

          <div class="overflow-x-auto rounded-lg border border-gray-200">
            <table class="w-full border-collapse text-sm">
              <thead class="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                <tr>
                  <th class="px-3 py-2">Séquence</th>
                  <th class="px-3 py-2 text-right">Mots</th>
                  <th class="px-3 py-2 text-right">Mots / phrase</th>
                  <th class="px-3 py-2 text-right">Adverbes</th>
                  <th class="px-3 py-2 text-right">Reprises</th>
                  <th class="px-3 py-2 text-right">Dialogue</th>
                  <th class="w-8 px-3 py-2"></th>
                </tr>
                <!-- La référence, pour lire chaque ligne contre le livre -->
                <tr class="border-t border-gray-200 bg-gray-100/70 normal-case tracking-normal text-gray-600">
                  <td class="px-3 py-1.5 text-xs font-medium">Moyenne du livre</td>
                  <td class="px-3 py-1.5 text-right text-xs tabular-nums">{{ Math.round(book.words / rows.length).toLocaleString() }}</td>
                  <td class="px-3 py-1.5 text-right text-xs tabular-nums">{{ book.avgSentence }}</td>
                  <td class="px-3 py-1.5 text-right text-xs tabular-nums">1 / {{ everyNWords(book.adverbCount, book.words) || '–' }}</td>
                  <td class="px-3 py-1.5 text-right text-xs tabular-nums">1 / {{ everyNWords(book.repetitionCount, book.words) || '–' }}</td>
                  <td class="px-3 py-1.5 text-right text-xs tabular-nums">{{ Math.round(book.dialogueShare * 100) }} %</td>
                  <td></td>
                </tr>
              </thead>
              <tbody>
                <template v-for="row in rows" :key="row.id">
                  <tr
                    class="cursor-pointer border-t border-gray-100 hover:bg-amber-50/40"
                    :class="expanded === row.id && 'bg-amber-50/60'"
                    @click="expanded = expanded === row.id ? null : row.id"
                  >
                    <td class="px-3 py-2">
                      <span class="mr-1.5 text-xs tabular-nums text-gray-400">{{ row.label }}</span>
                      <span class="font-medium text-gray-900">{{ row.name }}</span>
                    </td>
                    <td class="px-3 py-2 text-right tabular-nums text-gray-800">{{ row.report.words.toLocaleString() }}</td>
                    <td class="px-3 py-2 text-right tabular-nums" :class="cell(flags(row.report).sentence)">{{ row.report.avgSentence }}</td>
                    <td class="px-3 py-2 text-right tabular-nums" :class="cell(flags(row.report).adverbs)">
                      1 / {{ everyNWords(row.report.adverbCount, row.report.words) || '–' }}
                    </td>
                    <td class="px-3 py-2 text-right tabular-nums" :class="cell(flags(row.report).repetitions)">
                      1 / {{ everyNWords(row.report.repetitionCount, row.report.words) || '–' }}
                    </td>
                    <td class="px-3 py-2 text-right tabular-nums text-gray-800">{{ Math.round(row.report.dialogueShare * 100) }} %</td>
                    <td class="px-3 py-2 text-gray-400">
                      <ChevronDownIcon class="h-4 w-4 transition-transform" :class="expanded === row.id && 'rotate-180'" />
                    </td>
                  </tr>

                  <tr v-if="expanded === row.id" class="border-t border-amber-100 bg-amber-50/30">
                    <td colspan="7" class="px-3 py-4">
                      <div class="grid gap-4 md:grid-cols-3">
                        <div>
                          <h4 class="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">Adverbes en -ment</h4>
                          <p v-if="!row.report.adverbs.length" class="text-xs italic text-gray-400">Aucun</p>
                          <p v-else class="text-sm text-gray-700">
                            <span v-for="(item, i) in row.report.adverbs" :key="item.word">{{ i ? ', ' : '' }}{{ item.word }} <span class="text-xs text-gray-400">×{{ item.count }}</span></span>
                          </p>
                        </div>
                        <div>
                          <h4 class="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">Mots repris de près</h4>
                          <p v-if="!row.report.repetitions.length" class="text-xs italic text-gray-400">Aucun</p>
                          <p v-else class="text-sm text-gray-700">
                            <span v-for="(item, i) in row.report.repetitions" :key="item.word">{{ i ? ', ' : '' }}{{ item.word }} <span class="text-xs text-gray-400">×{{ item.count }}</span></span>
                          </p>
                        </div>
                        <div>
                          <h4 class="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">Formules à surveiller</h4>
                          <p v-if="!row.report.watch.length" class="text-xs italic text-gray-400">Aucune</p>
                          <p v-else class="text-sm text-gray-700">
                            <span v-for="(item, i) in row.report.watch" :key="item.word">{{ i ? ', ' : '' }}{{ item.word }} <span class="text-xs text-gray-400">×{{ item.count }}</span></span>
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        class="mt-4 text-sm font-medium text-amber-700 hover:text-amber-800"
                        @click.stop="goToSequence(row.id)"
                      >
                        Ouvrir la séquence →
                      </button>
                    </td>
                  </tr>
                </template>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </template>
  </section>
</template>
