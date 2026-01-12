use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GutendexAuthor {
    pub name: String,
    pub birth_year: Option<i32>,
    pub death_year: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GutendexBook {
    pub id: i64,
    pub title: String,
    pub authors: Vec<GutendexAuthor>,
    pub copyright: Option<bool>,
    pub formats: std::collections::HashMap<String, String>,
    pub download_count: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GutendexResponse {
    pub count: i64,
    pub next: Option<String>,
    pub previous: Option<String>,
    pub results: Vec<GutendexBook>,
}

pub async fn search_shakespeare(page_url: Option<String>) -> Result<GutendexResponse, anyhow::Error> {
    let url = page_url.unwrap_or_else(|| {
        // Gutendex: free Project Gutenberg API.
        // We filter by author name; Gutenberg catalogs Shakespeare consistently.
        "https://gutendex.com/books/?search=Shakespeare%2C%20William".to_string()
    });

    let client = reqwest::Client::new();
    let resp = client.get(url).send().await?.error_for_status()?;
    Ok(resp.json::<GutendexResponse>().await?)
}