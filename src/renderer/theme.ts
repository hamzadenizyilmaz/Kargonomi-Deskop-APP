// Appearance preferences from Figma page "22 — Settings" (Görünüm, 17:333).
// Theme: the Dark values live in styles/tokens.css; "Sistem" simply removes
// the override so the prefers-color-scheme block decides.

import type { DesktopSettings } from '../shared/ipc.ts';

export function applyTheme(theme: DesktopSettings['theme']): void {
  const root = document.documentElement;
  if (theme === 'system') root.removeAttribute('data-theme');
  else root.dataset['theme'] = theme;
}
