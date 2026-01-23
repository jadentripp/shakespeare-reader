//! PostgreSQL backend for AI Reader
//!
//! This module uses runtime SQL queries (not compile-time checked macros)
//! to avoid requiring DATABASE_URL at build time.

use sqlx::postgres::PgPoolOptions;
use sqlx::{Pool, Postgres, Row};
use thiserror::Error;
use once_cell::sync::OnceCell;
use std::env;

use super::{Book, BookChatThread, BookMessage, BookPosition, Highlight, HighlightMessage};

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
    POOL.get().ok_or_else(|| DbError::Other("Database pool not initialized".to_string()))
}

pub fn init() -> Result<(), DbError> {
    let database_url = env::var("DATABASE_URL")
        .map_err(|_| DbError::MissingDatabaseUrl)?;

    POOL.get_or_try_init(|| {
        tauri::async_runtime::block_on(async {
            let pool = PgPoolOptions::new()
                .max_connections(5)
                .connect(&database_url)
                .await?;
            init_schema(&pool).await?;
            Ok::<Pool<Postgres>, DbError>(pool)
        })
    })?;

    Ok(())
}

async fn init_schema(pool: &Pool<Postgres>) -> Result<(), DbError> {
    // Settings table
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)"
    )
    .execute(pool)
    .await?;

    // Book table
    sqlx::query(
        r#"CREATE TABLE IF NOT EXISTS book (
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
        )"#
    )
    .execute(pool)
    .await?;
    
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_book_title ON book(title)")
        .execute(pool)
        .await?;

    // Book position table
    sqlx::query(
        r#"CREATE TABLE IF NOT EXISTS book_position (
            book_id BIGINT PRIMARY KEY REFERENCES book(id) ON DELETE CASCADE,
            cfi TEXT NOT NULL,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )"#
    )
    .execute(pool)
    .await?;

    // Highlight table
    sqlx::query(
        r#"CREATE TABLE IF NOT EXISTS highlight (
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
        )"#
    )
    .execute(pool)
    .await?;
    
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_highlight_book ON highlight(book_id)")
        .execute(pool)
        .await?;

    // Highlight message table
    sqlx::query(
        r#"CREATE TABLE IF NOT EXISTS highlight_message (
            id BIGSERIAL PRIMARY KEY,
            highlight_id BIGINT NOT NULL REFERENCES highlight(id) ON DELETE CASCADE,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )"#
    )
    .execute(pool)
    .await?;
    
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_highlight_message_highlight ON highlight_message(highlight_id)")
        .execute(pool)
        .await?;

    // Book chat thread table
    sqlx::query(
        r#"CREATE TABLE IF NOT EXISTS book_chat_thread (
            id BIGSERIAL PRIMARY KEY,
            book_id BIGINT NOT NULL REFERENCES book(id) ON DELETE CASCADE,
            title TEXT NOT NULL,
            last_cfi TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )"#
    )
    .execute(pool)
    .await?;
    
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_book_chat_thread_book ON book_chat_thread(book_id)")
        .execute(pool)
        .await?;

    // Book message table
    sqlx::query(
        r#"CREATE TABLE IF NOT EXISTS book_message (
            id BIGSERIAL PRIMARY KEY,
            book_id BIGINT NOT NULL REFERENCES book(id) ON DELETE CASCADE,
            thread_id BIGINT REFERENCES book_chat_thread(id) ON DELETE CASCADE,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            reasoning_summary TEXT,
            context_map TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )"#
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
// BOOK OPERATIONS
// ============================================================================

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
        r#"
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
        "#,
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
    .await?;
    Ok(row.0)
}

pub async fn list_books(pool: &Pool<Postgres>) -> Result<Vec<Book>, DbError> {
    let rows = sqlx::query(
        r#"
        SELECT id, gutenberg_id, title, authors, publication_year, cover_url, mobi_data, html_content, first_image_index, created_at::text as created_at
        FROM book ORDER BY title ASC
        "#
    )
    .fetch_all(pool)
    .await?;
    
    let mut books = Vec::with_capacity(rows.len());
    for row in rows {
        books.push(Book {
            id: row.get("id"),
            gutenberg_id: row.get("gutenberg_id"),
            title: row.get("title"),
            authors: row.get("authors"),
            publication_year: row.get("publication_year"),
            cover_url: row.get("cover_url"),
            mobi_data: row.get("mobi_data"),
            html_content: row.get("html_content"),
            first_image_index: row.get("first_image_index"),
            created_at: row.get::<Option<String>, _>("created_at").unwrap_or_default(),
        });
    }
    Ok(books)
}

pub async fn get_book(pool: &Pool<Postgres>, book_id: i64) -> Result<Book, DbError> {
    let row = sqlx::query(
        r#"
        SELECT id, gutenberg_id, title, authors, publication_year, cover_url, mobi_data, html_content, first_image_index, created_at::text as created_at
        FROM book WHERE id = $1
        "#,
    )
    .bind(book_id)
    .fetch_one(pool)
    .await?;
    
    Ok(Book {
        id: row.get("id"),
        gutenberg_id: row.get("gutenberg_id"),
        title: row.get("title"),
        authors: row.get("authors"),
        publication_year: row.get("publication_year"),
        cover_url: row.get("cover_url"),
        mobi_data: row.get("mobi_data"),
        html_content: row.get("html_content"),
        first_image_index: row.get("first_image_index"),
        created_at: row.get::<Option<String>, _>("created_at").unwrap_or_default(),
    })
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

pub async fn set_book_position(pool: &Pool<Postgres>, book_id: i64, cfi: &str) -> Result<(), DbError> {
    sqlx::query(
        r#"
        INSERT INTO book_position (book_id, cfi)
        VALUES ($1, $2)
        ON CONFLICT (book_id) DO UPDATE SET cfi = EXCLUDED.cfi, updated_at = NOW()
        "#,
    )
    .bind(book_id)
    .bind(cfi)
    .execute(pool)
    .await?;
    Ok(())
}

pub async fn get_book_position(pool: &Pool<Postgres>, book_id: i64) -> Result<Option<BookPosition>, DbError> {
    let row = sqlx::query(
        "SELECT cfi, updated_at::text as updated_at FROM book_position WHERE book_id = $1"
    )
    .bind(book_id)
    .fetch_optional(pool)
    .await?;
    
    Ok(row.map(|r| BookPosition {
        cfi: r.get("cfi"),
        updated_at: r.get::<Option<String>, _>("updated_at").unwrap_or_default(),
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
    Ok(row.map(|r| r.get("value")))
}

// ============================================================================
// HIGHLIGHT OPERATIONS
// ============================================================================

pub async fn list_highlights(pool: &Pool<Postgres>, book_id: i64) -> Result<Vec<Highlight>, DbError> {
    let rows = sqlx::query(
        r#"
        SELECT id, book_id, start_path, start_offset, end_path, end_offset, text, note, created_at::text as created_at, updated_at::text as updated_at
        FROM highlight WHERE book_id = $1 ORDER BY created_at DESC
        "#,
    )
    .bind(book_id)
    .fetch_all(pool)
    .await?;
    
    let mut highlights = Vec::with_capacity(rows.len());
    for row in rows {
        highlights.push(Highlight {
            id: row.get("id"),
            book_id: row.get("book_id"),
            start_path: row.get("start_path"),
            start_offset: row.get("start_offset"),
            end_path: row.get("end_path"),
            end_offset: row.get("end_offset"),
            text: row.get("text"),
            note: row.get("note"),
            created_at: row.get::<Option<String>, _>("created_at").unwrap_or_default(),
            updated_at: row.get::<Option<String>, _>("updated_at").unwrap_or_default(),
        });
    }
    Ok(highlights)
}

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
        r#"
        INSERT INTO highlight (book_id, start_path, start_offset, end_path, end_offset, text, note)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, book_id, start_path, start_offset, end_path, end_offset, text, note, created_at::text as created_at, updated_at::text as updated_at
        "#,
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
    
    Ok(Highlight {
        id: row.get("id"),
        book_id: row.get("book_id"),
        start_path: row.get("start_path"),
        start_offset: row.get("start_offset"),
        end_path: row.get("end_path"),
        end_offset: row.get("end_offset"),
        text: row.get("text"),
        note: row.get("note"),
        created_at: row.get::<Option<String>, _>("created_at").unwrap_or_default(),
        updated_at: row.get::<Option<String>, _>("updated_at").unwrap_or_default(),
    })
}

pub async fn update_highlight_note(
    pool: &Pool<Postgres>,
    highlight_id: i64,
    note: Option<&str>,
) -> Result<Highlight, DbError> {
    let row = sqlx::query(
        r#"
        UPDATE highlight SET note = $1, updated_at = NOW() WHERE id = $2
        RETURNING id, book_id, start_path, start_offset, end_path, end_offset, text, note, created_at::text as created_at, updated_at::text as updated_at
        "#,
    )
    .bind(note)
    .bind(highlight_id)
    .fetch_one(pool)
    .await?;
    
    Ok(Highlight {
        id: row.get("id"),
        book_id: row.get("book_id"),
        start_path: row.get("start_path"),
        start_offset: row.get("start_offset"),
        end_path: row.get("end_path"),
        end_offset: row.get("end_offset"),
        text: row.get("text"),
        note: row.get("note"),
        created_at: row.get::<Option<String>, _>("created_at").unwrap_or_default(),
        updated_at: row.get::<Option<String>, _>("updated_at").unwrap_or_default(),
    })
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

pub async fn list_highlight_messages(pool: &Pool<Postgres>, highlight_id: i64) -> Result<Vec<HighlightMessage>, DbError> {
    let rows = sqlx::query(
        r#"
        SELECT id, highlight_id, role, content, created_at::text as created_at
        FROM highlight_message WHERE highlight_id = $1 ORDER BY created_at ASC
        "#,
    )
    .bind(highlight_id)
    .fetch_all(pool)
    .await?;
    
    let mut messages = Vec::with_capacity(rows.len());
    for row in rows {
        messages.push(HighlightMessage {
            id: row.get("id"),
            highlight_id: row.get("highlight_id"),
            role: row.get("role"),
            content: row.get("content"),
            created_at: row.get::<Option<String>, _>("created_at").unwrap_or_default(),
        });
    }
    Ok(messages)
}

pub async fn add_highlight_message(
    pool: &Pool<Postgres>,
    highlight_id: i64,
    role: &str,
    content: &str,
) -> Result<HighlightMessage, DbError> {
    let row = sqlx::query(
        r#"
        INSERT INTO highlight_message (highlight_id, role, content)
        VALUES ($1, $2, $3)
        RETURNING id, highlight_id, role, content, created_at::text as created_at
        "#,
    )
    .bind(highlight_id)
    .bind(role)
    .bind(content)
    .fetch_one(pool)
    .await?;
    
    Ok(HighlightMessage {
        id: row.get("id"),
        highlight_id: row.get("highlight_id"),
        role: row.get("role"),
        content: row.get("content"),
        created_at: row.get::<Option<String>, _>("created_at").unwrap_or_default(),
    })
}

// ============================================================================
// BOOK CHAT THREAD OPERATIONS
// ============================================================================

pub async fn list_book_chat_threads(pool: &Pool<Postgres>, book_id: i64) -> Result<Vec<BookChatThread>, DbError> {
    let rows = sqlx::query(
        r#"
        SELECT id, book_id, title, last_cfi, created_at::text as created_at, updated_at::text as updated_at
        FROM book_chat_thread WHERE book_id = $1 ORDER BY updated_at DESC
        "#,
    )
    .bind(book_id)
    .fetch_all(pool)
    .await?;
    
    let mut threads = Vec::with_capacity(rows.len());
    for row in rows {
        threads.push(BookChatThread {
            id: row.get("id"),
            book_id: row.get("book_id"),
            title: row.get("title"),
            last_cfi: row.get("last_cfi"),
            created_at: row.get::<Option<String>, _>("created_at").unwrap_or_default(),
            updated_at: row.get::<Option<String>, _>("updated_at").unwrap_or_default(),
        });
    }
    Ok(threads)
}

pub async fn create_book_chat_thread(
    pool: &Pool<Postgres>,
    book_id: i64,
    title: &str,
) -> Result<BookChatThread, DbError> {
    let row = sqlx::query(
        r#"
        INSERT INTO book_chat_thread (book_id, title)
        VALUES ($1, $2)
        RETURNING id, book_id, title, last_cfi, created_at::text as created_at, updated_at::text as updated_at
        "#,
    )
    .bind(book_id)
    .bind(title)
    .fetch_one(pool)
    .await?;
    
    Ok(BookChatThread {
        id: row.get("id"),
        book_id: row.get("book_id"),
        title: row.get("title"),
        last_cfi: row.get("last_cfi"),
        created_at: row.get::<Option<String>, _>("created_at").unwrap_or_default(),
        updated_at: row.get::<Option<String>, _>("updated_at").unwrap_or_default(),
    })
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
        r#"
        SELECT id, book_id, thread_id, role, content, reasoning_summary, context_map, created_at::text as created_at
        FROM book_message WHERE book_id = $1 AND (thread_id = $2 OR (thread_id IS NULL AND $2 IS NULL))
        ORDER BY created_at ASC
        "#,
    )
    .bind(book_id)
    .bind(thread_id)
    .fetch_all(pool)
    .await?;
    
    let mut messages = Vec::with_capacity(rows.len());
    for row in rows {
        messages.push(BookMessage {
            id: row.get("id"),
            book_id: row.get("book_id"),
            thread_id: row.get("thread_id"),
            role: row.get("role"),
            content: row.get("content"),
            reasoning_summary: row.get("reasoning_summary"),
            context_map: row.get("context_map"),
            created_at: row.get::<Option<String>, _>("created_at").unwrap_or_default(),
        });
    }
    Ok(messages)
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
        r#"
        INSERT INTO book_message (book_id, thread_id, role, content, reasoning_summary, context_map)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, book_id, thread_id, role, content, reasoning_summary, context_map, created_at::text as created_at
        "#,
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
    
    Ok(BookMessage {
        id: row.get("id"),
        book_id: row.get("book_id"),
        thread_id: row.get("thread_id"),
        role: row.get("role"),
        content: row.get("content"),
        reasoning_summary: row.get("reasoning_summary"),
        context_map: row.get("context_map"),
        created_at: row.get::<Option<String>, _>("created_at").unwrap_or_default(),
    })
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

pub async fn clear_default_book_messages(pool: &Pool<Postgres>, book_id: i64) -> Result<(), DbError> {
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
        r#"
        SELECT context_map FROM book_message
        WHERE book_id = $1 AND (thread_id = $2 OR (thread_id IS NULL AND $2 IS NULL))
        AND context_map IS NOT NULL
        "#,
    )
    .bind(book_id)
    .bind(thread_id)
    .fetch_all(pool)
    .await?;

    let max_index = rows
        .iter()
        .filter_map(|row| row.get::<Option<String>, _>("context_map"))
        .filter_map(|json_str| serde_json::from_str::<serde_json::Value>(&json_str).ok())
        .filter_map(|json| {
            json.as_object()
                .map(|obj| obj.keys().filter_map(|k| k.parse::<i32>().ok()).max())
        })
        .flatten()
        .max()
        .unwrap_or(0);
    
    Ok(max_index)
}

pub async fn delete_book_thread_messages(pool: &Pool<Postgres>, thread_id: i64) -> Result<(), DbError> {
    sqlx::query("DELETE FROM book_message WHERE thread_id = $1")
        .bind(thread_id)
        .execute(pool)
        .await?;
    Ok(())
}