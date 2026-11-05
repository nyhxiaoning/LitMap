import type { BookData, PathNode } from "../src/types";
import type { BookRow, Env } from "./types";

const JSON_HEADERS = { "Content-Type": "application/json; charset=utf-8" };

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });
}

function parseJson<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try { return JSON.parse(value) as T; } catch { return fallback; }
}

function rowToBook(row: BookRow): BookData {
  return {
    rank: row.rank,
    id: row.id,
    sliderVal: row.slider_val,
    century: row.century,
    lat: row.lat,
    lng: row.lng,
    country: row.country,
    city: row.city,
    title: row.title,
    author: row.author,
    color: row.color,
    coverUrl: row.cover_url,
    tags: parseJson<string[]>(row.tags_json, []),
    quote: row.quote,
    desc: row.description,
    isTrajectory: Boolean(row.is_trajectory),
    realViewName: row.real_view_name,
    realViewUrl: row.real_view_url,
    realViewQuote: row.real_view_quote,
    url: row.book_url || undefined,
    path: parseJson<PathNode[] | undefined>(row.path_json, undefined),
  };
}

function validateBook(value: unknown): value is BookData {
  if (!value || typeof value !== "object") return false;
  const book = value as Partial<BookData>;
  return typeof book.id === "string" && book.id.length > 0
    && typeof book.title === "string" && book.title.trim().length > 0
    && typeof book.author === "string" && book.author.trim().length > 0
    && typeof book.country === "string" && typeof book.city === "string"
    && typeof book.lat === "number" && typeof book.lng === "number"
    && Array.isArray(book.tags);
}

function bookParams(book: BookData): unknown[] {
  return [
    book.id, book.rank, book.sliderVal, book.century, book.lat, book.lng,
    book.country, book.city, book.title, book.author, book.color, book.coverUrl,
    JSON.stringify(book.tags), book.quote, book.desc, book.isTrajectory ? 1 : 0,
    book.realViewName, book.realViewUrl, book.realViewQuote, book.url || null,
    book.path ? JSON.stringify(book.path) : null,
  ];
}

const upsertSql = `
  INSERT INTO books (
    id, rank, slider_val, century, lat, lng, country, city, title, author,
    color, cover_url, tags_json, quote, description, is_trajectory,
    real_view_name, real_view_url, real_view_quote, book_url, path_json, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  ON CONFLICT(id) DO UPDATE SET
    rank=excluded.rank, slider_val=excluded.slider_val, century=excluded.century,
    lat=excluded.lat, lng=excluded.lng, country=excluded.country, city=excluded.city,
    title=excluded.title, author=excluded.author, color=excluded.color,
    cover_url=excluded.cover_url, tags_json=excluded.tags_json, quote=excluded.quote,
    description=excluded.description, is_trajectory=excluded.is_trajectory,
    real_view_name=excluded.real_view_name, real_view_url=excluded.real_view_url,
    real_view_quote=excluded.real_view_quote, book_url=excluded.book_url,
    path_json=excluded.path_json, updated_at=CURRENT_TIMESTAMP
`;

async function handleApi(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const parts = url.pathname.split("/").filter(Boolean);
  const resource = parts[1];
  const id = parts[2] ? decodeURIComponent(parts[2]) : null;

  if (request.method === "GET" && resource === "health") return json({ ok: true });

  if (resource !== "books") return json({ error: "接口不存在" }, 404);

  if (request.method !== "GET") {
    const supplied = request.headers.get("Authorization");
    if (!env.ADMIN_TOKEN || supplied !== `Bearer ${env.ADMIN_TOKEN}`) {
      return json({ error: "需要管理员授权" }, 401);
    }
  }

  if (request.method === "GET" && !id) {
    const result = await env.DB.prepare("SELECT * FROM books ORDER BY rank ASC, title ASC").all<BookRow>();
    return json({ books: result.results.map(rowToBook) });
  }

  if (request.method === "POST" && !id) {
    const book: unknown = await request.json();
    if (!validateBook(book)) return json({ error: "图书字段不完整" }, 400);
    await env.DB.prepare(upsertSql).bind(...bookParams(book)).run();
    return json({ book }, 201);
  }

  if (!id) return json({ error: "缺少图书 ID" }, 400);
  const existingRow = await env.DB.prepare("SELECT * FROM books WHERE id = ?1").bind(id).first<BookRow>();
  if (!existingRow) return json({ error: "图书不存在" }, 404);
  const existing = rowToBook(existingRow);

  if (request.method === "PATCH") {
    const patch = await request.json() as Partial<BookData>;
    const updated = { ...existing, ...patch, id: existing.id };
    if (!validateBook(updated)) return json({ error: "图书字段不完整" }, 400);
    await env.DB.prepare(upsertSql).bind(...bookParams(updated)).run();
    return json({ book: updated });
  }

  if (request.method === "DELETE") {
    await env.DB.prepare("DELETE FROM books WHERE id = ?1").bind(id).run();
    return json({ ok: true });
  }

  return json({ error: "不支持的请求方法" }, 405);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) {
      try { return await handleApi(request, env); }
      catch (error) {
        console.error(error);
        return json({ error: "数据库操作失败" }, 500);
      }
    }
    return env.ASSETS.fetch(request);
  },
};
