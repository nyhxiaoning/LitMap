/**
 * Shared filter & grouping utilities.
 * Single source of truth for search, time filter, zoom thresholds, and city normalization.
 */

import type { BookData } from "../types";

// ---------------------------------------------------------------------------
// Zoom threshold constants (used by MapView and LeftPanel)
// ---------------------------------------------------------------------------

export const ZOOM = {
  /** L1→L2: continent-level → country */
  CONTINENT: 3,
  /** L2→L3: country → province (2° grid) */
  COUNTRY: 4.5,
  /** L3→L4: province → city */
  PROVINCE: 5.5,
  /** L4→L5: city → district */
  CITY: 6.5,
  /** L5→L6: district → exact coordinates */
  DISTRICT: 7.5,
} as const;

// ---------------------------------------------------------------------------
// Time filter constants & helpers (used by MapView, LeftPanel, BottomTimeline)
// ---------------------------------------------------------------------------

export const CENTURY_SLIDER_20TH = 6;
export const CENTURY_SLIDER_21ST = 7;
export const SUB_ERA_20TH_MIN = 60;
export const SUB_ERA_20TH_MAX = 64;
export const SUB_ERA_21ST_MIN = 70;
export const SUB_ERA_21ST_MAX = 71;

export interface SubEraDef {
  value: number;
  label: string;
  range: [number, number];
}

export const SUB_20TH: SubEraDef[] = [
  { value: SUB_ERA_20TH_MIN, label: "1900–1919", range: [1900, 1919] },
  { value: 61, label: "1920–1939", range: [1920, 1939] },
  { value: 62, label: "1940–1959", range: [1940, 1959] },
  { value: 63, label: "1960–1979", range: [1960, 1979] },
  { value: SUB_ERA_20TH_MAX, label: "1980–1999", range: [1980, 1999] },
];

export const SUB_21ST: SubEraDef[] = [
  { value: SUB_ERA_21ST_MIN, label: "2000–2019", range: [2000, 2019] },
  { value: SUB_ERA_21ST_MAX, label: "2020–2039", range: [2020, 2039] },
];

export function extractPubYear(tags: string[]): number | null {
  for (const tag of tags) {
    const m = tag.match(/^(\d{4})年?/);
    if (m) {
      const y = parseInt(m[1], 10);
      if (y >= 1000 && y <= 2100) return y;
    }
  }
  return null;
}

/** Check if a book matches the current timeFilter */
export function matchesTimeFilter(
  sliderVal: number,
  tags: string[],
  timeFilter: number | null,
): boolean {
  if (timeFilter === null) return true;

  // Century-level filter (0-7)
  if (timeFilter <= CENTURY_SLIDER_21ST) return sliderVal === timeFilter;

  // Sub-era filter for 20世纪 and 21世纪
  if (timeFilter >= SUB_ERA_20TH_MIN && timeFilter <= SUB_ERA_20TH_MAX) {
    if (sliderVal !== CENTURY_SLIDER_20TH) return false;
    const pubYear = extractPubYear(tags);
    if (pubYear === null) return false;
    const sub = SUB_20TH.find((s) => s.value === timeFilter);
    if (!sub) return false;
    return pubYear >= sub.range[0] && pubYear <= sub.range[1];
  }

  if (timeFilter >= SUB_ERA_21ST_MIN && timeFilter <= SUB_ERA_21ST_MAX) {
    if (sliderVal !== CENTURY_SLIDER_21ST) return false;
    const pubYear = extractPubYear(tags);
    if (pubYear === null) return false;
    const sub = SUB_21ST.find((s) => s.value === timeFilter);
    if (!sub) return false;
    return pubYear >= sub.range[0] && pubYear <= sub.range[1];
  }

  return true;
}

// ---------------------------------------------------------------------------
// Search filter (shared by MapView, LeftPanel, and TopBar)
// ---------------------------------------------------------------------------

/** Check whether a book matches a free-text search query */
export function matchesSearch(book: BookData, query: string): boolean {
  const q = query.toLowerCase().trim();
  if (!q) return true;
  return (
    book.title.toLowerCase().includes(q) ||
    book.author.toLowerCase().includes(q) ||
    book.country.toLowerCase().includes(q) ||
    book.city.toLowerCase().includes(q) ||
    (book.tags?.some((t) => t.toLowerCase().includes(q)) ?? false)
  );
}

/** Filter a book list by search query */
export function filterBySearch(books: BookData[], query: string): BookData[] {
  const q = query.toLowerCase().trim();
  if (!q) return books;
  return books.filter((b) => matchesSearch(b, q));
}

// ---------------------------------------------------------------------------
// City name normalization (shared by MapView, LeftPanel, and scripts)
// ---------------------------------------------------------------------------

/** Strip parenthetical notes and slashes to get the base city name */
export function normalizeCity(city: string): string {
  return city.replace(/[（(][^)）]*[)）]/g, "").replace(/\/.*$/, "").trim();
}

/**
 * Build a city → base-city index by finding the shortest city name in the
 * same country that is a prefix of each city.
 */
export function buildCityIndex(bookList: BookData[]): Map<string, string> {
  const byCountry = new Map<string, string[]>();
  for (const b of bookList) {
    if (!byCountry.has(b.country)) byCountry.set(b.country, []);
    byCountry.get(b.country)!.push(b.city);
  }
  const index = new Map<string, string>();
  for (const [, cities] of byCountry) {
    const sorted = [...new Set(cities)].sort((a, b) => a.length - b.length);
    for (const city of cities) {
      const clean = normalizeCity(city);
      for (const base of sorted) {
        const cleanBase = normalizeCity(base);
        if (clean.startsWith(cleanBase) && cleanBase.length >= 2) {
          index.set(clean, cleanBase);
          break;
        }
      }
      if (!index.has(clean)) index.set(clean, clean);
    }
  }
  return index;
}
