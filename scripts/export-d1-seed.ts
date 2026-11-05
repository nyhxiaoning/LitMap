import fs from "node:fs/promises";
import path from "node:path";
import books from "../src/data/books";
import type { BookData } from "../src/types";

const ROOT = process.cwd();
const OUTPUT = path.join(ROOT, "db", "seed.sql");

function sql(value: string | number | null): string {
  if (value === null) return "NULL";
  if (typeof value === "number") return String(value);
  return `'${value.replace(/'/g, "''")}'`;
}

function row(book: BookData): string {
  return [
    book.id, book.rank, book.sliderVal, book.century, book.lat, book.lng,
    book.country, book.city, book.title, book.author, book.color, book.coverUrl,
    JSON.stringify(book.tags), book.quote, book.desc, book.isTrajectory ? 1 : 0,
    book.realViewName, book.realViewUrl, book.realViewQuote, book.url || null,
    book.path ? JSON.stringify(book.path) : null,
  ].map(sql).join(", ");
}

const columns = [
  "id", "rank", "slider_val", "century", "lat", "lng", "country", "city",
  "title", "author", "color", "cover_url", "tags_json", "quote", "description",
  "is_trajectory", "real_view_name", "real_view_url", "real_view_quote", "book_url", "path_json",
].join(", ");

const statements = books.map((book) =>
  `INSERT OR REPLACE INTO books (${columns}) VALUES (${row(book)});`,
);

await fs.mkdir(path.dirname(OUTPUT), { recursive: true });
await fs.writeFile(OUTPUT, `-- Generated from src/data/books.ts\n${statements.join("\n")}\n`);
console.log(`Generated ${books.length} books at ${path.relative(ROOT, OUTPUT)}`);
