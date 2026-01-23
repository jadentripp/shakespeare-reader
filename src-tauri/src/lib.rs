mod books;
mod db;
mod gutendex;

use db::{Book, BookChatThread, BookMessage, BookPosition, Highlight, HighlightMessage};
use tauri::{AppHandle, State, Manager};
use sqlx::{Pool, Postgres};
use std::fs;
use anyhow::Context;

/// Helper to convert anyhow::Result to Tauri-compatible Result<T, String>
fn cmd<T>(result: anyhow::Result<T>) -> Result<T, String> {
    result.map_err(|e| format!("{:#}", e))
}

#[tauri::command]
async fn db_init(_pool: State<'_, Pool<Postgres>>) -> Result<(), String> {
    // Pool is already initialized in run() and managed as State.
    Ok(())
}

#[tauri::command]
async fn gutendex_shakespeare_page(
    _app_handle: AppHandle,
    _pool: State<'_, Pool<Postgres>>,
    page_url: Option<String>,
) -> Result<gutendex::GutendexResponse, String> {
    cmd(async {
        gutendex::search_catalog("shakespeare", page_url, None, None)
            .await
            .context("fetching shakespeare page")
    }.await)
}

#[tauri::command]
async fn gutendex_catalog_page(
    _app_handle: AppHandle,
    _pool: State<'_, Pool<Postgres>>,
    catalog_key: String,
    page_url: Option<String>,
    search_query: Option<String>,
    topic: Option<String>,
) -> Result<gutendex::GutendexResponse, String> {
    cmd(async {
        gutendex::search_catalog(&catalog_key, page_url, search_query, topic)
            .await
            .with_context(|| format!("fetching catalog page for {}", catalog_key))
    }.await)
}

#[tauri::command]
async fn list_books(_app_handle: AppHandle, pool: State<'_, Pool<Postgres>>) -> Result<Vec<Book>, String> {
    cmd(async {
        db::list_books(&pool)
            .await
            .map_err(anyhow::Error::from)
            .context("listing books from database")
    }.await)
}

#[tauri::command]
async fn get_book(_app_handle: AppHandle, pool: State<'_, Pool<Postgres>>, book_id: i64) -> Result<Book, String> {
    cmd(async {
        db::get_book(&pool, book_id)
            .await
            .map_err(anyhow::Error::from)
            .with_context(|| format!("getting book {} from database", book_id))
    }.await)
}

#[tauri::command]
async fn download_gutenberg_mobi(
    app_handle: AppHandle,
    pool: State<'_, Pool<Postgres>>,
    gutenberg_id: i64,
    title: String,
    authors: String,
    publication_year: Option<i32>,
    cover_url: Option<String>,
    mobi_url: String,
) -> Result<i64, String> {
    cmd(async {
        let mobi_bytes = books::download_mobi_bytes(&app_handle, gutenberg_id, mobi_url)
            .await
            .map_err(anyhow::Error::from)
            .with_context(|| format!("downloading book {} ({})", gutenberg_id, title))?;

        let (html_content, first_image_index) = {
            let app_handle = app_handle.clone();
            let mobi_bytes = mobi_bytes.clone();
            tauri::async_runtime::spawn_blocking(move || {
                books::extract_mobi_to_content(&app_handle, gutenberg_id, &mobi_bytes)
            })
            .await
            .context("waiting for mobi extraction thread")?
            .map_err(anyhow::Error::from)
            .context("extracting mobi to html")?
        };

        db::upsert_book(
            &pool,
            gutenberg_id,
            &title,
            &authors,
            publication_year,
            cover_url.as_deref(),
            Some(&mobi_bytes),
            Some(&html_content),
            first_image_index.map(|v| v as i32),
        )
        .await
        .map_err(anyhow::Error::from)
        .context("saving book to database")
    }.await)
}

#[tauri::command]
async fn get_book_html(app_handle: AppHandle, pool: State<'_, Pool<Postgres>>, book_id: i64) -> Result<String, String> {
    cmd(async {
        let book = db::get_book(&pool, book_id)
            .await
            .map_err(anyhow::Error::from)
            .with_context(|| format!("getting book metadata for {}", book_id))?;

        if let Some(html) = book.html_content {
            // Check for issues that might require regeneration
            let has_invalid_controls = books::has_invalid_controls(html.as_bytes());
            let needs_regeneration = html.is_empty()
                || books::looks_like_mojibake(&html)
                || books::has_many_replacements(&html)
                || has_invalid_controls;

            if !needs_regeneration {
                return Ok(html);
            }
        }

        // Needs regeneration or initial extraction from stored mobi_data
        if let Some(ref mobi_bytes) = book.mobi_data {
            let mobi_bytes_clone = mobi_bytes.clone();
            let app_handle_clone = app_handle.clone();
            let gutenberg_id = book.gutenberg_id;
            
            let (html_content, first_image_index) = tauri::async_runtime::spawn_blocking(move || {
                books::extract_mobi_to_content(&app_handle_clone, gutenberg_id, &mobi_bytes_clone)
            })
            .await
            .context("waiting for extraction thread during regeneration")?
            .map_err(anyhow::Error::from)
            .context("regenerating html from mobi data")?;
            
            db::upsert_book(
                &pool,
                book.gutenberg_id,
                &book.title,
                &book.authors,
                book.publication_year,
                book.cover_url.as_deref(),
                Some(mobi_bytes),
                Some(&html_content),
                first_image_index.map(|v| v as i32),
            )
            .await
            .map_err(anyhow::Error::from)
            .context("updating book record after regeneration")?;

            return Ok(html_content);
        }

        anyhow::bail!("Book has no HTML content or MOBI data available");
    }.await)
}

#[tauri::command]
async fn get_book_image_data(app_handle: AppHandle, pool: State<'_, Pool<Postgres>>, book_id: i64, relative_index: i32) -> Result<String, String> {
    cmd(async {
        let book = db::get_book(&pool, book_id)
            .await
            .map_err(anyhow::Error::from)
            .with_context(|| format!("getting book metadata for {}", book_id))?;
        let first_image_index = book.first_image_index.ok_or_else(|| anyhow::anyhow!("Book has no image index"))?;
        
        let absolute_index = (first_image_index + relative_index - 1) as usize;
        
        let path = books::get_book_asset_path(&app_handle, book.gutenberg_id, absolute_index)
            .map_err(anyhow::Error::from)
            .with_context(|| format!("finding asset path for index {}", relative_index))?;
            
        let bytes = tauri::async_runtime::spawn_blocking({
            let path = path.clone();
            move || fs::read(&path).map(|b| (b, path))
        })
        .await
        .context("waiting for image read thread")?
        .with_context(|| format!("reading image from {:?}", path))?;

        let (bytes, path) = bytes;
        let extension = path.extension().and_then(|s| s.to_str()).unwrap_or("jpeg");
        let mime = match extension {
            "jpg" | "jpeg" => "image/jpeg",
            "png" => "image/png",
            "gif" => "image/gif",
            _ => "image/jpeg",
        };
        
        let b64 = data_encoding::BASE64.encode(&bytes);
        Ok(format!("data:{};base64,{}", mime, b64))
    }.await)
}

#[tauri::command]
async fn get_book_position(_app_handle: AppHandle, pool: State<'_, Pool<Postgres>>, book_id: i64) -> Result<Option<BookPosition>, String> {
    cmd(async {
        db::get_book_position(&pool, book_id)
            .await
            .map_err(anyhow::Error::from)
            .context("getting book position")
    }.await)
}

#[tauri::command]
async fn set_book_position(_app_handle: AppHandle, pool: State<'_, Pool<Postgres>>, book_id: i64, cfi: String) -> Result<(), String> {
    cmd(async {
        db::set_book_position(&pool, book_id, &cfi)
            .await
            .map_err(anyhow::Error::from)
            .context("saving book position")
    }.await)
}

#[tauri::command]
async fn hard_delete_book(app_handle: AppHandle, pool: State<'_, Pool<Postgres>>, book_id: i64) -> Result<(), String> {
    cmd(async {
        let book = db::get_book(&pool, book_id)
            .await
            .map_err(anyhow::Error::from)
            .with_context(|| format!("getting book metadata for deletion: {}", book_id))?;

        // Still delete assets on disk (images)
        let app_handle_clone = app_handle.clone();
        tauri::async_runtime::spawn_blocking(move || {
            let _ = books::delete_book_assets(&app_handle_clone, book.gutenberg_id);
        })
        .await
        .context("waiting for asset deletion thread")?;

        db::hard_delete_book(&pool, book_id)
            .await
            .map_err(anyhow::Error::from)
            .context("deleting book from database")
    }.await)
}

#[tauri::command]
async fn set_setting(_app_handle: AppHandle, pool: State<'_, Pool<Postgres>>, key: String, value: String) -> Result<(), String> {
    cmd(async {
        db::set_setting(&pool, &key, &value)
            .await
            .map_err(anyhow::Error::from)
            .with_context(|| format!("setting '{}'", key))
    }.await)
}

#[tauri::command]
async fn get_setting(_app_handle: AppHandle, pool: State<'_, Pool<Postgres>>, key: String) -> Result<Option<String>, String> {
    cmd(async {
        db::get_setting(&pool, &key)
            .await
            .map_err(anyhow::Error::from)
            .with_context(|| format!("getting '{}'", key))
    }.await)
}

#[tauri::command]
async fn list_highlights(_app_handle: AppHandle, pool: State<'_, Pool<Postgres>>, book_id: i64) -> Result<Vec<Highlight>, String> {
    cmd(async {
        db::list_highlights(&pool, book_id)
            .await
            .map_err(anyhow::Error::from)
            .context("listing highlights")
    }.await)
}

#[tauri::command]
async fn create_highlight(
    _app_handle: AppHandle,
    pool: State<'_, Pool<Postgres>>,
    book_id: i64,
    start_path: String,
    start_offset: i64,
    end_path: String,
    end_offset: i64,
    text: String,
    note: Option<String>,
) -> Result<Highlight, String> {
    cmd(async {
        db::create_highlight(
            &pool,
            book_id,
            &start_path,
            start_offset,
            &end_path,
            end_offset,
            &text,
            note.as_deref(),
        )
        .await
        .map_err(anyhow::Error::from)
        .context("creating highlight")
    }.await)
}

#[tauri::command]
async fn update_highlight_note(
    _app_handle: AppHandle,
    pool: State<'_, Pool<Postgres>>,
    highlight_id: i64,
    note: Option<String>,
) -> Result<Highlight, String> {
    cmd(async {
        db::update_highlight_note(&pool, highlight_id, note.as_deref())
            .await
            .map_err(anyhow::Error::from)
            .context("updating highlight note")
    }.await)
}

#[tauri::command]
async fn delete_highlight(
    _app_handle: AppHandle,
    pool: State<'_, Pool<Postgres>>,
    highlight_id: i64,
) -> Result<(), String> {
    cmd(async {
        db::delete_highlight(&pool, highlight_id)
            .await
            .map_err(anyhow::Error::from)
            .context("deleting highlight")
    }.await)
}

#[tauri::command]
async fn list_highlight_messages(
    _app_handle: AppHandle,
    pool: State<'_, Pool<Postgres>>,
    highlight_id: i64,
) -> Result<Vec<HighlightMessage>, String> {
    cmd(async {
        db::list_highlight_messages(&pool, highlight_id)
            .await
            .map_err(anyhow::Error::from)
            .context("listing highlight messages")
    }.await)
}

#[tauri::command]
async fn add_highlight_message(
    _app_handle: AppHandle,
    pool: State<'_, Pool<Postgres>>,
    highlight_id: i64,
    role: String,
    content: String,
) -> Result<HighlightMessage, String> {
    cmd(async {
        db::add_highlight_message(&pool, highlight_id, &role, &content)
            .await
            .map_err(anyhow::Error::from)
            .context("adding highlight message")
    }.await)
}

#[tauri::command]
async fn list_book_messages(
    _app_handle: AppHandle,
    pool: State<'_, Pool<Postgres>>,
    book_id: i64,
    thread_id: Option<i64>,
) -> Result<Vec<BookMessage>, String> {
    cmd(async {
        db::list_book_messages(&pool, book_id, thread_id)
            .await
            .map_err(anyhow::Error::from)
            .context("listing book messages")
    }.await)
}

#[tauri::command]
async fn add_book_message(
    _app_handle: AppHandle,
    pool: State<'_, Pool<Postgres>>,
    book_id: i64,
    thread_id: Option<i64>,
    role: String,
    content: String,
    reasoning_summary: Option<String>,
    context_map: Option<String>,
) -> Result<BookMessage, String> {
    cmd(async {
        db::add_book_message(&pool, book_id, thread_id, &role, &content, reasoning_summary.as_deref(), context_map.as_deref())
            .await
            .map_err(anyhow::Error::from)
            .context("adding book message")
    }.await)
}

#[tauri::command]
async fn list_book_chat_threads(
    _app_handle: AppHandle,
    pool: State<'_, Pool<Postgres>>,
    book_id: i64,
) -> Result<Vec<BookChatThread>, String> {
    cmd(async {
        db::list_book_chat_threads(&pool, book_id)
            .await
            .map_err(anyhow::Error::from)
            .context("listing chat threads")
    }.await)
}

#[tauri::command]
async fn create_book_chat_thread(
    _app_handle: AppHandle,
    pool: State<'_, Pool<Postgres>>,
    book_id: i64,
    title: String,
) -> Result<BookChatThread, String> {
    cmd(async {
        db::create_book_chat_thread(&pool, book_id, &title)
            .await
            .map_err(anyhow::Error::from)
            .context("creating chat thread")
    }.await)
}

#[tauri::command]
async fn rename_book_chat_thread(
    _app_handle: AppHandle,
    pool: State<'_, Pool<Postgres>>,
    thread_id: i64,
    title: String,
) -> Result<(), String> {
    cmd(async {
        db::rename_book_chat_thread(&pool, thread_id, &title)
            .await
            .map_err(anyhow::Error::from)
            .context("renaming chat thread")
    }.await)
}

#[tauri::command]
async fn delete_book_chat_thread(
    _app_handle: AppHandle,
    pool: State<'_, Pool<Postgres>>,
    thread_id: i64,
) -> Result<(), String> {
    cmd(async {
        db::delete_book_chat_thread(&pool, thread_id)
            .await
            .map_err(anyhow::Error::from)
            .context("deleting chat thread")
    }.await)
}

#[tauri::command]
async fn delete_book_messages(
    _app_handle: AppHandle,
    pool: State<'_, Pool<Postgres>>,
    book_id: i64,
) -> Result<(), String> {
    cmd(async {
        db::delete_book_messages(&pool, book_id)
            .await
            .map_err(anyhow::Error::from)
            .context("deleting book messages")
    }.await)
}

#[tauri::command]
async fn delete_book_message(
    _app_handle: AppHandle,
    pool: State<'_, Pool<Postgres>>,
    message_id: i64,
) -> Result<(), String> {
    cmd(async {
        db::delete_book_message(&pool, message_id)
            .await
            .map_err(anyhow::Error::from)
            .context("deleting message")
    }.await)
}

#[tauri::command]
async fn clear_default_book_messages(
    _app_handle: AppHandle,
    pool: State<'_, Pool<Postgres>>,
    book_id: i64,
) -> Result<(), String> {
    cmd(async {
        db::clear_default_book_messages(&pool, book_id)
            .await
            .map_err(anyhow::Error::from)
            .context("clearing default messages")
    }.await)
}

#[tauri::command]
async fn delete_book_thread_messages(
    _app_handle: AppHandle,
    pool: State<'_, Pool<Postgres>>,
    thread_id: i64,
) -> Result<(), String> {
    cmd(async {
        db::delete_book_thread_messages(&pool, thread_id)
            .await
            .map_err(anyhow::Error::from)
            .context("deleting thread messages")
    }.await)
}

#[tauri::command]
async fn set_thread_last_cfi(
    _app_handle: AppHandle,
    pool: State<'_, Pool<Postgres>>,
    thread_id: i64,
    cfi: String,
) -> Result<(), String> {
    cmd(async {
        db::set_thread_last_cfi(&pool, thread_id, &cfi)
            .await
            .map_err(anyhow::Error::from)
            .context("saving thread position")
    }.await)
}

#[tauri::command]
async fn get_thread_max_citation_index(
    _app_handle: AppHandle,
    pool: State<'_, Pool<Postgres>>,
    book_id: i64,
    thread_id: Option<i64>,
) -> Result<i32, String> {
    cmd(async {
        db::get_thread_max_citation_index(&pool, book_id, thread_id)
            .await
            .map_err(anyhow::Error::from)
            .context("getting max citation index")
    }.await)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            db::init().map_err(|e| tauri::Error::Io(std::io::Error::new(std::io::ErrorKind::Other, format!("Database init failed: {}", e))))?;
            let pool = db::get_pool().map_err(|e| tauri::Error::Io(std::io::Error::new(std::io::ErrorKind::Other, format!("Database pool failed: {}", e))))?;
            app.manage(pool.clone());
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            db_init,
            gutendex_shakespeare_page,
            gutendex_catalog_page,
            download_gutenberg_mobi,
            list_books,
            get_book,
            get_book_html,
            get_book_image_data,
            get_book_position,
            set_book_position,
            hard_delete_book,
            set_setting,
            get_setting,
            list_highlights,
            create_highlight,
            update_highlight_note,
            delete_highlight,
            list_highlight_messages,
            add_highlight_message,
            list_book_messages,
            add_book_message,
            list_book_chat_threads,
            create_book_chat_thread,
            rename_book_chat_thread,
            set_thread_last_cfi,
            get_thread_max_citation_index,
            delete_book_chat_thread,
            delete_book_messages,
            delete_book_message,
            clear_default_book_messages,
            delete_book_thread_messages,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
