import { ref } from 'vue';

interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

// État singleton au niveau module — partagé entre le composable et le composant
const isOpen = ref(false);
const options = ref<ConfirmOptions>({ title: '' });
let resolvePromise: ((value: boolean) => void) | null = null;

export const useConfirm = () => {
  const confirm = (opts: ConfirmOptions): Promise<boolean> => {
    options.value = { confirmLabel: 'Confirmer', cancelLabel: 'Annuler', ...opts };
    isOpen.value = true;
    return new Promise((resolve) => {
      resolvePromise = resolve;
    });
  };

  const onConfirm = () => {
    isOpen.value = false;
    resolvePromise?.(true);
  };

  const onCancel = () => {
    isOpen.value = false;
    resolvePromise?.(false);
  };

  return { confirm, isOpen, options, onConfirm, onCancel };
};
