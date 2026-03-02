export interface Theme {
  id: string;
  name: string;
}

export const THEMES: Theme[] = [
  { id: "default", name: "Informer \u2744\uFE0F" },
  { id: "c64", name: "Tasavallan tietokone \uD83D\uDC74" },
];

export const DEFAULT_THEME = "default";
