/**
 * fetch-missing-realviews.ts — 为缺少 realViewUrl 的书从 Wikipedia/Commons 获取实景图
 *
 * 策略（按优先级，尽快退出）:
 *   1. 从 city/realViewName 提取已知城市/地标 → cache 命中（即时）
 *   2. Wikipedia API: English page summary
 *   3. Wikipedia API: Chinese page summary（仅中文地名）
 *   4. Wikimedia Commons 文件搜索
 *   5. English Wikipedia opensearch（模糊）
 *
 * 只更新 data/realview-cache.json。之后运行 npm run build-data 即可。
 *
 * 用法: npx tsx scripts/fetch-missing-realviews.ts [--limit N] [--fast]
 *   --fast: 只做 cache/city lookup，不调 API
 */

import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { LITERARY_LANDMARKS, CITY_WIKI } from "./realview-maps.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");
const REGIONS_DIR = path.join(ROOT, "data", "regions");
const CACHE_PATH = path.join(ROOT, "data", "realview-cache.json");

const DELAY_MS = 400;

// ---------------------------------------------------------------------------
// Cache
// ---------------------------------------------------------------------------

interface CacheEntry {
  url: string;
  name: string;
}

const cache: Record<string, CacheEntry> = fs.existsSync(CACHE_PATH)
  ? JSON.parse(fs.readFileSync(CACHE_PATH, "utf-8"))
  : {};

function saveCache() {
  fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2), "utf-8");
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function setCache(key: string, entry: CacheEntry) {
  if (!cache[key]) {
    cache[key] = entry;
    saveCache();
  }
}

// ---------------------------------------------------------------------------
// Text utils
// ---------------------------------------------------------------------------

function clean(s: string): string {
  return s
    .replace(/[（(][^)）]*[)）]/g, "")
    .replace(/\/.*$/, "")
    .replace(/[→→].*$/, "")
    .trim();
}

/** Extract all potential location name fragments from a string */
function extractLocations(s: string, country: string): string[] {
  const results: string[] = [];
  const base = clean(s);

  if (base) results.push(base);

  // Split by common delimiters
  const parts = base.split(/[→→\-\—、，,\s]+/).filter((p) => p.length > 1);
  for (const p of parts) results.push(p);

  // Try to remove Chinese province/city suffixes
  const noSuffix = base.replace(/[省市区县州镇村]$/, "");
  if (noSuffix !== base && noSuffix.length > 1) results.push(noSuffix);

  // With country appended
  if (country) {
    for (const r of [...results]) {
      results.push(`${r} ${country}`);
    }
  }

  // Parenthetical content
  const pm = s.match(/[（(]([^)）]+)[)）]/);
  if (pm?.[1] && pm[1].length > 1) {
    results.push(pm[1]);
    if (country) results.push(`${pm[1]} ${country}`);
  }

  return [...new Set(results)].filter((k) => k.length > 1);
}

/** Check if string contains Chinese characters */
function hasChinese(s: string): boolean {
  return /[一-鿿]/.test(s);
}

// ---------------------------------------------------------------------------
// API helpers
// ---------------------------------------------------------------------------

const UA = "LitMap/1.0";

async function wikiSummary(lang: "en" | "zh", title: string): Promise<CacheEntry | null> {
  const base = lang === "zh"
    ? "https://zh.wikipedia.org/api/rest_v1/page/summary/"
    : "https://en.wikipedia.org/api/rest_v1/page/summary/";
  try {
    const resp = await fetch(`${base}${encodeURIComponent(title)}`, {
      headers: { "User-Agent": UA },
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    const imgUrl = data.originalimage?.source || data.thumbnail?.source;
    if (imgUrl) return { url: imgUrl, name: data.title };
  } catch { /* skip */ }
  return null;
}

async function commonsSearch(query: string): Promise<CacheEntry | null> {
  try {
    const searchUrl =
      `https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&srnamespace=6&srlimit=3&format=json&origin=*`;
    const resp = await fetch(searchUrl, { headers: { "User-Agent": UA } });
    if (!resp.ok) return null;
    const data = await resp.json();
    const results: Array<{ title: string }> = data.query?.search || [];

    const good = results.filter(
      (r) =>
        !/\.svg$/i.test(r.title) &&
        !/\.ogg$/i.test(r.title) &&
        !/icon|logo|flag|map|diagram|chart|signature/i.test(r.title)
    );

    for (const r of good.slice(0, 2)) {
      const imgUrl = await commonsImageUrl(r.title);
      if (imgUrl) return { url: imgUrl, name: r.title.replace(/^File:/, "") };
      await sleep(150);
    }
  } catch { /* skip */ }
  return null;
}

async function commonsImageUrl(fileTitle: string): Promise<string | null> {
  try {
    const url =
      `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(fileTitle)}&prop=imageinfo&iiprop=url&iiurlwidth=1200&format=json&origin=*`;
    const resp = await fetch(url, { headers: { "User-Agent": UA } });
    if (!resp.ok) return null;
    const data = await resp.json();
    for (const page of Object.values(data.query?.pages || {}) as any[]) {
      const info = page.imageinfo?.[0];
      if (info?.thumburl) return info.thumburl;
      if (info?.url) return info.url;
    }
  } catch { /* skip */ }
  return null;
}

async function enWikiSearch(query: string): Promise<CacheEntry | null> {
  try {
    const searchUrl =
      `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(query)}&limit=3&namespace=0&format=json&origin=*`;
    const resp = await fetch(searchUrl, { headers: { "User-Agent": UA } });
    const data = await resp.json();
    const titles: string[] = data[1] || [];
    for (const title of titles) {
      if (/List_of|disambiguation/i.test(title)) continue;
      const result = await wikiSummary("en", title);
      if (result) return result;
      await sleep(150);
    }
  } catch { /* skip */ }
  return null;
}

// ---------------------------------------------------------------------------
// Helper: get map entries sorted by key length (longest first) for substring matching
// ---------------------------------------------------------------------------

const CITY_WIKI_ENTRIES = Object.entries(CITY_WIKI).sort(
  (a, b) => b[0].length - a[0].length
);
const LITERARY_LANDMARKS_ENTRIES = Object.entries(LITERARY_LANDMARKS).sort(
  (a, b) => b[0].length - a[0].length
);

// ---------------------------------------------------------------------------
// Lookup logic — tries to find an image for one book
// ---------------------------------------------------------------------------

async function findImage(
  realViewName: string,
  city: string,
  country: string,
  fastOnly: boolean
): Promise<CacheEntry | null> {
  // ---- Phase 1: Instant cache lookups ----

  // 1a. Known literary landmarks (longest key first for specificity)
  for (const [chName, enWiki] of LITERARY_LANDMARKS_ENTRIES) {
    if (realViewName.includes(chName) || (city && city.includes(chName))) {
      if (cache[enWiki]) {
        console.log(`    ✅ Cache hit (landmark): "${enWiki}"`);
        return cache[enWiki];
      }
    }
  }

  // 1b. Known cities — exact match only (substring match in Phase 2 to avoid
  //     false positives like "威尔士" matching instead of "新南威尔士州")
  const locs = extractLocations(city || realViewName, country);
  for (const loc of locs) {
    if (CITY_WIKI[loc]) {
      const enWiki = CITY_WIKI[loc];
      if (cache[enWiki]) {
        console.log(`    ✅ Cache hit (city): "${loc}" → "${enWiki}"`);
        return cache[enWiki];
      }
    }
  }

  // 1c. Direct cache lookup by location names
  for (const loc of locs) {
    if (cache[loc]) {
      console.log(`    ✅ Cache hit (direct): "${loc}"`);
      return cache[loc];
    }
  }

  if (fastOnly) return null;

  // ---- Phase 2: Known landmark/city Wikipedia fetches (not in cache) ----

  // 2a. Try known landmarks on Wikipedia (longest key first)
  for (const [chName, enWiki] of LITERARY_LANDMARKS_ENTRIES) {
    if (realViewName.includes(chName) || (city && city.includes(chName))) {
      console.log(`    🎯 Landmark fetch: "${enWiki}"`);
      const result = await wikiSummary("en", enWiki);
      if (result) { setCache(enWiki, result); return result; }
      await sleep(DELAY_MS);
    }
  }

  // 2b. Try known cities on Wikipedia (longest key first)
  const triedCities = new Set<string>();
  for (const loc of locs) {
    for (const [chCity, enWiki] of CITY_WIKI_ENTRIES) {
      if ((loc === chCity || loc.includes(chCity)) && chCity.length >= 2 && !triedCities.has(enWiki)) {
        triedCities.add(enWiki);
        console.log(`    🏙 City fetch: "${enWiki}"`);
        const result = await wikiSummary("en", enWiki);
        if (result) { setCache(enWiki, result); return result; }
        await sleep(DELAY_MS);
      }
    }
  }

  // ---- Phase 3: Search by generated keys ----

  // Generate English-friendly search terms
  const searchTerms: string[] = [];

  // Use city first (more likely to find on Wikipedia)
  const cleanCity = clean(city);
  if (cleanCity && hasChinese(cleanCity)) {
    // Try to find an English equivalent
    for (const [chCity, enWiki] of Object.entries(CITY_WIKI)) {
      if (cleanCity.includes(chCity)) {
        searchTerms.push(enWiki.replace(/_/g, " "));
      }
    }
    // Also try city + country as a search
    if (country) searchTerms.push(`${cleanCity} ${country}`);
  } else if (cleanCity && !hasChinese(cleanCity)) {
    searchTerms.push(cleanCity);
    if (country) searchTerms.push(`${cleanCity} ${country}`);
  }

  // Add country-based search
  if (country) searchTerms.push(country);

  // Add clean realViewName if not already covered
  const rvClean = clean(realViewName);
  if (rvClean && rvClean !== cleanCity) {
    searchTerms.push(rvClean);
  }

  // Deduplicate, keep first 3
  const unique = [...new Set(searchTerms)].slice(0, 3);

  for (const term of unique) {
    if (cache[term]) {
      console.log(`    ✅ Cache hit: "${term}"`);
      return cache[term];
    }

    // EN Wikipedia
    console.log(`    🔍 EN: "${term}"`);
    let result = await wikiSummary("en", term);
    if (result) { setCache(term, result); return result; }
    await sleep(DELAY_MS);

    // ZH Wikipedia (only for Chinese terms)
    if (hasChinese(term)) {
      console.log(`    🔍 ZH: "${term}"`);
      result = await wikiSummary("zh", term);
      if (result) { setCache(term, result); return result; }
      await sleep(DELAY_MS);
    }

    // Commons
    console.log(`    🔍 Commons: "${term}"`);
    result = await commonsSearch(term);
    if (result) { setCache(term, result); return result; }
    await sleep(DELAY_MS);
  }

  // ---- Phase 4: Fuzzy English search ----
  const bestTerm = unique.find((t) => !hasChinese(t)) || country;
  if (bestTerm) {
    console.log(`    🔎 Fuzzy: "${bestTerm}"`);
    const result = await enWikiSearch(bestTerm);
    if (result) { setCache(bestTerm, result); return result; }
    await sleep(DELAY_MS);
  }

  return null;
}

// ---------------------------------------------------------------------------
// Book extraction
// ---------------------------------------------------------------------------

interface RegionBook {
  title: string;
  city: string;
  country: string;
  realViewName: string;
  realViewUrl: string;
}

function getMissingBooks(): RegionBook[] {
  const files = fs
    .readdirSync(REGIONS_DIR)
    .filter((f) => f.endsWith(".json") && !f.startsWith("_"));

  const missing: RegionBook[] = [];

  for (const file of files) {
    const filePath = path.join(REGIONS_DIR, file);
    const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    const country = data.region || "";

    for (const book of data.books || []) {
      if (book.realViewName && !book.realViewUrl) {
        missing.push({
          title: book.title,
          city: book.city || "",
          country,
          realViewName: book.realViewName,
          realViewUrl: book.realViewUrl || "",
        });
      }
    }
  }

  return missing;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2);
  const limitIdx = args.indexOf("--limit");
  const limit = limitIdx >= 0 ? parseInt(args[limitIdx + 1]) : Infinity;
  const fastOnly = args.includes("--fast");

  const missing = getMissingBooks();
  const mode = fastOnly ? "(fast mode — cache only, no API calls)" : "(full mode)";
  console.log(`📋 Books missing realViewUrl: ${missing.length} ${mode}`);
  console.log(`📷 Initial cache entries: ${Object.keys(cache).length}\n`);

  let success = 0;
  let processed = 0;

  for (const book of missing) {
    if (processed >= limit) break;
    processed++;

    console.log(
      `[${processed}/${missing.length}] ${book.title} — "${book.realViewName}"`
    );

    const result = await findImage(
      book.realViewName,
      book.city,
      book.country,
      fastOnly
    );

    if (result) {
      success++;
      console.log(`  ✅ ${result.url.slice(0, 100)}...`);
    } else {
      console.log(`  ❌ No image found`);
    }

    // Shorter delay for cache-only mode
    if (!fastOnly) await sleep(DELAY_MS);
  }

  saveCache();
  console.log(`\n🎉 Done! Found ${success}/${processed} images.`);
  console.log(`📷 Cache now has ${Object.keys(cache).length} entries.`);
  console.log(`\nNext: npm run build-data`);
}

main().catch(console.error);
