import AsyncStorage from "@react-native-async-storage/async-storage";
import { DevSettings, defaultDevSettings } from "@/config/devMode";

const STORAGE_KEY = "ask:devSettings:v1";

let cache: DevSettings | undefined;

export async function loadDevSettings(): Promise<DevSettings> {
  if (cache) return cache;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<DevSettings>;
      cache = { ...defaultDevSettings, ...parsed };
      return cache;
    }
  } catch {
    // fall through to defaults
  }
  cache = { ...defaultDevSettings };
  return cache;
}

export async function saveDevSettings(settings: Partial<DevSettings>): Promise<DevSettings> {
  const current = await loadDevSettings();
  cache = { ...current, ...settings };
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch {
    // ignore write failures in restricted sandboxes
  }
  return cache;
}

export function getCachedDevSettings(): DevSettings {
  return cache ? { ...cache } : { ...defaultDevSettings };
}

export function clearDevSettingsCache(): void {
  cache = undefined;
}
