// Echelon Analytics — Debug Logger
//
// Lightweight gated logger. Enabled by ECHELON_DEBUG=true env var
// or toggled at runtime via the admin settings panel.
// Usage: debug("pow", "token verified", { result: "valid" })
// Output: [echelon:pow] token verified { result: "valid" }

import { DEBUG } from "./config.ts";

/** Runtime override — toggled from admin settings. null = use env var. */
let runtimeDebug: boolean | null = null;

export function isDebugEnabled(): boolean {
  return runtimeDebug ?? DEBUG;
}

export function setRuntimeDebug(enabled: boolean | null): void {
  runtimeDebug = enabled;
}

export function debug(label: string, ...args: unknown[]): void {
  if (!isDebugEnabled()) return;
  console.log(`[echelon:${label}]`, ...args);
}
