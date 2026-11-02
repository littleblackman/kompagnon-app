import type { TimelineNature, TimelineSeverity, TimelineLayer, TimelinePrecision } from '~/types';

// Libellés et couleurs de la chronologie. Les calculs sont faits par l'API :
// ce fichier ne fait que nommer et colorer.

export const NATURE_LABELS: Record<TimelineNature, string> = {
  scene: 'Récit : montré en scène',
  evoque: 'Évoqué : cité dans le texte',
  fiche: 'Fiche : notes de l\'auteur',
};

export const NATURE_SHORT: Record<TimelineNature, string> = {
  scene: 'Récit',
  evoque: 'Évoqué',
  fiche: 'Fiche',
};

/** Pastille, puce de frise et liseré de ligne, par nature */
export const NATURE_CLASSES: Record<TimelineNature, { dot: string; chip: string; row: string }> = {
  scene: { dot: 'bg-sky-700', chip: 'bg-sky-50 border-sky-700 text-sky-950', row: 'shadow-[inset_4px_0_0_#0369a1]' },
  evoque: { dot: 'bg-gray-500', chip: 'bg-gray-100 border-gray-500 text-gray-900', row: 'shadow-[inset_4px_0_0_#6b7280]' },
  fiche: { dot: 'bg-amber-500', chip: 'bg-amber-50 border-amber-500 text-amber-950', row: 'shadow-[inset_4px_0_0_#f59e0b]' },
};

export const LAYER_LABELS: Record<TimelineLayer, string> = {
  present: 'Présent',
  passe: 'Passé',
  histoire: 'Histoire',
};

export const SEVERITY_LABELS: Record<TimelineSeverity, string> = {
  fort: 'fort',
  moyen: 'moyen',
  faible: 'faible',
  verifier: 'à vérifier',
};

export const SEVERITY_CLASSES: Record<TimelineSeverity, string> = {
  fort: 'bg-red-600 text-white border-red-600',
  moyen: 'border-red-600 text-red-700',
  faible: 'border-gray-400 text-gray-600',
  verifier: 'border-amber-500 text-amber-800 bg-amber-50',
};

export const CHECK_LABELS = {
  confirmed: { label: '✓ confirmé', classes: 'border-green-700 text-green-700' },
  unverifiable: { label: '? non vérifiable', classes: 'border-gray-400 text-gray-500' },
  contradicted: { label: '✗ contredit', classes: 'border-red-600 text-red-700' },
} as const;

export const PRECISION_OPTIONS: Array<{ value: TimelinePrecision; label: string }> = [
  { value: 'heure', label: 'jour + heure' },
  { value: 'jour', label: 'jour' },
  { value: 'semaine', label: 'semaine' },
  { value: 'mois', label: 'mois' },
  { value: 'saison', label: 'saison' },
  { value: 'annee', label: 'année' },
  { value: 'decennie', label: 'décennie' },
  { value: 'ordre', label: 'ordre seulement' },
  { value: 'aucune', label: 'sans date' },
];

export const WEEKDAYS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];

/** « J+12 », « J−3 » */
export const dayLabel = (offset: number | null | undefined) =>
  offset === null || offset === undefined ? '' : offset >= 0 ? `J+${offset}` : `J−${-offset}`;

export const shorten = (text: string, max = 90) => (text.length > max ? `${text.slice(0, max - 2)}…` : text);
