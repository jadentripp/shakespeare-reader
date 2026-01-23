use std::{fs, path::PathBuf, time::{Duration, Instant}};
use std::env;

use tauri::{path::BaseDirectory, AppHandle, Manager};
use thiserror::Error;

#[derive(Debug, Error)]
pub enum BooksError {
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("HTTP error: {0}")]
    Http(#[from] reqwest::Error),

    #[error("Tauri error: {0}")]
    Tauri(#[from] tauri::Error),

    #[error("MOBI extraction error: {0}")]
    Extraction(String),

    #[error("{0}")]
    Other(String),
}

const REPLACEMENT_THRESHOLD: usize = 16;

fn find_mobi_header_offset(rec0: &[u8]) -> Option<usize> {
    // After the 16-byte PalmDOC header, MOBI header commonly starts at offset 16,
    // but we search defensively.
    rec0.windows(4)
        .position(|w| w == b"MOBI")
}

fn mobi_text_encoding(rec0: &[u8]) -> Option<u32> {
    let off = find_mobi_header_offset(rec0)?;
    // MOBI header: text encoding is a 32-bit big-endian integer at offset 0x0C from MOBI.
    be_u32(rec0, off + 0x0c)
}

fn mobi_extra_data_flags(rec0: &[u8]) -> u16 {
    // Extra data flags live at offset 0xF2 from the start of record 0.
    be_u16(rec0, 0xf2).unwrap_or(0)
}

fn decode_mobi_text(rec0: &[u8], text_bytes: &[u8]) -> String {
    // Check BOM first
    if let Some(enc) = encoding_from_bom(text_bytes) {
        let (decoded, _, _) = enc.decode(text_bytes);
        return decoded.to_string();
    }
    
    // Use MOBI header encoding: 65001 = UTF-8, 1252 = Windows-1252
    let encoding = match mobi_text_encoding(rec0) {
        Some(65001) => encoding_rs::UTF_8,
        Some(1252) => encoding_rs::WINDOWS_1252,
        _ => {
            // Try UTF-8 first; if it produces replacement chars, fall back to Windows-1252
            let utf8_result = String::from_utf8_lossy(text_bytes);
            if contains_replacement(&utf8_result) {
                let (decoded, _, _) = encoding_rs::WINDOWS_1252.decode(text_bytes);
                return decoded.to_string();
            }
            return utf8_result.to_string();
        }
    };
    
    let (decoded, _, _) = encoding.decode(text_bytes);
    decoded.to_string()
}

fn encoding_from_bom(bytes: &[u8]) -> Option<&'static encoding_rs::Encoding> {
    if bytes.starts_with(&[0xEF, 0xBB, 0xBF]) {
        return Some(encoding_rs::UTF_8);
    }
    if bytes.starts_with(&[0xFE, 0xFF]) {
        return Some(encoding_rs::UTF_16BE);
    }
    if bytes.starts_with(&[0xFF, 0xFE]) {
        return Some(encoding_rs::UTF_16LE);
    }
    None
}

fn extract_label(haystack: &str, key: &str) -> Option<String> {
    let idx = haystack.find(key)?;
    let mut i = idx + key.len();
    let bytes = haystack.as_bytes();
    while i < bytes.len() {
        let c = bytes[i] as char;
        if c.is_whitespace() || c == '"' || c == '\'' {
            i += 1;
            continue;
        }
        break;
    }
    let start = i;
    while i < bytes.len() {
        let c = bytes[i] as char;
        if c.is_ascii_alphanumeric() || c == '-' || c == '_' || c == '.' {
            i += 1;
            continue;
        }
        break;
    }
    if i > start {
        Some(haystack[start..i].to_string())
    } else {
        None
    }
}

fn detect_html_encoding(bytes: &[u8]) -> Option<&'static encoding_rs::Encoding> {
    if let Some(enc) = encoding_from_bom(bytes) {
        return Some(enc);
    }
    let slice_len = bytes.len().min(8192);
    let mut lowered: Vec<u8> = Vec::with_capacity(slice_len);
    for &b in &bytes[..slice_len] {
        let lb = if (b'A'..=b'Z').contains(&b) { b + 32 } else { b };
        lowered.push(lb);
    }
    let haystack = String::from_utf8_lossy(&lowered);
    if let Some(label) = extract_label(&haystack, "charset=") {
        return encoding_rs::Encoding::for_label(label.trim().as_bytes());
    }
    if let Some(label) = extract_label(&haystack, "encoding=") {
        return encoding_rs::Encoding::for_label(label.trim().as_bytes());
    }
    None
}

pub fn looks_like_mojibake(s: &str) -> bool {
    let markers = [
        "â€™", "â€œ", "â€�", "â€”", "â€“", "â€¦", "â€˜", "Ã©", "Ã¨", "Ãª", "Ã¡", "Ã³", "Ã­", "Ãú", "Ã±",
        "Â ",
    ];
    markers.iter().any(|m| s.contains(m))
}

pub fn contains_replacement(s: &str) -> bool {
    s.contains('\u{FFFD}')
}

pub fn replacement_count(s: &str) -> usize {
    s.matches('\u{FFFD}').count()
}

pub fn has_many_replacements(s: &str) -> bool {
    replacement_count(s) > REPLACEMENT_THRESHOLD
}

pub fn has_invalid_controls(bytes: &[u8]) -> bool {
    bytes.iter().any(|&b| b < 0x20 && !matches!(b, b'\n' | b'\r' | b'\t'))
}

pub fn fix_mojibake(s: &str) -> Option<String> {
    if !looks_like_mojibake(s) {
        return None;
    }
    let (bytes, _, had_errors) = encoding_rs::WINDOWS_1252.encode(s);
    if had_errors {
        return None;
    }
    let (utf8, _, _) = encoding_rs::UTF_8.decode(&bytes);
    let fixed = utf8.to_string();
    if looks_like_mojibake(&fixed) {
        None
    } else {
        Some(fixed)
    }
}

static GUTENBERG_NEXT_ALLOWED: once_cell::sync::Lazy<tokio::sync::Mutex<Instant>> =
    once_cell::sync::Lazy::new(|| tokio::sync::Mutex::new(Instant::now()));

async fn throttle_gutenberg_if_needed(url: &str) {
    let is_gutenberg = reqwest::Url::parse(url)
        .ok()
        .and_then(|u| u.host_str().map(|h| h == "gutenberg.org" || h.ends_with(".gutenberg.org")))
        .unwrap_or(false);
    if !is_gutenberg {
        return;
    }

    // Project Gutenberg asks automated tools to be very gentle; 2s matches their wget example.
    let min_delay = Duration::from_secs(2);

    let delay = {
        let mut next_allowed = GUTENBERG_NEXT_ALLOWED.lock().await;
        let now = Instant::now();

        // if we're early, we must wait until next_allowed
        let delay = next_allowed.saturating_duration_since(now);

        // reserve the next slot *now*, so concurrent callers schedule properly
        *next_allowed = (now + delay) + min_delay;
        delay
    };

    if !delay.is_zero() {
        tokio::time::sleep(delay).await;
    }
}

pub fn books_dir(app_handle: &AppHandle) -> Result<PathBuf, BooksError> {
    let mut base = env::current_dir().unwrap_or(app_handle.path().resolve(".", BaseDirectory::AppLocalData)?);
    if base.file_name().and_then(|s| s.to_str()) == Some("src-tauri") {
        if let Some(parent) = base.parent() {
            base = parent.to_path_buf();
        }
    }
    let dir = base.join("tmp").join("books");
    fs::create_dir_all(&dir)?;
    Ok(dir)
}

pub async fn download_mobi_to_app_data(
    app_handle: &AppHandle,
    gutenberg_id: i64,
    mobi_url: String,
) -> Result<String, BooksError> {
    let dir = books_dir(app_handle)?;
    let path = dir.join(format!("{}.mobi", gutenberg_id));

    throttle_gutenberg_if_needed(&mobi_url).await;

    let client = reqwest::Client::builder()
        .user_agent("ai-reader/0.1 (polite; see https://www.gutenberg.org/policy/robot)")
        .build()?;

    let resp = client.get(&mobi_url).send().await?;
    let status = resp.status();
    if status.as_u16() == 403 || status.as_u16() == 429 {
        return Err(BooksError::Other(format!(
            "Project Gutenberg blocked/rate-limited this request (HTTP {}). Try pausing/resuming, or download fewer books / set up a local mirror per https://www.gutenberg.org/policy/robot",
            status
        )));
    }

    let bytes = resp.error_for_status()?.bytes().await?;
    fs::write(&path, &bytes)?;

    Ok(path.to_string_lossy().to_string())
}

fn be_u16(b: &[u8], off: usize) -> Option<u16> {
    b.get(off..off + 2)
        .map(|s| u16::from_be_bytes([s[0], s[1]]))
}

fn be_u32(b: &[u8], off: usize) -> Option<u32> {
    b.get(off..off + 4)
        .map(|s| u32::from_be_bytes([s[0], s[1], s[2], s[3]]))
}

fn detect_image_format(data: &[u8]) -> Option<&'static str> {
    if data.len() < 4 {
        return None;
    }
    if data.starts_with(&[0xff, 0xd8, 0xff]) {
        Some("jpg")
    } else if data.starts_with(&[0x89, 0x50, 0x4e, 0x47]) {
        Some("png")
    } else if data.starts_with(&[0x47, 0x49, 0x46, 0x38]) {
        Some("gif")
    } else {
        None
    }
}

fn palmdoc_decompress(input: &[u8]) -> Vec<u8> {
    let mut out: Vec<u8> = Vec::with_capacity(input.len() * 3);
    let mut i = 0;
    while i < input.len() {
        let c = input[i];
        match c {
            0x00 => {
                out.push(0x00);
                i += 1;
            }
            0x01..=0x08 => {
                let n = c as usize;
                let start = i + 1;
                let end = (start + n).min(input.len());
                out.extend_from_slice(&input[start..end]);
                i = end;
            }
            0x09..=0x7f => {
                out.push(c);
                i += 1;
            }
            0x80..=0xbf => {
                if i + 1 >= input.len() {
                    break;
                }
                let c2 = input[i + 1];
                let item: u16 = (((c & 0x3f) as u16) << 8) | (c2 as u16);
                let distance = (item >> 3) as usize;
                let length = ((item & 0x7) as usize) + 3;
                if distance == 0 || distance > out.len() {
                    i += 2;
                    continue;
                }
                let start = out.len() - distance;
                for j in 0..length {
                    let b = out[start + j];
                    out.push(b);
                }
                i += 2;
            }
            0xc0..=0xff => {
                out.push(0x20);
                out.push(c ^ 0x80);
                i += 1;
            }
        }
    }
    out
}

fn escape_html(s: &str) -> String {
    let mut out = String::with_capacity(s.len() + s.len() / 8);
    for ch in s.chars() {
        match ch {
            '&' => out.push_str("&amp;"),
            '<' => out.push_str("&lt;"),
            '>' => out.push_str("&gt;"),
            '"' => out.push_str("&quot;"),
            '\'' => out.push_str("&#39;"),
            _ => out.push(ch),
        }
    }
    out
}

fn trim_trailing_record_data(rec: &[u8], extra_flags: u16) -> usize {
    if rec.is_empty() || extra_flags == 0 {
        return rec.len();
    }

    let mut size = rec.len();

    // Process bits 15 down to 1: each set bit indicates a variable-length extra data entry
    for bit in (1..=15).rev() {
        if extra_flags & (1 << bit) == 0 {
            continue;
        }
        // Read backwards variable-length integer (size of this extra data block)
        let mut val: usize = 0;
        let mut shift = 0usize;
        while size > 0 {
            size -= 1;
            let b = rec[size];
            val |= ((b & 0x7f) as usize) << shift;
            shift += 7;
            if b & 0x80 != 0 {
                break;
            }
            if shift > 28 {
                break;
            }
        }
        // Subtract the extra data block size
        size = size.saturating_sub(val);
    }

    // Bit 0: multibyte overlap indicator (1 byte)
    if extra_flags & 1 != 0 && size > 0 {
        size -= 1;
    }

    size
}

fn strip_invalid_controls(s: &str) -> String {
    s.chars()
        .filter(|&ch| !ch.is_control() || matches!(ch, '\n' | '\r' | '\t'))
        .collect()
}

pub fn extract_mobi_images(bytes: &[u8]) -> Result<(std::collections::HashMap<usize, Vec<u8>>, Option<i32>), BooksError> {
    if bytes.len() < 80 {
        return Err(BooksError::Extraction("MOBI file too small".to_string()));
    }

    let num_records = be_u16(&bytes, 76).ok_or_else(|| BooksError::Extraction("Invalid PDB header".to_string()))? as usize;
    let record_list_start = 78;
    let record_list_len = num_records * 8;
    if bytes.len() < record_list_start + record_list_len {
        return Err(BooksError::Extraction("Invalid record list".to_string()));
    }

    let mut offsets: Vec<usize> = Vec::with_capacity(num_records + 1);
    for i in 0..num_records {
        let off = record_list_start + i * 8;
        let o = be_u32(&bytes, off).ok_or_else(|| BooksError::Extraction("Invalid record offset".to_string()))? as usize;
        offsets.push(o);
    }
    offsets.push(bytes.len());

    let rec0_start = offsets[0];
    let rec0_end = offsets[1];
    if rec0_end <= rec0_start || rec0_end > bytes.len() {
        return Err(BooksError::Extraction("Invalid record 0 bounds".to_string()));
    }
    let rec0 = &bytes[rec0_start..rec0_end];
    let record_count = be_u16(rec0, 8).unwrap_or(0) as usize;

    let mobi_off = find_mobi_header_offset(rec0).unwrap_or(0);
    let mut first_image_index = be_u32(rec0, mobi_off + 0x6c).map(|v| v as i32);

    let estimated_images = num_records.saturating_sub(record_count + 1);
    let mut images = std::collections::HashMap::with_capacity(estimated_images);
    let mut first_found_index = None;
    
    // Heuristic: images start after text records.
    // We search all records from record_count + 1 to num_records for image signatures.
    for i in (record_count + 1)..num_records {
        let start = offsets[i];
        let end = offsets[i + 1];
        if end <= start || end > bytes.len() {
            continue;
        }
        let data = &bytes[start..end];
        if detect_image_format(data).is_some() {
            first_found_index.get_or_insert(i as i32);
            images.insert(i, data.to_vec());
        }
    }

    // Fallback: If header says 0 or is missing, but we found images, use the first one we found.
    if (first_image_index.is_none() || first_image_index == Some(0) || first_image_index == Some(-1)) && first_found_index.is_some() {
        first_image_index = first_found_index;
    }

    Ok((images, first_image_index))
}

pub fn extract_mobi_to_html(app_handle: &AppHandle, gutenberg_id: i64, mobi_path: impl AsRef<std::path::Path>) -> Result<(String, Option<i32>), BooksError> {
    let dir = books_dir(app_handle)?;
    let out_path = dir.join(format!("{}.mobi.html", gutenberg_id));

    let bytes = fs::read(mobi_path.as_ref())?;
    if bytes.len() < 80 {
        anyhow::bail!("MOBI file too small");
    }

    // Extract images first
    let (images, first_image_index) = extract_mobi_images(&bytes).unwrap_or_default();
    if !images.is_empty() {
        let images_dir = dir.join(format!("{}_assets", gutenberg_id));
        let _ = fs::create_dir_all(&images_dir);
        for (idx, img_data) in images {
            let ext = detect_image_format(&img_data).unwrap_or("bin");
            let img_path = images_dir.join(format!("{}.{}", idx, ext));
            let _ = fs::write(img_path, img_data);
        }
    }

    let num_records = be_u16(&bytes, 76).ok_or_else(|| anyhow::anyhow!("Invalid PDB header"))? as usize;
    let record_list_start = 78;
    let record_list_len = num_records * 8;
    if bytes.len() < record_list_start + record_list_len {
        anyhow::bail!("Invalid record list");
    }

    let mut offsets: Vec<usize> = Vec::with_capacity(num_records + 1);
    for i in 0..num_records {
        let off = record_list_start + i * 8;
        let o = be_u32(&bytes, off).ok_or_else(|| anyhow::anyhow!("Invalid record offset"))? as usize;
        offsets.push(o);
    }
    offsets.push(bytes.len());

    let rec0_start = offsets[0];
    let rec0_end = offsets[1];
    if rec0_end <= rec0_start || rec0_end > bytes.len() {
        anyhow::bail!("Invalid record 0 bounds");
    }
    let rec0 = &bytes[rec0_start..rec0_end];

    // PalmDOC header (16 bytes)
    let compression = be_u16(rec0, 0).unwrap_or(1);
    let _text_len = be_u32(rec0, 4).unwrap_or(0) as usize;
    let record_count = be_u16(rec0, 8).unwrap_or(0) as usize;
    let extra_flags = mobi_extra_data_flags(rec0);

    if record_count == 0 {
        anyhow::bail!("MOBI has no text records");
    }

    let max_record = (1 + record_count).min(num_records);
    let mut record_texts: Vec<String> = Vec::with_capacity(record_count);
    
    for idx in 1..max_record {
        let start = offsets[idx];
        let end = offsets[idx + 1];
        if end <= start || end > bytes.len() {
            break;
        }
        let rec = &bytes[start..end];
        let trimmed_len = trim_trailing_record_data(rec, extra_flags);
        let rec = &rec[..trimmed_len];
        
        let decompressed = match compression {
            1 => rec.to_vec(),
            2 => palmdoc_decompress(rec),
            _ => rec.to_vec(),
        };
        
        let text = decode_mobi_text(rec0, &decompressed);
        if !text.trim().is_empty() {
            record_texts.push(text);
        }
    }

    let joined_text = record_texts.join("");
    let text = strip_invalid_controls(&joined_text);

    fn contains_html_tag(s: &str) -> bool {
        s.as_bytes().windows(5).any(|w| w.eq_ignore_ascii_case(b"<html"))
    }

    let html = if contains_html_tag(&text) {
        text
    } else {
        format!(
            "<!doctype html><html><head><meta charset=\"utf-8\"></head><body><pre>{}</pre></body></html>",
            escape_html(&text)
        )
    };

    fs::write(&out_path, html.as_bytes())?;
    Ok((out_path.to_string_lossy().to_string(), first_image_index))
}

pub fn delete_mobi_file(mobi_path: impl AsRef<std::path::Path>) -> Result<(), BooksError> {
    let _ = fs::remove_file(mobi_path);
    Ok(())
}

pub fn get_book_asset_path(app_handle: &AppHandle, gutenberg_id: i64, asset_id: usize) -> Result<PathBuf, BooksError> {
    let dir = books_dir(app_handle)?;
    let assets_dir = dir.join(format!("{}_assets", gutenberg_id));
    
    // Check for common extensions
    for ext in ["jpg", "png", "gif", "bin"] {
        let path = assets_dir.join(format!("{}.{}", asset_id, ext));
        if path.exists() {
            return Ok(path);
        }
    }
    
    anyhow::bail!("Asset {} not found for book {}", asset_id, gutenberg_id)
}

pub fn read_html_string_from_bytes(bytes: &[u8]) -> Result<String, BooksError> {
    let encoding = detect_html_encoding(bytes).unwrap_or(encoding_rs::UTF_8);
    let (cow, _, had_errors) = encoding.decode(bytes);
    let mut text = strip_invalid_controls(cow.as_ref());
    let mut replacement_total = replacement_count(&text);
    if had_errors || replacement_total > 0 {
        let (cp, _, _) = encoding_rs::WINDOWS_1252.decode(bytes);
        let fallback = strip_invalid_controls(cp.as_ref());
        let fallback_replacements = replacement_count(&fallback);
        if replacement_total > REPLACEMENT_THRESHOLD && fallback_replacements < replacement_total {
            text = fallback;
            replacement_total = fallback_replacements;
        }
    }
    
    if replacement_total > REPLACEMENT_THRESHOLD {
        anyhow::bail!("Cached HTML contains encoding errors, please reload the book");
    }
    
    Ok(fix_mojibake(&text).unwrap_or(text))
}

pub fn read_html_string(html_path: impl AsRef<std::path::Path>) -> Result<String, BooksError> {
    let html_path = html_path.as_ref();
    let bytes = fs::read(html_path)?;
    read_html_string_from_bytes(&bytes).map_err(|e| {
        let _ = fs::remove_file(html_path);
        e
    })
}

pub fn delete_html_file(html_path: impl AsRef<std::path::Path>) -> Result<(), BooksError> {
    let _ = fs::remove_file(html_path);
    Ok(())
}

pub fn delete_book_assets(app_handle: &AppHandle, gutenberg_id: i64) -> Result<(), BooksError> {
    let dir = books_dir(app_handle)?;
    let assets_dir = dir.join(format!("{}_assets", gutenberg_id));
    if assets_dir.exists() {
        let _ = fs::remove_dir_all(assets_dir);
    }
    Ok(())
}

// EPUB/HTML downloads are intentionally unsupported (MOBI-only).

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_extract_mobi_images() {
        let mobi_path = std::path::PathBuf::from("tmp/books/6130.mobi");
        if !mobi_path.exists() {
            return; // Skip if file not found
        }
        let bytes = fs::read(mobi_path).unwrap();
        let (images, first_image_index) = extract_mobi_images(&bytes).unwrap();
        
        assert!(first_image_index.is_some());
        assert!(!images.is_empty());
        
        // Record 449 was the first JPEG in my previous dump
        assert_eq!(first_image_index.unwrap(), 449);
        assert!(images.contains_key(&449));
    }
}
