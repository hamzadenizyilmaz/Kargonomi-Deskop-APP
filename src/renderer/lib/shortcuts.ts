// "28 — Accessibility" (22:47): Ctrl/Cmd + S runs the Save action of the form
// on screen. A page opts in by marking that button with data-save-shortcut, so
// the shortcut goes through the same validation and busy guard as a click and
// does nothing while the button is disabled or an open dialog made it inert.
export function handleSaveShortcut(event: KeyboardEvent): void {
  if (!(event.ctrlKey || event.metaKey) || event.altKey || event.shiftKey || event.key.toLowerCase() !== 's') return;
  event.preventDefault();
  if (event.repeat) return;
  const button = document.querySelector<HTMLButtonElement>('button[data-save-shortcut]');
  if (button === null || button.disabled || button.closest('[inert]') !== null) return;
  button.click();
}
