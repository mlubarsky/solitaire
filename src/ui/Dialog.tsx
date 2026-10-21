import { useEffect, useId, useRef, type ReactNode } from 'react';

export interface DialogProps {
  title: string;
  children?: ReactNode;
  actions: ReactNode;
  /** Called on Escape. */
  onDismiss?: () => void;
  className?: string;
}

/** In-app modal dialog. Focuses the element marked `data-autofocus` (or the first button). */
export function Dialog({ title, children, actions, onDismiss, className = '' }: DialogProps) {
  const titleId = useId();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    const target =
      root?.querySelector<HTMLElement>('[data-autofocus]') ?? root?.querySelector('button');
    target?.focus();
  }, []);

  useEffect(() => {
    if (!onDismiss) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onDismiss();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onDismiss]);

  return (
    <div className="dialog-backdrop">
      <div
        ref={ref}
        className={`dialog ${className}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <h2 id={titleId} className="dialog-title">
          {title}
        </h2>
        {children}
        <div className="dialog-actions">{actions}</div>
      </div>
    </div>
  );
}
