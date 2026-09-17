// Table structure as the Figma table components draw it — Shipment Table
// (8:245) and its Loading / Empty / Error variants: fixed-width header cells,
// 48px body cells inside 52px rows, a 250px state body and a text pagination
// row. Rendered with ARIA table roles so assistive technology still reads rows
// and columns.

import { Fragment, type CSSProperties, type ReactNode } from 'react';

export interface GridColumn {
  readonly key: string;
  readonly header: string;
  readonly width: number;
}

export function GridTable({ label, width, columns, busy = false, children }: {
  readonly label: string;
  readonly width: number;
  readonly columns: readonly GridColumn[];
  readonly busy?: boolean;
  readonly children: ReactNode;
}) {
  return (
    <div className="grid-table-scroll">
      <div className="grid-table" role="table" aria-label={label} aria-busy={busy || undefined} style={{ width }}>
        <div className="grid-table__header" role="row">
          {columns.map((column) => (
            <div className="grid-table__header-cell" role="columnheader" key={column.key} style={{ width: column.width }}>
              {column.header === '' ? <span className="sr-only">İşlemler</span> : column.header}
            </div>
          ))}
        </div>
        {children}
      </div>
    </div>
  );
}

export function GridRow({ children }: { readonly children: ReactNode }) {
  return <div className="grid-table__row" role="row">{children}</div>;
}

export type GridCellKind = 'text' | 'muted' | 'status' | 'actions';

// Long values truncate and keep the full text as a tooltip (29 — Developer
// Handoff: "truncate + tooltip/detail; never destroy column layout").
export function GridCell({ width, kind = 'text', title, children }: {
  readonly width: number;
  readonly kind?: GridCellKind;
  readonly title?: string | undefined;
  readonly children: ReactNode;
}) {
  const style: CSSProperties = { width };
  return (
    <div className={`grid-table__cell grid-table__cell--${kind}`} role="cell" style={style} title={title}>
      {children}
    </div>
  );
}

export function GridSkeleton({ widths, rows = 5 }: { readonly widths: readonly number[]; readonly rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }, (_, row) => (
        <div className="grid-table__skeleton-row" role="row" aria-hidden="true" key={row}>
          {widths.map((width, cell) => <span className="grid-table__skeleton" key={cell} style={{ width }} />)}
        </div>
      ))}
    </>
  );
}

export function GridState({ title, text, tone = 'default', action }: {
  readonly title: string;
  readonly text: string;
  readonly tone?: 'default' | 'error';
  readonly action: ReactNode;
}) {
  return (
    <div className="grid-table__state" role={tone === 'error' ? 'alert' : 'status'}>
      <p className={tone === 'error' ? 'grid-table__state-title grid-table__state-title--error' : 'grid-table__state-title'}>{title}</p>
      <p className="grid-table__state-text">{text}</p>
      {action}
    </div>
  );
}

// "1–50 / 248 kayıt" and "← Önceki     1  2  3  …  5     Sonraki →" as one
// Body Small run; the page numbers stay plain text, only clickable.
export function TextPagination({ currentPage, lastPage, perPage, total, disabled = false, onChange }: {
  readonly currentPage: number;
  readonly lastPage: number;
  readonly perPage: number;
  readonly total: number;
  readonly disabled?: boolean;
  readonly onChange: (page: number) => void;
}) {
  const first = total === 0 ? 0 : (currentPage - 1) * perPage + 1;
  const last = Math.min(currentPage * perPage, total);
  return (
    <nav className="text-pagination" aria-label="Sayfalama">
      <span>{`${first}–${last} / ${total.toLocaleString('tr-TR')} kayıt`}</span>
      <span className="text-pagination__pages">
        <button type="button" className="text-pagination__link" disabled={disabled || currentPage <= 1} onClick={() => onChange(currentPage - 1)}>← Önceki</button>
        {'     '}
        {pageWindow(currentPage, lastPage).map((page, index) => (
          <Fragment key={page ?? `gap-${index}`}>
            {index === 0 ? null : '  '}
            {page === null
              ? <span aria-hidden="true">…</span>
              : (
                <button
                  type="button"
                  className="text-pagination__link"
                  aria-current={page === currentPage ? 'page' : undefined}
                  aria-label={`Sayfa ${page}`}
                  disabled={disabled}
                  onClick={() => onChange(page)}
                >
                  {page}
                </button>
              )}
          </Fragment>
        ))}
        {'     '}
        <button type="button" className="text-pagination__link" disabled={disabled || currentPage >= lastPage} onClick={() => onChange(currentPage + 1)}>Sonraki →</button>
      </span>
    </nav>
  );
}

// Figma renders "1 2 3 … 5", so the window keeps three pages plus the last.
export function pageWindow(currentPage: number, lastPage: number): readonly (number | null)[] {
  if (lastPage <= 4) return Array.from({ length: Math.max(lastPage, 1) }, (_, index) => index + 1);
  const pages: (number | null)[] = [];
  const start = Math.min(Math.max(currentPage - 1, 1), lastPage - 3);
  for (let page = start; page < start + 3; page += 1) pages.push(page);
  if (start + 3 < lastPage) pages.push(null);
  pages.push(lastPage);
  return pages;
}
