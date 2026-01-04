import { useEffect, useMemo, useState, type ReactElement } from 'react';
import { onToast, type ToastPayload, type ToastVariant } from '@/utils/toast';

type ToastItem = ToastPayload & { id: string };

function makeId(): string {
  // Prefer a collision-resistant id when available.
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return (crypto as Crypto).randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function variantStyles(variant: ToastVariant): { container: string; icon: ReactElement } {
  switch (variant) {
    case 'success':
      return {
        container: 'bg-emerald-600 text-white',
        icon: (
          <svg className="shrink-0 size-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M20 6 9 17l-5-5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ),
      };
    case 'warning':
      return {
        container: 'bg-amber-500 text-white',
        icon: (
          <svg className="shrink-0 size-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ),
      };
    case 'info':
      return {
        container: 'bg-blue-600 text-white',
        icon: (
          <svg className="shrink-0 size-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M12 16v-4m0-4h.01M22 12c0 5.523-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2s10 4.477 10 10Z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ),
      };
    case 'error':
    default:
      return {
        container: 'bg-rose-600 text-white',
        icon: (
          <svg className="shrink-0 size-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ),
      };
  }
}

/**
 * Global toast stack (Preline-inspired "Solid color variants").
 * Mount once near the root (e.g. in `App.tsx`).
 */
export function ToastViewport() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    return onToast((payload) => {
      const id = makeId();
      const durationMs =
        payload.durationMs ??
        (payload.variant === 'error' ? 6500 : payload.variant === 'warning' ? 5500 : 3500);

      const toast: ToastItem = { id, ...payload, durationMs };
      setToasts((prev) => [...prev, toast]);

      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, durationMs);
    });
  }, []);

  const remove = (id: string) => setToasts((prev) => prev.filter((t) => t.id !== id));

  const hasToasts = toasts.length > 0;
  const containerA11y = useMemo(() => (hasToasts ? 'assertive' : 'off'), [hasToasts]);

  return (
    <div
      className="fixed top-5 right-5 z-9999 flex flex-col gap-3 w-88 max-w-[calc(100vw-2.5rem)]"
      aria-live={containerA11y}
      aria-relevant="additions"
    >
      {toasts.map((t) => {
        const { container, icon } = variantStyles(t.variant);
        return (
          <div
            key={t.id}
            className={`relative ${container} rounded-xl shadow-lg`}
            role="alert"
            tabIndex={-1}
          >
            <div className="flex gap-3 p-4">
              <div className="mt-0.5">{icon}</div>

              <div className="min-w-0 flex-1">
                {t.title ? <div className="font-semibold text-sm leading-5">{t.title}</div> : null}
                <div className="text-sm leading-5 opacity-95 wrap-break-word">{t.message}</div>
              </div>

              <button
                type="button"
                onClick={() => remove(t.id)}
                className="inline-flex shrink-0 justify-center items-center size-7 rounded-lg/50 text-white/90 hover:text-white hover:bg-white/10 focus:outline-hidden focus:ring-2 focus:ring-white/50"
                aria-label="Close"
              >
                <svg className="shrink-0 size-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M18 6 6 18"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="m6 6 12 12"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}


