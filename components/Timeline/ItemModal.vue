<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import type { Timeline, TimelineFactRow, TimelineSequenceRow } from '~/types';
import { PRECISION_OPTIONS, WEEKDAYS, LAYER_LABELS, NATURE_SHORT } from '~/utils/timeline';

/**
 * Correction d'une date de séquence, ou saisie / correction d'un fait.
 * Enregistrer, c'est valider : la correction de l'auteur fait foi.
 */
const props = defineProps<{
  timeline: Timeline;
  fact?: TimelineFactRow | null;
  sequence?: TimelineSequenceRow | null;
}>();

const emit = defineEmits<{
  close: [];
  save: [kind: 'fact' | 'sequence', data: Record<string, any>];
}>();

const isSequence = computed(() => !!props.sequence);
const source = props.sequence ?? props.fact ?? null;

const form = reactive({
  label: props.fact?.label ?? '',
  who: (source?.who ?? []).join(', '),
  layer: props.fact?.layer ?? 'passe',
  nature: props.fact?.nature ?? 'evoque',
  sequenceId: props.fact?.sequenceId ?? null as number | null,
  quote: props.fact?.quote ?? '',
  place: props.sequence?.place ?? '',
  summary: props.sequence?.summary ?? '',
  year: source?.date?.year ?? null as number | null,
  month: source?.date?.month ?? null as number | null,
  day: source?.date?.day ?? null as number | null,
  approximate: source?.date?.approximate ?? false,
  precision: source?.date?.precision ?? 'annee',
  time: source?.date?.time ?? '',
  weekday: source?.date?.weekday ?? '',
  anchor: source?.date?.anchor ?? '',
});

const error = ref('');

const submit = () => {
  if (!isSequence.value && !form.label.trim()) {
    error.value = 'Décrivez le fait.';
    return;
  }

  const date = {
    year: form.year || null,
    month: form.month || null,
    day: form.day || null,
    approximate: form.approximate,
    precision: form.precision,
    time: form.time || null,
    weekday: form.weekday || null,
    anchor: form.anchor || null,
    who: form.who,
    status: 'validated',
  };

  if (isSequence.value) {
    emit('save', 'sequence', { id: props.sequence!.id, ...date, place: form.place || null, summary: form.summary || null });
  } else {
    emit('save', 'fact', {
      id: props.fact?.id,
      ...date,
      label: form.label,
      layer: form.layer,
      nature: form.nature,
      quote: form.quote || null,
      sequenceId: form.sequenceId,
    });
  }
};

const input = 'w-full rounded border border-gray-300 p-2 text-sm';
const label = 'mb-1 block text-sm font-semibold';
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/30" @click.self="emit('close')">
    <div class="mx-4 max-h-[90vh] w-full max-w-[720px] overflow-y-auto rounded border-2 border-amber-950 bg-white p-6 shadow-xl">
      <h3 class="mb-4 text-xl font-bold">
        {{ isSequence ? `Dater ${sequence!.label} · ${sequence!.name}` : fact ? 'Corriger le fait' : 'Ajouter un fait' }}
      </h3>

      <template v-if="!isSequence">
        <label :class="label">Fait</label>
        <textarea v-model="form.label" rows="2" :class="input" class="mb-3"></textarea>

        <div class="mb-3 grid gap-3 sm:grid-cols-3">
          <div>
            <label :class="label">Couche</label>
            <select v-model="form.layer" :class="input">
              <option v-for="(text, key) in LAYER_LABELS" :key="key" :value="key">{{ text }}</option>
            </select>
          </div>
          <div>
            <label :class="label">Nature</label>
            <select v-model="form.nature" :class="input">
              <option v-for="(text, key) in NATURE_SHORT" :key="key" :value="key">{{ text }}</option>
            </select>
          </div>
          <div>
            <label :class="label">Lu dans</label>
            <select v-model="form.sequenceId" :class="input">
              <option :value="null">—</option>
              <option v-for="row in timeline.sequences" :key="row.sequenceId" :value="row.sequenceId">
                {{ row.label }} · {{ row.name }}
              </option>
            </select>
          </div>
        </div>
      </template>

      <template v-else>
        <div class="mb-3 grid gap-3 sm:grid-cols-2">
          <div>
            <label :class="label">Lieu</label>
            <input v-model="form.place" :class="input" />
          </div>
          <div>
            <label :class="label">Personnages</label>
            <input v-model="form.who" :class="input" placeholder="Séparés par des virgules" />
          </div>
        </div>
        <label :class="label">Ce qui se passe</label>
        <textarea v-model="form.summary" rows="2" :class="input" class="mb-3"></textarea>
      </template>

      <fieldset class="mb-3 rounded border border-gray-200 p-3">
        <legend class="px-1 text-sm font-semibold">Date</legend>
        <div class="grid grid-cols-3 gap-3 sm:grid-cols-6">
          <div class="col-span-1">
            <label class="mb-1 block text-xs text-gray-600">Jour</label>
            <input v-model.number="form.day" type="number" min="1" max="31" :class="input" />
          </div>
          <div class="col-span-1">
            <label class="mb-1 block text-xs text-gray-600">Mois</label>
            <input v-model.number="form.month" type="number" min="1" max="12" :class="input" />
          </div>
          <div class="col-span-1">
            <label class="mb-1 block text-xs text-gray-600">Année</label>
            <input v-model.number="form.year" type="number" :class="input" />
          </div>
          <div class="col-span-3 sm:col-span-1">
            <label class="mb-1 block text-xs text-gray-600">Heure</label>
            <input v-model="form.time" :class="input" placeholder="21:03" />
          </div>
          <div class="col-span-3 sm:col-span-2">
            <label class="mb-1 block text-xs text-gray-600">Précision</label>
            <select v-model="form.precision" :class="input">
              <option v-for="option in PRECISION_OPTIONS" :key="option.value" :value="option.value">{{ option.label }}</option>
            </select>
          </div>
        </div>
        <div class="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <label class="mb-1 block text-xs text-gray-600">Jour nommé dans le texte</label>
            <select v-model="form.weekday" :class="input">
              <option value="">—</option>
              <option v-for="day in WEEKDAYS" :key="day" :value="day">{{ day }}</option>
            </select>
          </div>
          <label class="flex items-center gap-2 self-end pb-2 text-sm">
            <input v-model="form.approximate" type="checkbox" class="h-4 w-4" />
            Date calée (~), pas donnée par le texte
          </label>
        </div>
        <label class="mb-1 mt-3 block text-xs text-gray-600">Ancrage : comment la date est établie</label>
        <input v-model="form.anchor" :class="input" placeholder="dit en déc. 2025, moins 50 ans" />
      </fieldset>

      <template v-if="!isSequence">
        <div class="mb-3">
          <label :class="label">Qui</label>
          <input v-model="form.who" :class="input" placeholder="Séparés par des virgules" />
        </div>
        <label :class="label">Citation</label>
        <textarea v-model="form.quote" rows="2" :class="input"></textarea>
      </template>

      <p v-if="error" class="mt-3 text-sm text-red-600">{{ error }}</p>

      <div class="mt-4 flex justify-end gap-2">
        <button type="button" class="rounded px-4 py-2 text-gray-600 hover:bg-gray-100" @click="emit('close')">Annuler</button>
        <button type="button" class="rounded bg-amber-600 px-4 py-2 font-semibold text-white hover:bg-amber-700" @click="submit">
          Enregistrer et valider
        </button>
      </div>
    </div>
  </div>
</template>
