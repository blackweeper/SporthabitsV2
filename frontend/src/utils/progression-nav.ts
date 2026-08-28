// Single source of truth for the Progression screen's sub-tabs, so any link
// that should open directly on a given sub-tab (from the dashboard, the
// profile menu, or any future screen) stays valid even if tabs are
// renamed/added/removed later.
export type ProgressionTab =
  | "overview"
  | "exercises"
  | "records"
  | "level"
  | "habits"
  | "goals"
  | "journal";

export function progressionHref(tab: ProgressionTab): string {
  return `/progression?tab=${tab}`;
}
