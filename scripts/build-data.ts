/**
 * build-data.ts — 合并地区文件 + 豆瓣缓存，生成 src/data/books.ts
 *
 * 流程:
 *   1. 读取 data/regions/*.json（用户按地区提供的书籍列表）
 *   2. 读取 data/douban-cache.json（从豆瓣获取的元数据缓存）
 *   3. 验证必填字段、坐标范围、重复检测
 *   4. 合并元数据（豆瓣缓存优先，用户字段回退）
 *   5. 生成 src/data/books.ts
 *
 * 用法:
 *   npm run build-data
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import type { RegionFile, PathNode, DoubanCache, OutputBook } from "./types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const REGIONS_DIR = path.join(ROOT, "data", "regions");
const CACHE_PATH = path.join(ROOT, "data", "douban-cache.json");
const OUTPUT_PATH = path.join(ROOT, "src", "data", "books.ts");

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CENTURY_MAP: Record<string, number> = {
  "公元前": 0,
  "中世纪": 1,
  "16世纪": 2,
  "17世纪": 3,
  "18世纪": 4,
  "19世纪": 5,
  "20世纪": 6,
  "21世纪": 7,
};

const VALID_CENTURIES = Object.keys(CENTURY_MAP);

const COLOR_PALETTE = [
  "#8B4513", "#B22222", "#2F4F4F", "#556B2F", "#8B008B",
  "#DAA520", "#4682B4", "#A0522D", "#483D8B", "#2E8B57",
  "#CD853F", "#6A5ACD", "#3CB371", "#B8860B", "#708090",
  "#BC8F8F", "#4169E1", "#228B22", "#8B0000", "#4B0082",
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function centuryToSliderVal(century: string): number {
  if (CENTURY_MAP[century] !== undefined) return CENTURY_MAP[century];
  // Try fuzzy match
  for (const [key, val] of Object.entries(CENTURY_MAP)) {
    if (century.includes(key)) return val;
  }
  console.warn(`  ⚠️  Unknown century "${century}", defaulting to 20世纪 (6)`);
  return 6;
}

function extractFirstSentence(text: string): string {
  if (!text) return "";
  // Split on Chinese/English sentence endings
  const match = text.match(/^(.+?[。！？.!?])/);
  return match ? match[1] : text.slice(0, 100);
}

// ---------------------------------------------------------------------------
// Main build logic
// ---------------------------------------------------------------------------

function loadRegions(): { region: RegionFile; filePath: string }[] {
  if (!fs.existsSync(REGIONS_DIR)) {
    console.error("❌ data/regions/ directory not found");
    process.exit(1);
  }

  const files = fs
    .readdirSync(REGIONS_DIR)
    .filter((f) => f.endsWith(".json") && !f.startsWith("_"));
  if (files.length === 0) {
    console.warn("⚠️  No region files found in data/regions/ — output will be empty");
    return [];
  }

  const regions: { region: RegionFile; filePath: string }[] = [];
  for (const file of files) {
    const filePath = path.join(REGIONS_DIR, file);
    try {
      const raw = fs.readFileSync(filePath, "utf-8");
      const data = JSON.parse(raw) as RegionFile;
      if (!data.region || !Array.isArray(data.books)) {
        console.error(`❌ Invalid region file: ${file} (missing "region" or "books")`);
        process.exit(1);
      }
      regions.push({ region: data, filePath });
    } catch (err) {
      console.error(`❌ Failed to parse ${file}:`, err);
      process.exit(1);
    }
  }

  return regions;
}

function loadCache(): DoubanCache {
  try {
    const raw = fs.readFileSync(CACHE_PATH, "utf-8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function validateAndBuild(
  regions: { region: RegionFile; filePath: string }[],
  cache: DoubanCache
): OutputBook[] {
  const books: OutputBook[] = [];
  const seenTitles = new Map<string, string>(); // title -> filePath
  let colorIndex = 0;

  for (const { region, filePath } of regions) {
    console.log(`\n📁 ${filePath} — "${region.region}" (${region.books.length} books)`);

    for (const book of region.books) {
      // --- Required field validation ---
      if (!book.title || book.title.trim() === "") {
        console.error(`❌ Book with empty title in ${filePath}`);
        process.exit(1);
      }
      if (typeof book.lat !== "number" || typeof book.lng !== "number") {
        console.error(`❌ "${book.title}" is missing lat/lng in ${filePath}`);
        process.exit(1);
      }
      if (book.lat < -90 || book.lat > 90 || book.lng < -180 || book.lng > 180) {
        console.error(
          `❌ "${book.title}" has invalid coordinates (lat=${book.lat}, lng=${book.lng})`
        );
        process.exit(1);
      }

      // --- Region bounds warning ---
      if (region.bounds) {
        const b = region.bounds;
        if (
          book.lat < b.minLat || book.lat > b.maxLat ||
          book.lng < b.minLng || book.lng > b.maxLng
        ) {
          console.warn(
            `  ⚠️  "${book.title}" (${book.lat}, ${book.lng}) is outside region bounds of "${region.region}"`
          );
        }
      }

      // --- Duplicate detection ---
      if (seenTitles.has(book.title)) {
        console.warn(
          `  ⚠️  Duplicate title "${book.title}" — also in ${seenTitles.get(book.title)}`
        );
      } else {
        seenTitles.set(book.title, filePath);
      }

      // --- Century validation ---
      if (!VALID_CENTURIES.includes(book.century)) {
        console.warn(
          `  ⚠️  "${book.title}" has unknown century "${book.century}", defaulting to 19世纪`
        );
      }

      // --- Path validation ---
      if (book.path && book.path.length > 0) {
        if (!book.isTrajectory) {
          console.warn(
            `  ⚠️  "${book.title}" has path nodes but isTrajectory is not true — forcing isTrajectory=true`
          );
          book.isTrajectory = true;
        }
        if (book.path.length < 2) {
          console.warn(
            `  ⚠️  "${book.title}" has only ${book.path.length} path node(s) — polyline won't be visible (need ≥ 2)`
          );
        }
        for (let i = 0; i < book.path.length; i++) {
          const node = book.path[i];
          if (!node.name) {
            console.error(`❌ "${book.title}" path node ${i} is missing "name"`);
            process.exit(1);
          }
          if (!node.coord || node.coord.length !== 2) {
            console.error(`❌ "${book.title}" path node ${i} ("${node.name}") is missing valid "coord"`);
            process.exit(1);
          }
          if (node.coord[0] < -90 || node.coord[0] > 90 || node.coord[1] < -180 || node.coord[1] > 180) {
            console.error(
              `❌ "${book.title}" path node ${i} ("${node.name}") has invalid coordinates (${node.coord[0]}, ${node.coord[1]})`
            );
            process.exit(1);
          }
        }
      }

      // --- Merge with Douban cache ---
      let author = book.author || "未知作者";
      let coverUrl = "";
      let quote = book.quote || "";
      let desc = book.desc || "";
      let tags = book.tags ? [...book.tags] : [];

      if (book.doubanId && cache[book.doubanId]) {
        const cached = cache[book.doubanId];
        author = cached.author || author;
        coverUrl = cached.coverLocalPath || "";
        quote = book.quote || extractFirstSentence(cached.summary) || "";
        desc = book.desc || cached.summary || "";

        // Add derived tags from cache
        if (cached.pubYear) tags.push(`${cached.pubYear}年`);
        if (cached.rating) tags.push(`豆瓣 ${cached.rating}`);
      }

      // Deduplicate tags
      tags = [...new Set(tags)];

      // --- Country ---
      const country = book.country || region.region || "";

      // --- Build output ---
      const outputBook: OutputBook = {
        rank: 0, // assigned after sort
        id: `book-${books.length + 1}`,
        sliderVal: centuryToSliderVal(book.century),
        century: book.century,
        lat: book.lat,
        lng: book.lng,
        country,
        city: book.city,
        title: book.title,
        author,
        color: COLOR_PALETTE[colorIndex % COLOR_PALETTE.length],
        coverUrl,
        tags,
        quote,
        desc,
        isTrajectory: book.isTrajectory || false,
        realViewName: book.realViewName || "",
        realViewUrl: book.realViewUrl || "",
        path: book.path,
      };

      books.push(outputBook);
      colorIndex++;
    }
  }

  // --- Assign ranks ---
  // Sort by century (chronological), then by title
  books.sort((a, b) => {
    if (a.sliderVal !== b.sliderVal) return a.sliderVal - b.sliderVal;
    return a.title.localeCompare(b.title, "zh");
  });

  books.forEach((book, i) => {
    book.rank = i + 1;
  });

  return books;
}

// ---------------------------------------------------------------------------
// Generate TypeScript output
// ---------------------------------------------------------------------------

function escapeString(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/`/g, "\\`")
    .replace(/\$/g, "\\$");
}

function formatPathNode(node: PathNode, indent: number): string {
  const pad = "  ".repeat(indent);
  return [
    `${pad}{`,
    `${pad}  name: \`${escapeString(node.name)}\`,`,
    `${pad}  coord: [${node.coord[0]}, ${node.coord[1]}],`,
    `${pad}  year: \`${escapeString(node.year)}\`,`,
    `${pad}  info: \`${escapeString(node.info)}\``,
    `${pad}}`,
  ].join("\n");
}

function formatBook(book: OutputBook): string {
  const lines: string[] = [];
  lines.push("  {");
  lines.push(`    rank: ${book.rank},`);
  lines.push(`    id: \`${escapeString(book.id)}\`,`);
  lines.push(`    sliderVal: ${book.sliderVal},`);
  lines.push(`    century: \`${escapeString(book.century)}\`,`);
  lines.push(`    lat: ${book.lat},`);
  lines.push(`    lng: ${book.lng},`);
  lines.push(`    country: \`${escapeString(book.country)}\`,`);
  lines.push(`    city: \`${escapeString(book.city)}\`,`);
  lines.push(`    title: \`${escapeString(book.title)}\`,`);
  lines.push(`    author: \`${escapeString(book.author)}\`,`);
  lines.push(`    color: \`${escapeString(book.color)}\`,`);
  lines.push(`    coverUrl: \`${escapeString(book.coverUrl)}\`,`);

  // Tags
  if (book.tags.length > 0) {
    const tagStr = book.tags.map((t) => `\`${escapeString(t)}\``).join(", ");
    lines.push(`    tags: [${tagStr}],`);
  } else {
    lines.push(`    tags: [],`);
  }

  lines.push(`    quote: \`${escapeString(book.quote)}\`,`);
  lines.push(`    desc: \`${escapeString(book.desc)}\`,`);
  lines.push(`    isTrajectory: ${book.isTrajectory || false},`);
  lines.push(`    realViewName: \`${escapeString(book.realViewName)}\`,`);
  lines.push(`    realViewUrl: \`${escapeString(book.realViewUrl)}\`,`);

  // Path
  if (book.path && book.path.length > 0) {
    lines.push(`    path: [`);
    book.path.forEach((node, i) => {
      lines.push(formatPathNode(node, 3));
      if (i < book.path!.length - 1) lines[lines.length - 1] += ",";
    });
    lines.push(`    ],`);
  }

  // Remove trailing comma from last line
  lines[lines.length - 1] = lines[lines.length - 1].replace(/,$/, "");

  lines.push("  }");
  return lines.join("\n");
}

function generateOutput(books: OutputBook[]): string {
  const header = [
    `import type { BookData } from "../types";`,
    ``,
    `// sliderVal: 0=公元前, 1=中世纪, 2=16世纪, 3=17世纪, 4=18世纪, 5=19世纪, 6=20世纪, 7=21世纪`,
    `//`,
    `// Auto-generated by scripts/build-data.ts — DO NOT EDIT by hand`,
    `// Run 'npm run build-data' to regenerate`,
    `//`,
    `// Source files: data/regions/*.json`,
    `// Douban cache: data/douban-cache.json`,
    `const books: BookData[] = [`,
  ].join("\n");

  const entries = books.map(formatBook).join(",\n\n");

  const footer = [
    ``,
    `];`,
    ``,
    `export default books;`,
    ``,
  ].join("\n");

  return `${header}\n${entries}\n${footer}`;
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function main(): void {
  console.log("🔨 Building books.ts from region files...\n");

  const regions = loadRegions();
  console.log(`📂 Found ${regions.length} region file(s)`);

  const cache = loadCache();
  const cacheCount = Object.keys(cache).length;
  console.log(`💾 Douban cache: ${cacheCount} entries`);

  const books = validateAndBuild(regions, cache);
  console.log(`\n📚 Total books: ${books.length}`);

  // Summary by century
  const centuryCount: Record<string, number> = {};
  for (const b of books) {
    centuryCount[b.century] = (centuryCount[b.century] || 0) + 1;
  }
  console.log("📊 By century:");
  for (const [century, count] of Object.entries(centuryCount).sort()) {
    console.log(`   ${century}: ${count}`);
  }

  const output = generateOutput(books);
  fs.writeFileSync(OUTPUT_PATH, output, "utf-8");
  console.log(`\n✅ Wrote ${books.length} books to ${OUTPUT_PATH}`);
}

main();
