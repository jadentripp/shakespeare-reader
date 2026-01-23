//! PostgreSQL backend for AI Reader
//!
//! This module uses runtime SQL queries (not compile-time checked macros)
//! to avoid requiring DATABASE_URL at build time.

use sqlx::postgres::PgPoolOptions;
use sqlx::{Pool, Postgres, Row};
use once_cell::sync::OnceCell;
use std::env;

use super::{Book, BookChatThread, BookMessage, BookPosition, Highlight, HighlightMessage};

static POOL: OnceCell<Pool<Postgres>> = OnceCell::new();

fn get_pool() -> &'static Pool<Postgres> {
    POOL.get().expect("Database pool not initialized")
}

pub fn init() -> Result<(), anyhow::Error> {
    let database_url = env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    
    // We need a runtime to initialize the pool in a synchronous context
    let rt = tokio::runtime::Runtime::new()?;
    let pool = rt.block_on(async {
        PgPoolOptions::new()
            .max_connections(5)
            .connect(&database_url)
            .await
    })?;

    POOL.set(pool).map_err(|_| anyhow::anyhow!("Failed to set pool"))?;
    
    // Run migrations/init schema
    init_schema()?;

    Ok(())
}

fn init_schema() -> Result<(), anyhow::Error> {
    let pool = get_pool();
    let rt = tokio::runtime::Runtime::new()?;
    
    rt.block_on(async {
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
                mobi_path TEXT,
                html_path TEXT,
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

        Ok::<(), sqlx::Error>(())
    })?;

    Ok(())
}

// ============================================================================
// BOOK OPERATIONS
// ============================================================================

pub fn upsert_book(
    gutenberg_id: i64,
    title: String,
    authors: String,
    publication_year: Option<i32>,
    cover_url: Option<String>,
    mobi_path: String,
    html_path: String,
    first_image_index: Option<i32>,
) -> Result<i64, anyhow::Error> {
    let pool = get_pool();
    let rt = tokio::runtime::Runtime::new()?;
    rt.block_on(async {
        let row: (i64,) = sqlx::query_as(
            r#"
            INSERT INTO book (gutenberg_id, title, authors, publication_year, cover_url, mobi_path, html_path, first_image_index)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            ON CONFLICT (gutenberg_id) DO UPDATE SET
                title = EXCLUDED.title,
                authors = EXCLUDED.authors,
                publication_year = EXCLUDED.publication_year,
                cover_url = EXCLUDED.cover_url,
                mobi_path = EXCLUDED.mobi_path,
                html_path = EXCLUDED.html_path,
                first_image_index = EXCLUDED.first_image_index
            RETURNING id
            "#,
        )
        .bind(gutenberg_id)
        .bind(&title)
        .bind(&authors)
        .bind(publication_year)
        .bind(&cover_url)
        .bind(&mobi_path)
        .bind(&html_path)
        .bind(first_image_index)
        .fetch_one(pool)
        .await?;
        Ok(row.0)
    })
}

pub fn list_books() -> Result<Vec<Book>, anyhow::Error> {
    let pool = get_pool();
    let rt = tokio::runtime::Runtime::new()?;
    rt.block_on(async {
        let rows = sqlx::query(
            r#"
            SELECT id, gutenberg_id, title, authors, publication_year, cover_url, mobi_path, html_path, first_image_index, created_at::text as created_at
            FROM book ORDER BY title ASC
            "#
        )
        .fetch_all(pool)
        .await?;
        
        let books: Vec<Book> = rows.iter().map(|row| Book {
            id: row.get("id"),
            gutenberg_id: row.get("gutenberg_id"),
            title: row.get("title"),
            authors: row.get("authors"),
            publication_year: row.get("publication_year"),
            cover_url: row.get("cover_url"),
            mobi_path: row.get("mobi_path"),
            html_path: row.get("html_path"),
            first_image_index: row.get("first_image_index"),
            created_at: row.get::<Option<String>, _>("created_at").unwrap_or_default(),
        }).collect();
        
        Ok(books)
    })
}

pub fn get_book(book_id: i64) -> Result<Book, anyhow::Error> {
    let pool = get_pool();
    let rt = tokio::runtime::Runtime::new()?;
    rt.block_on(async {
        let row = sqlx::query(
            r#"
            SELECT id, gutenberg_id, title, authors, publication_year, cover_url, mobi_path, html_path, first_image_index, created_at::text as created_at
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
            mobi_path: row.get("mobi_path"),
            html_path: row.get("html_path"),
            first_image_index: row.get("first_image_index"),
            created_at: row.get::<Option<String>, _>("created_at").unwrap_or_default(),
        })
    })
}

pub fn hard_delete_book(book_id: i64) -> Result<(), anyhow::Error> {
    let pool = get_pool();
    let rt = tokio::runtime::Runtime::new()?;
    rt.block_on(async {
        sqlx::query("DELETE FROM book WHERE id = $1")
            .bind(book_id)
            .execute(pool)
            .await?;
        Ok(())
    })
}

// ============================================================================
// BOOK POSITION OPERATIONS
// ============================================================================

pub fn set_book_position(book_id: i64, cfi: String) -> Result<(), anyhow::Error> {
    let pool = get_pool();
    let rt = tokio::runtime::Runtime::new()?;
    rt.block_on(async {
        sqlx::query(
            r#"
            INSERT INTO book_position (book_id, cfi)
            VALUES ($1, $2)
            ON CONFLICT (book_id) DO UPDATE SET cfi = EXCLUDED.cfi, updated_at = NOW()
            "#,
        )
        .bind(book_id)
        .bind(&cfi)
        .execute(pool)
        .await?;
        Ok(())
    })
}

pub fn get_book_position(book_id: i64) -> Result<Option<BookPosition>, anyhow::Error> {
    let pool = get_pool();
    let rt = tokio::runtime::Runtime::new()?;
    rt.block_on(async {
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
    })
}

// ============================================================================
// SETTINGS OPERATIONS
// ============================================================================

pub fn set_setting(key: String, value: String) -> Result<(), anyhow::Error> {
    let pool = get_pool();
    let rt = tokio::runtime::Runtime::new()?;
    rt.block_on(async {
        sqlx::query(
            "INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value"
        )
        .bind(&key)
        .bind(&value)
        .execute(pool)
        .await?;
        Ok(())
    })
}

pub fn get_setting(key: String) -> Result<Option<String>, anyhow::Error> {
    let pool = get_pool();
    let rt = tokio::runtime::Runtime::new()?;
    rt.block_on(async {
        let row = sqlx::query("SELECT value FROM settings WHERE key = $1")
            .bind(&key)
            .fetch_optional(pool)
            .await?;
        Ok(row.map(|r| r.get("value")))
    })
}

// ============================================================================
// HIGHLIGHT OPERATIONS
// ============================================================================

pub fn list_highlights(book_id: i64) -> Result<Vec<Highlight>, anyhow::Error> {
    let pool = get_pool();
    let rt = tokio::runtime::Runtime::new()?;
    rt.block_on(async {
        let rows = sqlx::query(
            r#"
            SELECT id, book_id, start_path, start_offset, end_path, end_offset, text, note, created_at::text as created_at, updated_at::text as updated_at
            FROM highlight WHERE book_id = $1 ORDER BY created_at DESC
            "#,
        )
        .bind(book_id)
        .fetch_all(pool)
        .await?;
        
        let highlights: Vec<Highlight> = rows.iter().map(|row| Highlight {
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
        }).collect();
        
        Ok(highlights)
    })
}

pub fn create_highlight(
    book_id: i64,
    start_path: String,
    start_offset: i64,
    end_path: String,
    end_offset: i64,
    text: String,
    note: Option<String>,
) -> Result<Highlight, anyhow::Error> {
    let pool = get_pool();
    let rt = tokio::runtime::Runtime::new()?;
    rt.block_on(async {
        let row = sqlx::query(
            r#"
            INSERT INTO highlight (book_id, start_path, start_offset, end_path, end_offset, text, note)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id, book_id, start_path, start_offset, end_path, end_offset, text, note, created_at::text as created_at, updated_at::text as updated_at
            "#,
        )
        .bind(book_id)
        .bind(&start_path)
        .bind(start_offset)
        .bind(&end_path)
        .bind(end_offset)
        .bind(&text)
        .bind(&note)
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
    })
}

pub fn update_highlight_note(
    highlight_id: i64,
    note: Option<String>,
) -> Result<Highlight, anyhow::Error> {
    let pool = get_pool();
    let rt = tokio::runtime::Runtime::new()?;
    rt.block_on(async {
        let row = sqlx::query(
            r#"
            UPDATE highlight SET note = $1, updated_at = NOW() WHERE id = $2
            RETURNING id, book_id, start_path, start_offset, end_path, end_offset, text, note, created_at::text as created_at, updated_at::text as updated_at
            "#,
        )
        .bind(&note)
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
    })
}

pub fn delete_highlight(highlight_id: i64) -> Result<(), anyhow::Error> {
    let pool = get_pool();
    let rt = tokio::runtime::Runtime::new()?;
    rt.block_on(async {
        sqlx::query("DELETE FROM highlight WHERE id = $1")
            .bind(highlight_id)
            .execute(pool)
            .await?;
        Ok(())
    })
}

// ============================================================================
// HIGHLIGHT MESSAGE OPERATIONS
// ============================================================================

pub fn list_highlight_messages(highlight_id: i64) -> Result<Vec<HighlightMessage>, anyhow::Error> {
    let pool = get_pool();
    let rt = tokio::runtime::Runtime::new()?;
    rt.block_on(async {
        let rows = sqlx::query(
            r#"
            SELECT id, highlight_id, role, content, created_at::text as created_at
            FROM highlight_message WHERE highlight_id = $1 ORDER BY created_at ASC
            "#,
        )
        .bind(highlight_id)
        .fetch_all(pool)
        .await?;
        
        let messages: Vec<HighlightMessage> = rows.iter().map(|row| HighlightMessage {
            id: row.get("id"),
            highlight_id: row.get("highlight_id"),
            role: row.get("role"),
            content: row.get("content"),
            created_at: row.get::<Option<String>, _>("created_at").unwrap_or_default(),
        }).collect();
        
        Ok(messages)
    })
}

pub fn add_highlight_message(
    highlight_id: i64,
    role: String,
    content: String,
) -> Result<HighlightMessage, anyhow::Error> {
    let pool = get_pool();
    let rt = tokio::runtime::Runtime::new()?;
    rt.block_on(async {
        let row = sqlx::query(
            r#"
            INSERT INTO highlight_message (highlight_id, role, content)
            VALUES ($1, $2, $3)
            RETURNING id, highlight_id, role, content, created_at::text as created_at
            "#,
        )
        .bind(highlight_id)
        .bind(&role)
        .bind(&content)
        .fetch_one(pool)
        .await?;
        
        Ok(HighlightMessage {
            id: row.get("id"),
            highlight_id: row.get("highlight_id"),
            role: row.get("role"),
            content: row.get("content"),
            created_at: row.get::<Option<String>, _>("created_at").unwrap_or_default(),
        })
    })
}

// ============================================================================
// BOOK CHAT THREAD OPERATIONS
// ============================================================================

pub fn list_book_chat_threads(book_id: i64) -> Result<Vec<BookChatThread>, anyhow::Error> {
    let pool = get_pool();
    let rt = tokio::runtime::Runtime::new()?;
    rt.block_on(async {
        let rows = sqlx::query(
            r#"
            SELECT id, book_id, title, last_cfi, created_at::text as created_at, updated_at::text as updated_at
            FROM book_chat_thread WHERE book_id = $1 ORDER BY updated_at DESC
            "#,
        )
        .bind(book_id)
        .fetch_all(pool)
        .await?;
        
        let threads: Vec<BookChatThread> = rows.iter().map(|row| BookChatThread {
            id: row.get("id"),
            book_id: row.get("book_id"),
            title: row.get("title"),
            last_cfi: row.get("last_cfi"),
            created_at: row.get::<Option<String>, _>("created_at").unwrap_or_default(),
            updated_at: row.get::<Option<String>, _>("updated_at").unwrap_or_default(),
        }).collect();
        
        Ok(threads)
    })
}

pub fn create_book_chat_thread(
    book_id: i64,
    title: String,
) -> Result<BookChatThread, anyhow::Error> {
    let pool = get_pool();
    let rt = tokio::runtime::Runtime::new()?;
    rt.block_on(async {
        let row = sqlx::query(
            r#"
            INSERT INTO book_chat_thread (book_id, title)
            VALUES ($1, $2)
            RETURNING id, book_id, title, last_cfi, created_at::text as created_at, updated_at::text as updated_at
            "#,
        )
        .bind(book_id)
        .bind(&title)
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
    })
}

pub fn rename_book_chat_thread(
    thread_id: i64,
    title: String,
) -> Result<(), anyhow::Error> {
    let pool = get_pool();
    let rt = tokio::runtime::Runtime::new()?;
    rt.block_on(async {
        sqlx::query("UPDATE book_chat_thread SET title = $1, updated_at = NOW() WHERE id = $2")
            .bind(&title)
            .bind(thread_id)
            .execute(pool)
            .await?;
        Ok(())
    })
}

pub fn set_thread_last_cfi(
    thread_id: i64,
    cfi: String,
) -> Result<(), anyhow::Error> {
    let pool = get_pool();
    let rt = tokio::runtime::Runtime::new()?;
    rt.block_on(async {
        sqlx::query("UPDATE book_chat_thread SET last_cfi = $1, updated_at = NOW() WHERE id = $2")
            .bind(&cfi)
            .bind(thread_id)
            .execute(pool)
            .await?;
        Ok(())
    })
}

pub fn delete_book_chat_thread(thread_id: i64) -> Result<(), anyhow::Error> {
    let pool = get_pool();
    let rt = tokio::runtime::Runtime::new()?;
    rt.block_on(async {
        sqlx::query("DELETE FROM book_chat_thread WHERE id = $1")
            .bind(thread_id)
            .execute(pool)
            .await?;
        Ok(())
    })
}

// ============================================================================
// BOOK MESSAGE OPERATIONS
// ============================================================================

pub fn list_book_messages(
    book_id: i64,
    thread_id: Option<i64>,
) -> Result<Vec<BookMessage>, anyhow::Error> {
    let pool = get_pool();
    let rt = tokio::runtime::Runtime::new()?;
    rt.block_on(async {
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
        
        let messages: Vec<BookMessage> = rows.iter().map(|row| BookMessage {
            id: row.get("id"),
            book_id: row.get("book_id"),
            thread_id: row.get("thread_id"),
            role: row.get("role"),
            content: row.get("content"),
            reasoning_summary: row.get("reasoning_summary"),
            context_map: row.get("context_map"),
            created_at: row.get::<Option<String>, _>("created_at").unwrap_or_default(),
        }).collect();
        
        Ok(messages)
    })
}

pub fn add_book_message(
    book_id: i64,
    thread_id: Option<i64>,
    role: String,
    content: String,
    reasoning_summary: Option<String>,
    context_map: Option<String>,
) -> Result<BookMessage, anyhow::Error> {
    let pool = get_pool();
    let rt = tokio::runtime::Runtime::new()?;
    rt.block_on(async {
        let row = sqlx::query(
            r#"
            INSERT INTO book_message (book_id, thread_id, role, content, reasoning_summary, context_map)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id, book_id, thread_id, role, content, reasoning_summary, context_map, created_at::text as created_at
            "#,
        )
        .bind(book_id)
        .bind(thread_id)
        .bind(&role)
        .bind(&content)
        .bind(&reasoning_summary)
        .bind(&context_map)
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
    })
}

pub fn delete_book_messages(book_id: i64) -> Result<(), anyhow::Error> {
    let pool = get_pool();
    let rt = tokio::runtime::Runtime::new()?;
    rt.block_on(async {
        sqlx::query("DELETE FROM book_message WHERE book_id = $1")
            .bind(book_id)
            .execute(pool)
            .await?;
        Ok(())
    })
}

pub fn delete_book_message(message_id: i64) -> Result<(), anyhow::Error> {
    let pool = get_pool();
    let rt = tokio::runtime::Runtime::new()?;
    rt.block_on(async {
        sqlx::query("DELETE FROM book_message WHERE id = $1")
            .bind(message_id)
            .execute(pool)
            .await?;
        Ok(())
    })
}

pub fn clear_default_book_messages(book_id: i64) -> Result<(), anyhow::Error> {
    let pool = get_pool();
    let rt = tokio::runtime::Runtime::new()?;
    rt.block_on(async {
        sqlx::query("DELETE FROM book_message WHERE book_id = $1 AND thread_id IS NULL")
            .bind(book_id)
            .execute(pool)
            .await?;
        Ok(())
    })
}

pub fn get_thread_max_citation_index(
    book_id: i64,
    thread_id: Option<i64>,
) -> Result<i32, anyhow::Error> {
    let pool = get_pool();
    let rt = tokio::runtime::Runtime::new()?;
    rt.block_on(async {
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

        let mut max_index = 0;
        for row in rows {
            let context_map: Option<String> = row.get("context_map");
            if let Some(json_str) = context_map {
                if let Ok(json) = serde_json::from_str::<serde_json::Value>(&json_str) {
                    if let Some(map) = json.as_object() {
                        for key in map.keys() {
                            if let Ok(idx) = key.parse::<i32>() {
                                if idx > max_index {
                                    max_index = idx;
                                }
                            }
                        }
                    }
                }
            }
        }
        Ok(max_index)
    })
}

pub fn delete_book_thread_messages(thread_id: i64) -> Result<(), anyhow::Error> {
    let pool = get_pool();
    let rt = tokio::runtime::Runtime::new()?;
    rt.block_on(async {
        sqlx::query("DELETE FROM book_message WHERE thread_id = $1")
            .bind(thread_id)
            .execute(pool)
            .await?;
        Ok(())
    })
}