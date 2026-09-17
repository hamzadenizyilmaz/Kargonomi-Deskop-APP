// Select Menu (52:22) behaviour shared by Select Field (49:38) and the
// Shipments filter triggers. The menu is portalled so tables and panels never
// clip it. Keyboard contract (52:7): Up/Down moves, Enter selects, Escape
// closes and returns focus to the trigger, Tab leaves the menu.

import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

export interface ListOption {
  readonly value: string;
  readonly label: string;
}

export type ListMenuState = 'default' | 'loading' | 'error';

interface Position {
  readonly top: number;
  readonly left: number;
  readonly width: number;
  readonly maxHeight: number;
}

const defaultMenuWidth = 320;

export function useListbox({ label, options, value, onChange, menuState = 'default', matchTriggerWidth = false }: {
  readonly label: string;
  readonly options: readonly ListOption[];
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly menuState?: ListMenuState;
  readonly matchTriggerWidth?: boolean;
}) {
  const trigger = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<Position>();
  const [active, setActive] = useState(0);
  const listId = useId();

  const open = () => {
    const rect = trigger.current?.getBoundingClientRect();
    if (rect === undefined) return;
    const width = matchTriggerWidth ? Math.max(rect.width, 160) : defaultMenuWidth;
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));
    setPosition({ top: rect.bottom + 4, left, width, maxHeight: Math.max(120, window.innerHeight - rect.bottom - 20) });
    setActive(Math.max(0, options.findIndex((option) => option.value === value)));
  };

  const close = (restoreFocus: boolean) => {
    setPosition(undefined);
    if (restoreFocus) trigger.current?.focus();
  };

  useEffect(() => {
    if (position === undefined) return undefined;
    list.current?.focus();
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (trigger.current?.contains(target) === true || list.current?.contains(target) === true) return;
      setPosition(undefined);
    };
    const dismiss = () => setPosition(undefined);
    document.addEventListener('mousedown', onPointerDown);
    window.addEventListener('resize', dismiss);
    window.addEventListener('scroll', dismiss, true);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('resize', dismiss);
      window.removeEventListener('scroll', dismiss, true);
    };
  }, [position]);

  useEffect(() => {
    if (position === undefined) return;
    list.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active, position]);

  const choose = (next: string) => {
    onChange(next);
    close(true);
  };

  const selectable = menuState === 'default' && options.length > 0;

  const onListKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') { event.preventDefault(); close(true); return; }
    if (event.key === 'Tab') { close(false); return; }
    if (!selectable) return;
    if (event.key === 'ArrowDown') { event.preventDefault(); setActive((index) => Math.min(index + 1, options.length - 1)); }
    else if (event.key === 'ArrowUp') { event.preventDefault(); setActive((index) => Math.max(index - 1, 0)); }
    else if (event.key === 'Home') { event.preventDefault(); setActive(0); }
    else if (event.key === 'End') { event.preventDefault(); setActive(options.length - 1); }
    else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      const option = options[active];
      if (option !== undefined) choose(option.value);
    }
  };

  const onTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); open(); }
  };

  let body: ReactNode;
  if (menuState === 'loading') {
    body = <p className="k-menu__title">Seçenekler yükleniyor…</p>;
  } else if (menuState === 'error') {
    body = (
      <>
        <p className="k-menu__title">Seçenekler yüklenemedi.</p>
        <p className="k-menu__hint">Bağlantıyı kontrol edip tekrar deneyin.</p>
      </>
    );
  } else if (options.length === 0) {
    body = (
      <>
        <p className="k-menu__title">Sonuç bulunamadı.</p>
        <p className="k-menu__hint">Arama ifadenizi veya üst seçimi kontrol edin.</p>
      </>
    );
  } else {
    body = options.map((option, index) => (
      <div
        key={option.value}
        id={`${listId}-${index}`}
        data-index={index}
        role="option"
        aria-selected={option.value === value}
        className={index === active ? 'k-menu__option k-menu__option--active' : 'k-menu__option'}
        title={option.label}
        onMouseEnter={() => setActive(index)}
        onClick={() => choose(option.value)}
      >
        <span className="k-menu__option-label">{option.label}</span>
      </div>
    ));
  }

  const popover = position === undefined
    ? null
    : createPortal(
      <div
        ref={list}
        id={listId}
        className={menuState === 'error' ? 'k-menu k-menu--popover k-menu--error' : 'k-menu k-menu--popover'}
        role="listbox"
        aria-label={label}
        aria-busy={menuState === 'loading' || undefined}
        tabIndex={-1}
        aria-activedescendant={selectable ? `${listId}-${active}` : undefined}
        style={{ top: position.top, left: position.left, width: position.width, maxHeight: position.maxHeight }}
        onKeyDown={onListKeyDown}
      >
        {body}
      </div>,
      document.body,
    );

  return {
    expanded: position !== undefined,
    popover,
    triggerProps: {
      ref: trigger,
      'aria-haspopup': 'listbox' as const,
      'aria-expanded': position !== undefined,
      'aria-controls': position === undefined ? undefined : listId,
      onClick: () => (position === undefined ? open() : close(true)),
      onKeyDown: onTriggerKeyDown,
    },
  };
}
