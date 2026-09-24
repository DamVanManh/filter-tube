import { Injectable, signal } from '@angular/core';
import { DEFAULT_SETTINGS } from './defaults';
import { Settings } from './models';
import { parseSettings } from './settings-io';
import { readJson, writeJson } from './storage';

const SETTINGS_KEY = 'settings';
const PIN_KEY = 'pin-hash';

async function sha256(text: string): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

@Injectable({ providedIn: 'root' })
export class SettingsStore {
  readonly settings = signal<Settings>(DEFAULT_SETTINGS);
  readonly hasPin = signal(false);
  private pinHash: string | null = null;

  async load(): Promise<void> {
    const stored = parseSettings(await readJson<unknown>(SETTINGS_KEY));
    if (stored) this.settings.set(stored);
    this.pinHash = await readJson<string>(PIN_KEY);
    this.hasPin.set(this.pinHash !== null);
  }

  async update(change: (current: Settings) => Settings): Promise<void> {
    const next = change(this.settings());
    this.settings.set(next);
    await writeJson(SETTINGS_KEY, next);
  }

  async replaceFromJson(json: string): Promise<boolean> {
    let raw: unknown;
    try {
      raw = JSON.parse(json);
    } catch {
      return false;
    }
    const parsed = parseSettings(raw);
    if (!parsed) return false;
    await this.update(() => parsed);
    return true;
  }

  exportJson(): string {
    return JSON.stringify(this.settings(), null, 2);
  }

  async blockChannel(id: string, title: string): Promise<void> {
    await this.update((s) =>
      s.blockedChannels.some((c) => c.id === id)
        ? s
        : {
            ...s,
            blockedChannels: [...s.blockedChannels, { id, title }],
            trustedChannels: s.trustedChannels.filter((c) => c.id !== id),
          },
    );
  }

  async setPin(pin: string): Promise<void> {
    this.pinHash = await sha256(pin);
    await writeJson(PIN_KEY, this.pinHash);
    this.hasPin.set(true);
  }

  async verifyPin(pin: string): Promise<boolean> {
    return this.pinHash !== null && (await sha256(pin)) === this.pinHash;
  }
}
