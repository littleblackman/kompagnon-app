<script setup lang="ts">
import { computed } from 'vue';
import { useSequenceRefs, SEQUENCE_REF_PATTERN } from '~/composables/useSequenceRefs';

/**
 * Texte d'analyse dont les renvois « [57] » deviennent des pastilles « II.3 »
 * cliquables. Avec `ids`, affiche seulement la liste des renvois.
 * Avec `html`, le texte est du HTML déjà nettoyé côté API (balises de mise
 * en forme sans attribut) : les renvois y sont insérés comme liens.
 */
const props = defineProps({
  text: { type: String, default: '' },
  ids: { type: Array as () => number[], default: null },
  html: { type: Boolean, default: false }
});

const { refFor, linkFor } = useSequenceRefs();

const CHIP = 'inline-flex items-baseline rounded bg-gray-100 px-1 text-[0.85em] font-medium text-indigo-700 no-underline hover:bg-indigo-100';

type Part = { kind: 'text'; value: string } | { kind: 'ref'; id: number };

const parts = computed<Part[]>(() => {
  if (props.ids) return props.ids.map(id => ({ kind: 'ref', id }));

  const out: Part[] = [];
  let last = 0;
  for (const match of props.text.matchAll(SEQUENCE_REF_PATTERN)) {
    if (match.index! > last) out.push({ kind: 'text', value: props.text.slice(last, match.index) });
    match[1].split(',').forEach(id => out.push({ kind: 'ref', id: Number(id.trim()) }));
    last = match.index! + match[0].length;
  }
  if (last < props.text.length) out.push({ kind: 'text', value: props.text.slice(last) });
  return out;
});

const escape = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const htmlWithRefs = computed(() =>
  props.text.replace(SEQUENCE_REF_PATTERN, (_, list: string) =>
    list.split(',').map((raw) => {
      const id = Number(raw.trim());
      const ref = refFor(id);
      const href = linkFor(id);
      if (!ref || !href) return `<span class="${CHIP}">#${id}</span>`;
      return `<a href="${href}" class="${CHIP}" title="${escape(`${ref.part} · ${ref.name}`)}">${ref.label}</a>`;
    }).join(' ')
  )
);
</script>

<template>
  <div v-if="html" v-html="htmlWithRefs" />
  <span v-else>
    <template v-for="(part, i) in parts" :key="i">
      <template v-if="part.kind === 'text'">{{ part.value }}</template>
      <NuxtLink
        v-else-if="refFor(part.id) && linkFor(part.id)"
        :to="linkFor(part.id)!"
        :class="CHIP"
        data-controller="tooltip"
        :title="`${refFor(part.id)!.part} · ${refFor(part.id)!.name}`"
      >{{ refFor(part.id)!.label }}</NuxtLink>
      <span v-else :class="CHIP">#{{ part.id }}</span>
      <template v-if="ids && i < parts.length - 1">{{ ' ' }}</template>
    </template>
  </span>
</template>
