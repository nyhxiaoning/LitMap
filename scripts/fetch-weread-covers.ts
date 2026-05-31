/**
 * fetch-weread-covers.ts — 从微信读书搜索并下载缺失封面
 *
 * 用法: npm run weread-covers
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

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
  Accept: "application/json",
  Referer: "https://weread.qq.com/",
};

interface BookToProcess { title: string; author: string; regionFile: string; regionName: string; bookIndex: number; }

// ---------------------------------------------------------------------------
// WeChat Read search
// ---------------------------------------------------------------------------

async function searchWeread(title: string): Promise<{ bookId: string; coverUrl: string; foundTitle: string } | null> {
  const url = `https://weread.qq.com/web/search/global?keyword=${encodeURIComponent(title)}`;
  try {
    const res = await fetch(url, { headers: HEADERS });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.books?.length > 0) {
      const b = data.books[0].bookInfo;
      // Use original cover URL (s_ prefix = small thumbnail, but it works)
      const coverUrl = b.cover || "";
      return { bookId: b.bookId, coverUrl, foundTitle: b.title };
    }
    return null;
  } catch { return null; }
}

// ---------------------------------------------------------------------------
// Download
// ---------------------------------------------------------------------------

async function downloadCover(url: string, id: string): Promise<boolean> {
  const dest = path.join(COVERS_DIR, `${id}.jpg`);
  if (fs.existsSync(dest)) return true;
  try {
    const res = await fetch(url, {
      headers: { ...HEADERS, Referer: "https://weread.qq.com/", Accept: "*/*" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 2000) throw new Error(`${buf.length}B`);
    fs.writeFileSync(dest, buf);
    console.log(`    📷 Saved: ${id}.jpg (${(buf.length / 1024).toFixed(0)}KB)`);
    return true;
  } catch (e: unknown) { console.warn(`    ⚠️  DL fail: ${e instanceof Error ? e.message : String(e)}`); return false; }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function loadCache(): DoubanCache {
  try { return JSON.parse(fs.readFileSync(CACHE_PATH, "utf-8")); } catch { return {}; }
}
function saveCache(c: DoubanCache): void { fs.writeFileSync(CACHE_PATH, JSON.stringify(c, null, 2), "utf-8"); }

function loadRegions() {
  return fs.readdirSync(REGIONS_DIR)
    .filter(f => f.endsWith(".json") && f !== "_template.json")
    .map(f => ({ filePath: path.join(REGIONS_DIR, f), data: JSON.parse(fs.readFileSync(path.join(REGIONS_DIR, f), "utf-8")) as RegionFile }));
}

function saveRegion(fp: string, d: RegionFile): void {
  fs.writeFileSync(fp, JSON.stringify(d, null, 2) + "\n", "utf-8");
}

function updateRecord(book: BookToProcess, id: string, cache: DoubanCache): void {
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
  console.log("📚 WeChat Read Cover Fetcher\n");

  const regions = loadRegions();
  const books: BookToProcess[] = [];

  for (const { filePath, data } of regions) {
    for (let i = 0; i < data.books.length; i++) {
      if (!data.books[i].doubanId) {
        books.push({
          title: data.books[i].title,
          author: data.books[i].author || "",
          regionFile: filePath,
          regionName: data.region,
          bookIndex: i,
        });
      }
    }
  }

  console.log(`📋 Missing covers: ${books.length}\n`);

  const cache = loadCache();
  fs.mkdirSync(COVERS_DIR, { recursive: true });
  let ok = 0, nope = 0;

  for (let i = 0; i < books.length; i++) {
    const b = books[i];
    console.log(`[${i + 1}/${books.length}] [${b.regionName}] ${b.title}`);

    const wr = await searchWeread(b.title);
    if (wr?.coverUrl) {
      const id = `wr-${wr.bookId}`;
      console.log(`    📖 Found: "${wr.foundTitle}"`);
      if (await downloadCover(wr.coverUrl, id)) {
        updateRecord(b, id, cache);
        console.log(`    📝 Updated`);
        ok++;
      } else {
        nope++;
      }
    } else {
      // Try search with author
      if (b.author) {
        const wr2 = await searchWeread(b.title + " " + b.author.split("/")[0].trim());
        if (wr2?.coverUrl) {
          const id = `wr-${wr2.bookId}`;
          console.log(`    📖 Found: "${wr2.foundTitle}"`);
          if (await downloadCover(wr2.coverUrl, id)) {
            updateRecord(b, id, cache);
            console.log(`    📝 Updated`);
            ok++;
            continue;
          }
        }
      }
      console.log(`    ❌ Not found`);
      nope++;
    }

    if (i % 10 === 9) { saveCache(cache); console.log(`    💾 Cache: ${Object.keys(cache).length}`); }
    if (i < books.length - 1) await sleep(500 + Math.random() * 500);
  }

  saveCache(cache);
  console.log(`\n========================================`);
  console.log(`✅ Done! Success: ${ok}, Failed: ${nope}, Total: ${books.length}`);
  console.log(`   Cache: ${Object.keys(cache).length} entries`);
  console.log(`========================================\n`);
  console.log(`💡 Run: npm run build-data\n`);
}

main().catch(e => { console.error("❌", e); process.exit(1); });
