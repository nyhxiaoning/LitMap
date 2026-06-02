/**
 * Fetch SPECIFIC landmark photos from Wikipedia for each book.
 *
 * Strategy (in priority order):
 * 1. Known literary landmark → exact Wikipedia page
 * 2. Extract specific landmark from city field → search Wikipedia for that
 * 3. Fallback: city-level Wikipedia page
 *
 * Usage: npx tsx scripts/fetch-realviews.ts [--limit N]
 */

import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { LITERARY_LANDMARKS, CITY_WIKI } from "./realview-maps.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BOOKS_PATH = path.resolve(__dirname, "../src/data/books.ts");
const CACHE_PATH = path.resolve(__dirname, "../data/realview-cache.json");

const DELAY_MS = 800;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ---- Cache ----
interface CacheEntry { url: string; name: string; }
const cache: Record<string, CacheEntry> = fs.existsSync(CACHE_PATH)
  ? JSON.parse(fs.readFileSync(CACHE_PATH, "utf-8"))
  : {};

function saveCache() {
  fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2), "utf-8");
}

function cleanCity(city: string): string {
  return city.replace(/[（(][^)）]*[)）]/g, "").replace(/\/.*$/, "").trim();
}

/** Extract the most specific landmark name from a city field */
function extractSpecificLandmark(city: string): string | null {
  // Check parenthetical notes first — these are usually the most specific
  const pm = city.match(/[（(]([^)）]+)[)）]/);
  if (pm) {
    // Check if the parenthetical is a known literary landmark
    for (const key of Object.keys(LITERARY_LANDMARKS)) {
      if (pm[1].includes(key)) return key;
    }
    return pm[1];
  }
  // Check the full city string for known landmarks
  for (const key of Object.keys(LITERARY_LANDMARKS)) {
    if (city.includes(key)) return key;
  }
  return null;
}

async function getWikipediaImage(
  wikiTitle: string
): Promise<CacheEntry | null> {
  if (cache[wikiTitle]) return cache[wikiTitle];
  try {
    const apiUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(wikiTitle)}`;
    const resp = await fetch(apiUrl, {
      headers: { "User-Agent": "TimeMap/1.0" },
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    const imgUrl = data.originalimage?.source || data.thumbnail?.source;
    if (imgUrl) {
      const entry = { url: imgUrl, name: data.title };
      cache[wikiTitle] = entry;
      saveCache();
      return entry;
    }
  } catch { /* skip */ }
  return null;
}

async function searchWikipediaImage(
  query: string
): Promise<CacheEntry | null> {
  if (cache[query]) return cache[query];
  try {
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(query)}&limit=3&namespace=0&format=json&origin=*`;
    const resp = await fetch(searchUrl, {
      headers: { "User-Agent": "TimeMap/1.0" },
    });
    const data = await resp.json();
    const titles: string[] = data[1] || [];
    for (const title of titles) {
      if (/List_of|disambiguation/i.test(title)) continue;
      const result = await getWikipediaImage(title);
      if (result) {
        cache[query] = result;
        saveCache();
        return result;
      }
      await sleep(250);
    }
  } catch { /* skip */ }
  return null;
}

async function main() {
  const args = process.argv.slice(2);
  const limitIdx = args.indexOf("--limit");
  const limit = limitIdx >= 0 ? parseInt(args[limitIdx + 1]) : Infinity;
  const forceIdx = args.indexOf("--force");
  const force = forceIdx >= 0;

  const content = fs.readFileSync(BOOKS_PATH, "utf-8");
  const lines = content.split("\n");

  const bookStarts: number[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (/^\s*rank:\s*\d+,$/.test(lines[i])) {
      bookStarts.push(i);
    }
  }

  console.log(`Total books: ${bookStarts.length}\n`);

  let updated = 0;
  let processed = 0;

  for (const startLine of bookStarts) {
    if (processed >= limit) break;

    // Check if already has realViewUrl (skip unless --force)
    let hasUrl = false;
    for (let j = startLine; j < Math.min(startLine + 20, lines.length); j++) {
      if (/realViewUrl:\s*`[^`]+`/.test(lines[j])) { hasUrl = true; break; }
      if (/^\s*\},$/.test(lines[j])) break;
    }
    if (hasUrl && !force) { processed++; continue; }

    // Extract fields
    const block = lines.slice(startLine, startLine + 20).join("\n");
    const titleM = block.match(/title:\s*`([^`]*)`/);
    const cityM = block.match(/city:\s*`([^`]*)`/);
    const countryM = block.match(/country:\s*`([^`]*)`/);
    if (!titleM || !cityM) continue;

    const city = cityM[1];
    const country = countryM?.[1] || "";
    const base = cleanCity(city);
    processed++;

    let result: CacheEntry | null = null;

    // ---- Strategy 1: Known literary landmark ----
    const landmark = extractSpecificLandmark(city);
    if (landmark && LITERARY_LANDMARKS[landmark]) {
      const wikiTitle = LITERARY_LANDMARKS[landmark];
      console.log(`[${processed}] ${titleM[1]} — 🎯 "${landmark}" → "${wikiTitle}"`);
      result = await getWikipediaImage(wikiTitle);
      await sleep(DELAY_MS);
    }

    // ---- Strategy 2: Search for the specific landmark by name ----
    if (!result && landmark) {
      console.log(`[${processed}] ${titleM[1]} — 🔍 landmark "${landmark}"`);
      result = await searchWikipediaImage(`${landmark} ${country}`);
      await sleep(DELAY_MS);
    }

    // ---- Strategy 3: Search with the full base city name ----
    if (!result && base.length > 0 && base.length <= 15) {
      const wikiCity = CITY_WIKI[base];
      if (wikiCity) {
        console.log(`[${processed}] ${titleM[1]} — 🏙 city "${base}" → "${wikiCity}"`);
        result = await getWikipediaImage(wikiCity);
        await sleep(DELAY_MS);
      }
    }

    // ---- Strategy 4: Wikipedia search for base city ----
    if (!result) {
      console.log(`[${processed}] ${titleM[1]} — 🔎 search "${base} ${country}"`);
      result = await searchWikipediaImage(`${base} ${country}`);
      await sleep(DELAY_MS);
    }

    if (result) {
      const nameLineIdx = lines.findIndex(
        (l, idx) => idx >= startLine && /realViewName:\s*`/.test(l)
      );
      if (nameLineIdx >= 0) {
        lines[nameLineIdx] = lines[nameLineIdx].replace(
          /realViewName:\s*`[^`]*`/,
          `realViewName: \`${landmark || base}\``
        );
      }
      const urlLineIdx = lines.findIndex(
        (l, idx) => idx >= startLine && /realViewUrl:\s*`/.test(l)
      );
      if (urlLineIdx >= 0) {
        lines[urlLineIdx] = lines[urlLineIdx].replace(
          /realViewUrl:\s*`[^`]*`/,
          `realViewUrl: \`${result.url}\``
        );
      }
      updated++;
      console.log(`  ✓ ${result.url.slice(0, 90)}...`);
    } else {
      console.log(`  ✗ no image found`);
    }
  }

  if (updated > 0) {
    fs.writeFileSync(BOOKS_PATH, lines.join("\n"), "utf-8");
    console.log(`\nDone! Updated ${updated}/${processed} books.`);
    console.log(`Cache: ${Object.keys(cache).length} entries.`);
  } else {
    console.log(`\nNo books updated.`);
  }
}

main().catch(console.error);
