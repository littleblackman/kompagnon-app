export interface Scene {
  /** Absent tant que la scène n'a pas été créée côté serveur */
  id?: number
  name: string
  description?: string
  content?: string
  /** Posée par le serveur : le front n'exprime que de l'ordre relatif */
  position?: number
  /**
   * Renvoyée par l'API via le getter virtuel getSequenceId().
   * À ne pas confondre avec sequence_id, attendu en écriture.
   */
  sequenceId?: number
  /** Clé attendue par l'API en écriture (POST /scene/update) */
  sequence_id?: number
  /** Insertion relative à la création */
  afterSceneId?: number
  status?: any
  status_id?: number
  /** Note de travail, affichée en marge et jamais exportée */
  notes?: string | null
}

export interface SequencePersonnage {
  id: number
  personnage: Personnage
}

export interface Sequence {
  id: number
  name: string
  description: string
  position: number
  part_id: number
  status_id?: number
  scenes?: Scene[]
  afterSequenceId?: number
  intention?: string
  aesthetic_idea?: string
  information?: string
  sequencePersonnages?: SequencePersonnage[]
}

export interface Part {
  id: number
  name: string
  description: string
  position: number
  project_id: number
  sequences?: Sequence[]
  status_id?: number
  afterPartId?: number
}

export interface Project {
  id: number
  name: string
  description: string
  slug?: string
  type?: {
    id: number
    name: string
  }
  parts: Part[]
  personnages?: Personnage[]
  referenceNarrativeComponents?: {
    genre_id?: number
    subgenre_id?: number
    narrative_structure_id?: number
  }
}

export interface PersonnageDramaticFunction {
  id: number
  dramaticFunction: DramaticFunction
  weight: number
  comment?: string
}

export interface LanguageLevel {
  id: number
  name: string
  description?: string
  markers: string[]
}

export interface PersonnageLanguageLevel {
  id: number
  languageLevel: LanguageLevel
  weight: number
  comment?: string | null
  quote?: string | null
}

export interface Personnage {
  id: number
  firstName: string
  lastName: string
  slug?: string
  background?: string
  age?: number
  avatar?: string
  images?: string[]
  level?: number
  analysis?: string
  strength?: string
  weakness?: string
  project_id: number
  personnageDramaticFunctions?: PersonnageDramaticFunction[]
  personnageLanguageLevels?: PersonnageLanguageLevel[]
  languageAnalysis?: string | null
}

export interface NarrativeArc {
  id: number
  name: string
  description?: string
  steps: string[]
  variants: string[]
  tendency: 'positive' | 'negative' | 'ambiguous'
}

export interface DramaticFunction {
  id: number
  name: string
  description?: string
  characteristics: string[]
  tendency: 'positive' | 'negative' | 'ambiguous'
}

export interface ActantialSchema {
  role: string
  description: string
  tendency: 'positive' | 'negative' | 'ambiguous'
  keywords: string[]
} 
// ── Chronologie ──────────────────────────────────────────────────────
// Tout est calculé par l'API (/project/{id}/timeline) : zones, J+n,
// jours de la semaine, retours en arrière, incohérences de calendrier.

export type TimelinePrecision = 'heure' | 'jour' | 'semaine' | 'mois' | 'saison' | 'annee' | 'decennie' | 'ordre' | 'aucune'
export type TimelineLayer = 'present' | 'passe' | 'histoire'
export type TimelineNature = 'scene' | 'evoque' | 'fiche'
export type TimelineStatus = 'proposed' | 'validated' | 'rejected'
export type TimelineSeverity = 'fort' | 'moyen' | 'faible' | 'verifier'

export interface TimelineDate {
  year: number | null
  month: number | null
  day: number | null
  approximate: boolean
  precision: TimelinePrecision
  time: string | null
  /** Jour que le texte affirme ; le jour réel est dans display.weekday */
  weekday: string | null
  anchor: string | null
}

export interface TimelineDisplay {
  absolute: string
  relative: string
  short: string
  precision: string
  weekday: string | null
}

export interface TimelineSequenceRow {
  id: number | null
  sequenceId: number
  number: number
  label: string
  part: string
  name: string
  analysed: boolean
  stale: boolean
  issues: string[]
  date?: TimelineDate
  display?: TimelineDisplay
  dayOffset?: number | null
  place?: string | null
  who?: string[]
  summary?: string | null
  quote?: string | null
  status?: 'proposed' | 'validated'
  extractedAt?: string | null
  flashback?: boolean
  key?: number | null
  zone?: string
}

export interface TimelineFactRow {
  id: number
  sequenceId: number | null
  sequenceLabel: string | null
  personnageId: number | null
  personnageName: string | null
  label: string
  who: string[]
  layer: TimelineLayer
  nature: TimelineNature
  quote: string | null
  status: TimelineStatus
  check: 'confirmed' | 'unverifiable' | 'contradicted' | null
  origin: 'ia' | 'manual'
  issues: string[]
  key: number | null
  zone: string
  date: TimelineDate
  display: TimelineDisplay
  dayOffset: number | null
}

export interface TimelineIssueRow {
  id: number | null
  code: string
  origin: 'calendar' | 'ia'
  severity: TimelineSeverity
  title: string
  description: string | null
  fix: string | null
  status: 'open' | 'resolved' | 'dismissed'
  facts: number[]
  sequences: number[]
}

export interface Timeline {
  settings: {
    yearZero: number | null
    dayZero: string | null
    dayZeroLabel: string | null
    effectiveYearZero: number | null
    effectiveDayZero: string | null
    dayZeroSource: 'manual' | 'auto' | null
  }
  zones: Array<{ key: string; title: string; range: string; count: number }>
  layers: Array<{ key: TimelineLayer; label: string }>
  sequences: TimelineSequenceRow[]
  facts: TimelineFactRow[]
  issues: TimelineIssueRow[]
  stats: {
    sequences: number
    analysed: number
    stale: number
    facts: number
    byNature: Record<TimelineNature, number>
    proposed: number
    openIssues: number
  }
}

// ── Todo de projet ──────────────────────────────────────────────────────

export type TodoCategory = 'personnage' | 'structure' | 'continuite' | 'style' | 'recherche' | 'autre'

export interface ProjectTodo {
  id: number
  label: string
  category: TodoCategory
  /** 'ia' : ajoutée par une analyse, dédoublonnée côté serveur */
  source: 'manual' | 'ia'
  origin: string | null
  done: boolean
  doneAt: string | null
  sequenceId: number | null
  sceneId: number | null
  personnage: { id: number; name: string } | null
  createdAt: string
}

/** Tâche proposée par une analyse : la clé empêche de la recréer à chaque relance */
export interface TodoDraft {
  label: string
  category: TodoCategory
  dedupeKey: string
  origin?: string
  sequenceId?: number | null
  sceneId?: number | null
  personnageId?: number | null
}
