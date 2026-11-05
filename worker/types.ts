export interface D1Result<T = unknown> {
  results: T[];
  success: boolean;
  meta?: Record<string, unknown>;
}

export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = unknown>(): Promise<T | null>;
  all<T = unknown>(): Promise<D1Result<T>>;
  run(): Promise<D1Result>;
}

export interface D1Database {
  prepare(query: string): D1PreparedStatement;
}

export interface AssetFetcher {
  fetch(request: Request): Promise<Response>;
}

export interface Env {
  DB: D1Database;
  ASSETS: AssetFetcher;
  ADMIN_TOKEN?: string;
}

export interface BookRow {
  rank: number;
  id: string;
  slider_val: number;
  century: string;
  lat: number;
  lng: number;
  country: string;
  city: string;
  title: string;
  author: string;
  color: string;
  cover_url: string;
  tags_json: string;
  quote: string;
  description: string;
  is_trajectory: number;
  real_view_name: string;
  real_view_url: string;
  real_view_quote: string;
  book_url: string | null;
  path_json: string | null;
}
