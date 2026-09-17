// Screen-level building blocks: page header, shared states and the dialog
// system from Figma page "25 — Dialogs & Overlays" (one modal system, never
// nested, destructive colour only on the action and the critical emphasis).

import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { Icon, type IconName } from './Icon.tsx';
import { Button } from './Kit.tsx';

// `toolbar`: the Barcode header (15:134) packs its four actions 8px apart.
export function PageHeader({ title, description, actions, toolbar = false }: {
  readonly title: string;
  readonly description?: string;
  readonly actions?: ReactNode;
  readonly toolbar?: boolean;
}) {
  return (
    <header className="page-header">
      <div className="page-header__text">
        <h1 className="page-header__title">{title}</h1>
        {description === undefined ? null : <p className="page-header__description">{description}</p>}
      </div>
      {actions === undefined ? null : <div className={toolbar ? 'page-header__actions page-header__actions--toolbar' : 'page-header__actions'}>{actions}</div>}
    </header>
  );
}

export function OfflineBanner({ title = 'Çevrimdışı çalışıyorsunuz', text }: { readonly title?: string; readonly text: string }) {
  return (
    <div className="banner" role="status">
      <p className="banner__title">{title}</p>
      <p className="banner__text">{text}</p>
    </div>
  );
}

export function ErrorCard({ title, text, onRetry }: { readonly title: string; readonly text: string; readonly onRetry?: () => void }) {
  return (
    <div className="error-card" role="alert">
      <p className="error-card__title">{title}</p>
      <p className="error-card__text">{text}</p>
      {onRetry === undefined ? null : <Button hierarchy="secondary" leadingIcon="action-refresh" onClick={onRetry}>Tekrar Dene</Button>}
    </div>
  );
}

export function LoadingSkeleton({ lines = 3, variant = 'block' }: { readonly lines?: number; readonly variant?: 'block' | 'line' }) {
  return (
    <div className={variant === 'line' ? 'skeleton-stack skeleton-stack--lines' : 'skeleton-stack'} aria-hidden="true">
      {Array.from({ length: lines }, (_, index) => <span className={variant === 'line' ? 'skeleton-line' : 'skeleton-block'} key={index} />)}
    </div>
  );
}

/*
 * Every Dialog Surface on 25 — Dialogs & Overlays pairs a specific glyph with
 * one of three tones: default (Confirm, Unsaved Changes, Replace Token,
 * Carrier Confirmation, Save PDF), warning — border only — (Cancel Shipment)
 * and error — border and title — (Delete, Remove Token, Connection Failed).
 */
export type DialogTone = 'default' | 'warning' | 'error';

export interface DialogProps {
  readonly title: string;
  readonly icon: IconName;
  readonly tone?: DialogTone;
  readonly children: ReactNode;
  readonly actions: ReactNode;
  readonly onClose: () => void;
  readonly dismissible?: boolean;
}

const shellSelectors = '.sidebar, .topbar, .main-content';

// In-app frames (Edit 12:374, Price Comparison 13:750) scrim only the main
// content area and place the surface 180px below its top; the shell stays
// visible but is made inert while the dialog is open. Escape closes the dialog
// and focus returns to the trigger (28 — Accessibility).
export function Dialog({ title, icon, tone = 'default', children, actions, onClose, dismissible = true }: DialogProps) {
  const surface = useRef<HTMLElement>(null);
  const opener = useRef<Element | null>(null);
  const [host, setHost] = useState<HTMLElement | null>(null);
  const titleId = useId();

  useLayoutEffect(() => {
    setHost(document.getElementById('main-modal-root') ?? document.body);
  }, []);

  useEffect(() => {
    if (host === null) return undefined;
    opener.current = document.activeElement;
    const shell = [...document.querySelectorAll<HTMLElement>(shellSelectors)];
    for (const element of shell) element.inert = true;
    surface.current?.querySelector<HTMLElement>('input, button, [href], textarea')?.focus();
    return () => {
      for (const element of shell) element.inert = false;
      if (opener.current instanceof HTMLElement) opener.current.focus();
    };
  }, [host]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && dismissible) { event.stopPropagation(); onClose(); }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [dismissible, onClose]);

  if (host === null) return null;
  return createPortal(
    <div className="k-dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && dismissible) onClose(); }}>
      <section ref={surface} className={`k-dialog k-dialog--${tone}`} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="k-dialog__title-row">
          <Icon name={icon} className="k-dialog__icon" />
          <h2 className="k-dialog__title" id={titleId}>{title}</h2>
        </div>
        {children}
        <div className="k-dialog__actions">{actions}</div>
      </section>
    </div>,
    host,
  );
}

// Two-action confirmation: body (Body), optional meta line (Body Medium) and
// note (Body Small), then Vazgeç + the confirming action. While the request
// runs the actions lock and the confirm button keeps its label (81:11). A
// failed request keeps the dialog open with its error above the actions.
export function ConfirmDialog({ title, icon, tone = 'default', body, meta, note, error, confirmLabel, cancelLabel = 'Vazgeç', confirmHierarchy = 'primary', busy, onConfirm, onClose }: {
  readonly title: string;
  readonly icon: IconName;
  readonly tone?: DialogTone;
  readonly body: string;
  readonly meta?: string | undefined;
  readonly note?: string | undefined;
  readonly error?: string | undefined;
  readonly confirmLabel: string;
  readonly cancelLabel?: string;
  readonly confirmHierarchy?: 'primary' | 'destructive';
  readonly busy: boolean;
  readonly onConfirm: () => void;
  readonly onClose: () => void;
}) {
  return (
    <Dialog
      title={title}
      icon={icon}
      tone={tone}
      dismissible={!busy}
      onClose={onClose}
      actions={
        <>
          <Button hierarchy="secondary" disabled={busy} onClick={onClose}>{cancelLabel}</Button>
          <Button hierarchy={confirmHierarchy} loading={busy} onClick={onConfirm}>{confirmLabel}</Button>
        </>
      }
    >
      <p className="k-dialog__body">{body}</p>
      {meta === undefined ? null : <p className="k-dialog__meta">{meta}</p>}
      {note === undefined ? null : <p className="k-dialog__note">{note}</p>}
      {error === undefined ? null : <p className="k-dialog__error" role="alert">{error}</p>}
    </Dialog>
  );
}
