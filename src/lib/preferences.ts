import type { ProfileId, TabId } from "./splicer";

export type Preferences = {
  theme: "light" | "dark" | "system";
  accent: "blue" | "copper" | "teal";
  density: "comfortable" | "compact";
  defaultTab: TabId;
  mapApp: "apple" | "google";
  showOverviewRoute: boolean;
  showOverviewTeam: boolean;
};
export const DEFAULT_PREFERENCES: Preferences = { theme: "light", accent: "blue", density: "comfortable", defaultTab: "overview", mapApp: "apple", showOverviewRoute: true, showOverviewTeam: true };
export function normalizePreferences(value: Partial<Preferences>): Preferences {
  return { theme: ["light", "dark", "system"].includes(value.theme ?? "") ? value.theme! : "light", accent: ["blue", "copper", "teal"].includes(value.accent ?? "") ? value.accent! : "blue", density: value.density === "compact" ? "compact" : "comfortable", defaultTab: ["overview", "calendar", "nodes", "routes", "billing", "stats"].includes(value.defaultTab ?? "") ? value.defaultTab! : "overview", mapApp: value.mapApp === "google" ? "google" : "apple", showOverviewRoute: value.showOverviewRoute !== false, showOverviewTeam: value.showOverviewTeam !== false };
}
export function readPreferences(person: ProfileId) {
  if (typeof window === "undefined") return DEFAULT_PREFERENCES;
  try { return normalizePreferences(JSON.parse(localStorage.getItem(`strand-preferences-${person}`) || "null") ?? { theme: localStorage.getItem("splicer-theme") === "dark" ? "dark" : "light" }); } catch { return DEFAULT_PREFERENCES; }
}
export function writePreferences(person: ProfileId, value: Preferences) {
  localStorage.setItem(`strand-preferences-${person}`, JSON.stringify(value));
}
