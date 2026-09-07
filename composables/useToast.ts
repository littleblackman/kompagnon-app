import { ref } from 'vue';

export type ToastKind = 'success' | 'error' | 'info';

export interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

// État singleton au niveau module, comme useConfirm.
// Valable en SPA (ssr: false) ; en SSR cet état fuirait entre requêtes.
const toasts = ref<Toast[]>([]);
let nextId = 1;

const DURATIONS: Record<ToastKind, number> = {
  success: 3000,
  info: 4000,
  // Une erreur mérite d'être lue avant de disparaître
  error: 6000,
};

export const useToast = () => {
  const dismiss = (id: number) => {
    toasts.value = toasts.value.filter(t => t.id !== id);
  };

  const push = (kind: ToastKind, message: string) => {
    const id = nextId++;
    toasts.value = [...toasts.value, { id, kind, message }];
    setTimeout(() => dismiss(id), DURATIONS[kind]);
    return id;
  };

  return {
    toasts,
    dismiss,
    success: (message: string) => push('success', message),
    error: (message: string) => push('error', message),
    info: (message: string) => push('info', message),
  };
};
