mod books;
mod db;
mod gutendex;
mod openai;

use db::{Book, BookPosition};
use tauri::AppHandle;

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
    gutendex::search_shakespeare(page_url)
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
    let path = book
        .html_path
        .ok_or_else(|| "Book has no html_path (download it first)".to_string())?;
    books::read_html_string(path).map_err(|e| e.to_string())
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
fn delete_book(app_handle: AppHandle, book_id: i64) -> Result<(), String> {
    db::init(&app_handle).map_err(|e| e.to_string())?;
    let book = db::get_book(&app_handle, book_id).map_err(|e| e.to_string())?;
    if let Some(path) = book.mobi_path.clone() {
        books::delete_mobi_file(path).map_err(|e| e.to_string())?;
    }
    if let Some(path) = book.html_path.clone() {
        books::delete_html_file(path).map_err(|e| e.to_string())?;
    }
    db::delete_book(&app_handle, book_id).map_err(|e| e.to_string())
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
async fn openai_chat(
    app_handle: AppHandle,
    messages: Vec<openai::ChatMessage>,
) -> Result<String, String> {
    db::init(&app_handle).map_err(|e| e.to_string())?;
    openai::chat(&app_handle, messages)
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
            download_gutenberg_mobi,
            list_books,
            get_book,
            get_book_html,
            get_book_position,
            set_book_position,
            delete_book,
            set_setting,
            get_setting,
            openai_chat,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
