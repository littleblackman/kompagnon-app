import { useProjectStore } from '~/store/project';
import { useConfirm } from '~/composables/useConfirm';
import { useToast } from '~/composables/useToast';
import { SCENE_VERSIONS, getSceneVersion, type SceneVersion } from '~/utils/sceneStatus';
import type { Scene } from '~/types';

/**
 * Changement de version en lot, partagé entre une séquence et le projet entier.
 * Toujours confirmé : repasser tout un projet en travail efface d'un clic
 * des validations posées une à une.
 */
export const useSceneVersions = () => {
  const projectStore = useProjectStore();
  const { confirm } = useConfirm();
  const toast = useToast();

  const setAll = async (scenes: Scene[], version: SceneVersion, scopeLabel: string) => {
    const def = SCENE_VERSIONS.find(v => v.key === version)!;
    const toChange = scenes.filter(s => s.id && getSceneVersion(s).key !== version);

    if (!toChange.length) {
      toast.info(`Toutes les scènes sont déjà « ${def.label} ».`);
      return;
    }

    // Ce qu'on s'apprête à écraser, version par version
    const details = SCENE_VERSIONS
      .filter(v => v.key !== version)
      .map(v => ({ v, count: toChange.filter(s => getSceneVersion(s).key === v.key).length }))
      .filter(({ count }) => count > 0)
      .map(({ v, count }) => `${count} scène${count > 1 ? 's' : ''} « ${v.label} »`);

    const ok = await confirm({
      title: `Tout passer en « ${def.label} » ?`,
      message: `${toChange.length} scène${toChange.length > 1 ? 's' : ''} de ${scopeLabel} vont changer de version :`,
      details,
      confirmLabel: `Tout passer en « ${def.label} »`,
    });
    if (!ok) return;

    try {
      const failures = await projectStore.setScenesVersion(toChange.map(s => s.id!), version);
      if (failures) {
        toast.error(`${failures} scène${failures > 1 ? 's' : ''} n'ont pas pu être mises à jour.`);
      } else {
        toast.success(`${toChange.length} scène${toChange.length > 1 ? 's' : ''} passée${toChange.length > 1 ? 's' : ''} en « ${def.label} ».`);
      }
    } catch (error) {
      console.error('Erreur lors du changement de version :', error);
      toast.error("Le changement de version n'a pas pu être enregistré.");
    }
  };

  return { setAll };
};
