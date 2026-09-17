// Kargonomi design-system primitives.
// Transcribed from the Figma component masters on "06 — Components"
// (file 9ZIA1fhVnuHpMcPNoX0VRg). Props follow the Figma variant axes so a
// component instance in the design maps directly onto a call site here.

import { useId, useRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react';

import { Icon, type IconName, type IconSize } from './Icon.tsx';
import { useListbox, type ListMenuState, type ListOption } from './Listbox.tsx';

export type ButtonHierarchy = 'primary' | 'secondary' | 'tertiary' | 'ghost' | 'destructive';
export type ButtonSize = 'small' | 'medium' | 'large';

const buttonSizeClass: Record<ButtonSize, string> = { small: 'k-button--sm', medium: 'k-button--md', large: 'k-button--lg' };

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'> {
  readonly hierarchy?: ButtonHierarchy;
  readonly size?: ButtonSize;
  readonly leadingIcon?: IconName;
  readonly trailingIcon?: IconName;
  // Critical-action lock (81:11): the Submitting frame (11:1201) keeps the
  // hierarchy colours at 55% opacity instead of the disabled treatment.
  readonly loading?: boolean;
  // The same lock on sibling actions held while another request runs
  // (Price Comparison · Confirming, 13:760); it does not announce progress.
  readonly locked?: boolean;
  readonly children: ReactNode;
}

export function Button({ hierarchy = 'primary', size = 'medium', leadingIcon, trailingIcon, loading = false, locked = false, disabled, children, type = 'button', ...rest }: ButtonProps) {
  return (
    <button
      {...rest}
      type={type}
      disabled={disabled === true || loading || locked}
      aria-busy={loading || undefined}
      className={`k-button k-button--${hierarchy} ${buttonSizeClass[size]}${loading || locked ? ' k-button--loading' : ''}`}
    >
      {leadingIcon === undefined ? null : <Icon name={leadingIcon} />}
      <span>{children}</span>
      {trailingIcon === undefined ? null : <Icon name={trailingIcon} />}
    </button>
  );
}

// Icon Button (94:99). Every icon-only action carries a tooltip and an
// accessible name, per the icon accessibility contract on "28 — Accessibility".
export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'children'> {
  readonly icon: IconName;
  readonly label: string;
  readonly size?: 'small' | 'medium';
  readonly shortcut?: string | undefined;
}

export function IconButton({ icon, label, size = 'small', shortcut, type = 'button', ...rest }: IconButtonProps) {
  return (
    <Tooltip label={label} shortcut={shortcut}>
      <button {...rest} type={type} aria-label={label} className={`k-icon-button k-icon-button--${size === 'small' ? 'sm' : 'md'}`}>
        <Icon name={icon} />
      </button>
    </Tooltip>
  );
}

export function Tooltip({ label, shortcut, children }: { readonly label: string; readonly shortcut?: string | undefined; readonly children: ReactNode }) {
  return (
    <span className="k-tooltip-host">
      {children}
      <span role="tooltip" className="k-tooltip">
        <span className="k-tooltip__label">{label}</span>
        {shortcut === undefined ? null : <span className="k-tooltip__shortcut">{shortcut}</span>}
      </span>
    </span>
  );
}

export type FieldState = 'default' | 'error' | 'success' | 'loading';

function fieldClass(state: FieldState): string {
  return state === 'default' ? 'k-field' : `k-field k-field--${state}`;
}

export interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'className' | 'size'> {
  readonly label: string;
  readonly state?: FieldState;
  readonly message?: string | undefined;
  readonly hint?: string | undefined;
  readonly controlSize?: 'medium' | 'large';
  // A read-only mask that keeps the Default look (Settings · API Token, 17:155).
  readonly masked?: boolean;
}

export function TextField({ label, state = 'default', message, hint, controlSize = 'medium', masked = false, id, ...rest }: TextFieldProps) {
  const fieldId = id ?? `field-${label.replaceAll(/\s+/gu, '-').toLocaleLowerCase('tr-TR')}`;
  return (
    <label className={fieldClass(state)} htmlFor={fieldId}>
      <span className="k-field__label">{label}</span>
      <input
        {...rest}
        id={fieldId}
        className={`k-field__control${controlSize === 'large' ? ' k-field__control--lg' : ''}${masked ? ' k-field__control--masked' : ''}`}
        aria-invalid={state === 'error' ? true : undefined}
      />
      {message === undefined ? null : <span className="k-field__message">{message}</span>}
      {hint === undefined ? null : <span className="k-field__hint">{hint}</span>}
    </label>
  );
}

export interface TextAreaFieldProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'className'> {
  readonly label: string;
  readonly state?: FieldState;
  readonly message?: string | undefined;
  readonly hint?: string | undefined;
}

export function TextAreaField({ label, state = 'default', message, hint, id, ...rest }: TextAreaFieldProps) {
  const fieldId = id ?? `area-${label.replaceAll(/\s+/gu, '-').toLocaleLowerCase('tr-TR')}`;
  return (
    <label className={`${fieldClass(state)} k-field--textarea`} htmlFor={fieldId}>
      <span className="k-field__label">{label}</span>
      <textarea {...rest} id={fieldId} className="k-field__control" aria-invalid={state === 'error' ? true : undefined} />
      {message === undefined ? null : <span className="k-field__message">{message}</span>}
      {hint === undefined ? null : <span className="k-field__hint">{hint}</span>}
    </label>
  );
}

export type SelectOption = ListOption;

export interface SelectFieldProps {
  readonly label: string;
  readonly value: string;
  readonly options: readonly SelectOption[];
  readonly onChange: (value: string) => void;
  readonly placeholder?: string | undefined;
  readonly state?: FieldState;
  readonly message?: string | undefined;
  readonly hint?: string | undefined;
  readonly disabled?: boolean | undefined;
  // Select Field / Loading (49:31) and the matching Select Menu states.
  readonly menuState?: ListMenuState | undefined;
}

// Select Field (49:38) paired with Select Menu (52:22): the value (or the
// placeholder), a flexible spacer and the 16px chevron.
export function SelectField({ label, value, options, onChange, placeholder = 'Seçin', state = 'default', message, hint, disabled = false, menuState = 'default' }: SelectFieldProps) {
  const labelId = useId();
  const valueId = useId();
  const { triggerProps, popover, expanded } = useListbox({ label, options, value, onChange, menuState, matchTriggerWidth: true });
  const selected = options.find((option) => option.value === value);
  const loading = (state === 'loading' || menuState === 'loading') && selected === undefined;
  const text = loading ? 'Yükleniyor…' : selected?.label ?? placeholder;
  const valueClass = selected === undefined ? 'k-select-trigger__value k-select-trigger__value--placeholder' : 'k-select-trigger__value';
  return (
    <div className={`${fieldClass(state)} k-field--select${expanded ? ' k-field--open' : ''}`}>
      <span className="k-field__label" id={labelId}>{label}</span>
      <button
        type="button"
        className="k-field__control k-select-trigger"
        disabled={disabled}
        aria-labelledby={`${labelId} ${valueId}`}
        aria-invalid={state === 'error' ? true : undefined}
        title={selected?.label}
        {...triggerProps}
      >
        <span className={valueClass} id={valueId}>{text}</span>
        <Icon name="control-chevron-down" size={16} />
      </button>
      {message === undefined ? null : <span className="k-field__message">{message}</span>}
      {hint === undefined ? null : <span className="k-field__hint">{hint}</span>}
      {popover}
    </div>
  );
}

// Search Field (94:119). Loading swaps the leading glyph for the activity icon.
export function SearchField({ value, onChange, placeholder = 'Ara: ID, alıcı, takip kodu…', disabled = false, loading = false, label = 'Ara' }: {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly placeholder?: string;
  readonly disabled?: boolean;
  readonly loading?: boolean;
  readonly label?: string;
}) {
  return (
    <div className={disabled ? 'k-search k-search--disabled' : 'k-search'}>
      <Icon name={loading ? 'system-activity' : 'action-search'} />
      <input
        className="k-search__input"
        type="search"
        value={value}
        disabled={disabled}
        aria-label={label}
        placeholder={loading ? 'Aranıyor…' : placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

// Switch (51:15) — 40×24 control with a ≥40px accessible hit target.
export function Switch({ checked, onChange, disabled = false, label }: {
  readonly checked: boolean;
  readonly onChange: (checked: boolean) => void;
  readonly disabled?: boolean;
  readonly label: string;
}) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled} className="k-switch" onClick={() => onChange(!checked)} />
  );
}

// Switch Field (53:9228) — label above, switch plus state text in a control row.
export function SwitchField({ label, checked, onChange, disabled = false, onText = 'Aktif', offText = 'Pasif' }: {
  readonly label: string;
  readonly checked: boolean;
  readonly onChange: (checked: boolean) => void;
  readonly disabled?: boolean;
  readonly onText?: string;
  readonly offText?: string;
}) {
  return (
    <div className="k-field">
      <span className="k-field__label">{label}</span>
      <div className="k-switch-field__row">
        <Switch checked={checked} onChange={onChange} disabled={disabled} label={label} />
        <span className={disabled ? 'k-switch-field__state k-switch-field__state--disabled' : 'k-switch-field__state'}>{checked ? onText : offText}</span>
      </div>
    </div>
  );
}

// Segmented Control (72:106) — a single-choice group: arrow keys move the
// selection and focus together (28 — Accessibility), Enter/Space confirms.
export function SegmentedControl<T extends string>({ options, value, onChange, label }: {
  readonly options: readonly { readonly value: T; readonly label: string }[];
  readonly value: T;
  readonly onChange: (value: T) => void;
  readonly label: string;
}) {
  const group = useRef<HTMLDivElement>(null);
  const move = (delta: number) => {
    const index = options.findIndex((option) => option.value === value);
    const nextIndex = (index + delta + options.length) % options.length;
    const next = options[nextIndex];
    if (next === undefined) return;
    onChange(next.value);
    group.current?.querySelectorAll<HTMLButtonElement>('[role="radio"]')[nextIndex]?.focus();
  };
  return (
    <div ref={group} className="k-segmented" role="radiogroup" aria-label={label} onKeyDown={(event) => {
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') { event.preventDefault(); move(1); }
      else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') { event.preventDefault(); move(-1); }
    }}>
      {options.map((option) => (
        <button key={option.value} type="button" role="radio" aria-checked={option.value === value} tabIndex={option.value === value ? 0 : -1} className="k-segmented__item" onClick={() => onChange(option.value)}>
          {option.label}
        </button>
      ))}
    </div>
  );
}

export type StatusTone = 'neutral' | 'information' | 'success' | 'warning' | 'error';

// Accessible status: colour + indicator + label. Never colour alone (3:107).
export function StatusPill({ tone, label }: { readonly tone: StatusTone; readonly label: string }) {
  return (
    <span className={`k-status k-status--${tone}`}>
      <span className="k-status__dot" />
      {label}
    </span>
  );
}

// Shipment Status Badge (3:107) — the 13 lifecycle states from the design.
const shipmentStatuses = {
  draft: { label: 'Taslak', tone: 'neutral' },
  ready: { label: 'İşleme Hazır', tone: 'information' },
  creating: { label: 'Sipariş Oluşturuluyor', tone: 'information' },
  created: { label: 'Sipariş Oluşturuldu', tone: 'information' },
  checking: { label: 'Kargo Kaydı Kontrol Ediliyor', tone: 'information' },
  inDelivery: { label: 'Teslim Sürecinde', tone: 'information' },
  delivered: { label: 'Teslim Edildi', tone: 'success' },
  notDelivered: { label: 'Teslim Edilemedi', tone: 'warning' },
  returning: { label: 'Geri Geliyor', tone: 'warning' },
  cancellationRequest: { label: 'İptal Talebi', tone: 'warning' },
  lost: { label: 'Kayıp', tone: 'error' },
  cancelled: { label: 'İptal Edildi', tone: 'error' },
  unknown: { label: 'Bilinmeyen Durum', tone: 'neutral' },
} as const satisfies Record<string, { readonly label: string; readonly tone: StatusTone }>;

export type ShipmentStatusKey = keyof typeof shipmentStatuses;

const shipmentStatusAliases: Record<string, ShipmentStatusKey> = {
  draft: 'draft', taslak: 'draft', new: 'draft', pending: 'draft',
  ready: 'ready', ready_to_process: 'ready', readytoprocess: 'ready', processable: 'ready',
  creating_order: 'creating', creating: 'creating', order_creating: 'creating',
  order_created: 'created', created: 'created',
  checking_cargo_record: 'checking', checking: 'checking', cargo_record_checking: 'checking',
  in_delivery_process: 'inDelivery', in_delivery: 'inDelivery', shipped: 'inDelivery', on_delivery: 'inDelivery', transit: 'inDelivery',
  delivered: 'delivered', teslim_edildi: 'delivered',
  not_delivered: 'notDelivered', undelivered: 'notDelivered', delivery_failed: 'notDelivered',
  returning: 'returning', returned: 'returning', return: 'returning',
  lost: 'lost', missing: 'lost',
  cancellation_request: 'cancellationRequest', cancel_request: 'cancellationRequest', cancellation_requested: 'cancellationRequest',
  cancelled: 'cancelled', canceled: 'cancelled',
};

export function resolveShipmentStatus(status: string): ShipmentStatusKey {
  const normalized = status.trim().toLocaleLowerCase('en-US').replaceAll(/[\s-]+/gu, '_');
  return shipmentStatusAliases[normalized] ?? 'unknown';
}

// The provider label is shown when the raw status is not one of the 13 known
// states; the raw value itself stays in Diagnostics (29 — Developer Handoff).
export function shipmentStatusLabel(status: string, statusLabel?: string): string {
  const key = resolveShipmentStatus(status);
  return key === 'unknown' && statusLabel !== undefined && statusLabel.trim() !== '' ? statusLabel : shipmentStatuses[key].label;
}

export function ShipmentStatusBadge({ status, statusLabel }: { readonly status: string; readonly statusLabel?: string }) {
  return <StatusPill tone={shipmentStatuses[resolveShipmentStatus(status)].tone} label={shipmentStatusLabel(status, statusLabel)} />;
}

// API Connection Status (3:126). Variant names stay English; labels are Turkish.
export type ConnectionStatusKey = 'connected' | 'connecting' | 'offline' | 'unauthorized' | 'service-problem' | 'timeout';

const connectionStatuses: Record<ConnectionStatusKey, { readonly label: string; readonly tone: StatusTone }> = {
  connected: { label: 'Bağlı', tone: 'success' },
  connecting: { label: 'Bağlanıyor', tone: 'information' },
  offline: { label: 'Çevrimdışı', tone: 'warning' },
  timeout: { label: 'Zaman Aşımı', tone: 'warning' },
  unauthorized: { label: 'Yetkisiz', tone: 'error' },
  'service-problem': { label: 'Servis Sorunu', tone: 'error' },
};

export function ApiConnectionStatus({ status }: { readonly status: ConnectionStatusKey }) {
  const definition = connectionStatuses[status];
  return <StatusPill tone={definition.tone} label={definition.label} />;
}

// Stepper (176:345) — four-step shipment creation progress.
export function Stepper({ steps, current }: { readonly steps: readonly string[]; readonly current: number }) {
  return (
    <ol className="k-stepper">
      {steps.map((step, index) => {
        const state = index < current ? 'completed' : index === current ? 'active' : 'upcoming';
        return (
          <li key={step} className={`k-stepper__step k-stepper__step--${state}`} aria-current={state === 'active' ? 'step' : undefined}>
            <span className="k-stepper__indicator">{state === 'completed' ? '✓' : index + 1}</span>
            <span className="k-stepper__label">{step}</span>
            {index === steps.length - 1 ? null : <span className="k-stepper__connector" />}
          </li>
        );
      })}
    </ol>
  );
}

export function IconGlyph({ name, size, className }: { readonly name: IconName; readonly size?: IconSize | undefined; readonly className?: string | undefined }) {
  return <Icon name={name} size={size} className={className} />;
}
