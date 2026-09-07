/**
 * Helpers de position pour les collections ordonnées (parties, séquences, scènes).
 *
 * Convention du projet : les positions sont contiguës et commencent à 1.
 * Le serveur reste propriétaire des positions ; ces helpers maintiennent
 * l'état local cohérent entre deux réponses de l'API.
 */

export interface Positionable {
  id: number;
  position: number;
}

/** Copie triée par position. Ne mute rien. */
export function sortByPosition<T extends Positionable>(items: readonly T[]): T[] {
  return [...items].sort((a, b) => a.position - b.position);
}

/**
 * Renumérote les éléments en base..base+n-1, en place, et trie le tableau.
 * Renvoie le payload prêt pour /x/order.
 */
export function resequence<T extends Positionable>(
  items: T[],
  base = 1
): { id: number; position: number }[] {
  items.sort((a, b) => a.position - b.position);
  items.forEach((item, index) => {
    item.position = index + base;
  });
  return items.map((item) => ({ id: item.id, position: item.position }));
}

/**
 * Déplace un élément d'un cran et renumérote.
 * Renvoie null si le mouvement est impossible (élément introuvable, déjà en bout).
 */
export function move<T extends Positionable>(
  items: T[],
  id: number,
  direction: 'up' | 'down',
  base = 1
): { id: number; position: number }[] | null {
  const ordered = sortByPosition(items);
  const from = ordered.findIndex((item) => item.id === id);
  if (from === -1) return null;

  const to = direction === 'up' ? from - 1 : from + 1;
  if (to < 0 || to >= ordered.length) return null;

  [ordered[from], ordered[to]] = [ordered[to], ordered[from]];

  ordered.forEach((item, index) => {
    item.position = index + base;
  });
  items.sort((a, b) => a.position - b.position);

  return ordered.map((item) => ({ id: item.id, position: item.position }));
}

/**
 * Applique les positions renvoyées par l'API sur les objets locaux, puis trie.
 * Les éléments absents de la réponse gardent leur position.
 */
export function applyPositions<T extends Positionable>(
  items: T[],
  positions: { id: number; position: number }[] | undefined | null
): void {
  if (!positions?.length) return;

  const byId = new Map(positions.map((p) => [p.id, p.position]));
  for (const item of items) {
    const position = byId.get(item.id);
    if (position !== undefined) item.position = position;
  }
  items.sort((a, b) => a.position - b.position);
}
