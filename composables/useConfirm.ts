import { computed, ref } from 'vue';

export interface ConfirmOptions {
  title: string;
  message?: string;
  /** Puces d'avertissement listées sous le message */
  details?: string[];
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  /** Si défini, l'utilisateur doit saisir exactement ce mot pour pouvoir confirmer */
  requireText?: string;
}

// État singleton au niveau module — partagé entre le composable et le composant.
// Valable ici car l'app est en SPA (ssr: false) ; en SSR cet état fuirait entre requêtes.
const isOpen = ref(false);
const options = ref<ConfirmOptions>({ title: '' });
const inputValue = ref('');
let resolvePromise: ((value: boolean) => void) | null = null;

// Le scroll-lock se compte, il ne se booléenne pas : la confirmation s'ouvre
// souvent par-dessus une modale déjà plein écran (SceneModal), et restaurer
// l'overflow à sa fermeture masquerait le lock de la modale sous-jacente.
let lockCount = 0;
let previousOverflow = '';

const lockScroll = () => {
  if (!import.meta.client) return;
  if (lockCount === 0) {
    previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }
  lockCount++;
};

const unlockScroll = () => {
  if (!import.meta.client) return;
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount === 0) {
    document.body.style.overflow = previousOverflow;
  }
};

const settle = (value: boolean) => {
  if (!isOpen.value) return;
  isOpen.value = false;
  unlockScroll();
  const resolve = resolvePromise;
  resolvePromise = null;
  resolve?.(value);
};

export const useConfirm = () => {
  const confirm = (opts: ConfirmOptions): Promise<boolean> => {
    // Un second confirm() pendant qu'une modale est ouverte annule le premier
    // au lieu de laisser sa promesse pendante à jamais.
    if (resolvePromise) settle(false);

    options.value = { confirmLabel: 'Confirmer', cancelLabel: 'Annuler', ...opts };
    inputValue.value = '';
    isOpen.value = true;
    lockScroll();

    return new Promise((resolve) => {
      resolvePromise = resolve;
    });
  };

  const canConfirm = computed(() => {
    const required = options.value.requireText;
    return !required || inputValue.value.trim() === required;
  });

  const onConfirm = () => {
    if (!canConfirm.value) return;
    settle(true);
  };

  const onCancel = () => settle(false);

  return { confirm, isOpen, options, inputValue, canConfirm, onConfirm, onCancel };
};
