/**
 * Version d'une scène : trois états affichés, adossés aux statuts de la base.
 *
 * On se cale sur le nom du statut et non sur son id, qui peut différer entre
 * environnements. « Brouillon » est le statut posé par l'API à la création :
 * une scène neuve est donc « en travail » sans rien faire.
 */
export type SceneVersion = 'travail' | 'relire' | 'valide';

export interface SceneVersionDef {
  key: SceneVersion;
  label: string;
  /** Nom du statut en base */
  statusName: string;
  /** Classes de la pastille */
  badge: string;
}

export const SCENE_VERSIONS: SceneVersionDef[] = [
  { key: 'travail', label: 'En travail', statusName: 'Brouillon', badge: 'bg-gray-100 text-gray-600 border-gray-300' },
  { key: 'relire', label: 'À relire', statusName: 'À valider', badge: 'bg-amber-50 text-amber-700 border-amber-300' },
  { key: 'valide', label: 'Validé', statusName: 'Validé', badge: 'bg-green-50 text-green-700 border-green-300' },
];

/**
 * Tout statut hors « À valider » / « Validé » (Brouillon, En cours,
 * À travailler…) se lit comme « en travail ».
 */
export function getSceneVersion(scene: { status?: any }): SceneVersionDef {
  const name = scene.status?.name;
  return SCENE_VERSIONS.find(v => v.key !== 'travail' && v.statusName === name) ?? SCENE_VERSIONS[0];
}

/** État suivant au clic sur la pastille : travail → relire → validé → travail */
export function nextSceneVersion(key: SceneVersion): SceneVersion {
  const index = SCENE_VERSIONS.findIndex(v => v.key === key);
  return SCENE_VERSIONS[(index + 1) % SCENE_VERSIONS.length].key;
}
