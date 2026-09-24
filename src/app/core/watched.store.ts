import { Injectable, signal } from '@angular/core';
import { readJson, writeJson } from './storage';

const WATCHED_KEY = 'watched';
const MAX_REMEMBERED = 2000;

@Injectable({ providedIn: 'root' })
export class WatchedStore {
  readonly watchedIds = signal<ReadonlySet<string>>(new Set());
  private order: string[] = [];

  async load(): Promise<void> {
    this.order = (await readJson<string[]>(WATCHED_KEY)) ?? [];
    this.watchedIds.set(new Set(this.order));
  }

  async markWatched(id: string): Promise<void> {
    if (this.watchedIds().has(id)) return;
    this.order = [...this.order, id].slice(-MAX_REMEMBERED);
    this.watchedIds.set(new Set(this.order));
    await writeJson(WATCHED_KEY, this.order);
  }
}
