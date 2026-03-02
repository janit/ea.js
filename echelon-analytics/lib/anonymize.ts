// Echelon Analytics — Pre-storage Anonymization
//
// Deterministic transforms so analytics aggregation still works
// (same visitor → same anonymous ID within a day) but nothing
// about tracked instances is identifiable.

import type { SemanticEvent, ViewRecord } from "../types.ts";
import { ANONYMIZE_SITES, SECRET } from "./config.ts";

// ── HMAC key: daily-rotating seed + server secret ────────────────────────────
// The secret prevents anyone from reversing the anonymization without access
// to the server's ECHELON_SECRET. Without a secret, a random 32-byte key is
// generated at startup (anonymization is still irreversible across restarts).

const fallbackSecret = crypto.getRandomValues(new Uint8Array(32));

let hmacKeyDate = "";
let hmacKey: CryptoKey | null = null;

async function getHmacKey(): Promise<CryptoKey> {
  const today = new Date().toISOString().slice(0, 10);
  if (hmacKey && hmacKeyDate === today) return hmacKey;
  const salt = SECRET ? new TextEncoder().encode(SECRET) : fallbackSecret;
  const dateBytes = new TextEncoder().encode(`echelon-anon-${today}`);
  const seed = new Uint8Array(salt.length + dateBytes.length);
  seed.set(salt);
  seed.set(dateBytes, salt.length);
  hmacKey = await crypto.subtle.importKey(
    "raw",
    seed,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  hmacKeyDate = today;
  return hmacKey;
}

async function hmacHex(input: string): Promise<string> {
  const key = await getHmacKey();
  const data = new TextEncoder().encode(input);
  const sig = await crypto.subtle.sign("HMAC", key, data);
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Deterministic index into an array from a string input. */
function pickIndex(hex: string, len: number): number {
  // Use first 8 hex chars as a 32-bit number
  return parseInt(hex.slice(0, 8), 16) % len;
}

// ── Lookup tables ────────────────────────────────────────────────────────────

const PLANETS = [
  "Kepler-442b",
  "Proxima-b",
  "TRAPPIST-1e",
  "Gliese-667Cc",
  "HD-40307g",
  "Kepler-62f",
  "Kepler-186f",
  "Wolf-1061c",
  "LHS-1140b",
  "Ross-128b",
  "Tau-Ceti-e",
  "Teegarden-b",
  "GJ-357d",
  "K2-18b",
  "TOI-700d",
  "Kepler-22b",
  "Kepler-452b",
  "Kepler-1649c",
  "GJ-1002b",
  "Proxima-d",
  "TRAPPIST-1f",
  "TRAPPIST-1g",
  "Kepler-438b",
  "Kepler-296e",
  "HD-85512b",
  "Gliese-581g",
  "55-Cancri-e",
  "CoRoT-7b",
  "Kepler-69c",
  "Kepler-62e",
  "Barnard-b",
  "LP-890-9c",
];

const FISHERMEN = [
  "Torstein Sjømann",
  "Bjørn Havblikk",
  "Olav Sildekong",
  "Knut Garndrager",
  "Einar Tråler",
  "Sigurd Fjordmann",
  "Harald Bølge",
  "Ragnar Snørekaster",
  "Leif Tangansen",
  "Gunnar Strømvik",
  "Magnus Kveitefisker",
  "Arne Juksafisker",
  "Trygve Notmann",
  "Per Loddefanger",
  "Sverre Brosme",
  "Ivar Djuphavsmann",
  "Nils Stormfugl",
  "Oddvar Sjøsprøyt",
  "Rolf Skjæansen",
  "Terje Havøransen",
  "Kristoffer Torsken",
  "Halvor Krabben",
  "Ottar Steinbitansen",
  "Thoralf Makkansen",
  "Asbjørn Pilken",
  "Fritjof Hummeransen",
  "Geir Flyndansen",
  "Steinar Laksen",
  "Vidar Reketansen",
  "Håkon Blåskjelansen",
  "Yngve Sjøstjernansen",
  "Dagfinn Brislingansen",
  "Petter Seifisker",
  "Jostein Breiflabb",
  "Morten Havabbansen",
  "Sondre Blåkveiten",
  "Øystein Lusufiskansen",
  "Torbjørn Steinkobbe",
  "Arvid Sjøpølsen",
  "Kolbjørn Brugden",
  "Anfinn Leppefisker",
  "Birger Trollgansen",
  "Erling Rypen",
  "Guttorm Småsild",
  "Helge Dorgansen",
  "Jarle Havmusen",
  "Kåre Teinansen",
  "Lauritz Åleransen",
  "Mathias Fjordansen",
  "Nikolai Blåstålansen",
];

const NSA_CODENAMES = [
  "STELLAR-WIND",
  "PRISM",
  "XKEYSCORE",
  "MUSCULAR",
  "BULLRUN",
  "BOUNDLESS-INFORMANT",
  "TEMPORA",
  "UPSTREAM",
  "PINWALE",
  "MARINA",
  "MAINWAY",
  "NUCLEON",
  "TURBULENCE",
  "TURMOIL",
  "TUMULT",
  "DISHFIRE",
  "MYSTIC",
  "SOMALGET",
  "DIRTBOX",
  "STINGRAY",
  "FAIRVIEW",
  "STORMBREW",
  "BLARNEY",
  "OAKSTAR",
  "LITHIUM",
  "SENTRY-EAGLE",
  "TREASURE-MAP",
  "AURORAGOLD",
  "COTTONMOUTH",
  "QUANTUM-INSERT",
  "FOXACID",
  "EGOTISTICAL-GIRAFFE",
  "FLYING-PIG",
  "HAPPY-FOOT",
  "JUGGERNAUT",
  "RAGE-MASTER",
  "SWAP",
  "DROPOUT-JEEP",
  "MONKEYROCKET",
  "OLYMPIA",
];

const OPERATION_CODENAMES = [
  "operation-mockingbird",
  "operation-paperclip",
  "operation-gladio",
  "operation-condor",
  "operation-cyclone",
  "operation-ajax",
  "operation-northwoods",
  "operation-chaos",
  "operation-mongoose",
  "operation-overlord",
  "operation-valkyrie",
  "operation-barbarossa",
  "operation-market-garden",
  "operation-sea-lion",
  "operation-fortitude",
  "operation-mincemeat",
  "operation-crossbow",
  "operation-dragoon",
  "operation-dynamo",
  "operation-torch",
  "operation-husky",
  "operation-avalanche",
  "operation-shingle",
  "operation-anvil",
  "operation-plunder",
  "operation-varsity",
  "operation-grenade",
  "operation-veritable",
  "operation-lumberjack",
  "operation-undertone",
  "operation-iceberg",
  "operation-downfall",
  "operation-coronet",
  "operation-olympic",
  "operation-magic-carpet",
  "operation-paperback",
  "operation-ivy-bells",
  "operation-gold",
  "operation-stopwatch",
  "operation-wrath-of-god",
];

// ── Public API ───────────────────────────────────────────────────────────────

export function shouldAnonymize(siteId: string): boolean {
  return ANONYMIZE_SITES.has(siteId.toLowerCase());
}

export async function anonymizeView(record: ViewRecord): Promise<ViewRecord> {
  const vidHash = await hmacHex(record.visitor_id);
  const sidHash = record.session_id ? await hmacHex(record.session_id) : null;
  const refHash = record.referrer ? await hmacHex(record.referrer) : null;

  return {
    ...record,
    visitor_id: vidHash.slice(0, 16),
    session_id: sidHash
      ? FISHERMEN[pickIndex(sidHash, FISHERMEN.length)]
      : null,
    country_code: record.country_code
      ? PLANETS[pickIndex(await hmacHex(record.country_code), PLANETS.length)]
      : null,
    referrer: refHash
      ? `https://nsa-intranet.gov/ops/${
        NSA_CODENAMES[pickIndex(refHash, NSA_CODENAMES.length)]
      }-${refHash.slice(0, 4)}`
      : null,
    utm_source: record.utm_source
      ? OPERATION_CODENAMES[
        pickIndex(await hmacHex(record.utm_source), OPERATION_CODENAMES.length)
      ]
      : record.utm_source,
    utm_medium: record.utm_medium
      ? OPERATION_CODENAMES[
        pickIndex(await hmacHex(record.utm_medium), OPERATION_CODENAMES.length)
      ]
      : record.utm_medium,
    utm_campaign: record.utm_campaign
      ? OPERATION_CODENAMES[
        pickIndex(
          await hmacHex(record.utm_campaign),
          OPERATION_CODENAMES.length,
        )
      ]
      : record.utm_campaign,
    utm_content: record.utm_content
      ? OPERATION_CODENAMES[
        pickIndex(await hmacHex(record.utm_content), OPERATION_CODENAMES.length)
      ]
      : record.utm_content,
    utm_term: record.utm_term
      ? OPERATION_CODENAMES[
        pickIndex(await hmacHex(record.utm_term), OPERATION_CODENAMES.length)
      ]
      : record.utm_term,
  };
}

export async function anonymizeEvent(
  record: SemanticEvent,
): Promise<SemanticEvent> {
  const vidHash = record.visitor_id ? await hmacHex(record.visitor_id) : null;
  const sidHash = record.session_id ? await hmacHex(record.session_id) : null;
  const refHash = record.referrer ? await hmacHex(record.referrer) : null;

  return {
    ...record,
    visitor_id: vidHash ? vidHash.slice(0, 16) : null,
    session_id: sidHash
      ? FISHERMEN[pickIndex(sidHash, FISHERMEN.length)]
      : null,
    referrer: refHash
      ? `https://nsa-intranet.gov/ops/${
        NSA_CODENAMES[pickIndex(refHash, NSA_CODENAMES.length)]
      }-${refHash.slice(0, 4)}`
      : null,
    data: "{}",
    experiment_id: record.experiment_id
      ? `experiment-${(await hmacHex(record.experiment_id)).slice(0, 8)}`
      : record.experiment_id,
    variant_id: record.variant_id
      ? `variant-${(await hmacHex(record.variant_id)).slice(0, 8)}`
      : record.variant_id,
    utm_campaign: record.utm_campaign
      ? OPERATION_CODENAMES[
        pickIndex(
          await hmacHex(record.utm_campaign),
          OPERATION_CODENAMES.length,
        )
      ]
      : record.utm_campaign,
  };
}
