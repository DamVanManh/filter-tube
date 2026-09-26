import { Injectable, computed, inject, signal } from '@angular/core';
import { CapacitorHttp } from '@capacitor/core';
import { GOOGLE_AUTH_ERROR, errorCodeOf, googleAuth } from '../native/google-auth';
import { SignedInAccount } from './models';
import { readJson, writeJson } from './storage';
import { YoutubeApi } from './youtube-api';

export const YOUTUBE_COMMENT_SCOPE = 'https://www.googleapis.com/auth/youtube.force-ssl';
const SIGNED_IN_KEY = 'signed-in-account';
const TOKEN_LIFETIME_MS = 50 * 60 * 1000;
const REVOKE_URL = 'https://oauth2.googleapis.com/revoke';

export const SIGN_IN_OUTCOME = {
  SIGNED_IN: 'signed-in',
  CANCELLED: 'cancelled',
  NO_CHANNEL: 'no-channel',
  FAILED: 'failed',
} as const;
export type SignInOutcome = (typeof SIGN_IN_OUTCOME)[keyof typeof SIGN_IN_OUTCOME];

export class SignInRequiredError extends Error {
  constructor() {
    super('Sign-in required');
  }
}

@Injectable({ providedIn: 'root' })
export class AuthStore {
  private readonly api = inject(YoutubeApi);
  readonly account = signal<SignedInAccount | null>(null);
  readonly isSignedIn = computed(() => this.account() !== null);
  private token: { value: string; obtainedAt: number } | null = null;

  async restore(): Promise<void> {
    this.account.set(await readJson<SignedInAccount>(SIGNED_IN_KEY));
  }

  async signIn(): Promise<SignInOutcome> {
    try {
      const token = await this.authorize(true);
      const account = await this.api.myChannel(token);
      if (!account) return SIGN_IN_OUTCOME.NO_CHANNEL;
      this.account.set(account);
      await writeJson(SIGNED_IN_KEY, account);
      return SIGN_IN_OUTCOME.SIGNED_IN;
    } catch (error) {
      return errorCodeOf(error) === GOOGLE_AUTH_ERROR.CANCELLED ? SIGN_IN_OUTCOME.CANCELLED : SIGN_IN_OUTCOME.FAILED;
    }
  }

  async signOut(): Promise<void> {
    const token = this.token?.value;
    this.token = null;
    this.account.set(null);
    await writeJson(SIGNED_IN_KEY, null);
    if (token) {
      try {
        await CapacitorHttp.post({ url: REVOKE_URL, params: { token }, headers: {} });
      } catch {}
    }
  }

  async accessToken(): Promise<string> {
    if (!this.isSignedIn()) throw new SignInRequiredError();
    if (this.token && Date.now() - this.token.obtainedAt < TOKEN_LIFETIME_MS) return this.token.value;
    try {
      return await this.authorize(false);
    } catch (error) {
      if (errorCodeOf(error) === GOOGLE_AUTH_ERROR.NEEDS_INTERACTION) return this.authorize(true);
      throw error;
    }
  }

  private async authorize(interactive: boolean): Promise<string> {
    const result = await googleAuth.authorize({ scopes: [YOUTUBE_COMMENT_SCOPE], interactive });
    this.token = { value: result.accessToken, obtainedAt: Date.now() };
    return result.accessToken;
  }
}
