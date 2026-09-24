import { Preferences } from '@capacitor/preferences';

export async function readJson<T>(key: string): Promise<T | null> {
  const { value } = await Preferences.get({ key });
  if (value === null) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export async function writeJson(key: string, value: unknown): Promise<void> {
  await Preferences.set({ key, value: JSON.stringify(value) });
}
