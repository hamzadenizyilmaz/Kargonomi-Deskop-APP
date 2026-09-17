// Shipment Row Actions / Menu (9:1786) and the Webhook row menu.
// The menu is portalled to the document so it is never clipped by the table's
// rounded overflow or horizontal scroll container.
// Keyboard contract (28 — Accessibility): opening moves focus to the first
// item, Up/Down/Home/End move between items, and Escape or Tab closes the
// menu with focus back on its trigger.

import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { IconButton } from './Kit.tsx';

const menuWidth = 240;

export function RowMenu({ label, children }: { readonly label: string; readonly children: (close: () => void) => ReactNode }) {
  const trigger = useRef<HTMLSpanElement>(null);
  const surface = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ readonly top: number; readonly left: number }>();

  const dismiss = () => setPosition(undefined);

  // Closing from inside the menu hands focus back to the trigger, so a dialog
  // opened by the chosen item also returns focus there when it closes.
  const close = () => {
    setPosition(undefined);
    trigger.current?.querySelector('button')?.focus();
  };

  const open = () => {
    const rect = trigger.current?.getBoundingClientRect();
    if (rect === undefined) return;
    setPosition({ top: rect.bottom + 4, left: Math.max(8, rect.right - menuWidth) });
  };

  useEffect(() => {
    if (position === undefined) return undefined;
    surface.current?.querySelector<HTMLElement>('[role="menuitem"]:not(:disabled)')?.focus();
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (trigger.current?.contains(target) === true || surface.current?.contains(target) === true) return;
      dismiss();
    };
    document.addEventListener('mousedown', onPointerDown);
    window.addEventListener('resize', dismiss);
    window.addEventListener('scroll', dismiss, true);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('resize', dismiss);
      window.removeEventListener('scroll', dismiss, true);
    };
  }, [position]);

  const onMenuKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape' || event.key === 'Tab') {
      event.preventDefault();
      close();
      return;
    }
    const items = [...(surface.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not(:disabled)') ?? [])];
    if (items.length === 0) return;
    const current = items.indexOf(document.activeElement as HTMLElement);
    let next: number | undefined;
    if (event.key === 'ArrowDown') next = (current + 1) % items.length;
    else if (event.key === 'ArrowUp') next = current <= 0 ? items.length - 1 : current - 1;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = items.length - 1;
    if (next === undefined) return;
    event.preventDefault();
    items[next]?.focus();
  };

  return (
    <span className="row-menu-host" ref={trigger}>
      <IconButton
        icon="action-more-horizontal"
        label={label}
        aria-haspopup="menu"
        aria-expanded={position !== undefined}
        onClick={() => (position === undefined ? open() : dismiss())}
      />
      {position === undefined
        ? null
        : createPortal(
          <div ref={surface} className="row-menu" role="menu" aria-label={label} style={{ top: position.top, left: position.left }} onKeyDown={onMenuKeyDown}>
            {children(close)}
          </div>,
          document.body,
        )}
    </span>
  );
}

export function RowMenuItem({ label, danger = false, onSelect }: { readonly label: string; readonly danger?: boolean; readonly onSelect: () => void }) {
  return (
    <button type="button" role="menuitem" className={danger ? 'row-menu__item row-menu__item--danger' : 'row-menu__item'} onClick={onSelect}>
      {label}
    </button>
  );
}
