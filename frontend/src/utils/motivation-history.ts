import AsyncStorage from "@react-native-async-storage/async-storage";

/** Historique "derniers messages de motivation affichés", pour ne pas
 * répéter — même patron que `getDismissedReminderKeys`/`dismissReminderKey`
 * (`reminders-due.ts`). */

const HISTORY_KEY = "@ironflow/motivationHistory";
const MAX_HISTORY = 15;

export async function getRecentMotivationKeys(): Promise<string[]> {
  const raw = await AsyncStorage.getItem(HISTORY_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function recordMotivationShown(key: string): Promise<void> {
  const list = await getRecentMotivationKeys();
  list.push(key);
  await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(-MAX_HISTORY)));
}
