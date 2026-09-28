import { Injectable, signal } from '@angular/core';
import { HistoryEntry, recordInHistory } from './history';
import { Video } from './models';
import { readJson, writeJson } from './storage';

const HISTORY_KEY = 'history';

@Injectable({ providedIn: 'root' })
export class HistoryStore {
  readonly entries = signal<readonly HistoryEntry[]>([]);

  async load(): Promise<void> {
    this.entries.set((await readJson<HistoryEntry[]>(HISTORY_KEY)) ?? []);
  }

  async record(video: Video): Promise<void> {
    if (this.entries()[0]?.video.id === video.id) return;
    this.entries.set(recordInHistory(this.entries(), video, new Date()));
    await writeJson(HISTORY_KEY, this.entries());
  }
}
