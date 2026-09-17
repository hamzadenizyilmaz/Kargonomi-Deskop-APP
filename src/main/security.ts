export interface SecureWebPreferences {
  readonly nodeIntegration: false;
  readonly contextIsolation: true;
  readonly sandbox: true;
  readonly webSecurity: true;
  readonly allowRunningInsecureContent: false;
  readonly spellcheck: true;
  readonly plugins: true;
}

export function secureWebPreferences(): SecureWebPreferences {
  return {
    nodeIntegration: false,
    contextIsolation: true,
    sandbox: true,
    webSecurity: true,
    allowRunningInsecureContent: false,
    spellcheck: true,
    // Chromium's built-in PDF viewer renders the barcode preview (17 — Barcode).
    plugins: true,
  };
}

export function isAllowedExternalUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:';
  } catch {
    return false;
  }
}
