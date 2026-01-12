use std::{fs, path::PathBuf, time::{Duration, Instant}};

use tauri::{path::BaseDirectory, AppHandle, Manager};

fn find_mobi_header_offset(rec0: &[u8]) -> Option<usize> {
    // After the 16-byte PalmDOC header, MOBI header commonly starts at offset 16,
    // but we search defensively.
    rec0.windows(4)
        .position(|w| w == b"MOBI")
}

fn mobi_text_encoding(rec0: &[u8]) -> Option<u32> {
    let off = find_mobi_header_offset(rec0)?;
    // MOBI header: text encoding is a 32-bit big-endian integer at offset 0x1C from MOBI.
    be_u32(rec0, off + 0x1c)
}

fn decode_mobi_text(rec0: &[u8], text_bytes: &[u8]) -> String {
    let enc = mobi_text_encoding(rec0);
    match enc {
        Some(1252) => {
            let (cow, _, _) = encoding_rs::WINDOWS_1252.decode(text_bytes);
            cow.to_string()
        }
        Some(65001) => {
            let (cow, _, _) = encoding_rs::UTF_8.decode(text_bytes);
            cow.to_string()
        }
        _ => {
            // Heuristic: try UTF-8 first; if it produces lots of replacement chars, fall back to 1252.
            let (utf8, _, _) = encoding_rs::UTF_8.decode(text_bytes);
            let s = utf8.to_string();
            let repl = s.chars().filter(|&c| c == '\u{FFFD}').count();
            if repl >= 4 {
                let (cp, _, _) = encoding_rs::WINDOWS_1252.decode(text_bytes);
                cp.to_string()
            } else {
                s
            }
        }
    }
}

static GUTENBERG_LAST: once_cell::sync::Lazy<tokio::sync::Mutex<Option<Instant>>> =
    once_cell::sync::Lazy::new(|| tokio::sync::Mutex::new(None));

async fn throttle_gutenberg_if_needed(url: &str) {
    let host = reqwest::Url::parse(url)
        .ok()
        .and_then(|u| u.host_str().map(|h| h.to_string()));
    let is_gutenberg = host
        .as_deref()
        .map(|h| h == "gutenberg.org" || h.ends_with(".gutenberg.org"))
        .unwrap_or(false);
    if !is_gutenberg {
        return;
    }

    // Project Gutenberg asks automated tools to be very gentle; 2s matches their wget example.
    let min_delay = Duration::from_secs(2);

    let mut guard = GUTENBERG_LAST.lock().await;
    if let Some(last) = *guard {
        let elapsed = last.elapsed();
        if elapsed < min_delay {
            tokio::time::sleep(min_delay - elapsed).await;
        }
    }
    *guard = Some(Instant::now());
}

pub fn books_dir(app_handle: &AppHandle) -> Result<PathBuf, anyhow::Error> {
    let dir = app_handle
        .path()
        .resolve("books", BaseDirectory::AppLocalData)?;
    fs::create_dir_all(&dir)?;
    Ok(dir)
}

pub async fn download_mobi_to_app_data(
    app_handle: &AppHandle,
    gutenberg_id: i64,
    mobi_url: String,
) -> Result<String, anyhow::Error> {
    let dir = books_dir(app_handle)?;
    let path = dir.join(format!("{}.mobi", gutenberg_id));

    throttle_gutenberg_if_needed(&mobi_url).await;

    let client = reqwest::Client::builder()
        .user_agent("shakespeare-reader/0.1 (polite; see https://www.gutenberg.org/policy/robot)")
        .build()?;

    let resp = client.get(&mobi_url).send().await?;
    let status = resp.status();
    if status.as_u16() == 403 || status.as_u16() == 429 {
        anyhow::bail!(
            "Project Gutenberg blocked/rate-limited this request (HTTP {}). Try pausing/resuming, or download fewer books / set up a local mirror per https://www.gutenberg.org/policy/robot",
            status
        );
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
    let mut out = String::with_capacity(s.len() + s.len() / 10);
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

pub fn extract_mobi_to_html(app_handle: &AppHandle, gutenberg_id: i64, mobi_path: String) -> Result<String, anyhow::Error> {
    let dir = books_dir(app_handle)?;
    let out_path = dir.join(format!("{}.mobi.html", gutenberg_id));

    let bytes = fs::read(mobi_path)?;
    if bytes.len() < 80 {
        anyhow::bail!("MOBI file too small");
    }

    let num_records = be_u16(&bytes, 76).ok_or_else(|| anyhow::anyhow!("Invalid PDB header"))? as usize;
    let record_list_start = 78;
    let record_list_len = num_records * 8;
    if bytes.len() < record_list_start + record_list_len {
        anyhow::bail!("Invalid record list");
    }

    let mut offsets: Vec<usize> = Vec::with_capacity(num_records);
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
    let text_len = be_u32(rec0, 4).unwrap_or(0) as usize;
    let record_count = be_u16(rec0, 8).unwrap_or(0) as usize;

    if record_count == 0 {
        anyhow::bail!("MOBI has no text records");
    }

    let max_record = (1 + record_count).min(num_records);
    let mut out: Vec<u8> = Vec::with_capacity(text_len.max(1024));
    for idx in 1..max_record {
        let start = offsets[idx];
        let end = offsets[idx + 1];
        if end <= start || end > bytes.len() {
            break;
        }
        let rec = &bytes[start..end];
        match compression {
            1 => out.extend_from_slice(rec),
            2 => out.extend_from_slice(&palmdoc_decompress(rec)),
            _ => out.extend_from_slice(rec),
        }
        if text_len > 0 && out.len() >= text_len {
            out.truncate(text_len);
            break;
        }
    }

    // Trim trailing nulls
    while out.last() == Some(&0) {
        out.pop();
    }

    // MOBI text streams are commonly Windows-1252 or UTF-8 depending on header.
    let text = decode_mobi_text(rec0, &out);
    let html = if text.to_lowercase().contains("<html") {
        text
    } else {
        format!(
            "<!doctype html><html><head><meta charset=\"utf-8\"></head><body><pre>{}</pre></body></html>",
            escape_html(&text)
        )
    };

    fs::write(&out_path, html.as_bytes())?;
    Ok(out_path.to_string_lossy().to_string())
}

pub fn delete_mobi_file(mobi_path: String) -> Result<(), anyhow::Error> {
    let _ = fs::remove_file(mobi_path);
    Ok(())
}

pub fn read_html_string(html_path: String) -> Result<String, anyhow::Error> {
    let bytes = fs::read(html_path)?;
    Ok(String::from_utf8_lossy(&bytes).to_string())
}

pub fn delete_html_file(html_path: String) -> Result<(), anyhow::Error> {
    let _ = fs::remove_file(html_path);
    Ok(())
}

// EPUB/HTML downloads are intentionally unsupported (MOBI-only).
