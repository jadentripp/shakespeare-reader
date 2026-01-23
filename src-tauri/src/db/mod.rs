//! Database module for AI Reader
//!
//! This module provides all database operations for the application using PostgreSQL.

pub mod postgres;

use serde::{Deserialize, Serialize};

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
// RE-EXPORTS: All operations delegate to postgres
// ============================================================================

pub use postgres::init_pool;
pub use postgres::upsert_book;
pub use postgres::list_books;
pub use postgres::get_book;
pub use postgres::hard_delete_book;
pub use postgres::set_book_position;
pub use postgres::get_book_position;
pub use postgres::set_setting;
pub use postgres::get_setting;
pub use postgres::list_highlights;
pub use postgres::create_highlight;
pub use postgres::update_highlight_note;
pub use postgres::delete_highlight;
pub use postgres::list_highlight_messages;
pub use postgres::add_highlight_message;
pub use postgres::list_book_chat_threads;
pub use postgres::create_book_chat_thread;
pub use postgres::rename_book_chat_thread;
pub use postgres::set_thread_last_cfi;
pub use postgres::delete_book_chat_thread;
pub use postgres::list_book_messages;
pub use postgres::add_book_message;
pub use postgres::delete_book_messages;
pub use postgres::delete_book_message;
pub use postgres::clear_default_book_messages;
pub use postgres::get_thread_max_citation_index;
pub use postgres::delete_book_thread_messages;