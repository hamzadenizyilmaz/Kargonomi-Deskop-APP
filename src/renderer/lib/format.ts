// Turkish lira amounts are written the way the design shows them
// ("₺12.480,50", "₺184,90"). The API sends decimal strings such as
// "12480.50"; anything that is not a plain number is shown unchanged.
const lira = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' });

export function formatLira(amount: string): string {
  const trimmed = amount.trim();
  if (!/^-?\d+(?:\.\d+)?$/u.test(trimmed)) return amount;
  return lira.format(Number(trimmed));
}

export function liraOr(amount: string | null | undefined, fallback = '—'): string {
  return amount === null || amount === undefined ? fallback : formatLira(amount);
}
