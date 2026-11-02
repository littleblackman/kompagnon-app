/**
 * Relevés stylistiques calculés sur le texte — aucun modèle, aucun appel
 * réseau. Ce sont des observations à vérifier, jamais des corrections :
 * un adverbe ou une répétition peut être voulu, seul l'auteur tranche.
 */

export interface WordCount {
  word: string;
  count: number;
}

export interface StyleReport {
  words: number;
  sentences: number;
  /** Mots par phrase, en moyenne */
  avgSentence: number;
  /** Début des phrases dépassant LONG_SENTENCE mots */
  longSentences: string[];
  longSentenceCount: number;
  adverbCount: number;
  adverbs: WordCount[];
  /** Reprises d'un mot à moins de REPETITION_WINDOW mots d'intervalle */
  repetitionCount: number;
  repetitions: WordCount[];
  /** Part des mots en dialogue, de 0 à 1 */
  dialogueShare: number;
  /** Formules souvent signalées en atelier d'écriture */
  watch: WordCount[];
}

export const LONG_SENTENCE = 40;
export const REPETITION_WINDOW = 40;
/** Seuils au-delà desquels une valeur est mise en évidence */
export const THRESHOLDS = {
  avgSentence: 25,
  adverbsPer1000: 10,
  repetitionsPer1000: 15
};

/** Forme -ment des adverbes ; filtrée ensuite des noms et verbes homographes */
const ADVERB = /^\p{L}{2,}(ement|amment|emment|iment|ument|ûment)$/u;

const NOT_ADVERBS = new Set([
  // noms
  'mouvement', 'vêtement', 'élément', 'événement', 'évènement', 'appartement',
  'gouvernement', 'jugement', 'logement', 'bâtiment', 'monument', 'instrument',
  'argument', 'document', 'changement', 'commencement', 'comportement',
  'traitement', 'enterrement', 'parlement', 'département', 'établissement',
  'enseignement', 'développement', 'rassemblement', 'paiement', 'aliment',
  'ciment', 'régiment', 'compliment', 'supplément', 'sentiment', 'excrément',
  'détachement', 'déplacement', 'emplacement', 'remerciement', 'avertissement',
  'étonnement', 'isolement', 'mécontentement', 'consentement',
  'gémissement', 'frémissement', 'grincement', 'craquement', 'battement',
  'roulement', 'sifflement', 'tremblement', 'hurlement', 'ronflement',
  'agacement', 'acharnement', 'éloignement', 'rapprochement', 'aboutissement',
  'bouleversement', 'ressentiment', 'pressentiment', 'médicament', 'testament',
  'tempérament', 'firmament', 'filament', 'ornement', 'encadrement',
  'raisonnement', 'licenciement', 'équipement', 'armement', 'campement',
  'lotissement', 'investissement', 'divertissement', 'gisement',
  // adverbe, mais mot-outil : le compter noierait les autres
  'seulement',
  // verbes à la 3e personne du pluriel
  'aiment', 'animent', 'priment', 'expriment', 'impriment', 'suppriment',
  'riment', 'liment', 'fument', 'allument', 'consument', 'assument', 'résument',
  'dorment', 'ferment', 'affirment', 'confirment', 'arment', 'calment',
  'estiment', 'abîment', 'déciment', 'oppriment', 'répriment'
]);

/** Mots courants à ignorer dans les répétitions, en plus de ceux de moins de 5 lettres */
const STOPWORDS = new Set([
  'alors', 'avait', 'avais', 'avaient', 'avoir', 'était', 'étais', 'étaient',
  'cette', 'leurs', 'entre', 'après', 'avant', 'aussi', 'depuis', 'pendant',
  'quelque', 'quelques', 'autre', 'autres', 'notre', 'votre', 'elles', 'celle',
  'celui', 'celles', 'parce', 'toute', 'toutes', 'mêmes', 'moins', 'encore',
  'toujours', 'jamais', 'quand', 'comme', 'faire', 'chaque', 'plusieurs',
  'aucun', 'aucune', 'lequel', 'laquelle', 'lorsque', 'tandis', 'contre',
  'pourquoi', 'comment', 'puisque', 'ainsi', 'déjà', 'rien', 'personne',
  'serait', 'seront', 'avons', 'avez', 'ayant', 'étant', 'seulement',
  'dessus', 'dessous', 'devant', 'derrière', 'vraiment', 'peut-être',
  // « quelqu'un » se coupe à l'apostrophe
  'quelqu', 'aurait', 'auraient', 'seraient'
]);

const WATCH: Array<{ label: string; pattern: RegExp }> = [
  { label: 'soudain / soudainement', pattern: /(?<!\p{L})soudain(ement)?(?!\p{L})/giu },
  { label: 'tout à coup', pattern: /(?<!\p{L})tout (à|d['’]un) coup(?!\p{L})/giu },
  { label: 'il y a / il y avait', pattern: /(?<!\p{L})il y (a|avait|eut|aura)(?!\p{L})/giu },
  { label: 'commencer à / se mettre à', pattern: /(?<!\p{L})(commen[cç]\p{L}*|s(e |['’])(met|mit|mettait|mirent|mettent|mettaient)) à(?!\p{L})/giu },
  { label: 'sembler', pattern: /(?<!\p{L})sembl(e|es|ent|ait|aient|a|èrent|er)(?!\p{L})/giu },
  { label: 'se sentir / ressentir', pattern: /(?<!\p{L})(res)?sent(it|ait|aient|irent|ir|i|ie)(?!\p{L})/giu }
];

/** Mots et noms, apostrophes et traits d'union compris (« l'homme » → l, homme) */
const TOKEN = /\p{L}+(?:-\p{L}+)*/gu;

/** HTML de TinyMCE vers texte brut, un paragraphe par ligne */
export const htmlToText = (html?: string | null): string => {
  if (!html) return '';
  const withBreaks = html.replace(/<\/(p|div|li|h[1-6]|blockquote)>|<br\s*\/?>/gi, '\n');
  const doc = new DOMParser().parseFromString(withBreaks, 'text/html');
  return (doc.body.textContent ?? '').replace(/ /g, ' ');
};

const top = (map: Map<string, number>, limit: number): WordCount[] =>
  [...map.entries()]
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count || a.word.localeCompare(b.word))
    .slice(0, limit);

/**
 * @param ignore mots à ne pas compter comme répétitions — les noms des
 *   personnages reviennent forcément.
 * @param limit longueur des listes de mots ; plus longue sur un roman entier
 */
export const analyseStyle = (text: string, ignore: Set<string> = new Set(), limit = 8): StyleReport => {
  const tokens = text.match(TOKEN) ?? [];
  const words = tokens.length;

  // Phrases : ponctuation finale ou retour à la ligne
  const sentenceList = text
    .split(/(?<=[.!?…])\s+|\n+/)
    .map(s => s.trim())
    .filter(s => /\p{L}/u.test(s));
  const lengths = sentenceList.map(s => (s.match(TOKEN) ?? []).length);
  const allLong = sentenceList.filter((_, i) => lengths[i] > LONG_SENTENCE);
  const longSentences = allLong
    .slice(0, Math.max(3, Math.round(limit / 2)))
    .map(s => (s.length > 90 ? `${s.slice(0, 90)}…` : s));

  const adverbs = new Map<string, number>();
  const repetitions = new Map<string, number>();
  const lastSeen = new Map<string, number>();

  tokens.forEach((token, index) => {
    const word = token.toLowerCase();

    if (ADVERB.test(word) && !NOT_ADVERBS.has(word)) {
      adverbs.set(word, (adverbs.get(word) ?? 0) + 1);
    }

    if (word.length < 5 || STOPWORDS.has(word) || ignore.has(word)) return;
    const previous = lastSeen.get(word);
    if (previous !== undefined && index - previous <= REPETITION_WINDOW) {
      repetitions.set(word, (repetitions.get(word) ?? 0) + 1);
    }
    lastSeen.set(word, index);
  });

  // Dialogue : paragraphes ouverts par un tiret ou un guillemet
  let dialogueWords = 0;
  text.split('\n').forEach((line) => {
    if (/^\s*[—–«"“-]/.test(line)) dialogueWords += (line.match(TOKEN) ?? []).length;
  });

  const watch = WATCH
    .map(({ label, pattern }) => ({ word: label, count: (text.match(pattern) ?? []).length }))
    .filter(entry => entry.count);

  return {
    words,
    sentences: sentenceList.length,
    avgSentence: sentenceList.length ? Math.round(words / sentenceList.length) : 0,
    longSentences,
    longSentenceCount: allLong.length,
    adverbCount: [...adverbs.values()].reduce((sum, n) => sum + n, 0),
    adverbs: top(adverbs, limit),
    repetitionCount: [...repetitions.values()].reduce((sum, n) => sum + n, 0),
    repetitions: top(repetitions, limit),
    dialogueShare: words ? dialogueWords / words : 0,
    watch
  };
};

/** « 1 tous les N mots » : plus parlant qu'un taux pour mille */
export const everyNWords = (count: number, words: number) =>
  count ? Math.round(words / count) : 0;

/** Ramené à 1 000 mots : seule mesure comparable d'une séquence à l'autre */
export const per1000 = (count: number, words: number) =>
  words ? Math.round((count / words) * 1000) : 0;
