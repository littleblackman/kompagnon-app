import { computed } from 'vue';
import { useProjectStore } from '~/store/project';
import { toRoman } from '~/utils/roman';

/**
 * Renvois vers les séquences du projet chargé.
 *
 * Les analyses citent une séquence par son identifiant « [57] » : c'est la
 * clé stable (un nom change, un rang aussi). On l'affiche comme l'auteur la
 * lit dans le plan — « II.3 », partie puis rang — avec le nom au survol et
 * un lien vers la séquence dans le projet.
 */
export const useSequenceRefs = () => {
  const projectStore = useProjectStore();

  const refs = computed(() => {
    const map = new Map<number, { label: string; name: string; part: string }>();
    projectStore.parts.forEach((part: any, partIndex: number) => {
      (part.sequences ?? []).forEach((sequence: any, index: number) => {
        map.set(sequence.id, {
          label: `${toRoman(partIndex + 1)}.${index + 1}`,
          name: sequence.name,
          part: part.name
        });
      });
    });
    return map;
  });

  const refFor = (id: number) => refs.value.get(id) ?? null;

  const linkFor = (id: number) =>
    projectStore.project?.slug ? `/projets/projet-${projectStore.project.slug}#sequence-${id}` : null;

  return { refFor, linkFor };
};

/** « [57] », « [57, 69] » : un renvoi peut regrouper plusieurs séquences */
export const SEQUENCE_REF_PATTERN = /\[(\d+(?:\s*,\s*\d+)*)\]/g;
