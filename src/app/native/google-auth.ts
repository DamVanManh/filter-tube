import { registerPlugin } from '@capacitor/core';

export interface AuthorizeOptions {
  readonly scopes: readonly string[];
  readonly interactive: boolean;
}

export interface AuthorizeResult {
  readonly accessToken: string;
  readonly grantedScopes: readonly string[];
}

interface GoogleAuthPlugin {
  authorize(options: AuthorizeOptions): Promise<AuthorizeResult>;
}

export const GOOGLE_AUTH_ERROR = {
  NEEDS_INTERACTION: 'needs-interaction',
  CANCELLED: 'cancelled',
} as const;

export const googleAuth = registerPlugin<GoogleAuthPlugin>('GoogleAuth');

export function errorCodeOf(error: unknown): string | null {
  return typeof error === 'object' && error !== null && 'code' in error ? String((error as { code: unknown }).code) : null;
}
