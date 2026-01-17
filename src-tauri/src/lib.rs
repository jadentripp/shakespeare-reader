mod books;
mod db;
mod gutendex;
mod openai;

use db::{Book, BookPosition, Highlight, HighlightMessage};
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
    gutendex::search_catalog("shakespeare", page_url)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn gutendex_catalog_page(
    app_handle: AppHandle,
    catalog_key: String,
    page_url: Option<String>,
) -> Result<gutendex::GutendexResponse, String> {
    db::init(&app_handle).map_err(|e| e.to_string())?;
    gutendex::search_catalog(&catalog_key, page_url)
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
    let html_path = books::extract_mobi_to_html(&app_handle, gutenberg_id, mobi_path.clone())
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
        || books::contains_replacement(&html)
        || has_invalid_controls)
        && mobi_path.is_some()
    {
        let mobi_path = mobi_path.unwrap();
        let new_path = books::extract_mobi_to_html(&app_handle, book.gutenberg_id, mobi_path)
            .map_err(|e| e.to_string())?;
        html = books::read_html_string(new_path).map_err(|e| e.to_string())?;
    }

    if html.is_empty() {
        return Err("Book has no html_path or mobi_path (download it first)".to_string());
    }

    Ok(html)
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
fn openai_key_status(app_handle: AppHandle) -> Result<openai::KeyStatus, String> {
    db::init(&app_handle).map_err(|e| e.to_string())?;
    openai::key_status(&app_handle).map_err(|e| e.to_string())
}

#[tauri::command]
async fn openai_chat(
    app_handle: AppHandle,
    messages: Vec<openai::ChatMessage>,
) -> Result<String, String> {
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            db_init,
            gutendex_shakespeare_page,
            gutendex_catalog_page,
            download_gutenberg_mobi,
            list_books,
            get_book,
            get_book_html,
            get_book_position,
            set_book_position,
            hard_delete_book,
            set_setting,
            get_setting,
            list_highlights,
            create_highlight,
            update_highlight_note,
            list_highlight_messages,
            add_highlight_message,
            openai_key_status,
            openai_chat,
            openai_list_models,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
