mod books;
mod db;
mod gutendex;
mod openai;

use db::{Book, BookChatThread, BookMessage, BookPosition, Highlight, HighlightMessage};
use tauri::AppHandle;
use std::fs;

#[tauri::command]
fn db_init(app_handle: AppHandle) -> Result<(), String> {
    db::init(&app_handle).map_err(|e| e.to_string())
}

#[tauri::command]
async fn gutendex_shakespeare_page(
    app_handle: AppHandle,
    page_url: Option<String>,
) -> Result<gutendex::GutendexResponse, String> {
    db::init(&app_handle).map_err(|e| e.to_string())?;
    gutendex::search_catalog("shakespeare", page_url, None, None)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn gutendex_catalog_page(
    app_handle: AppHandle,
    catalog_key: String,
    page_url: Option<String>,
    search_query: Option<String>,
    topic: Option<String>,
) -> Result<gutendex::GutendexResponse, String> {
    db::init(&app_handle).map_err(|e| e.to_string())?;
    gutendex::search_catalog(&catalog_key, page_url, search_query, topic)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn list_books(app_handle: AppHandle) -> Result<Vec<Book>, String> {
    db::init(&app_handle).map_err(|e| e.to_string())?;
    db::list_books(&app_handle).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_book(app_handle: AppHandle, book_id: i64) -> Result<Book, String> {
    db::init(&app_handle).map_err(|e| e.to_string())?;
    db::get_book(&app_handle, book_id).map_err(|e| e.to_string())
}

#[tauri::command]
async fn download_gutenberg_mobi(
    app_handle: AppHandle,
    gutenberg_id: i64,
    title: String,
    authors: String,
    publication_year: Option<i32>,
    cover_url: Option<String>,
    mobi_url: String,
) -> Result<i64, String> {
    db::init(&app_handle).map_err(|e| e.to_string())?;
    let mobi_path = books::download_mobi_to_app_data(&app_handle, gutenberg_id, mobi_url)
        .await
        .map_err(|e| e.to_string())?;
    let (html_path, first_image_index) = books::extract_mobi_to_html(&app_handle, gutenberg_id, mobi_path.clone())
        .map_err(|e| e.to_string())?;

    db::upsert_book(
        &app_handle,
        gutenberg_id,
        title,
        authors,
        publication_year,
        cover_url,
        mobi_path,
        html_path,
        first_image_index.map(|v| v as i32),
    )
    .map_err(|e| e.to_string())
}

#[tauri::command]
fn get_book_html(app_handle: AppHandle, book_id: i64) -> Result<String, String> {
    db::init(&app_handle).map_err(|e| e.to_string())?;
    let book = db::get_book(&app_handle, book_id).map_err(|e| e.to_string())?;
    let html_path = book.html_path.clone();
    let mobi_path = book.mobi_path.clone();

    let mut has_invalid_controls = false;
    let mut html = if let Some(path) = html_path {
        if let Ok(bytes) = fs::read(&path) {
            has_invalid_controls = books::has_invalid_controls(&bytes);
        }
        books::read_html_string(path).map_err(|e| e.to_string())?
    } else {
        String::new()
    };

    if (html.is_empty()
        || books::looks_like_mojibake(&html)
        || books::has_many_replacements(&html)
        || has_invalid_controls)
        && mobi_path.is_some()
    {
        let mobi_path = mobi_path.unwrap();
        let (new_path, first_image_index) = books::extract_mobi_to_html(&app_handle, book.gutenberg_id, mobi_path)
            .map_err(|e| e.to_string())?;
        
        // Update DB with first_image_index if it was regenerated
        let _ = db::upsert_book(
            &app_handle,
            book.gutenberg_id,
            book.title.clone(),
            book.authors.clone(),
            book.publication_year,
            book.cover_url.clone(),
            book.mobi_path.clone().unwrap_or_default(),
            new_path.clone(),
            first_image_index.map(|v| v as i32),
        );

        html = books::read_html_string(new_path).map_err(|e| e.to_string())?;
    }

    if html.is_empty() {
        return Err("Book has no html_path or mobi_path (download it first)".to_string());
    }

    Ok(html)
}

#[tauri::command]
fn get_book_image_data(app_handle: AppHandle, book_id: i64, relative_index: i32) -> Result<String, String> {
    db::init(&app_handle).map_err(|e| e.to_string())?;
    let book = db::get_book(&app_handle, book_id).map_err(|e| e.to_string())?;
    let first_image_index = book.first_image_index.ok_or("Book has no image index".to_string())?;
    
    let absolute_index = (first_image_index + relative_index - 1) as usize;
    
    let path = books::get_book_asset_path(&app_handle, book.gutenberg_id, absolute_index)
        .map_err(|e| e.to_string())?;
        
    let bytes = fs::read(&path).map_err(|e| e.to_string())?;
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
fn get_book_position(app_handle: AppHandle, book_id: i64) -> Result<Option<BookPosition>, String> {
    db::init(&app_handle).map_err(|e| e.to_string())?;
    db::get_book_position(&app_handle, book_id).map_err(|e| e.to_string())
}

#[tauri::command]
fn set_book_position(app_handle: AppHandle, book_id: i64, cfi: String) -> Result<(), String> {
    db::init(&app_handle).map_err(|e| e.to_string())?;
    db::set_book_position(&app_handle, book_id, cfi).map_err(|e| e.to_string())
}

#[tauri::command]
fn hard_delete_book(app_handle: AppHandle, book_id: i64) -> Result<(), String> {
    db::init(&app_handle).map_err(|e| e.to_string())?;
    let book = db::get_book(&app_handle, book_id).map_err(|e| e.to_string())?;

    if let Some(path) = book.mobi_path.clone() {
        books::delete_mobi_file(path).map_err(|e| e.to_string())?;
    }
    if let Some(path) = book.html_path.clone() {
        books::delete_html_file(path).map_err(|e| e.to_string())?;
    }
    
    books::delete_book_assets(&app_handle, book.gutenberg_id).map_err(|e| e.to_string())?;

    db::hard_delete_book(&app_handle, book_id).map_err(|e| e.to_string())
}

#[tauri::command]
fn set_setting(app_handle: AppHandle, key: String, value: String) -> Result<(), String> {
    db::init(&app_handle).map_err(|e| e.to_string())?;
    db::set_setting(&app_handle, key, value).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_setting(app_handle: AppHandle, key: String) -> Result<Option<String>, String> {
    db::init(&app_handle).map_err(|e| e.to_string())?;
    db::get_setting(&app_handle, key).map_err(|e| e.to_string())
}

#[tauri::command]
fn list_highlights(app_handle: AppHandle, book_id: i64) -> Result<Vec<Highlight>, String> {
    db::init(&app_handle).map_err(|e| e.to_string())?;
    db::list_highlights(&app_handle, book_id).map_err(|e| e.to_string())
}

#[tauri::command]
fn create_highlight(
    app_handle: AppHandle,
    book_id: i64,
    start_path: String,
    start_offset: i64,
    end_path: String,
    end_offset: i64,
    text: String,
    note: Option<String>,
) -> Result<Highlight, String> {
    db::init(&app_handle).map_err(|e| e.to_string())?;
    db::create_highlight(
        &app_handle,
        book_id,
        start_path,
        start_offset,
        end_path,
        end_offset,
        text,
        note,
    )
    .map_err(|e| e.to_string())
}

#[tauri::command]
fn update_highlight_note(
    app_handle: AppHandle,
    highlight_id: i64,
    note: Option<String>,
) -> Result<Highlight, String> {
    db::init(&app_handle).map_err(|e| e.to_string())?;
    db::update_highlight_note(&app_handle, highlight_id, note).map_err(|e| e.to_string())
}

#[tauri::command]
fn delete_highlight(
    app_handle: AppHandle,
    highlight_id: i64,
) -> Result<(), String> {
    db::init(&app_handle).map_err(|e| e.to_string())?;
    db::delete_highlight(&app_handle, highlight_id).map_err(|e| e.to_string())
}

#[tauri::command]
fn list_highlight_messages(
    app_handle: AppHandle,
    highlight_id: i64,
) -> Result<Vec<HighlightMessage>, String> {
    db::init(&app_handle).map_err(|e| e.to_string())?;
    db::list_highlight_messages(&app_handle, highlight_id).map_err(|e| e.to_string())
}

#[tauri::command]
fn add_highlight_message(
    app_handle: AppHandle,
    highlight_id: i64,
    role: String,
    content: String,
) -> Result<HighlightMessage, String> {
    db::init(&app_handle).map_err(|e| e.to_string())?;
    db::add_highlight_message(&app_handle, highlight_id, role, content).map_err(|e| e.to_string())
}

#[tauri::command]
fn list_book_messages(
    app_handle: AppHandle,
    book_id: i64,
    thread_id: Option<i64>,
) -> Result<Vec<BookMessage>, String> {
    db::init(&app_handle).map_err(|e| e.to_string())?;
    db::list_book_messages(&app_handle, book_id, thread_id).map_err(|e| e.to_string())
}

#[tauri::command]
fn add_book_message(
    app_handle: AppHandle,
    book_id: i64,
    thread_id: Option<i64>,
    role: String,
    content: String,
    reasoning_summary: Option<String>,
    context_map: Option<String>,
) -> Result<BookMessage, String> {
    db::init(&app_handle).map_err(|e| e.to_string())?;
    db::add_book_message(&app_handle, book_id, thread_id, role, content, reasoning_summary, context_map).map_err(|e| e.to_string())
}

#[tauri::command]
fn list_book_chat_threads(
    app_handle: AppHandle,
    book_id: i64,
) -> Result<Vec<BookChatThread>, String> {
    db::init(&app_handle).map_err(|e| e.to_string())?;
    db::list_book_chat_threads(&app_handle, book_id).map_err(|e| e.to_string())
}

#[tauri::command]
fn create_book_chat_thread(
    app_handle: AppHandle,
    book_id: i64,
    title: String,
) -> Result<BookChatThread, String> {
    db::init(&app_handle).map_err(|e| e.to_string())?;
    db::create_book_chat_thread(&app_handle, book_id, title).map_err(|e| e.to_string())
}

#[tauri::command]
fn rename_book_chat_thread(
    app_handle: AppHandle,
    thread_id: i64,
    title: String,
) -> Result<(), String> {
    db::init(&app_handle).map_err(|e| e.to_string())?;
    db::rename_book_chat_thread(&app_handle, thread_id, title).map_err(|e| e.to_string())
}

#[tauri::command]
fn delete_book_chat_thread(
    app_handle: AppHandle,
    thread_id: i64,
) -> Result<(), String> {
    db::init(&app_handle).map_err(|e| e.to_string())?;
    db::delete_book_chat_thread(&app_handle, thread_id).map_err(|e| e.to_string())
}

#[tauri::command]
fn delete_book_messages(
    app_handle: AppHandle,
    book_id: i64,
) -> Result<(), String> {
    db::init(&app_handle).map_err(|e| e.to_string())?;
    db::delete_book_messages(&app_handle, book_id).map_err(|e| e.to_string())
}

#[tauri::command]
fn delete_book_message(
    app_handle: AppHandle,
    message_id: i64,
) -> Result<(), String> {
    db::init(&app_handle).map_err(|e| e.to_string())?;
    db::delete_book_message(&app_handle, message_id).map_err(|e| e.to_string())
}

#[tauri::command]
fn clear_default_book_messages(
    app_handle: AppHandle,
    book_id: i64,
) -> Result<(), String> {
    db::init(&app_handle).map_err(|e| e.to_string())?;
    db::clear_default_book_messages(&app_handle, book_id).map_err(|e| e.to_string())
}

#[tauri::command]
fn delete_book_thread_messages(
    app_handle: AppHandle,
    thread_id: i64,
) -> Result<(), String> {
    db::init(&app_handle).map_err(|e| e.to_string())?;
    db::delete_book_thread_messages(&app_handle, thread_id).map_err(|e| e.to_string())
}

#[tauri::command]
fn openai_key_status(app_handle: AppHandle) -> Result<openai::KeyStatus, String> {
    db::init(&app_handle).map_err(|e| e.to_string())?;
    openai::key_status(&app_handle).map_err(|e| e.to_string())
}

#[tauri::command]
async fn openai_chat(
    app_handle: AppHandle,
    messages: Vec<openai::ChatMessage>,
) -> Result<openai::ChatResult, String> {
    db::init(&app_handle).map_err(|e| e.to_string())?;
    openai::chat(&app_handle, messages)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn openai_list_models(app_handle: AppHandle) -> Result<Vec<String>, String> {
    db::init(&app_handle).map_err(|e| e.to_string())?;
    openai::list_models(&app_handle)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn set_thread_last_cfi(
    app_handle: AppHandle,
    thread_id: i64,
    cfi: String,
) -> Result<(), String> {
    db::init(&app_handle).map_err(|e| e.to_string())?;
    db::set_thread_last_cfi(&app_handle, thread_id, cfi).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_thread_max_citation_index(
    app_handle: AppHandle,
    thread_id: i64,
) -> Result<i32, String> {
    db::init(&app_handle).map_err(|e| e.to_string())?;
    db::get_thread_max_citation_index(&app_handle, thread_id).map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
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
            openai_key_status,
            openai_chat,
            openai_list_models,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
