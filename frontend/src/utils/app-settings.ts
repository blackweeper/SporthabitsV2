import AsyncStorage from '@react-native-async-storage/async-storage';

export type CalendarViewMode = 'week' | 'month' | 'auto';

export type AppSettings = {
  calendarView: CalendarViewMode;
  /** URL de base du backend d'import santé (Health Auto Export), ex. "https://xxx.onrender.com". */
  healthSyncBaseUrl: string | null;
  /** Token partagé envoyé en "Authorization: Bearer <token>" vers ce même backend. */
  healthSyncToken: string | null;
};

const SETTINGS_KEY = '@ironflow/settings';

const DEFAULT_SETTINGS: AppSettings = {
  calendarView: 'week',
  healthSyncBaseUrl: null,
  healthSyncToken: null,
};

export async function getAppSettings(): Promise<AppSettings> {
  const raw = await AsyncStorage.getItem(SETTINGS_KEY);
  if (!raw) return DEFAULT_SETTINGS;
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveAppSettings(
  patch: Partial<AppSettings>,
): Promise<AppSettings> {
  const current = await getAppSettings();
  const next = { ...current, ...patch };
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
  return next;
}
