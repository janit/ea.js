import { DISPLAY_TIMEZONE } from "./config.ts";

/**
 * Format a UTC ISO timestamp for admin display in the configured timezone.
 * Returns "YYYY-MM-DD HH:MM" in the DISPLAY_TIMEZONE.
 */
export function formatTime(utcIso: string): string {
  if (!utcIso) return "-";
  try {
    const d = new Date(utcIso);
    if (isNaN(d.getTime())) return utcIso.slice(0, 16);

    if (DISPLAY_TIMEZONE === "UTC") {
      return utcIso.slice(0, 16);
    }

    return d.toLocaleString("sv-SE", {
      timeZone: DISPLAY_TIMEZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    // Invalid timezone — fall back to raw UTC slice
    return utcIso.slice(0, 16);
  }
}

/** Format a UTC ISO timestamp as date only (YYYY-MM-DD) in the configured timezone. */
export function formatDate(utcIso: string): string {
  if (!utcIso) return "-";
  try {
    const d = new Date(utcIso);
    if (isNaN(d.getTime())) return utcIso.slice(0, 10);

    if (DISPLAY_TIMEZONE === "UTC") {
      return utcIso.slice(0, 10);
    }

    return d.toLocaleString("sv-SE", {
      timeZone: DISPLAY_TIMEZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  } catch {
    return utcIso.slice(0, 10);
  }
}
