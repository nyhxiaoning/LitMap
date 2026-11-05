CREATE TABLE IF NOT EXISTS books (
  id TEXT PRIMARY KEY NOT NULL,
  rank INTEGER NOT NULL,
  slider_val INTEGER NOT NULL,
  century TEXT NOT NULL,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  country TEXT NOT NULL,
  city TEXT NOT NULL,
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  color TEXT NOT NULL,
  cover_url TEXT NOT NULL DEFAULT '',
  tags_json TEXT NOT NULL DEFAULT '[]',
  quote TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  is_trajectory INTEGER NOT NULL DEFAULT 0,
  real_view_name TEXT NOT NULL DEFAULT '',
  real_view_url TEXT NOT NULL DEFAULT '',
  real_view_quote TEXT NOT NULL DEFAULT '',
  book_url TEXT,
  path_json TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_books_country ON books(country);
CREATE INDEX IF NOT EXISTS idx_books_rank ON books(rank);
CREATE INDEX IF NOT EXISTS idx_books_title ON books(title);
