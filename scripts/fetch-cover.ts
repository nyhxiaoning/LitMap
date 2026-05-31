/**
 * fetch-cover.ts — 从任意URL下载封面并存入douban-cache
 *
 * 用法:
 *   npm run cover -- "流俗地" "https://img.example.com/cover.jpg" --id my-id
 *   npm run cover -- "战争哀歌" "https://img.example.com/cover.jpg" --id my-id --author "保宁"
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import type { DoubanCache } from "./types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const COVERS_DIR = path.join(ROOT, "public", "covers");
const CACHE_PATH = path.join(ROOT, "data", "douban-cache.json");

async function downloadCover(url: string, destPath: string): Promise<void> {
  if (fs.existsSync(destPath)) {
    console.log(`  📷 Cover already exists: ${path.basename(destPath)}`);
    return;
  }
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; BookMap/1.0)" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length < 1000) throw new Error("Image too small");
    fs.writeFileSync(destPath, buffer);
    console.log(`  📷 Cover saved: ${path.basename(destPath)}`);
  } catch (err: unknown) {
    console.warn(`  ⚠️  Failed to download cover: ${err instanceof Error ? err.message : String(err)}`);
  }
}

function loadCache(): DoubanCache {
  try {
    return JSON.parse(fs.readFileSync(CACHE_PATH, "utf-8"));
  } catch {
    return {};
  }
}

function saveCache(cache: DoubanCache): void {
  fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2), "utf-8");
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.length < 2 || args.includes("--help")) {
    console.log("用法: npm run cover -- \"书名\" \"封面URL\" --id <ID> [--author <作者>]");
    process.exit(0);
  }

  const title = args[0];
  const coverUrl = args[1];
  const idIdx = args.indexOf("--id");
  const authorIdx = args.indexOf("--author");

  const customId = idIdx >= 0 ? args[idIdx + 1] : `alt-${Date.now()}`;
  const author = authorIdx >= 0 ? args[authorIdx + 1] : "";

  fs.mkdirSync(COVERS_DIR, { recursive: true });

  const destPath = path.join(COVERS_DIR, `${customId}.jpg`);
  await downloadCover(coverUrl, destPath);

  const cache = loadCache();
  if (!cache[customId]) {
    cache[customId] = {
      doubanId: customId,
      title,
      author,
      publisher: "",
      pubYear: "",
      rating: "",
      summary: "",
      coverLocalPath: `/covers/${customId}.jpg`,
      fetchedAt: new Date().toISOString(),
    };
    saveCache(cache);
    console.log(`  ✅ Added to cache: ${customId} -> ${title}`);
  }
}

main().catch((err) => console.error("❌", err));
