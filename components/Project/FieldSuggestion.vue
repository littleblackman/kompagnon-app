<script setup lang="ts">
/**
 * Rédaction proposée par le modèle pour un champ de séquence, affichée sous
 * la saisie. Rien n'est enregistré sans le clic de l'auteur.
 */
defineProps({
  text: { type: String, required: true },
  // Le champ a déjà une valeur : reprendre la proposition l'écrase
  replacing: { type: Boolean, default: false }
});

const emit = defineEmits(['apply', 'dismiss']);
</script>

<template>
  <div class="ml-4 flex items-start gap-2 rounded-lg border border-dashed border-amber-300 bg-amber-50/60 px-3 py-1.5 text-xs">
    <span class="flex-1 italic text-amber-900">
      <span class="not-italic font-semibold text-amber-700">Proposé :</span>
      {{ text }}
    </span>
    <button
      @click="emit('apply')"
      class="shrink-0 rounded-full bg-amber-500 px-2 py-0.5 font-medium text-white transition-colors hover:bg-amber-600"
      data-controller="tooltip"
      :title="replacing ? 'Remplacer le texte actuel par cette proposition' : 'Reprendre cette proposition'"
    >
      {{ replacing ? 'Remplacer' : 'Reprendre' }}
    </button>
    <button
      @click="emit('dismiss')"
      class="shrink-0 rounded-full px-1.5 py-0.5 text-amber-700 transition-colors hover:bg-amber-100"
      data-controller="tooltip"
      title="Ignorer la proposition"
    >
      ×
    </button>
  </div>
</template>
