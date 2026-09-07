/**
 * Infobulles maison.
 *
 * Un élément marqué `data-controller="tooltip"` garde son `title` comme source
 * du texte ; l'infobulle native est neutralisée au survol.
 *
 * Le rendu passe par un élément unique attaché au <body> et positionné en
 * `fixed`, et non par un pseudo-élément : un ::after reste prisonnier des
 * conteneurs en `overflow` — la grille d'analyse le découpait — et des
 * contextes d'empilement créés par les colonnes collantes.
 *
 * L'écoute est déléguée au document, ce qui couvre aussi tout ce qui est
 * monté après coup : listes, modales, contenus chargés depuis l'API.
 */
export default defineNuxtPlugin(() => {
  if (typeof document === 'undefined') return;

  const GAP = 8;
  let tip: HTMLElement | null = null;
  let current: HTMLElement | null = null;

  const ensureTip = () => {
    if (tip) return tip;
    tip = document.createElement('div');
    tip.className = 'app-tooltip';
    tip.setAttribute('role', 'tooltip');
    tip.setAttribute('aria-hidden', 'true');
    document.body.appendChild(tip);
    return tip;
  };

  const hide = () => {
    current = null;
    if (!tip) return;
    tip.classList.remove('is-visible');
    tip.setAttribute('aria-hidden', 'true');
  };

  const place = (host: HTMLElement, text: string) => {
    const node = ensureTip();
    node.textContent = text;
    node.classList.add('is-visible');
    node.setAttribute('aria-hidden', 'false');

    const target = host.getBoundingClientRect();
    const box = node.getBoundingClientRect();

    // Au-dessus par défaut, en dessous s'il n'y a pas la place en haut
    const above = target.top - box.height - GAP;
    const below = target.bottom + GAP;
    const top = above >= 4 ? above : below;
    node.classList.toggle('is-below', top === below);

    // Centré, puis ramené dans la fenêtre pour ne jamais déborder
    const centered = target.left + target.width / 2 - box.width / 2;
    const left = Math.max(4, Math.min(centered, window.innerWidth - box.width - 4));

    node.style.top = `${Math.round(top)}px`;
    node.style.left = `${Math.round(left)}px`;

    // La flèche suit la cible : ramenée dans la fenêtre, l'infobulle n'est
    // plus centrée sur elle et une flèche fixe pointerait à côté.
    const arrow = target.left + target.width / 2 - left;
    const clamped = Math.max(10, Math.min(arrow, box.width - 10));
    node.style.setProperty('--arrow-x', `${Math.round(clamped)}px`);
  };

  const show = (host: HTMLElement) => {
    // Le title est relu à chaque survol : une liaison dynamique a pu changer
    const text = host.getAttribute('title') ?? host.dataset.tooltipText ?? '';

    if (host.hasAttribute('title')) {
      // Neutraliser l'infobulle native, sans priver de nom accessible les
      // boutons qui n'ont pas de libellé visible.
      if (!host.getAttribute('aria-label') && !host.textContent?.trim()) {
        host.setAttribute('aria-label', text);
      }
      host.dataset.tooltipText = text;
      host.removeAttribute('title');
    }

    if (!text.trim()) {
      hide();
      return;
    }

    current = host;
    place(host, text);
  };

  const onOver = (event: Event) => {
    const target = event.target as HTMLElement | null;
    const host = target?.closest?.('[data-controller~="tooltip"]') as HTMLElement | null;

    if (!host) {
      if (current) hide();
      return;
    }
    if (host !== current) show(host);
  };

  const onOut = (event: Event) => {
    const related = (event as PointerEvent).relatedTarget as HTMLElement | null;
    if (related?.closest?.('[data-controller~="tooltip"]') === current) return;
    hide();
  };

  document.addEventListener('pointerover', onOver, true);
  document.addEventListener('pointerout', onOut, true);
  document.addEventListener('focusin', onOver, true);
  document.addEventListener('focusout', hide, true);

  // Un défilement ou un clic laisserait l'infobulle flotter à l'ancienne place
  window.addEventListener('scroll', hide, true);
  document.addEventListener('click', hide, true);
});
