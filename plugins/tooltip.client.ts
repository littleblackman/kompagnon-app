/**
 * Infobulles maison.
 *
 * Un élément marqué `data-controller="tooltip"` garde son `title` comme source
 * du texte. Au premier survol, ce `title` est déplacé vers `data-tooltip` :
 * l'infobulle native du navigateur disparaît et seule la nôtre s'affiche,
 * via le CSS de `assets/scss/tooltip.css`.
 *
 * L'écoute est déléguée au document plutôt que posée par élément : cela
 * couvre aussi tout ce qui est monté après coup — listes, modales, contenus
 * chargés depuis l'API.
 */
export default defineNuxtPlugin(() => {
  if (typeof document === 'undefined') return;

  const activate = (element: HTMLElement) => {
    const text = element.getAttribute('title');

    // Un title dynamique repassé à vide doit effacer l'infobulle, sinon
    // l'ancien texte resterait affiché alors qu'il ne s'applique plus.
    if (!text) {
      if (element.hasAttribute('title')) element.removeAttribute('data-tooltip');
      return;
    }

    element.setAttribute('data-tooltip', text);

    // Le title portait le nom accessible des boutons sans libellé :
    // le retirer sans compensation les rendrait muets aux lecteurs d'écran.
    if (!element.getAttribute('aria-label') && !element.textContent?.trim()) {
      element.setAttribute('aria-label', text);
    }

    element.removeAttribute('title');
  };

  const onPointerOver = (event: Event) => {
    const target = event.target as HTMLElement | null;
    const host = target?.closest?.('[data-controller~="tooltip"]') as HTMLElement | null;
    if (host) activate(host);
  };

  // capture : certains composants arrêtent la propagation du survol
  document.addEventListener('pointerover', onPointerOver, true);
  document.addEventListener('focusin', onPointerOver, true);
});
