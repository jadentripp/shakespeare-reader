use anyhow::Context;
use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use tauri::{path::BaseDirectory, AppHandle, Manager};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Book {
    pub id: i64,
    pub gutenberg_id: i64,
    pub title: String,
    pub authors: String,
    pub publication_year: Option<i32>,
    pub cover_url: Option<String>,
    pub mobi_path: Option<String>,
    pub html_path: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BookPosition {
    pub cfi: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Highlight {
    pub id: i64,
    pub book_id: i64,
    pub start_path: String,
    pub start_offset: i64,
    pub end_path: String,
    pub end_offset: i64,
    pub text: String,
    pub note: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HighlightMessage {
    pub id: i64,
    pub highlight_id: i64,
    pub role: String,
    pub content: String,
    pub created_at: String,
}

fn db_path(app_handle: &AppHandle) -> Result<std::path::PathBuf, anyhow::Error> {
    if let Ok(override_path) = std::env::var("SHAKESPEARE_DB_PATH") {
        return Ok(std::path::PathBuf::from(override_path));
    }
    let mut base = std::env::current_dir()
        .unwrap_or(app_handle.path().resolve(".", BaseDirectory::AppLocalData)?);
    if base.file_name().and_then(|s| s.to_str()) == Some("src-tauri") {
        if let Some(parent) = base.parent() {
            base = parent.to_path_buf();
        }
    }
    Ok(base.join("tmp").join("shakespeare-reader.sqlite"))
}

fn open(app_handle: &AppHandle) -> Result<Connection, anyhow::Error> {
    let path = db_path(app_handle)?;
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)?;
    }
    let conn = Connection::open(path)?;
    conn.execute_batch("PRAGMA foreign_keys = ON;")?;
    Ok(conn)
}

pub fn init(app_handle: &AppHandle) -> Result<(), anyhow::Error> {
    let conn = open(app_handle)?;
    conn.execute_batch(
        r#"
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS book (
  id INTEGER PRIMARY KEY,
  gutenberg_id INTEGER NOT NULL UNIQUE,
  title TEXT NOT NULL,
  authors TEXT NOT NULL,
  publication_year INTEGER,
  cover_url TEXT,
  mobi_path TEXT,
  html_path TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_book_title ON book(title);

CREATE TABLE IF NOT EXISTS book_position (
  book_id INTEGER PRIMARY KEY,
  cfi TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY(book_id) REFERENCES book(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS highlight (
  id INTEGER PRIMARY KEY,
  book_id INTEGER NOT NULL,
  start_path TEXT NOT NULL,
  start_offset INTEGER NOT NULL,
  end_path TEXT NOT NULL,
  end_offset INTEGER NOT NULL,
  text TEXT NOT NULL,
  note TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY(book_id) REFERENCES book(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_highlight_book ON highlight(book_id);

CREATE TABLE IF NOT EXISTS highlight_message (
  id INTEGER PRIMARY KEY,
  highlight_id INTEGER NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY(highlight_id) REFERENCES highlight(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_highlight_message_highlight ON highlight_message(highlight_id);
"#,
    )
    .context("failed to initialize sqlite schema")?;

    // Best-effort migration for older DBs.
    let _ = conn.execute("ALTER TABLE book ADD COLUMN publication_year INTEGER", []);
    let _ = conn.execute("ALTER TABLE book ADD COLUMN mobi_path TEXT", []);
    let _ = conn.execute("ALTER TABLE book ADD COLUMN html_path TEXT", []);

    Ok(())
}

pub fn upsert_book(
    app_handle: &AppHandle,
    gutenberg_id: i64,
    title: String,
    authors: String,
    publication_year: Option<i32>,
    cover_url: Option<String>,
    mobi_path: String,
    html_path: String,
) -> Result<i64, anyhow::Error> {
    let conn = open(app_handle)?;
    conn.execute(
        "INSERT INTO book(gutenberg_id, title, authors, publication_year, cover_url, mobi_path, html_path) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
         ON CONFLICT(gutenberg_id) DO UPDATE SET
           title=excluded.title,
           authors=excluded.authors,
           publication_year=excluded.publication_year,
           cover_url=excluded.cover_url,
           mobi_path=excluded.mobi_path,
           html_path=excluded.html_path",
        params![gutenberg_id, title, authors, publication_year, cover_url, mobi_path, html_path],
    )?;

    let id: i64 = conn.query_row(
        "SELECT id FROM book WHERE gutenberg_id = ?1",
        params![gutenberg_id],
        |row| row.get(0),
    )?;
    Ok(id)
}

pub fn list_books(app_handle: &AppHandle) -> Result<Vec<Book>, anyhow::Error> {
    let conn = open(app_handle)?;
    let mut stmt = conn.prepare(
        "SELECT id, gutenberg_id, title, authors, publication_year, cover_url, mobi_path, html_path, created_at FROM book ORDER BY title ASC",
    )?;

    let rows = stmt
        .query_map([], |row| {
            Ok(Book {
                id: row.get(0)?,
                gutenberg_id: row.get(1)?,
                title: row.get(2)?,
                authors: row.get(3)?,
                publication_year: row.get(4)?,
                cover_url: row.get(5)?,
                mobi_path: row.get(6)?,
                html_path: row.get(7)?,
                created_at: row.get(8)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

    Ok(rows)
}

pub fn get_book(app_handle: &AppHandle, book_id: i64) -> Result<Book, anyhow::Error> {
    let conn = open(app_handle)?;
    conn.query_row(
        "SELECT id, gutenberg_id, title, authors, publication_year, cover_url, mobi_path, html_path, created_at FROM book WHERE id = ?1",
        params![book_id],
        |row| {
            Ok(Book {
                id: row.get(0)?,
                gutenberg_id: row.get(1)?,
                title: row.get(2)?,
                authors: row.get(3)?,
                publication_year: row.get(4)?,
                cover_url: row.get(5)?,
                mobi_path: row.get(6)?,
                html_path: row.get(7)?,
                created_at: row.get(8)?,
            })
        },
    )
    .context("failed to get book")
}

pub fn hard_delete_book(app_handle: &AppHandle, book_id: i64) -> Result<(), anyhow::Error> {
    let conn = open(app_handle)?;
    conn.execute(
        "DELETE FROM highlight_message WHERE highlight_id IN (SELECT id FROM highlight WHERE book_id = ?1)",
        params![book_id],
    )?;
    conn.execute("DELETE FROM highlight WHERE book_id = ?1", params![book_id])?;
    conn.execute("DELETE FROM book_position WHERE book_id = ?1", params![book_id])?;
    let deleted = conn.execute("DELETE FROM book WHERE id = ?1", params![book_id])?;
    if deleted == 0 {
        anyhow::bail!("No book deleted for id {}", book_id);
    }
    Ok(())
}

pub fn set_book_position(app_handle: &AppHandle, book_id: i64, cfi: String) -> Result<(), anyhow::Error> {
    let conn = open(app_handle)?;
    conn.execute(
        "INSERT INTO book_position(book_id, cfi) VALUES (?1, ?2)
         ON CONFLICT(book_id) DO UPDATE SET cfi=excluded.cfi, updated_at=(strftime('%Y-%m-%dT%H:%M:%fZ','now'))",
        params![book_id, cfi],
    )?;
    Ok(())
}

pub fn get_book_position(app_handle: &AppHandle, book_id: i64) -> Result<Option<BookPosition>, anyhow::Error> {
    let conn = open(app_handle)?;
    conn.query_row(
        "SELECT cfi, updated_at FROM book_position WHERE book_id = ?1",
        params![book_id],
        |row| {
            Ok(BookPosition {
                cfi: row.get(0)?,
                updated_at: row.get(1)?,
            })
        },
    )
    .optional()
    .context("failed to read book position")
}

pub fn set_setting(app_handle: &AppHandle, key: String, value: String) -> Result<(), anyhow::Error> {
    let conn = open(app_handle)?;
    conn.execute(
        "INSERT INTO settings(key, value) VALUES (?1, ?2) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
        params![key, value],
    )
    .context("failed to set setting")?;
    Ok(())
}

pub fn get_setting(app_handle: &AppHandle, key: String) -> Result<Option<String>, anyhow::Error> {
    let conn = open(app_handle)?;
    conn.query_row(
        "SELECT value FROM settings WHERE key = ?1",
        params![key],
        |row| row.get(0),
    )
    .optional()
    .context("failed to read setting")
}

pub fn list_highlights(app_handle: &AppHandle, book_id: i64) -> Result<Vec<Highlight>, anyhow::Error> {
    let conn = open(app_handle)?;
    let mut stmt = conn.prepare(
        "SELECT id, book_id, start_path, start_offset, end_path, end_offset, text, note, created_at, updated_at
         FROM highlight WHERE book_id = ?1 ORDER BY created_at DESC",
    )?;
    let rows = stmt
        .query_map(params![book_id], |row| {
            Ok(Highlight {
                id: row.get(0)?,
                book_id: row.get(1)?,
                start_path: row.get(2)?,
                start_offset: row.get(3)?,
                end_path: row.get(4)?,
                end_offset: row.get(5)?,
                text: row.get(6)?,
                note: row.get(7)?,
                created_at: row.get(8)?,
                updated_at: row.get(9)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(rows)
}

pub fn create_highlight(
    app_handle: &AppHandle,
    book_id: i64,
    start_path: String,
    start_offset: i64,
    end_path: String,
    end_offset: i64,
    text: String,
    note: Option<String>,
) -> Result<Highlight, anyhow::Error> {
    let conn = open(app_handle)?;
    conn.execute(
        "INSERT INTO highlight(book_id, start_path, start_offset, end_path, end_offset, text, note)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        params![
            book_id,
            start_path,
            start_offset,
            end_path,
            end_offset,
            text,
            note
        ],
    )?;
    let id = conn.last_insert_rowid();
    conn.query_row(
        "SELECT id, book_id, start_path, start_offset, end_path, end_offset, text, note, created_at, updated_at
         FROM highlight WHERE id = ?1",
        params![id],
        |row| {
            Ok(Highlight {
                id: row.get(0)?,
                book_id: row.get(1)?,
                start_path: row.get(2)?,
                start_offset: row.get(3)?,
                end_path: row.get(4)?,
                end_offset: row.get(5)?,
                text: row.get(6)?,
                note: row.get(7)?,
                created_at: row.get(8)?,
                updated_at: row.get(9)?,
            })
        },
    )
    .context("failed to create highlight")
}

pub fn update_highlight_note(
    app_handle: &AppHandle,
    highlight_id: i64,
    note: Option<String>,
) -> Result<Highlight, anyhow::Error> {
    let conn = open(app_handle)?;
    conn.execute(
        "UPDATE highlight SET note = ?1, updated_at=(strftime('%Y-%m-%dT%H:%M:%fZ','now')) WHERE id = ?2",
        params![note, highlight_id],
    )?;
    conn.query_row(
        "SELECT id, book_id, start_path, start_offset, end_path, end_offset, text, note, created_at, updated_at
         FROM highlight WHERE id = ?1",
        params![highlight_id],
        |row| {
            Ok(Highlight {
                id: row.get(0)?,
                book_id: row.get(1)?,
                start_path: row.get(2)?,
                start_offset: row.get(3)?,
                end_path: row.get(4)?,
                end_offset: row.get(5)?,
                text: row.get(6)?,
                note: row.get(7)?,
                created_at: row.get(8)?,
                updated_at: row.get(9)?,
            })
        },
    )
    .context("failed to update highlight note")
}

pub fn list_highlight_messages(
    app_handle: &AppHandle,
    highlight_id: i64,
) -> Result<Vec<HighlightMessage>, anyhow::Error> {
    let conn = open(app_handle)?;
    let mut stmt = conn.prepare(
        "SELECT id, highlight_id, role, content, created_at
         FROM highlight_message WHERE highlight_id = ?1 ORDER BY created_at ASC",
    )?;
    let rows = stmt
        .query_map(params![highlight_id], |row| {
            Ok(HighlightMessage {
                id: row.get(0)?,
                highlight_id: row.get(1)?,
                role: row.get(2)?,
                content: row.get(3)?,
                created_at: row.get(4)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(rows)
}

pub fn add_highlight_message(
    app_handle: &AppHandle,
    highlight_id: i64,
    role: String,
    content: String,
) -> Result<HighlightMessage, anyhow::Error> {
    let conn = open(app_handle)?;
    conn.execute(
        "INSERT INTO highlight_message(highlight_id, role, content) VALUES (?1, ?2, ?3)",
        params![highlight_id, role, content],
    )?;
    let id = conn.last_insert_rowid();
    conn.query_row(
        "SELECT id, highlight_id, role, content, created_at FROM highlight_message WHERE id = ?1",
        params![id],
        |row| {
            Ok(HighlightMessage {
                id: row.get(0)?,
                highlight_id: row.get(1)?,
                role: row.get(2)?,
                content: row.get(3)?,
                created_at: row.get(4)?,
            })
        },
    )
    .context("failed to add highlight message")
}
