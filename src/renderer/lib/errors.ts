import { networkFailureMessage } from '../../shared/ipc.ts';

// True when an API call failed before Kargonomi answered (see ipc-handlers).
export function isNetworkFailure(error: unknown): boolean {
  return error instanceof Error && error.message.includes(networkFailureMessage);
}
