//! `PostgreSQL` backend for AI Reader
//!
//! This module uses runtime SQL queries (not compile-time checked macros)
//! to avoid requiring `DATABASE_URL` at build time.

use once_cell::sync::OnceCell;
use sqlx::postgres::PgPoolOptions;
use sqlx::{Pool, Postgres, Row};
use std::env;
use thiserror::Error;

use super::{Book, BookChatThread, BookMessage, BookPosition, Highlight, HighlightMessage};
use crate::types::{BookId, GutenbergId, HighlightId, MessageId, MessageRole, ThreadId};

static POOL: OnceCell<Pool<Postgres>> = OnceCell::new();

#[derive(Debug, Error)]
pub enum DbError {
    #[error(transparent)]
    Sqlx(#[from] sqlx::Error),

    #[error("JSON error: {0}")]
    Json(#[from] serde_json::Error),

    #[error("Missing DATABASE_URL environment variable")]
    MissingDatabaseUrl,

    #[error("{0}")]
    Other(String),
}

pub fn get_pool() -> Result<&'static Pool<Postgres>, DbError> {
    POOL.get()
        .ok_or_else(|| DbError::Other("Database pool not initialized".to_string()))
}

/// Zero-cost helper: wraps `block_on` for sync init patterns
/// Monomorphizes per future type, eliminating runtime dispatch
#[inline]
fn block_on<F: std::future::Future>(fut: F) -> F::Output {
    tauri::async_runtime::block_on(fut)
}

pub fn init() -> Result<(), DbError> {
    let database_url = env::var("DATABASE_URL").map_err(|_| DbError::MissingDatabaseUrl)?;
    println!("[Backend] Initializing database connection...");

    POOL.get_or_try_init(|| {
        block_on(async {
            let pool = PgPoolOptions::new()
                .max_connections(5)
                .connect(&database_url)
                .await
                .map_err(|e| {
                    println!("[Backend] Database connection failed: {}", e);
                    e
                })?;
            println!("[Backend] Connected to database. Initializing schema...");
            init_schema(&pool).await.map_err(|e| {
                println!("[Backend] Schema initialization failed: {}", e);
                e
            })?;
            println!("[Backend] Database schema initialized.");
            Ok::<Pool<Postgres>, DbError>(pool)
        })
    })?;

    Ok(())
}

#[allow(clippy::too_many_lines)]
async fn init_schema(pool: &Pool<Postgres>) -> Result<(), DbError> {
    // Settings table
    sqlx::query("CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)")
        .execute(pool)
        .await?;

    // Book table
    sqlx::query(
        r"CREATE TABLE IF NOT EXISTS book (
            id BIGSERIAL PRIMARY KEY,
            gutenberg_id BIGINT NOT NULL UNIQUE,
            title TEXT NOT NULL,
            authors TEXT NOT NULL,
            publication_year INTEGER,
            cover_url TEXT,
            mobi_data BYTEA,
            html_content TEXT,
            first_image_index INTEGER,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )",
    )
    .execute(pool)
    .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_book_title ON book(title)")
        .execute(pool)
        .await?;

    // Ensure all columns exist for existing tables
    sqlx::query("ALTER TABLE book ADD COLUMN IF NOT EXISTS mobi_data BYTEA")
        .execute(pool)
        .await?;
    sqlx::query("ALTER TABLE book ADD COLUMN IF NOT EXISTS html_content TEXT")
        .execute(pool)
        .await?;
    sqlx::query("ALTER TABLE book ADD COLUMN IF NOT EXISTS first_image_index INTEGER")
        .execute(pool)
        .await?;

    // Book position table
    sqlx::query(
        r"CREATE TABLE IF NOT EXISTS book_position (
            book_id BIGINT PRIMARY KEY REFERENCES book(id) ON DELETE CASCADE,
            cfi TEXT NOT NULL,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )",
    )
    .execute(pool)
    .await?;

    // Highlight table
    sqlx::query(
        r"CREATE TABLE IF NOT EXISTS highlight (
            id BIGSERIAL PRIMARY KEY,
            book_id BIGINT NOT NULL REFERENCES book(id) ON DELETE CASCADE,
            start_path TEXT NOT NULL,
            start_offset BIGINT NOT NULL,
            end_path TEXT NOT NULL,
            end_offset BIGINT NOT NULL,
            text TEXT NOT NULL,
            note TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )",
    )
    .execute(pool)
    .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_highlight_book ON highlight(book_id)")
        .execute(pool)
        .await?;

    // Highlight message table
    sqlx::query(
        r"CREATE TABLE IF NOT EXISTS highlight_message (
            id BIGSERIAL PRIMARY KEY,
            highlight_id BIGINT NOT NULL REFERENCES highlight(id) ON DELETE CASCADE,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )",
    )
    .execute(pool)
    .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_highlight_message_highlight ON highlight_message(highlight_id)")
        .execute(pool)
        .await?;

    // Book chat thread table
    sqlx::query(
        r"CREATE TABLE IF NOT EXISTS book_chat_thread (
            id BIGSERIAL PRIMARY KEY,
            book_id BIGINT NOT NULL REFERENCES book(id) ON DELETE CASCADE,
            title TEXT NOT NULL,
            last_cfi TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )",
    )
    .execute(pool)
    .await?;

    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_book_chat_thread_book ON book_chat_thread(book_id)",
    )
    .execute(pool)
    .await?;

    // Book message table
    sqlx::query(
        r"CREATE TABLE IF NOT EXISTS book_message (
            id BIGSERIAL PRIMARY KEY,
            book_id BIGINT NOT NULL REFERENCES book(id) ON DELETE CASCADE,
            thread_id BIGINT REFERENCES book_chat_thread(id) ON DELETE CASCADE,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            reasoning_summary TEXT,
            context_map TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )",
    )
    .execute(pool)
    .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_book_message_book ON book_message(book_id)")
        .execute(pool)
        .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_book_message_thread ON book_message(thread_id)")
        .execute(pool)
        .await?;

    Ok(())
}

// ============================================================================
// ZERO-COST ROW MAPPING HELPERS
// ============================================================================
// These generic helpers eliminate runtime column-name lookups by using
// positional indices. The compiler monomorphizes each call site.

/// Maps a Book row using positional indices instead of runtime column lookups
#[inline]
fn map_book_row(row: &sqlx::postgres::PgRow) -> Book {
    Book {
        id: BookId::new(row.get::<i64, _>(0)),
        gutenberg_id: GutenbergId::new(row.get::<i64, _>(1)),
        title: row.get(2),
        authors: row.get(3),
        publication_year: row.get(4),
        cover_url: row.get(5),
        mobi_data: row.get(6),
        html_content: row.get(7),
        first_image_index: row.get(8),
        created_at: row.get::<Option<String>, _>(9).unwrap_or_default(),
    }
}

/// Maps a Highlight row using positional indices
#[inline]
fn map_highlight_row(row: &sqlx::postgres::PgRow) -> Highlight {
    Highlight {
        id: HighlightId::new(row.get::<i64, _>(0)),
        book_id: BookId::new(row.get::<i64, _>(1)),
        start_path: row.get(2),
        start_offset: row.get(3),
        end_path: row.get(4),
        end_offset: row.get(5),
        text: row.get(6),
        note: row.get(7),
        created_at: row.get::<Option<String>, _>(8).unwrap_or_default(),
        updated_at: row.get::<Option<String>, _>(9).unwrap_or_default(),
    }
}

/// Maps a `HighlightMessage` row using positional indices
#[inline]
fn map_highlight_message_row(row: &sqlx::postgres::PgRow) -> HighlightMessage {
    HighlightMessage {
        id: MessageId::new(row.get::<i64, _>(0)),
        highlight_id: HighlightId::new(row.get::<i64, _>(1)),
        role: row.get::<String, _>(2).parse().unwrap_or(MessageRole::User),
        content: row.get(3),
        created_at: row.get::<Option<String>, _>(4).unwrap_or_default(),
    }
}

/// Maps a `BookChatThread` row using positional indices
#[inline]
fn map_book_chat_thread_row(row: &sqlx::postgres::PgRow) -> BookChatThread {
    BookChatThread {
        id: ThreadId::new(row.get::<i64, _>(0)),
        book_id: BookId::new(row.get::<i64, _>(1)),
        title: row.get(2),
        last_cfi: row.get(3),
        created_at: row.get::<Option<String>, _>(4).unwrap_or_default(),
        updated_at: row.get::<Option<String>, _>(5).unwrap_or_default(),
    }
}

/// Maps a `BookMessage` row using positional indices
#[inline]
fn map_book_message_row(row: &sqlx::postgres::PgRow) -> BookMessage {
    BookMessage {
        id: MessageId::new(row.get::<i64, _>(0)),
        book_id: BookId::new(row.get::<i64, _>(1)),
        thread_id: row.get::<Option<i64>, _>(2).map(ThreadId::new),
        role: row.get::<String, _>(3).parse().unwrap_or(MessageRole::User),
        content: row.get(4),
        reasoning_summary: row.get(5),
        context_map: row.get(6),
        created_at: row.get::<Option<String>, _>(7).unwrap_or_default(),
    }
}

// ============================================================================
// BOOK OPERATIONS
// ============================================================================

#[allow(clippy::too_many_arguments)]
pub async fn upsert_book(
    pool: &Pool<Postgres>,
    gutenberg_id: i64,
    title: &str,
    authors: &str,
    publication_year: Option<i32>,
    cover_url: Option<&str>,
    mobi_data: Option<&[u8]>,
    html_content: Option<&str>,
    first_image_index: Option<i32>,
) -> Result<i64, DbError> {
    let row: (i64,) = sqlx::query_as(
        r"
        INSERT INTO book (gutenberg_id, title, authors, publication_year, cover_url, mobi_data, html_content, first_image_index)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (gutenberg_id) DO UPDATE SET
            title = EXCLUDED.title,
            authors = EXCLUDED.authors,
            publication_year = EXCLUDED.publication_year,
            cover_url = EXCLUDED.cover_url,
            mobi_data = EXCLUDED.mobi_data,
            html_content = EXCLUDED.html_content,
            first_image_index = EXCLUDED.first_image_index
        RETURNING id
        ",
    )
    .bind(gutenberg_id)
    .bind(title)
    .bind(authors)
    .bind(publication_year)
    .bind(cover_url)
    .bind(mobi_data)
    .bind(html_content)
    .bind(first_image_index)
    .fetch_one(pool)
    .await
    .map_err(|e| {
        println!("[Backend] Book upsert failed for {}: {}", gutenberg_id, e);
        e
    })?;
    println!(
        "[Backend] Successfully upserted book {} (id: {})",
        gutenberg_id, row.0
    );
    Ok(row.0)
}

pub async fn list_books(pool: &Pool<Postgres>) -> Result<Vec<Book>, DbError> {
    let rows = sqlx::query(
        r"
        SELECT id, gutenberg_id, title, authors, publication_year, cover_url, mobi_data, html_content, first_image_index, created_at::text
        FROM book ORDER BY title ASC
        "
    )
    .fetch_all(pool)
    .await?;

    Ok(rows.iter().map(map_book_row).collect())
}

pub async fn get_book(pool: &Pool<Postgres>, book_id: i64) -> Result<Book, DbError> {
    let row = sqlx::query(
        r"
        SELECT id, gutenberg_id, title, authors, publication_year, cover_url, mobi_data, html_content, first_image_index, created_at::text
        FROM book WHERE id = $1
        ",
    )
    .bind(book_id)
    .fetch_one(pool)
    .await?;

    Ok(map_book_row(&row))
}

pub async fn hard_delete_book(pool: &Pool<Postgres>, book_id: i64) -> Result<(), DbError> {
    sqlx::query("DELETE FROM book WHERE id = $1")
        .bind(book_id)
        .execute(pool)
        .await?;
    Ok(())
}

// ============================================================================
// BOOK POSITION OPERATIONS
// ============================================================================

pub async fn set_book_position(
    pool: &Pool<Postgres>,
    book_id: i64,
    cfi: &str,
) -> Result<(), DbError> {
    sqlx::query(
        r"
        INSERT INTO book_position (book_id, cfi)
        VALUES ($1, $2)
        ON CONFLICT (book_id) DO UPDATE SET cfi = EXCLUDED.cfi, updated_at = NOW()
        ",
    )
    .bind(book_id)
    .bind(cfi)
    .execute(pool)
    .await?;
    Ok(())
}

pub async fn get_book_position(
    pool: &Pool<Postgres>,
    book_id: i64,
) -> Result<Option<BookPosition>, DbError> {
    let row = sqlx::query("SELECT cfi, updated_at::text FROM book_position WHERE book_id = $1")
        .bind(book_id)
        .fetch_optional(pool)
        .await?;

    Ok(row.map(|r| BookPosition {
        cfi: r.get(0),
        updated_at: r.get::<Option<String>, _>(1).unwrap_or_default(),
    }))
}

// ============================================================================
// SETTINGS OPERATIONS
// ============================================================================

pub async fn set_setting(pool: &Pool<Postgres>, key: &str, value: &str) -> Result<(), DbError> {
    sqlx::query(
        "INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value"
    )
    .bind(key)
    .bind(value)
    .execute(pool)
    .await?;
    Ok(())
}

pub async fn get_setting(pool: &Pool<Postgres>, key: &str) -> Result<Option<String>, DbError> {
    let row = sqlx::query("SELECT value FROM settings WHERE key = $1")
        .bind(key)
        .fetch_optional(pool)
        .await?;

    if let Some(r) = row {
        return Ok(Some(r.get(0)));
    }

    // Fallback to environment variables (e.g. "openai_api_key" -> "OPENAI_API_KEY")
    let env_key = key.to_uppercase();
    if let Ok(val) = env::var(&env_key) {
        return Ok(Some(val));
    }

    Ok(None)
}

// ============================================================================
// HIGHLIGHT OPERATIONS
// ============================================================================

pub async fn list_highlights(
    pool: &Pool<Postgres>,
    book_id: i64,
) -> Result<Vec<Highlight>, DbError> {
    let rows = sqlx::query(
        r"
        SELECT id, book_id, start_path, start_offset, end_path, end_offset, text, note, created_at::text, updated_at::text
        FROM highlight WHERE book_id = $1 ORDER BY created_at DESC
        ",
    )
    .bind(book_id)
    .fetch_all(pool)
    .await?;

    Ok(rows.iter().map(map_highlight_row).collect())
}

#[allow(clippy::too_many_arguments)]
pub async fn create_highlight(
    pool: &Pool<Postgres>,
    book_id: i64,
    start_path: &str,
    start_offset: i64,
    end_path: &str,
    end_offset: i64,
    text: &str,
    note: Option<&str>,
) -> Result<Highlight, DbError> {
    let row = sqlx::query(
        r"
        INSERT INTO highlight (book_id, start_path, start_offset, end_path, end_offset, text, note)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, book_id, start_path, start_offset, end_path, end_offset, text, note, created_at::text, updated_at::text
        ",
    )
    .bind(book_id)
    .bind(start_path)
    .bind(start_offset)
    .bind(end_path)
    .bind(end_offset)
    .bind(text)
    .bind(note)
    .fetch_one(pool)
    .await?;

    Ok(map_highlight_row(&row))
}

pub async fn update_highlight_note(
    pool: &Pool<Postgres>,
    highlight_id: i64,
    note: Option<&str>,
) -> Result<Highlight, DbError> {
    let row = sqlx::query(
        r"
        UPDATE highlight SET note = $1, updated_at = NOW() WHERE id = $2
        RETURNING id, book_id, start_path, start_offset, end_path, end_offset, text, note, created_at::text, updated_at::text
        ",
    )
    .bind(note)
    .bind(highlight_id)
    .fetch_one(pool)
    .await?;

    Ok(map_highlight_row(&row))
}

pub async fn delete_highlight(pool: &Pool<Postgres>, highlight_id: i64) -> Result<(), DbError> {
    sqlx::query("DELETE FROM highlight WHERE id = $1")
        .bind(highlight_id)
        .execute(pool)
        .await?;
    Ok(())
}

// ============================================================================
// HIGHLIGHT MESSAGE OPERATIONS
// ============================================================================

pub async fn list_highlight_messages(
    pool: &Pool<Postgres>,
    highlight_id: i64,
) -> Result<Vec<HighlightMessage>, DbError> {
    let rows = sqlx::query(
        r"
        SELECT id, highlight_id, role, content, created_at::text
        FROM highlight_message WHERE highlight_id = $1 ORDER BY created_at ASC
        ",
    )
    .bind(highlight_id)
    .fetch_all(pool)
    .await?;

    Ok(rows.iter().map(map_highlight_message_row).collect())
}

pub async fn add_highlight_message(
    pool: &Pool<Postgres>,
    highlight_id: i64,
    role: &str,
    content: &str,
) -> Result<HighlightMessage, DbError> {
    let row = sqlx::query(
        r"
        INSERT INTO highlight_message (highlight_id, role, content)
        VALUES ($1, $2, $3)
        RETURNING id, highlight_id, role, content, created_at::text
        ",
    )
    .bind(highlight_id)
    .bind(role)
    .bind(content)
    .fetch_one(pool)
    .await?;

    Ok(map_highlight_message_row(&row))
}

// ============================================================================
// BOOK CHAT THREAD OPERATIONS
// ============================================================================

pub async fn list_book_chat_threads(
    pool: &Pool<Postgres>,
    book_id: i64,
) -> Result<Vec<BookChatThread>, DbError> {
    let rows = sqlx::query(
        r"
        SELECT id, book_id, title, last_cfi, created_at::text, updated_at::text
        FROM book_chat_thread WHERE book_id = $1 ORDER BY updated_at DESC
        ",
    )
    .bind(book_id)
    .fetch_all(pool)
    .await?;

    Ok(rows.iter().map(map_book_chat_thread_row).collect())
}

pub async fn create_book_chat_thread(
    pool: &Pool<Postgres>,
    book_id: i64,
    title: &str,
) -> Result<BookChatThread, DbError> {
    let row = sqlx::query(
        r"
        INSERT INTO book_chat_thread (book_id, title)
        VALUES ($1, $2)
        RETURNING id, book_id, title, last_cfi, created_at::text, updated_at::text
        ",
    )
    .bind(book_id)
    .bind(title)
    .fetch_one(pool)
    .await?;

    Ok(map_book_chat_thread_row(&row))
}

pub async fn rename_book_chat_thread(
    pool: &Pool<Postgres>,
    thread_id: i64,
    title: &str,
) -> Result<(), DbError> {
    sqlx::query("UPDATE book_chat_thread SET title = $1, updated_at = NOW() WHERE id = $2")
        .bind(title)
        .bind(thread_id)
        .execute(pool)
        .await?;
    Ok(())
}

pub async fn set_thread_last_cfi(
    pool: &Pool<Postgres>,
    thread_id: i64,
    cfi: &str,
) -> Result<(), DbError> {
    sqlx::query("UPDATE book_chat_thread SET last_cfi = $1, updated_at = NOW() WHERE id = $2")
        .bind(cfi)
        .bind(thread_id)
        .execute(pool)
        .await?;
    Ok(())
}

pub async fn delete_book_chat_thread(pool: &Pool<Postgres>, thread_id: i64) -> Result<(), DbError> {
    sqlx::query("DELETE FROM book_chat_thread WHERE id = $1")
        .bind(thread_id)
        .execute(pool)
        .await?;
    Ok(())
}

// ============================================================================
// BOOK MESSAGE OPERATIONS
// ============================================================================

pub async fn list_book_messages(
    pool: &Pool<Postgres>,
    book_id: i64,
    thread_id: Option<i64>,
) -> Result<Vec<BookMessage>, DbError> {
    let rows = sqlx::query(
        r"
        SELECT id, book_id, thread_id, role, content, reasoning_summary, context_map, created_at::text
        FROM book_message WHERE book_id = $1 AND (thread_id = $2 OR (thread_id IS NULL AND $2 IS NULL))
        ORDER BY created_at ASC
        ",
    )
    .bind(book_id)
    .bind(thread_id)
    .fetch_all(pool)
    .await?;

    Ok(rows.iter().map(map_book_message_row).collect())
}

pub async fn add_book_message(
    pool: &Pool<Postgres>,
    book_id: i64,
    thread_id: Option<i64>,
    role: &str,
    content: &str,
    reasoning_summary: Option<&str>,
    context_map: Option<&str>,
) -> Result<BookMessage, DbError> {
    let row = sqlx::query(
        r"
        INSERT INTO book_message (book_id, thread_id, role, content, reasoning_summary, context_map)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, book_id, thread_id, role, content, reasoning_summary, context_map, created_at::text
        ",
    )
    .bind(book_id)
    .bind(thread_id)
    .bind(role)
    .bind(content)
    .bind(reasoning_summary)
    .bind(context_map)
    .fetch_one(pool)
    .await?;

    if let Some(tid) = thread_id {
        sqlx::query("UPDATE book_chat_thread SET updated_at = NOW() WHERE id = $1")
            .bind(tid)
            .execute(pool)
            .await?;
    }

    Ok(map_book_message_row(&row))
}

pub async fn delete_book_messages(pool: &Pool<Postgres>, book_id: i64) -> Result<(), DbError> {
    sqlx::query("DELETE FROM book_message WHERE book_id = $1")
        .bind(book_id)
        .execute(pool)
        .await?;
    Ok(())
}

pub async fn delete_book_message(pool: &Pool<Postgres>, message_id: i64) -> Result<(), DbError> {
    sqlx::query("DELETE FROM book_message WHERE id = $1")
        .bind(message_id)
        .execute(pool)
        .await?;
    Ok(())
}

pub async fn clear_default_book_messages(
    pool: &Pool<Postgres>,
    book_id: i64,
) -> Result<(), DbError> {
    sqlx::query("DELETE FROM book_message WHERE book_id = $1 AND thread_id IS NULL")
        .bind(book_id)
        .execute(pool)
        .await?;
    Ok(())
}

pub async fn get_thread_max_citation_index(
    pool: &Pool<Postgres>,
    book_id: i64,
    thread_id: Option<i64>,
) -> Result<i32, DbError> {
    let rows = sqlx::query(
        r"
        SELECT context_map FROM book_message
        WHERE book_id = $1 AND (thread_id = $2 OR (thread_id IS NULL AND $2 IS NULL))
        AND context_map IS NOT NULL
        ",
    )
    .bind(book_id)
    .bind(thread_id)
    .fetch_all(pool)
    .await?;

    // Optimized JSON parsing: avoid repeated String allocations and clones
    let max_index = rows
        .iter()
        .filter_map(|row| row.get::<Option<&str>, _>(0))
        .filter_map(|json_str| serde_json::from_str::<serde_json::Value>(json_str).ok())
        .filter_map(|json| {
            json.as_object()
                .and_then(|obj| obj.keys().filter_map(|k| k.parse::<i32>().ok()).max())
        })
        .max()
        .unwrap_or(0);

    Ok(max_index)
}

pub async fn delete_book_thread_messages(
    pool: &Pool<Postgres>,
    thread_id: i64,
) -> Result<(), DbError> {
    sqlx::query("DELETE FROM book_message WHERE thread_id = $1")
        .bind(thread_id)
        .execute(pool)
        .await?;
    Ok(())
}
