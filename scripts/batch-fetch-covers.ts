/**
 * batch-fetch-covers.ts — 批量获取缺失封面
 *
 * 策略:
 *   1. Wikidata: 通过中文书名找英文标题
 *   2. Open Library: 用英文标题 + ISBN 获取封面
 *   3. 跳过豆瓣搜索(被限流), 之后可手动补充
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import type { RegionFile, DoubanCache } from "./types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const REGIONS_DIR = path.join(ROOT, "data", "regions");
const CACHE_PATH = path.join(ROOT, "data", "douban-cache.json");
const COVERS_DIR = path.join(ROOT, "public", "covers");

const UAS = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36";
const HEADERS = { "User-Agent": UAS, "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8" };

interface BookToProcess { title: string; author: string; regionFile: string; regionName: string; bookIndex: number; }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchJSON(url: string): Promise<any> {
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function loadCache(): DoubanCache {
  try { return JSON.parse(fs.readFileSync(CACHE_PATH, "utf-8")); } catch { return {}; }
}
function saveCache(c: DoubanCache): void { fs.writeFileSync(CACHE_PATH, JSON.stringify(c, null, 2), "utf-8"); }
function loadRegions() {
  return fs.readdirSync(REGIONS_DIR).filter(f => f.endsWith(".json") && f !== "_template.json").map(f => {
    const fp = path.join(REGIONS_DIR, f);
    return { filePath: fp, data: JSON.parse(fs.readFileSync(fp, "utf-8")) as RegionFile };
  });
}
function saveRegion(fp: string, d: RegionFile): void {
  fs.writeFileSync(fp, JSON.stringify(d, null, 2) + "\n", "utf-8");
}

// ---------------------------------------------------------------------------
// Wikidata: get English title
// ---------------------------------------------------------------------------

async function getEnTitle(title: string): Promise<string | null> {
  try {
    const url = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(title)}&language=zh&format=json&limit=2`;
    const data = await fetchJSON(url);
    if (!data.search?.length) return null;
    const qid = data.search[0].id;
    const entityUrl = `https://www.wikidata.org/wiki/Special:EntityData/${qid}.json`;
    const entity = await fetchJSON(entityUrl);
    const labels = entity.entities?.[qid]?.labels || {};
    return labels.en?.value || null;
  } catch { /* best-effort Wikidata query, skip on failure */ return null; }
}

// ---------------------------------------------------------------------------
// Open Library: search + get cover
// ---------------------------------------------------------------------------

async function searchOpenLib(title: string, author: string, enTitle?: string): Promise<{ id: string; coverUrl: string } | null> {
  const queries: string[] = [];
  if (enTitle) {
    queries.push(`${enTitle} ${author}`.trim(), enTitle);
  }
  queries.push(`${title} ${author}`.trim(), title);

  for (const q of queries.slice(0, 3)) {
    try {
      const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&limit=3&fields=key,title,author_name,cover_i,isbn`;
      const data = await fetchJSON(url);
      if (!data.docs?.length) continue;

      // Find best match
      let best = data.docs[0];
      for (const d of data.docs) {
        if (enTitle && d.title?.toLowerCase().includes(enTitle.toLowerCase().substring(0, 10))) { best = d; break; }
      }

      // Build cover URL
      let coverUrl = "";
      if (best.cover_i && typeof best.cover_i === "number") {
        coverUrl = `https://covers.openlibrary.org/b/id/${best.cover_i}-L.jpg`;
      } else if (best.isbn?.[0]) {
        coverUrl = `https://covers.openlibrary.org/b/isbn/${best.isbn[0]}-L.jpg`;
      }

      if (coverUrl) {
        const olKey = best.key?.replace("/works/", "") || `ol-${Date.now()}`;
        return { id: `ol-${olKey}`, coverUrl };
      }
    } catch { /* best-effort Open Library search, skip on failure */ }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Download
// ---------------------------------------------------------------------------

async function downloadCover(url: string, id: string): Promise<boolean> {
  const dest = path.join(COVERS_DIR, `${id}.jpg`);
  if (fs.existsSync(dest)) return true;
  try {
    const res = await fetch(url, { headers: { ...HEADERS, Referer: "https://openlibrary.org/" } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 1000) throw new Error(`${buf.length}B`);
    fs.writeFileSync(dest, buf);
    console.log(`    📷 Saved: ${id}.jpg (${(buf.length / 1024).toFixed(0)}KB)`);
    return true;
  } catch (e: unknown) { console.warn(`    ⚠️  DL fail: ${e instanceof Error ? e.message : String(e)}`); return false; }
}

function update(book: BookToProcess, id: string, cache: DoubanCache): void {
  if (!cache[id]) {
    cache[id] = {
      doubanId: id, title: book.title, author: book.author || "",
      publisher: "", pubYear: "", rating: "", summary: "",
      coverLocalPath: `/covers/${id}.jpg`, fetchedAt: new Date().toISOString(),
    };
  }
  const rd: RegionFile = JSON.parse(fs.readFileSync(book.regionFile, "utf-8"));
  rd.books[book.bookIndex].doubanId = id;
  saveRegion(book.regionFile, rd);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const limit = args.includes("--limit") ? parseInt(args[args.indexOf("--limit") + 1]) : Infinity;

  console.log("📚 Batch Cover Fetcher (Wikidata → Open Library)\n");

  const regions = loadRegions();
  console.log(`📂 ${regions.length} region files`);

  const books: BookToProcess[] = [];
  for (const { filePath, data } of regions) {
    for (let i = 0; i < data.books.length; i++) {
      if (!data.books[i].doubanId) {
        books.push({ title: data.books[i].title, author: data.books[i].author || "", regionFile: filePath, regionName: data.region, bookIndex: i });
      }
    }
  }

  console.log(`📋 Missing covers: ${books.length}`);

  if (dryRun) {
    books.forEach((b, i) => console.log(`${i + 1}. [${b.regionName}] ${b.title}`));
    console.log(`\n✅ Dry run.`);
    return;
  }

  const todo = books.slice(0, limit);
  console.log(`🔄 Processing: ${todo.length} books\n`);

  const cache = loadCache();
  fs.mkdirSync(COVERS_DIR, { recursive: true });
  let ok = 0, nope = 0;

  for (let i = 0; i < todo.length; i++) {
    const b = todo[i];
    console.log(`\n[${i + 1}/${todo.length}] [${b.regionName}] ${b.title}`);

    let found = false;

    // Step 1: Wikidata for English title
    let enTitle: string | null = null;
    try {
      console.log(`    🔍 Wikidata...`);
      enTitle = await getEnTitle(b.title);
      if (enTitle) console.log(`    📖 EN: "${enTitle}"`);
    } catch { /* best-effort Wikidata, continue to Open Library */ }

    // Step 2: Open Library
    console.log(`    🔍 Open Library...`);
    const ol = await searchOpenLib(b.title, b.author, enTitle || undefined);
    if (ol?.coverUrl) {
      if (await downloadCover(ol.coverUrl, ol.id)) {
        update(b, ol.id, cache);
        console.log(`    📝 Updated`);
        found = true; ok++;
      }
    }

    if (!found) {
      console.log(`    ❌ No cover`);
      nope++;
    }

    if (i % 10 === 9) { saveCache(cache); console.log(`    💾 Cache: ${Object.keys(cache).length}`); }
    if (i < todo.length - 1) await sleep(800 + Math.random() * 800);
  }

  saveCache(cache);
  console.log(`\n\n========================================`);
  console.log(`✅ Done! Success: ${ok}, Failed: ${nope}, Total: ${todo.length}`);
  console.log(`   Cache: ${Object.keys(cache).length} entries`);
  console.log(`========================================`);
  console.log(`\n💡 Run: npm run build-data\n`);
}

main().catch(e => { console.error("❌", e); process.exit(1); });
