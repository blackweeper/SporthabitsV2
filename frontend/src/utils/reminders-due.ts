import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  CalendarEvent,
  CALENDAR_EVENT_KIND_EMOJI,
  CALENDAR_EVENT_KIND_LABEL,
  Reminder,
  REMINDER_KIND_LABEL,
} from '@/src/utils/gym-storage';

const DISMISSED_KEY = '@ironflow/dismissedReminders';

export type DueReminder = {
  key: string;
  emoji: string;
  title: string;
  subtitle: string;
  href: string;
};

export async function getDismissedReminderKeys(): Promise<string[]> {
  const raw = await AsyncStorage.getItem(DISMISSED_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function dismissReminderKey(key: string): Promise<void> {
  const list = await getDismissedReminderKeys();
  if (!list.includes(key)) list.push(key);
  await AsyncStorage.setItem(DISMISSED_KEY, JSON.stringify(list.slice(-200)));
}

function parseHHMM(time: string): number | null {
  const m = time.match(/^(\d{2}):(\d{2})$/);
  if (!m) return null;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}

/** In-app-only reminders: no OS push, computed live from Reminder (weekly
 * recurrence) and CalendarEvent (one-off, per-event) records whenever the
 * dashboard is open. Best-effort — see index.tsx for the Web Notification
 * companion that fires while the tab stays open. */
export function computeDueReminders(
  reminders: Reminder[],
  events: CalendarEvent[],
  dismissed: string[],
  now: Date = new Date(),
): DueReminder[] {
  const due: DueReminder[] = [];
  const todayStr = now.toISOString().slice(0, 10);
  const nowMin = now.getHours() * 60 + now.getMinutes();

  for (const r of reminders) {
    if (!r.enabled) continue;
    if (!r.daysOfWeek.includes(now.getDay())) continue;
    const key = `r-${r.id}-${todayStr}`;
    if (dismissed.includes(key)) continue;
    const rMin = parseHHMM(r.time);
    if (rMin == null) continue;
    if (nowMin >= rMin && nowMin - rMin <= 90) {
      due.push({
        key,
        emoji: '🔔',
        title: r.title || REMINDER_KIND_LABEL[r.kind],
        subtitle: `Rappel · ${r.time}`,
        href: `/reminder/${r.id}`,
      });
    }
  }

  for (const e of events) {
    if (e.date !== todayStr) continue;
    if (!e.time || e.reminderMinutesBefore == null) continue;
    const key = `e-${e.id}-${todayStr}`;
    if (dismissed.includes(key)) continue;
    const eventMin = parseHHMM(e.time);
    if (eventMin == null) continue;
    const triggerMin = eventMin - e.reminderMinutesBefore;
    if (nowMin >= triggerMin && nowMin <= eventMin + 60) {
      const remaining = eventMin - nowMin;
      due.push({
        key,
        emoji: CALENDAR_EVENT_KIND_EMOJI[e.kind],
        title: e.title || CALENDAR_EVENT_KIND_LABEL[e.kind],
        subtitle: remaining > 0 ? `Dans ${remaining} min · ${e.time}` : `Maintenant · ${e.time}`,
        href: `/calendar-event/${e.id}`,
      });
    }
  }

  return due;
}
