/**
 * Génère un slug à partir d'un personnage
 * Ex: "Harry Potter" -> "harry-potter"
 */
export function generatePersonnageSlug(personnage: { firstName: string; lastName: string }): string {
  const fullName = `${personnage.firstName} ${personnage.lastName}`.trim();
  
  return fullName
    .toLowerCase()
    .normalize('NFD') // Décomposer les caractères accentués
    .replace(/[\u0300-\u036f]/g, '') // Supprimer les accents
    .replace(/[^a-z0-9\s-]/g, '') // Garder seulement lettres, chiffres, espaces et tirets
    .replace(/\s+/g, '-') // Remplacer espaces par tirets
    .replace(/-+/g, '-') // Remplacer tirets multiples par un seul
    .replace(/^-|-$/g, ''); // Supprimer tirets en début/fin
}

/**
 * Trouve un personnage par son slug dans une liste
 */
export function findPersonnageBySlug(personnages: any[], slug: string) {
  return personnages.find(personnage => 
    generatePersonnageSlug(personnage) === slug
  );
}