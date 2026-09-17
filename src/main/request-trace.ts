// Observes the HTTP exchange behind one IPC operation for Tanılama
// (Figma 18:2 / 18:199 / 18:364): method, endpoint, final status, attempts and
// the provider's correlation id. Only metadata is kept — never headers such as
// Authorization, and never request or response bodies.

const correlationHeaders = ['x-correlation-id', 'x-request-id', 'request-id'] as const;

export type TraceFailure = 'timeout' | 'network';

export class RequestTracer {
  method = '';
  endpoint = '';
  status: number | null = null;
  attempts = 0;
  correlationId: string | null = null;
  failure: TraceFailure | null = null;

  readonly fetch: typeof globalThis.fetch = async (input, init) => {
    const request = input instanceof Request && init === undefined ? input : new Request(input, init);
    const url = new URL(request.url);
    this.method = request.method;
    this.endpoint = `${url.pathname}${url.search}`;
    this.attempts += 1;
    try {
      const response = await globalThis.fetch(request);
      this.status = response.status;
      this.failure = null;
      this.correlationId = correlationHeaders.map((name) => response.headers.get(name)).find((value) => value !== null) ?? this.correlationId;
      return response;
    } catch (error) {
      this.status = null;
      this.failure = error instanceof DOMException && (error.name === 'AbortError' || error.name === 'TimeoutError') ? 'timeout' : 'network';
      throw error;
    }
  };
}
