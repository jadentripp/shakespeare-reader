mod books;
mod db;
mod gutendex;

use db::{Book, BookChatThread, BookMessage, BookPosition, Highlight, HighlightMessage};
use tauri::{AppHandle, State, Manager};
use sqlx::{Pool, Postgres};
use std::fs;

#[tauri::command]
async fn db_init(_pool: State<'_, Pool<Postgres>>) -> Result<(), String> {
    // Already initialized in run()
    Ok(())
}

#[tauri::command]
async fn gutendex_shakespeare_page(
    _app_handle: AppHandle,
    _pool: State<'_, Pool<Postgres>>,
    page_url: Option<String>,
) -> Result<gutendex::GutendexResponse, String> {
    gutendex::search_catalog("shakespeare", page_url, None, None)
        .await
        .map_err(|e| e.to_string())
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
    gutendex::search_catalog(&catalog_key, page_url, search_query, topic)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn list_books(_app_handle: AppHandle, pool: State<'_, Pool<Postgres>>) -> Result<Vec<Book>, String> {
    db::list_books(&pool).await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_book(_app_handle: AppHandle, pool: State<'_, Pool<Postgres>>, book_id: i64) -> Result<Book, String> {
    db::get_book(&pool, book_id).await.map_err(|e| e.to_string())
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
    let mobi_path = books::download_mobi_to_app_data(&app_handle, gutenberg_id, mobi_url)
        .await
        .map_err(|e| e.to_string())?;

    let (html_path, first_image_index) = tauri::async_runtime::spawn_blocking({
        let app_handle = app_handle.clone();
        let mobi_path = mobi_path.clone();
        move || books::extract_mobi_to_html(&app_handle, gutenberg_id, &mobi_path)
    })
    .await
    .map_err(|e| e.to_string())?
    .map_err(|e| e.to_string())?;

    db::upsert_book(
        &pool,
        gutenberg_id,
        &title,
        &authors,
        publication_year,
        cover_url.as_deref(),
        &mobi_path,
        &html_path,
        first_image_index.map(|v| v as i32),
    )
    .await
    .map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_book_html(app_handle: AppHandle, pool: State<'_, Pool<Postgres>>, book_id: i64) -> Result<String, String> {
    let book = db::get_book(&pool, book_id).await.map_err(|e| e.to_string())?;

    let (mut html, has_invalid_controls) = if let Some(ref path) = book.html_path {
        let path = path.clone();
        tauri::async_runtime::spawn_blocking(move || {
            let bytes = fs::read(&path).map_err(|e| e.to_string())?;
            let invalid = books::has_invalid_controls(&bytes);
            let content = books::read_html_string_from_bytes(&bytes).map_err(|e| e.to_string())?;
            Ok::<(String, bool), String>((content, invalid))
        })
        .await
        .map_err(|e| e.to_string())?
        .map_err(|e| e.to_string())?
    } else {
        (String::new(), false)
    };

    let needs_regeneration = html.is_empty()
        || books::looks_like_mojibake(&html)
        || books::has_many_replacements(&html)
        || has_invalid_controls;

    if needs_regeneration {
        if let Some(ref mobi_path) = book.mobi_path {
            let mobi_path_clone = mobi_path.clone();
            let app_handle_clone = app_handle.clone();
            let gutenberg_id = book.gutenberg_id;
            
            let (new_path, first_image_index) = tauri::async_runtime::spawn_blocking(move || {
                books::extract_mobi_to_html(&app_handle_clone, gutenberg_id, &mobi_path_clone)
            })
            .await
            .map_err(|e| e.to_string())?
            .map_err(|e| e.to_string())?;
            
            let _ = db::upsert_book(
                &pool,
                book.gutenberg_id,
                &book.title,
                &book.authors,
                book.publication_year,
                book.cover_url.as_deref(),
                mobi_path,
                &new_path,
                first_image_index.map(|v| v as i32),
            ).await;

            let new_path_clone = new_path.clone();
            html = tauri::async_runtime::spawn_blocking(move || {
                books::read_html_string(new_path_clone)
            })
            .await
            .map_err(|e| e.to_string())?
            .map_err(|e| e.to_string())?;
        }
    }

    if html.is_empty() {
        return Err("Book has no html_path or mobi_path (download it first)".to_string());
    }

    Ok(html)
}

#[tauri::command]
async fn get_book_image_data(app_handle: AppHandle, pool: State<'_, Pool<Postgres>>, book_id: i64, relative_index: i32) -> Result<String, String> {
    let book = db::get_book(&pool, book_id).await.map_err(|e| e.to_string())?;
    let first_image_index = book.first_image_index.ok_or("Book has no image index".to_string())?;
    
    let absolute_index = (first_image_index + relative_index - 1) as usize;
    
    let path = books::get_book_asset_path(&app_handle, book.gutenberg_id, absolute_index)
        .map_err(|e| e.to_string())?;
        
    let bytes = tauri::async_runtime::spawn_blocking(move || {
        fs::read(&path).map(|b| (b, path))
    })
    .await
    .map_err(|e| e.to_string())?
    .map_err(|e| e.to_string())?;

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
}

#[tauri::command]
async fn get_book_position(_app_handle: AppHandle, pool: State<'_, Pool<Postgres>>, book_id: i64) -> Result<Option<BookPosition>, String> {
    db::get_book_position(&pool, book_id).await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn set_book_position(_app_handle: AppHandle, pool: State<'_, Pool<Postgres>>, book_id: i64, cfi: String) -> Result<(), String> {
    db::set_book_position(&pool, book_id, &cfi).await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn hard_delete_book(app_handle: AppHandle, pool: State<'_, Pool<Postgres>>, book_id: i64) -> Result<(), String> {
    let book = db::get_book(&pool, book_id).await.map_err(|e| e.to_string())?;

    tauri::async_runtime::spawn_blocking({
        let app_handle = app_handle.clone();
        let book = book.clone();
        move || {
            if let Some(ref path) = book.mobi_path {
                let _ = books::delete_mobi_file(path);
            }
            if let Some(ref path) = book.html_path {
                let _ = books::delete_html_file(path);
            }
            let _ = books::delete_book_assets(&app_handle, book.gutenberg_id);
        }
    })
    .await
    .map_err(|e| e.to_string())?;

    db::hard_delete_book(&pool, book_id).await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn set_setting(_app_handle: AppHandle, pool: State<'_, Pool<Postgres>>, key: String, value: String) -> Result<(), String> {
    db::set_setting(&pool, &key, &value).await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_setting(_app_handle: AppHandle, pool: State<'_, Pool<Postgres>>, key: String) -> Result<Option<String>, String> {
    db::get_setting(&pool, &key).await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn list_highlights(_app_handle: AppHandle, pool: State<'_, Pool<Postgres>>, book_id: i64) -> Result<Vec<Highlight>, String> {
    db::list_highlights(&pool, book_id).await.map_err(|e| e.to_string())
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
    .map_err(|e| e.to_string())
}

#[tauri::command]
async fn update_highlight_note(
    _app_handle: AppHandle,
    pool: State<'_, Pool<Postgres>>,
    highlight_id: i64,
    note: Option<String>,
) -> Result<Highlight, String> {
    db::update_highlight_note(&pool, highlight_id, note.as_deref()).await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn delete_highlight(
    _app_handle: AppHandle,
    pool: State<'_, Pool<Postgres>>,
    highlight_id: i64,
) -> Result<(), String> {
    db::delete_highlight(&pool, highlight_id).await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn list_highlight_messages(
    _app_handle: AppHandle,
    pool: State<'_, Pool<Postgres>>,
    highlight_id: i64,
) -> Result<Vec<HighlightMessage>, String> {
    db::list_highlight_messages(&pool, highlight_id).await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn add_highlight_message(
    _app_handle: AppHandle,
    pool: State<'_, Pool<Postgres>>,
    highlight_id: i64,
    role: String,
    content: String,
) -> Result<HighlightMessage, String> {
    db::add_highlight_message(&pool, highlight_id, &role, &content).await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn list_book_messages(
    _app_handle: AppHandle,
    pool: State<'_, Pool<Postgres>>,
    book_id: i64,
    thread_id: Option<i64>,
) -> Result<Vec<BookMessage>, String> {
    db::list_book_messages(&pool, book_id, thread_id).await.map_err(|e| e.to_string())
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
    db::add_book_message(&pool, book_id, thread_id, &role, &content, reasoning_summary.as_deref(), context_map.as_deref()).await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn list_book_chat_threads(
    _app_handle: AppHandle,
    pool: State<'_, Pool<Postgres>>,
    book_id: i64,
) -> Result<Vec<BookChatThread>, String> {
    db::list_book_chat_threads(&pool, book_id).await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn create_book_chat_thread(
    _app_handle: AppHandle,
    pool: State<'_, Pool<Postgres>>,
    book_id: i64,
    title: String,
) -> Result<BookChatThread, String> {
    db::create_book_chat_thread(&pool, book_id, &title).await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn rename_book_chat_thread(
    _app_handle: AppHandle,
    pool: State<'_, Pool<Postgres>>,
    thread_id: i64,
    title: String,
) -> Result<(), String> {
    db::rename_book_chat_thread(&pool, thread_id, &title).await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn delete_book_chat_thread(
    _app_handle: AppHandle,
    pool: State<'_, Pool<Postgres>>,
    thread_id: i64,
) -> Result<(), String> {
    db::delete_book_chat_thread(&pool, thread_id).await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn delete_book_messages(
    _app_handle: AppHandle,
    pool: State<'_, Pool<Postgres>>,
    book_id: i64,
) -> Result<(), String> {
    db::delete_book_messages(&pool, book_id).await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn delete_book_message(
    _app_handle: AppHandle,
    pool: State<'_, Pool<Postgres>>,
    message_id: i64,
) -> Result<(), String> {
    db::delete_book_message(&pool, message_id).await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn clear_default_book_messages(
    _app_handle: AppHandle,
    pool: State<'_, Pool<Postgres>>,
    book_id: i64,
) -> Result<(), String> {
    db::clear_default_book_messages(&pool, book_id).await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn delete_book_thread_messages(
    _app_handle: AppHandle,
    pool: State<'_, Pool<Postgres>>,
    thread_id: i64,
) -> Result<(), String> {
    db::delete_book_thread_messages(&pool, thread_id).await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn set_thread_last_cfi(
    _app_handle: AppHandle,
    pool: State<'_, Pool<Postgres>>,
    thread_id: i64,
    cfi: String,
) -> Result<(), String> {
    db::set_thread_last_cfi(&pool, thread_id, &cfi).await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_thread_max_citation_index(
    _app_handle: AppHandle,
    pool: State<'_, Pool<Postgres>>,
    book_id: i64,
    thread_id: Option<i64>,
) -> Result<i32, String> {
    db::get_thread_max_citation_index(&pool, book_id, thread_id).await.map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            let database_url = std::env::var("DATABASE_URL")
                .expect("DATABASE_URL must be set");

            let pool = tauri::async_runtime::block_on(async {
                db::init_pool(&database_url).await
            }).expect("Failed to initialize database pool");

            app.manage(pool);
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
