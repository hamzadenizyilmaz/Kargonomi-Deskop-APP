const REDACTIONS: readonly [RegExp, string][] = [
  [/Authorization:\s*Bearer\s+\S+/giu, 'Authorization: Bearer [REDACTED]'],
  [/(?:api[_-]?token|token|secret|api[_-]?key)\s*[=:]\s*\S+/giu, 'credential=[REDACTED]'],
  [/(?:\+?90|0)?5\d{9}/gu, '[PHONE REDACTED]'],
  [/(?:address|adres)\s*[=:]\s*[^\r\n]+/giu, 'address=[REDACTED]'],
  [/\b\d{10,11}\b/gu, '[IDENTIFIER REDACTED]'],
];

export function redactDiagnostics(value: string): string {
  return REDACTIONS.reduce((safe, [pattern, replacement]) => safe.replace(pattern, replacement), value);
}

export class DiagnosticLog {
  readonly #entries: string[] = [];

  add(operation: string, details: Record<string, string | number | boolean | null | undefined>): void {
    const safeDetails = Object.fromEntries(
      Object.entries(details).filter(([key]) => !/token|authorization|secret|address|phone|tax/iu.test(key)),
    );
    this.#entries.push(redactDiagnostics(JSON.stringify({ at: new Date().toISOString(), operation, ...safeDetails })));
    if (this.#entries.length > 500) this.#entries.shift();
  }

  snapshot(): readonly string[] {
    return [...this.#entries];
  }
}
