export type PanelKey =
  | "journey"
  | "history"
  | "favorites"
  | "search"
  | "settings";

export const PANEL_TITLES: Record<PanelKey, string> = {
  journey: "Journey",
  history: "History",
  favorites: "Favorites",
  search: "Search",
  settings: "Settings",
};
