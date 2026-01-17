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

fn catalog_url(catalog_key: &str) -> Option<String> {
    match catalog_key {
        "shakespeare" => Some("https://gutendex.com/books/?search=Shakespeare%2C%20William".to_string()),
        "greek-tragedy" => Some("https://gutendex.com/books/?search=greek%20tragedy".to_string()),
        "greek-epic" => Some("https://gutendex.com/books/?search=greek%20epic".to_string()),
        "roman-drama" => Some("https://gutendex.com/books/?search=roman%20drama".to_string()),
        "mythology" => Some("https://gutendex.com/books/?search=mythology".to_string()),
        "philosophy" => Some("https://gutendex.com/books/?search=philosophy".to_string()),
        "gothic" => Some("https://gutendex.com/books/?search=gothic".to_string()),
        "science-fiction" => Some("https://gutendex.com/books/?search=science%20fiction".to_string()),
        "poetry" => Some("https://gutendex.com/books/?search=poetry".to_string()),
        _ => None,
    }
}

fn sanitize_page_url(page_url: &str) -> Result<String, anyhow::Error> {
    if page_url.starts_with("https://gutendex.com/books/") {
        Ok(page_url.to_string())
    } else {
        Err(anyhow::anyhow!("Invalid catalog URL."))
    }
}

pub async fn search_catalog(
    catalog_key: &str,
    page_url: Option<String>,
) -> Result<GutendexResponse, anyhow::Error> {
    let url = if let Some(page_url) = page_url {
        sanitize_page_url(&page_url)?
    } else {
        catalog_url(catalog_key).ok_or_else(|| anyhow::anyhow!("Unknown catalog"))?
    };

    let client = reqwest::Client::new();
    let resp = client.get(url).send().await?.error_for_status()?;
    Ok(resp.json::<GutendexResponse>().await?)
}
