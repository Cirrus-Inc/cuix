'use client';

import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Button, IconButton } from './Button.tsx';
import { cx } from './cx.ts';

export type ToastType = 'info' | 'success' | 'warning' | 'error';
export type ToastAction = { label: string; run: () => void };
export type ToastOptions = { type?: ToastType; action?: ToastAction };

export type ToastItem = {
  id: number;
  message: string;
  type: ToastType;
  /** How many times this exact (message, type) arrived while on screen. */
  count: number;
  action?: ToastAction;
  at: Date;
  /** Press order; a merge takes the newer press's number, so the bump is announced. */
  seq: number;
  /** The press whose timer may close it; a merge hands the lease to the newer press. */
  lease?: number;
};

type ToastContextValue = { toast: (message: string, options?: ToastOptions) => void };
type ToastLogValue = { log: ToastItem[]; clear: () => void };

const ToastContext = createContext<ToastContextValue | null>(null);
const ToastLogContext = createContext<ToastLogValue | null>(null);

// Four on screen; a fifth pushes out the oldest. Errors never auto-dismiss, so
// an unbounded stack would grow off the top of the window, ✕ included.
const MAX_TOASTS = 4;
const MAX_LOG = 50;
// Transient types: 4 s, 8 s with an action to reach for (2.2.1, 2.2.3).
const DURATION = { plain: 4000, withAction: 8000 };

let nextId = 0;
let nextSeq = 0;

// Errors and warnings are assertive and sticky; info and success are polite
// and time out. The outcome is also kept in the log, so a toast is never the
// only record of it.
const STYLE: Record<ToastType, { icon: typeof Info; accent: string; rail: string; assertive: boolean }> = {
  error: { icon: XCircle, accent: 'text-danger', rail: 'border-l-danger', assertive: true },
  warning: { icon: AlertTriangle, accent: 'text-warning', rail: 'border-l-warning', assertive: true },
  success: { icon: CheckCircle2, accent: 'text-success', rail: 'border-l-success', assertive: false },
  info: { icon: Info, accent: 'text-info', rail: 'border-l-info', assertive: false },
};

export type ToastLabels = { dismiss: string; dismissAll: string; region: string };
const DEFAULT_LABELS: ToastLabels = { dismiss: 'Dismiss', dismissAll: 'Dismiss all', region: 'Notifications' };

export function ToastProvider({ children, labels = DEFAULT_LABELS }: { children: ReactNode; labels?: ToastLabels }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [log, setLog] = useState<ToastItem[]>([]);
  const [live, setLive] = useState({ polite: '', assertive: '' });

  const dismiss = useCallback((id: number) => setToasts((prev) => prev.filter((x) => x.id !== id)), []);
  const dismissAll = useCallback(() => setToasts([]), []);
  const clear = useCallback(() => setLog([]), []);

  // One timer per transient press, all cleared on unmount. While the pointer or
  // focus is inside the region nothing closes: a timer that fires then is parked
  // and re-armed on leave, so an Undo never vanishes under the user (2.2.1).
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
  const parked = useRef(new Set<number>());
  const hold = useRef({ pointer: false, focus: false });

  const expire = useCallback((lease: number) => {
    if (hold.current.pointer || hold.current.focus) parked.current.add(lease);
    else setToasts((prev) => prev.filter((x) => x.lease !== lease));
  }, []);

  const schedule = useCallback(
    (lease: number, ms: number) => {
      const handle = setTimeout(() => {
        timers.current.delete(handle);
        expire(lease);
      }, ms);
      timers.current.add(handle);
    },
    [expire],
  );

  useEffect(() => {
    const live = timers.current;
    return () => {
      live.forEach(clearTimeout);
      live.clear();
    };
  }, []);

  // Native listeners: the region is a landmark, not a control, so it takes no
  // React handlers; it only watches whether the user is inside it.
  const region = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = region.current;
    if (!el) return;
    const set = (key: 'pointer' | 'focus', on: boolean) => {
      hold.current[key] = on;
      if (hold.current.pointer || hold.current.focus) return;
      parked.current.forEach((lease) => schedule(lease, DURATION.plain));
      parked.current.clear();
    };
    const enter = () => set('pointer', true);
    const leave = () => set('pointer', false);
    const focusIn = () => set('focus', true);
    const focusOut = (e: FocusEvent) => {
      if (!el.contains(e.relatedTarget as Node | null)) set('focus', false);
    };
    el.addEventListener('pointerenter', enter);
    el.addEventListener('pointerleave', leave);
    el.addEventListener('focusin', focusIn);
    el.addEventListener('focusout', focusOut);
    return () => {
      el.removeEventListener('pointerenter', enter);
      el.removeEventListener('pointerleave', leave);
      el.removeEventListener('focusin', focusIn);
      el.removeEventListener('focusout', focusOut);
    };
  }, [schedule]);

  // The live regions exist from mount and only their text changes, which is
  // what screen readers announce reliably. Clearing first re-announces a repeat.
  const announced = useRef(-1);
  const announceTimers = useRef(new Set<ReturnType<typeof setTimeout>>());
  useEffect(() => {
    const fresh = toasts.filter((x) => x.seq > announced.current).sort((a, b) => a.seq - b.seq);
    if (!fresh.length) return;
    announced.current = fresh[fresh.length - 1].seq;
    for (const kind of ['polite', 'assertive'] as const) {
      const last = fresh.filter((x) => STYLE[x.type].assertive === (kind === 'assertive')).pop();
      if (!last) continue;
      const text = last.count > 1 ? `${last.message} ×${last.count}` : last.message;
      setLive((prev) => ({ ...prev, [kind]: '' }));
      const handle = setTimeout(() => {
        announceTimers.current.delete(handle);
        setLive((prev) => ({ ...prev, [kind]: text }));
      }, 50);
      announceTimers.current.add(handle);
    }
  }, [toasts]);
  useEffect(() => {
    const pending = announceTimers.current;
    return () => {
      pending.forEach(clearTimeout);
      pending.clear();
    };
  }, []);

  const toast = useCallback(
    (message: string, { type = 'info', action }: ToastOptions = {}) => {
      // Minted outside the updater: StrictMode runs updaters twice.
      const id = nextId++;
      const transient = !STYLE[type].assertive;
      const lease = transient ? id : undefined;
      const item: ToastItem = { id, message, type, count: 1, action, at: new Date(), seq: nextSeq++, lease };
      setLog((prev) => [item, ...prev].slice(0, MAX_LOG));
      setToasts((prev) => {
        // Exact (message, type) merges into ×N. A toast with an action never
        // merges: each Undo undoes its own press.
        const at = action ? -1 : prev.findIndex((x) => x.message === message && x.type === type && !x.action);
        if (at !== -1) {
          const next = [...prev];
          // The bump re-announces it, so it gets a full duration from now.
          next[at] = { ...next[at], count: next[at].count + 1, seq: item.seq, lease };
          return next;
        }
        return [...prev, item].slice(-MAX_TOASTS);
      });
      if (lease !== undefined) schedule(lease, action ? DURATION.withAction : DURATION.plain);
    },
    [schedule],
  );

  const value = useMemo(() => ({ toast }), [toast]);
  const logValue = useMemo(() => ({ log, clear }), [log, clear]);

  return (
    <ToastContext.Provider value={value}>
      <ToastLogContext.Provider value={logValue}>
        {children}
        {/* Phone: top, clear of thumbs and any bottom bar. Desktop: bottom-right. */}
        <section
          aria-label={labels.region}
          ref={region}
          className="pointer-events-none fixed inset-x-4 top-4 z-toast flex flex-col gap-2 safe-top sm:inset-x-auto sm:top-auto sm:right-4 sm:bottom-4 sm:w-sheet sm:max-w-full"
        >
          {toasts.length > 1 && (
            <div className="pointer-events-auto flex justify-end">
              <Button variant="secondary" onClick={dismissAll}>
                {labels.dismissAll}
              </Button>
            </div>
          )}
          {/* scroll-ok: the stack is capped at 4 toasts; the scroller only exists so a tall toast never pushes Dismiss all off screen */}
          <div className="flex max-h-96 flex-col gap-2 overflow-y-auto">
            {toasts.map((item) => {
              const s = STYLE[item.type];
              const Icon = s.icon;
              return (
                <div
                  key={item.id}
                  className={cx(
                    'pointer-events-auto flex items-start gap-3 rounded-card border border-border border-l-4 bg-surface p-3 text-body-sm text-foreground shadow-overlay',
                    s.rail,
                  )}
                >
                  <Icon aria-hidden="true" className={cx('mt-1 shrink-0', s.accent)} />
                  <span className="flex-1 self-center">
                    {item.message}
                    {item.count > 1 && <span className="ml-1 tabular-nums text-foreground-muted">×{item.count}</span>}
                  </span>
                  {item.action && (
                    <Button
                      variant="secondary"
                      className="shrink-0 self-center"
                      onClick={() => {
                        dismiss(item.id);
                        item.action?.run();
                      }}
                    >
                      {item.action.label}
                    </Button>
                  )}
                  <IconButton
                    icon={<X aria-hidden="true" />}
                    aria-label={labels.dismiss}
                    onClick={() => dismiss(item.id)}
                    className="-my-2 -mr-2 shrink-0 self-center"
                  />
                </div>
              );
            })}
          </div>
        </section>
        <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
          {live.polite}
        </div>
        <div role="alert" aria-live="assertive" aria-atomic="true" className="sr-only">
          {live.assertive}
        </div>
      </ToastLogContext.Provider>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}

/** Every toast that was shown, newest first (2.2.3: a toast is never the only record). */
export function useToastLog(): ToastLogValue {
  const ctx = useContext(ToastLogContext);
  if (!ctx) throw new Error('useToastLog must be used inside <ToastProvider>');
  return ctx;
}

const TYPE_WORD: Record<ToastType, string> = { info: 'Info', success: 'Success', warning: 'Warning', error: 'Error' };

/** A reachable list of past notifications, for a settings page or a help panel. */
export function ToastLog({ emptyText = 'No notifications yet.', typeWords = TYPE_WORD, className }: { emptyText?: string; typeWords?: Record<ToastType, string>; className?: string }) {
  const { log } = useToastLog();
  if (!log.length) return <p className={cx('text-body-sm text-foreground-muted', className)}>{emptyText}</p>;
  return (
    <ol className={cx('flex flex-col divide-y divide-border', className)}>
      {log.map((item) => {
        const s = STYLE[item.type];
        const Icon = s.icon;
        return (
          <li key={item.id} className="flex items-start gap-3 py-2 text-body-sm">
            <Icon aria-hidden="true" className={cx('mt-0.5 shrink-0', s.accent)} />
            <span className="flex-1">
              <span className="sr-only">{typeWords[item.type]}: </span>
              {item.message}
            </span>
            <time dateTime={item.at.toISOString()} className="shrink-0 text-caption text-foreground-subtle tabular-nums">
              {item.at.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </time>
          </li>
        );
      })}
    </ol>
  );
}
