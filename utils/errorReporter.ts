/**
 * Remontée des erreurs du front vers /api/error-log, visible dans l'admin.
 *
 * Passe par `fetch` natif et non par `$fetch` : l'intercepteur de
 * auth-interceptor ne doit pas réagir à nos envois, et un envoi raté ne
 * doit surtout pas générer une nouvelle erreur à remonter.
 */

export type ErrorLevel = 'critical' | 'error' | 'warning';

export interface ErrorReport {
  message: string;
  level?: ErrorLevel;
  /** Type de l'erreur (TypeError, FetchError…) */
  name?: string;
  stack?: string;
  /** Fichier:ligne d'origine, sert au regroupement côté serveur */
  file?: string;
  context?: Record<string, unknown>;
}

// Bruit connu, sans action possible de notre côté
const IGNORED = [
  /ResizeObserver loop/i,
  /^Script error\.?$/i,
  /chrome-extension:\/\/|moz-extension:\/\//,
];

const DEDUPE_MS = 30_000;
const MAX_PER_MINUTE = 10;

const recent = new Map<string, number>();
let windowStart = 0;
let sentInWindow = 0;

/** Normalise n'importe quoi de levé (Error, chaîne, objet) en rapport */
export function toErrorReport(err: unknown, extra: Partial<ErrorReport> = {}): ErrorReport {
  if (err instanceof Error) {
    return {
      message: err.message || String(err),
      name: err.name,
      stack: err.stack,
      file: firstFrame(err.stack),
      ...extra,
    };
  }
  return { message: typeof err === 'string' ? err : safeStringify(err), ...extra };
}

export function reportError(report: ErrorReport): void {
  if (typeof window === 'undefined') return;

  const haystack = `${report.message}\n${report.stack ?? ''}`;
  if (IGNORED.some(re => re.test(haystack))) return;

  // Une erreur dans une boucle de rendu peut tomber des centaines de fois
  const now = Date.now();
  const key = `${report.name}|${report.message}|${report.file}`;
  if (now - (recent.get(key) ?? 0) < DEDUPE_MS) return;
  recent.set(key, now);

  if (now - windowStart > 60_000) {
    windowStart = now;
    sentInWindow = 0;
  }
  if (++sentInWindow > MAX_PER_MINUTE) return;

  try {
    const config = useRuntimeConfig();
    const token = localStorage.getItem('token');

    fetch(`${config.public.apiBase}/error-log`, {
      method: 'POST',
      // keepalive : l'envoi survit à une navigation ou une fermeture d'onglet
      keepalive: true,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'X-AUTH-TOKEN': token } : {}),
      },
      body: JSON.stringify({
        level: 'error',
        ...report,
        // keepalive plafonne le corps à 64 Ko
        stack: report.stack?.slice(0, 8000),
        url: window.location.pathname + window.location.search,
      }),
    }).catch(() => { /* API injoignable : rien à faire de plus */ });
  } catch {
    // Pas de contexte Nuxt (erreur très précoce) : tant pis
  }
}

/** Première ligne de pile qui pointe vers un fichier, sans le domaine */
function firstFrame(stack?: string): string | undefined {
  const match = stack?.match(/(?:https?:\/\/[^/\s]+)?(\/[^\s)]+:\d+):\d+/);
  return match?.[1].replace(/\?[^:]*/, '');
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return String(value);
  }
}
