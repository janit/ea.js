export interface Theme {
  id: string;
  name: string;
}

export const THEMES: Theme[] = [
  { id: "default", name: "\u2744\uFE0F Informer" },
  { id: "c64", name: "\uD83D\uDC74 Tasavallan tietokone" },
];

export const DEFAULT_THEME = "default";
