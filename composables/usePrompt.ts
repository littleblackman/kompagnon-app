import { ref } from 'vue';

export interface PromptOptions {
  title: string;
  message?: string;
  placeholder?: string;
  /** Valeur pré-remplie */
  initialValue?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Passe la saisie en majuscules à la volée (codes de segments, par exemple) */
  uppercase?: boolean;
}

// Même architecture que useConfirm : état singleton au niveau module.
const isOpen = ref(false);
const options = ref<PromptOptions>({ title: '' });
const value = ref('');
let resolvePromise: ((value: string | null) => void) | null = null;

const settle = (result: string | null) => {
  if (!isOpen.value) return;
  isOpen.value = false;
  const resolve = resolvePromise;
  resolvePromise = null;
  resolve?.(result);
};

export const usePrompt = () => {
  /**
   * Remplace prompt(), qui bloque le thread et que plusieurs navigateurs
   * désactivent purement et simplement.
   * Résout avec la saisie, ou null si l'utilisateur annule.
   */
  const prompt = (opts: PromptOptions): Promise<string | null> => {
    if (resolvePromise) settle(null);

    options.value = { confirmLabel: 'Valider', cancelLabel: 'Annuler', ...opts };
    value.value = opts.initialValue ?? '';
    isOpen.value = true;

    return new Promise((resolve) => {
      resolvePromise = resolve;
    });
  };

  const onConfirm = () => {
    const trimmed = value.value.trim();
    if (!trimmed) return;
    settle(options.value.uppercase ? trimmed.toUpperCase() : trimmed);
  };

  const onCancel = () => settle(null);

  return { prompt, isOpen, options, value, onConfirm, onCancel };
};
