use std::env;
use std::{
    fs,
    path::PathBuf,
    time::{Duration, Instant},
};
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
    rec0.windows(4).position(|w| w == b"MOBI")
}

fn mobi_text_encoding(rec0: &[u8]) -> Option<u32> {
    let off = find_mobi_header_offset(rec0)?;
    be_u32(rec0, off + 0x0c)
}

fn mobi_extra_data_flags(rec0: &[u8]) -> u16 {
    be_u16(rec0, 0xf2).unwrap_or(0)
}

fn decode_mobi_text(rec0: &[u8], text_bytes: &[u8]) -> String {
    if let Some(enc) = encoding_from_bom(text_bytes) {
        let (decoded, _, _) = enc.decode(text_bytes);
        return decoded.to_string();
    }

    let encoding = match mobi_text_encoding(rec0) {
        Some(65001) => encoding_rs::UTF_8,
        Some(1252) => encoding_rs::WINDOWS_1252,
        _ => {
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

#[allow(dead_code)]
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

#[allow(dead_code)]
fn detect_html_encoding(bytes: &[u8]) -> Option<&'static encoding_rs::Encoding> {
    if let Some(enc) = encoding_from_bom(bytes) {
        return Some(enc);
    }
    let slice_len = bytes.len().min(8192);
    let mut lowered: Vec<u8> = Vec::with_capacity(slice_len);
    for &b in &bytes[..slice_len] {
        let lb = if b.is_ascii_uppercase() { b + 32 } else { b };
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
        "\u{00e2}\u{0080}\u{0099}", // â€™
        "\u{00e2}\u{0080}\u{009c}", // â€œ
        "\u{00e2}\u{0080}\u{009d}", // â€
        "\u{00e2}\u{0080}\u{0093}", // â€"
        "\u{00e2}\u{0080}\u{0094}", // â€"
        "\u{00e2}\u{0080}\u{00a6}", // â€¦
        "\u{00e2}\u{0080}\u{0098}", // â€˜
        "\u{00c3}\u{00a9}",         // Ã©
        "\u{00c3}\u{00a8}",         // Ã¨
        "\u{00c3}\u{00aa}",         // Ãª
        "\u{00c3}\u{00a1}",         // Ã¡
        "\u{00c3}\u{00b3}",         // Ã³
        "\u{00c3}\u{00ad}",         // Ã­
        "\u{00c3}\u{00ba}",         // Ãº
        "\u{00c3}\u{00b1}",         // Ã±
        "\u{00c2}\u{00a0}",         // Â
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
    bytes
        .iter()
        .any(|&b| b < 0x20 && !matches!(b, b'\n' | b'\r' | b'\t'))
}

#[allow(dead_code)]
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
        .and_then(|u| {
            u.host_str()
                .map(|h| h == "gutenberg.org" || h.ends_with(".gutenberg.org"))
        })
        .unwrap_or(false);
    if !is_gutenberg {
        return;
    }

    let min_delay = Duration::from_secs(2);

    let delay = {
        let mut next_allowed = GUTENBERG_NEXT_ALLOWED.lock().await;
        let now = Instant::now();
        let delay = next_allowed.saturating_duration_since(now);
        *next_allowed = (now + delay) + min_delay;
        delay
    };

    if !delay.is_zero() {
        tokio::time::sleep(delay).await;
    }
}

pub async fn download_mobi_bytes(
    _app_handle: &AppHandle,
    _gutenberg_id: i64,
    mobi_url: String,
) -> Result<Vec<u8>, BooksError> {
    throttle_gutenberg_if_needed(&mobi_url).await;

    let client = reqwest::Client::builder()
        .user_agent("ai-reader/0.1 (polite; see https://www.gutenberg.org/policy/robot)")
        .build()?;

    let resp = client.get(&mobi_url).send().await?;
    let status = resp.status();
    if status.as_u16() == 403 || status.as_u16() == 429 {
        return Err(BooksError::Other(format!(
            "Project Gutenberg blocked/rate-limited this request (HTTP {status}). Try pausing/resuming, or download fewer books / set up a local mirror per https://www.gutenberg.org/policy/robot"
        )));
    }

    let bytes = resp.error_for_status()?.bytes().await?;
    Ok(bytes.to_vec())
}

#[inline]
fn be_u16(b: &[u8], off: usize) -> Option<u16> {
    b.get(off..off + 2)
        .map(|s| u16::from_be_bytes([s[0], s[1]]))
}

#[inline]
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
                let item: u16 = (u16::from(c & 0x3f) << 8) | u16::from(c2);
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

    for bit in (1..=15).rev() {
        if extra_flags & (1 << bit) == 0 {
            continue;
        }
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
        size = size.saturating_sub(val);
    }

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

/// Zero-cost helper: parses record offsets from MOBI PDB header
/// Generic over the capacity hint to allow monomorphization per call site
#[inline]
fn parse_record_offsets(
    bytes: &[u8],
    record_list_start: usize,
    num_records: usize,
) -> Result<Vec<usize>, BooksError> {
    let mut offsets: Vec<usize> = Vec::with_capacity(num_records + 1);
    for i in 0..num_records {
        let off = record_list_start + i * 8;
        let o = be_u32(bytes, off)
            .ok_or_else(|| BooksError::Extraction("Invalid record offset".to_string()))?
            as usize;
        offsets.push(o);
    }
    offsets.push(bytes.len());
    Ok(offsets)
}

#[allow(
    clippy::type_complexity,
    clippy::cast_possible_wrap,
    clippy::cast_possible_truncation
)]
pub fn extract_mobi_images(
    bytes: &[u8],
) -> Result<(std::collections::HashMap<usize, Vec<u8>>, Option<i32>), BooksError> {
    if bytes.len() < 80 {
        return Err(BooksError::Extraction("MOBI file too small".to_string()));
    }

    let num_records = be_u16(bytes, 76)
        .ok_or_else(|| BooksError::Extraction("Invalid PDB header".to_string()))?
        as usize;
    let record_list_start = 78;
    let record_list_len = num_records * 8;
    if bytes.len() < record_list_start + record_list_len {
        return Err(BooksError::Extraction("Invalid record list".to_string()));
    }

    let offsets = parse_record_offsets(bytes, record_list_start, num_records)?;

    let rec0_start = offsets[0];
    let rec0_end = offsets[1];
    if rec0_end <= rec0_start || rec0_end > bytes.len() {
        return Err(BooksError::Extraction(
            "Invalid record 0 bounds".to_string(),
        ));
    }
    let rec0 = &bytes[rec0_start..rec0_end];
    let record_count = be_u16(rec0, 8).unwrap_or(0) as usize;

    let mobi_off = find_mobi_header_offset(rec0).unwrap_or(0);
    let mut first_image_index = be_u32(rec0, mobi_off + 0x6c).map(|v| v as i32);

    let estimated_images = num_records.saturating_sub(record_count + 1);
    let mut images = std::collections::HashMap::with_capacity(estimated_images);
    let mut first_found_index = None;

    for i in (record_count + 1)..num_records {
        let start = offsets[i];
        let end = offsets[i + 1];
        if end <= start || end > bytes.len() {
            continue;
        }
        let data = &bytes[start..end];
        if detect_image_format(data).is_some() {
            first_found_index.get_or_insert(i as i32);
            // Store slice reference bounds instead of copying
            images.insert(i, data.to_vec());
        }
    }

    if (first_image_index.is_none()
        || first_image_index == Some(0)
        || first_image_index == Some(-1))
        && first_found_index.is_some()
    {
        first_image_index = first_found_index;
    }

    Ok((images, first_image_index))
}

pub fn extract_mobi_to_content(
    app_handle: &AppHandle,
    gutenberg_id: i64,
    bytes: &[u8],
) -> Result<(String, Option<i32>), BooksError> {
    if bytes.len() < 80 {
        return Err(BooksError::Extraction("MOBI data too small".to_string()));
    }

    let (images, first_image_index) = match extract_mobi_images(bytes) {
        Ok(v) => v,
        Err(e) => {
            eprintln!("warning: failed to extract images from MOBI data {gutenberg_id}: {e:#}");
            (std::collections::HashMap::default(), None)
        }
    };
    if !images.is_empty() {
        let dir = books_dir(app_handle)?;
        let images_dir = dir.join(format!("{gutenberg_id}_assets"));
        let _ = fs::create_dir_all(&images_dir);
        for (idx, img_data) in images {
            let ext = detect_image_format(&img_data).unwrap_or("bin");
            let img_path = images_dir.join(format!("{idx}.{ext}"));
            let _ = fs::write(img_path, img_data);
        }
    }

    let num_records = be_u16(bytes, 76)
        .ok_or_else(|| BooksError::Extraction("Invalid PDB header".to_string()))?
        as usize;
    let record_list_start = 78;
    let record_list_len = num_records * 8;
    if bytes.len() < record_list_start + record_list_len {
        return Err(BooksError::Extraction("Invalid record list".to_string()));
    }

    let offsets = parse_record_offsets(bytes, record_list_start, num_records)?;

    let rec0_start = offsets[0];
    let rec0_end = offsets[1];
    if rec0_end <= rec0_start || rec0_end > bytes.len() {
        return Err(BooksError::Extraction(
            "Invalid record 0 bounds".to_string(),
        ));
    }
    let rec0 = &bytes[rec0_start..rec0_end];

    let compression = be_u16(rec0, 0).unwrap_or(1);
    let record_count = be_u16(rec0, 8).unwrap_or(0) as usize;
    let extra_flags = mobi_extra_data_flags(rec0);

    if record_count == 0 {
        return Err(BooksError::Extraction(
            "MOBI has no text records".to_string(),
        ));
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

        // Avoid allocation when no compression
        let text = match compression {
            2 => {
                let decompressed = palmdoc_decompress(rec);
                decode_mobi_text(rec0, &decompressed)
            }
            _ => decode_mobi_text(rec0, rec),
        };

        if !text.trim().is_empty() {
            record_texts.push(text);
        }
    }

    let joined_text = record_texts.join("");
    let text = strip_invalid_controls(&joined_text);

    let html = if text
        .as_bytes()
        .windows(5)
        .any(|w| w.eq_ignore_ascii_case(b"<html"))
    {
        text
    } else {
        format!(
            "<!doctype html><html><head><meta charset=\"utf-8\"></head><body><pre>{}</pre></body></html>",
            escape_html(&text)
        )
    };

    Ok((html, first_image_index))
}

fn books_dir(app_handle: &AppHandle) -> Result<PathBuf, BooksError> {
    let mut base = env::current_dir()
        .or_else(|_| app_handle.path().resolve(".", BaseDirectory::AppLocalData))?;
    if base.file_name().and_then(|s| s.to_str()) == Some("src-tauri") {
        if let Some(parent) = base.parent() {
            base = parent.to_path_buf();
        }
    }
    let dir = base.join("tmp").join("books");
    fs::create_dir_all(&dir)?;
    Ok(dir)
}

pub fn get_book_asset_path(
    app_handle: &AppHandle,
    gutenberg_id: i64,
    asset_id: usize,
) -> Result<PathBuf, BooksError> {
    let dir = books_dir(app_handle)?;
    let assets_dir = dir.join(format!("{gutenberg_id}_assets"));

    for ext in ["jpg", "png", "gif", "bin"] {
        let path = assets_dir.join(format!("{asset_id}.{ext}"));
        if path.exists() {
            return Ok(path);
        }
    }

    Err(BooksError::Other(format!(
        "Asset {asset_id} not found for book {gutenberg_id}"
    )))
}

#[allow(dead_code)]
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
        return Err(BooksError::Extraction(
            "Cached HTML contains encoding errors, please reload the book".to_string(),
        ));
    }

    Ok(fix_mojibake(&text).unwrap_or(text))
}

pub fn delete_book_assets(app_handle: &AppHandle, gutenberg_id: i64) -> Result<(), BooksError> {
    let dir = books_dir(app_handle)?;
    let assets_dir = dir.join(format!("{gutenberg_id}_assets"));
    if assets_dir.exists() {
        let _ = fs::remove_dir_all(assets_dir);
    }
    Ok(())
}

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
