/**
 * fetch-douban-book.ts — 单本书豆瓣元数据获取
 *
 * 用法:
 *   npm run enrich -- "边城"
 *   npm run enrich -- "活着" --douban-id 4913064
 *   npm run enrich -- "红楼梦" --url https://book.douban.com/subject/1007305/
 *
 * 流程:
 *   1. 解析豆瓣 ID（直接提供 > URL > 搜索）
 *   2. 获取详情页 HTML
 *   3. 解析作者、出版社、年份、评分、简介、封面 URL
 *   4. 下载封面到 public/covers/{doubanId}.jpg
 *   5. 存入 data/douban-cache.json
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import * as cheerio from "cheerio";
import type { DoubanCache, DoubanEntry } from "./types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DATA_DIR = path.join(ROOT, "data");
const COVERS_DIR = path.join(ROOT, "public", "covers");
const CACHE_PATH = path.join(DATA_DIR, "douban-cache.json");

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function fetchWithRetry(
  url: string,
  retries = 2,
  delayMs = 3000
): Promise<string> {
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(url, { headers: HEADERS });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} for ${url}`);
      }
      return await res.text();
    } catch (err) {
      if (i < retries) {
        console.warn(`  ⚠️  Retrying (${i + 1}/${retries}) after ${delayMs}ms...`);
        await new Promise((r) => setTimeout(r, delayMs));
      } else {
        throw err;
      }
    }
  }
  throw new Error("unreachable");
}

async function downloadCover(
  url: string,
  destPath: string
): Promise<void> {
  if (fs.existsSync(destPath)) {
    console.log(`  📷 Cover already exists: ${path.basename(destPath)}`);
    return;
  }
  const res = await fetch(url, { headers: { ...HEADERS, Referer: "https://book.douban.com/" } });
  if (!res.ok) {
    console.warn(`  ⚠️  Failed to download cover: HTTP ${res.status}`);
    return;
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(destPath, buffer);
  console.log(`  📷 Cover saved: ${path.basename(destPath)}`);
}

function loadCache(): DoubanCache {
  try {
    const raw = fs.readFileSync(CACHE_PATH, "utf-8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function saveCache(cache: DoubanCache): void {
  fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2), "utf-8");
}

// ---------------------------------------------------------------------------
// Search: find Douban ID by title
// ---------------------------------------------------------------------------

async function searchDouban(title: string): Promise<string | null> {
  const searchUrl = `https://book.douban.com/subject_search?search_text=${encodeURIComponent(title)}`;
  console.log(`  🔍 Searching: ${searchUrl}`);
  const html = await fetchWithRetry(searchUrl);

  // Douban now renders search results via React, data is in window.__DATA__
  const dataLine = html.split("\n").find((l) => l.includes("__DATA__"));
  if (dataLine) {
    // Check for rate limiting
    if (dataLine.includes("搜索访问太频繁") || dataLine.includes("访问太频繁")) {
      console.warn("  ⚠️  Douban rate limited! Retrying after 10s...");
      await new Promise((r) => setTimeout(r, 10000));
      const retryHtml = await fetchWithRetry(searchUrl, 1, 0);
      const retryLine = retryHtml.split("\n").find((l) => l.includes("__DATA__"));
      if (retryLine && !retryLine.includes("访问太频繁")) {
        const retryIdMatch = retryLine.match(/"id":\s*(\d+)/);
        if (retryIdMatch) return retryIdMatch[1];
      }
      return null;
    }

    // Check for empty results
    if (dataLine.includes('"items": []') || dataLine.includes('"total": 0')) {
      return null;
    }

    const idMatch = dataLine.match(/"id":\s*(\d+)/);
    if (idMatch) return idMatch[1];
  }

  // Fallback: try cheerio parsing (old method, might still work on some pages)
  const $ = cheerio.load(html);
  const firstLink = $("li.subject-item a.nbg").first().attr("href");
  if (firstLink) {
    const match = firstLink.match(/\/subject\/(\d+)\//);
    if (match) return match[1];
  }

  const anyLink = $('a[href*="/subject/"]').first().attr("href");
  if (anyLink) {
    const match = anyLink.match(/\/subject\/(\d+)\//);
    if (match) return match[1];
  }

  return null;
}

// ---------------------------------------------------------------------------
// Parse detail page
// ---------------------------------------------------------------------------

async function fetchDetail(doubanId: string): Promise<DoubanEntry> {
  const url = `https://book.douban.com/subject/${doubanId}/`;
  console.log(`  📄 Fetching detail: ${url}`);
  const html = await fetchWithRetry(url);
  const $ = cheerio.load(html);

  // Title
  const title =
    $('h1 span[property="v:itemreviewed"]').text().trim() ||
    $("h1").text().trim() ||
    "未知书名";

  // Author
  const authorEl = $('a[href*="/author/"]').first();
  const author = authorEl.text().trim() || "未知作者";

  // Info block: publisher, pubYear
  const infoText = $("#info").text() || "";
  const publisherMatch = infoText.match(/出版社:\s*(.+)/);
  const publisher = publisherMatch?.[1]?.trim() || "";
  const yearMatch = infoText.match(/(\d{4})/);
  const pubYear = yearMatch?.[1] || "";

  // Rating
  const rating =
    $('strong.ll.rating_num').text().trim() ||
    $('[property="v:average"]').text().trim() ||
    "";

  // Summary / intro
  const summary =
    $("div.intro p").first().text().trim() ||
    $('div.related_info div.indent p, #link-report .intro p').first().text().trim() ||
    $('span[property="v:summary"]').text().trim() ||
    "";

  // Cover image
  const coverUrl =
    $("#mainpic img").attr("src") ||
    $('a.nbg img').attr("src") ||
    "";

  const coverLocalPath = `/covers/${doubanId}.jpg`;

  // Download cover
  if (coverUrl) {
    const destPath = path.join(COVERS_DIR, `${doubanId}.jpg`);
    await downloadCover(coverUrl, destPath);
  }

  return {
    doubanId,
    title,
    author,
    publisher,
    pubYear,
    rating,
    summary,
    coverLocalPath,
    fetchedAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function printUsage(): void {
  console.log(`
用法:
  npm run enrich -- "<书名>"
  npm run enrich -- "<书名>" --douban-id <ID>
  npm run enrich -- "<书名>" --url <豆瓣URL>
`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    printUsage();
    process.exit(0);
  }

  // Parse arguments
  let searchTitle = "";
  let doubanId = "";
  const urlIdx = args.indexOf("--url");
  const idIdx = args.indexOf("--douban-id");

  if (urlIdx >= 0 && args[urlIdx + 1]) {
    const url = args[urlIdx + 1];
    const match = url.match(/\/subject\/(\d+)\//);
    if (!match) {
      console.error(`❌ 无法从 URL 解析豆瓣 ID: ${url}`);
      process.exit(1);
    }
    doubanId = match[1];
    // Try to extract title from remaining args
    searchTitle = args.filter((_, i) => i !== urlIdx && i !== urlIdx + 1).join(" ");
  } else if (idIdx >= 0 && args[idIdx + 1]) {
    doubanId = args[idIdx + 1];
    searchTitle = args.filter((_, i) => i !== idIdx && i !== idIdx + 1).join(" ");
  } else {
    searchTitle = args.join(" ");
  }

  console.log(`\n📚 Fetching Douban metadata for: "${searchTitle || doubanId}"\n`);

  // Ensure directories exist
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(COVERS_DIR, { recursive: true });

  const cache = loadCache();

  // Resolve Douban ID
  if (!doubanId) {
    // Check if we already have this title in cache
    const existing = Object.values(cache).find(
      (entry) => entry.title === searchTitle
    );
    if (existing) {
      console.log(`  ✅ Found in cache: ${existing.doubanId}`);
      console.log(`     Title: ${existing.title}`);
      console.log(`     Author: ${existing.author}`);
      console.log(`     Rating: ${existing.rating}`);
      console.log(`     Cover: ${existing.coverLocalPath}`);
      return;
    }

    doubanId = (await searchDouban(searchTitle)) || "";
    if (!doubanId) {
      console.error(`❌ 未找到匹配的书籍: "${searchTitle}"`);
      console.error("   请尝试提供 --douban-id 或 --url 参数");
      process.exit(1);
    }
  }

  // Check cache for this doubanId
  if (cache[doubanId]) {
    console.log(`  ✅ Already cached: ${doubanId}`);
    console.log(`     Title: ${cache[doubanId].title}`);
    console.log(`     Author: ${cache[doubanId].author}`);
    console.log(`     Rating: ${cache[doubanId].rating}`);
    return;
  }

  // Fetch detail
  console.log(`  🆔 Douban ID: ${doubanId}`);
  const entry = await fetchDetail(doubanId);

  // Save to cache
  cache[doubanId] = entry;
  saveCache(cache);

  console.log(`\n  ✅ Saved to cache:`);
  console.log(`     Title:    ${entry.title}`);
  console.log(`     Author:   ${entry.author}`);
  console.log(`     Year:     ${entry.pubYear}`);
  console.log(`     Rating:   ${entry.rating}`);
  console.log(`     Summary:  ${entry.summary.slice(0, 80)}...`);
  console.log(`     Cover:    ${entry.coverLocalPath}`);
  console.log();
}

main().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});
