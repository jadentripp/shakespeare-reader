//! Database module for AI Reader
//!
//! This module provides all database operations for the application.
//! It supports both SQLite and PostgreSQL backends.

pub mod sqlite;
pub mod postgres;

use serde::{Deserialize, Serialize};
use tauri::AppHandle;

// ============================================================================
// DATA STRUCTURES
// ============================================================================

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
    pub first_image_index: Option<i32>,
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

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BookMessage {
    pub id: i64,
    pub book_id: i64,
    pub thread_id: Option<i64>,
    pub role: String,
    pub content: String,
    pub reasoning_summary: Option<String>,
    pub context_map: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BookChatThread {
    pub id: i64,
    pub book_id: i64,
    pub title: String,
    pub last_cfi: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

// ============================================================================
// FACADE: Dispatch to selected backend
// ============================================================================

// For now, we'll hardcode the switch based on an environment variable or default to SQLite.
// Later we can move this to a more formal configuration.
fn is_postgres_enabled() -> bool {
    std::env::var("AI_READER_POSTGRES").is_ok()
}

pub fn init(app_handle: &AppHandle) -> Result<(), anyhow::Error> {
    if is_postgres_enabled() {
        postgres::init()
    } else {
        sqlite::init(app_handle)
    }
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
    first_image_index: Option<i32>,
) -> Result<i64, anyhow::Error> {
    if is_postgres_enabled() {
        postgres::upsert_book(gutenberg_id, title, authors, publication_year, cover_url, mobi_path, html_path, first_image_index)
    } else {
        sqlite::upsert_book(app_handle, gutenberg_id, title, authors, publication_year, cover_url, mobi_path, html_path, first_image_index)
    }
}

pub fn list_books(app_handle: &AppHandle) -> Result<Vec<Book>, anyhow::Error> {
    if is_postgres_enabled() {
        postgres::list_books()
    } else {
        sqlite::list_books(app_handle)
    }
}

pub fn get_book(app_handle: &AppHandle, book_id: i64) -> Result<Book, anyhow::Error> {
    if is_postgres_enabled() {
        postgres::get_book(book_id)
    } else {
        sqlite::get_book(app_handle, book_id)
    }
}

pub fn hard_delete_book(app_handle: &AppHandle, book_id: i64) -> Result<(), anyhow::Error> {
    if is_postgres_enabled() {
        postgres::hard_delete_book(book_id)
    } else {
        sqlite::hard_delete_book(app_handle, book_id)
    }
}

pub fn set_book_position(app_handle: &AppHandle, book_id: i64, cfi: String) -> Result<(), anyhow::Error> {
    if is_postgres_enabled() {
        postgres::set_book_position(book_id, cfi)
    } else {
        sqlite::set_book_position(app_handle, book_id, cfi)
    }
}

pub fn get_book_position(app_handle: &AppHandle, book_id: i64) -> Result<Option<BookPosition>, anyhow::Error> {
    if is_postgres_enabled() {
        postgres::get_book_position(book_id)
    } else {
        sqlite::get_book_position(app_handle, book_id)
    }
}

pub fn set_setting(app_handle: &AppHandle, key: String, value: String) -> Result<(), anyhow::Error> {
    if is_postgres_enabled() {
        postgres::set_setting(key, value)
    } else {
        sqlite::set_setting(app_handle, key, value)
    }
}

pub fn get_setting(app_handle: &AppHandle, key: String) -> Result<Option<String>, anyhow::Error> {
    if is_postgres_enabled() {
        postgres::get_setting(key)
    } else {
        sqlite::get_setting(app_handle, key)
    }
}

pub fn list_highlights(app_handle: &AppHandle, book_id: i64) -> Result<Vec<Highlight>, anyhow::Error> {
    if is_postgres_enabled() {
        postgres::list_highlights(book_id)
    } else {
        sqlite::list_highlights(app_handle, book_id)
    }
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
    if is_postgres_enabled() {
        postgres::create_highlight(book_id, start_path, start_offset, end_path, end_offset, text, note)
    } else {
        sqlite::create_highlight(app_handle, book_id, start_path, start_offset, end_path, end_offset, text, note)
    }
}

pub fn update_highlight_note(
    app_handle: &AppHandle,
    highlight_id: i64,
    note: Option<String>,
) -> Result<Highlight, anyhow::Error> {
    if is_postgres_enabled() {
        postgres::update_highlight_note(highlight_id, note)
    } else {
        sqlite::update_highlight_note(app_handle, highlight_id, note)
    }
}

pub fn delete_highlight(app_handle: &AppHandle, highlight_id: i64) -> Result<(), anyhow::Error> {
    if is_postgres_enabled() {
        postgres::delete_highlight(highlight_id)
    } else {
        sqlite::delete_highlight(app_handle, highlight_id)
    }
}

pub fn list_highlight_messages(app_handle: &AppHandle, highlight_id: i64) -> Result<Vec<HighlightMessage>, anyhow::Error> {
    if is_postgres_enabled() {
        postgres::list_highlight_messages(highlight_id)
    } else {
        sqlite::list_highlight_messages(app_handle, highlight_id)
    }
}

pub fn add_highlight_message(
    app_handle: &AppHandle,
    highlight_id: i64,
    role: String,
    content: String,
) -> Result<HighlightMessage, anyhow::Error> {
    if is_postgres_enabled() {
        postgres::add_highlight_message(highlight_id, role, content)
    } else {
        sqlite::add_highlight_message(app_handle, highlight_id, role, content)
    }
}

pub fn list_book_chat_threads(app_handle: &AppHandle, book_id: i64) -> Result<Vec<BookChatThread>, anyhow::Error> {
    if is_postgres_enabled() {
        postgres::list_book_chat_threads(book_id)
    } else {
        sqlite::list_book_chat_threads(app_handle, book_id)
    }
}

pub fn create_book_chat_thread(
    app_handle: &AppHandle,
    book_id: i64,
    title: String,
) -> Result<BookChatThread, anyhow::Error> {
    if is_postgres_enabled() {
        postgres::create_book_chat_thread(book_id, title)
    } else {
        sqlite::create_book_chat_thread(app_handle, book_id, title)
    }
}

pub fn rename_book_chat_thread(
    app_handle: &AppHandle,
    thread_id: i64,
    title: String,
) -> Result<(), anyhow::Error> {
    if is_postgres_enabled() {
        postgres::rename_book_chat_thread(thread_id, title)
    } else {
        sqlite::rename_book_chat_thread(app_handle, thread_id, title)
    }
}

pub fn set_thread_last_cfi(
    app_handle: &AppHandle,
    thread_id: i64,
    cfi: String,
) -> Result<(), anyhow::Error> {
    if is_postgres_enabled() {
        postgres::set_thread_last_cfi(thread_id, cfi)
    } else {
        sqlite::set_thread_last_cfi(app_handle, thread_id, cfi)
    }
}

pub fn delete_book_chat_thread(app_handle: &AppHandle, thread_id: i64) -> Result<(), anyhow::Error> {
    if is_postgres_enabled() {
        postgres::delete_book_chat_thread(thread_id)
    } else {
        sqlite::delete_book_chat_thread(app_handle, thread_id)
    }
}

pub fn list_book_messages(
    app_handle: &AppHandle,
    book_id: i64,
    thread_id: Option<i64>,
) -> Result<Vec<BookMessage>, anyhow::Error> {
    if is_postgres_enabled() {
        postgres::list_book_messages(book_id, thread_id)
    } else {
        sqlite::list_book_messages(app_handle, book_id, thread_id)
    }
}

pub fn add_book_message(
    app_handle: &AppHandle,
    book_id: i64,
    thread_id: Option<i64>,
    role: String,
    content: String,
    reasoning_summary: Option<String>,
    context_map: Option<String>,
) -> Result<BookMessage, anyhow::Error> {
    if is_postgres_enabled() {
        postgres::add_book_message(book_id, thread_id, role, content, reasoning_summary, context_map)
    } else {
        sqlite::add_book_message(app_handle, book_id, thread_id, role, content, reasoning_summary, context_map)
    }
}

pub fn delete_book_messages(app_handle: &AppHandle, book_id: i64) -> Result<(), anyhow::Error> {
    if is_postgres_enabled() {
        postgres::delete_book_messages(book_id)
    } else {
        sqlite::delete_book_messages(app_handle, book_id)
    }
}

pub fn delete_book_message(app_handle: &AppHandle, message_id: i64) -> Result<(), anyhow::Error> {
    if is_postgres_enabled() {
        postgres::delete_book_message(message_id)
    } else {
        sqlite::delete_book_message(app_handle, message_id)
    }
}

pub fn clear_default_book_messages(app_handle: &AppHandle, book_id: i64) -> Result<(), anyhow::Error> {
    if is_postgres_enabled() {
        postgres::clear_default_book_messages(book_id)
    } else {
        sqlite::clear_default_book_messages(app_handle, book_id)
    }
}

pub fn get_thread_max_citation_index(
    app_handle: &AppHandle,
    book_id: i64,
    thread_id: Option<i64>,
) -> Result<i32, anyhow::Error> {
    if is_postgres_enabled() {
        postgres::get_thread_max_citation_index(book_id, thread_id)
    } else {
        sqlite::get_thread_max_citation_index(app_handle, book_id, thread_id)
    }
}

pub fn delete_book_thread_messages(app_handle: &AppHandle, thread_id: i64) -> Result<(), anyhow::Error> {
    if is_postgres_enabled() {
        postgres::delete_book_thread_messages(thread_id)
    } else {
        sqlite::delete_book_thread_messages(app_handle, thread_id)
    }
}
