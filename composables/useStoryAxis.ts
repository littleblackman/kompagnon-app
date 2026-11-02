import { computed } from 'vue';
import { useProjectStore } from '~/store/project';
import { toRoman } from '~/utils/roman';

export interface StoryColumn {
  id: number;
  /** Libellé court (I.2), pour les axes */
  label: string;
  name: string;
  part: string;
  partIndex: number;
}

/**
 * Les séquences dans l'ordre du récit : l'axe commun aux analyses.
 * Le libellé court (I.2) sert d'étiquette d'axe, le nom complet au survol.
 */
export const useStoryAxis = () => {
  const projectStore = useProjectStore();

  const sequences = computed(() => {
    const columns: StoryColumn[] = [];

    projectStore.parts.forEach((part, partIndex) => {
      (part.sequences ?? []).forEach((sequence, sequenceIndex) => {
        columns.push({
          id: sequence.id!,
          label: `${toRoman(partIndex + 1)}.${sequenceIndex + 1}`,
          name: sequence.name,
          part: part.name,
          partIndex
        });
      });
    });

    return columns;
  });

  return { sequences };
};
