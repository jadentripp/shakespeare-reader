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

fn db_path(app_handle: &AppHandle) -> Result<std::path::PathBuf, anyhow::Error> {
    Ok(app_handle
        .path()
        .resolve("shakespeare-reader.sqlite", BaseDirectory::AppLocalData)?)
}

fn open(app_handle: &AppHandle) -> Result<Connection, anyhow::Error> {
    let path = db_path(app_handle)?;
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)?;
    }
    Ok(Connection::open(path)?)
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
...
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

pub fn delete_book(app_handle: &AppHandle, book_id: i64) -> Result<(), anyhow::Error> {
    let conn = open(app_handle)?;
    conn.execute("DELETE FROM book WHERE id = ?1", params![book_id])?;
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
