import type { BookData } from "../types";

const API_PREFIX = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
let remoteApiAvailable = false;

export function configureBooksApi(available: boolean): void {
  remoteApiAvailable = available;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const send = () => fetch(`${API_PREFIX}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.method && init.method !== "GET" && sessionStorage.getItem("litmap-admin-token")
        ? { Authorization: `Bearer ${sessionStorage.getItem("litmap-admin-token")}` }
        : {}),
      ...(init?.headers || {}),
    },
  });
  let response = await send();
  if (response.status === 401 && init?.method && init.method !== "GET") {
    const token = window.prompt("请输入管理员密钥，以保存图书修改");
    if (token) {
      sessionStorage.setItem("litmap-admin-token", token.trim());
      response = await send();
    }
  }
  if (!response.ok) throw new Error(`图书 API 请求失败（${response.status}）`);
  return response.json() as Promise<T>;
}

export async function fetchBooks(): Promise<BookData[] | null> {
  try {
    const result = await request<{ books: BookData[] }>("/api/books");
    remoteApiAvailable = true;
    return Array.isArray(result.books) ? result.books : null;
  } catch {
    remoteApiAvailable = false;
    return null;
  }
}

export async function createBook(book: BookData): Promise<BookData> {
  if (!remoteApiAvailable) return book;
  const result = await request<{ book: BookData }>("/api/books", {
    method: "POST",
    body: JSON.stringify(book),
  });
  return result.book;
}

export async function updateBook(id: string, patch: Partial<BookData>): Promise<BookData> {
  if (!remoteApiAvailable) return { id, ...patch } as BookData;
  const result = await request<{ book: BookData }>(`/api/books/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
  return result.book;
}

export async function deleteBook(id: string): Promise<void> {
  if (!remoteApiAvailable) return;
  await request<{ ok: true }>(`/api/books/${encodeURIComponent(id)}`, { method: "DELETE" });
}
