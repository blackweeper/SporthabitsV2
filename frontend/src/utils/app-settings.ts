import AsyncStorage from '@react-native-async-storage/async-storage';

export type CalendarViewMode = 'week' | 'month' | 'auto';

export type AppSettings = {
  calendarView: CalendarViewMode;
};

const SETTINGS_KEY = '@ironflow/settings';

const DEFAULT_SETTINGS: AppSettings = {
  calendarView: 'auto',
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
