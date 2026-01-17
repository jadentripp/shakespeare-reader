use reqwest::Url;
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

fn catalog_base_url(catalog_key: &str) -> Option<String> {
    match catalog_key {
        "all" => Some("https://gutendex.com/books/".to_string()),
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

fn build_catalog_url(
    base_url: &str,
    search_query: Option<&str>,
    topic: Option<&str>,
) -> Result<String, anyhow::Error> {
    let mut url = Url::parse(base_url)?;
    let mut existing_search: Option<String> = None;
    let mut other_pairs: Vec<(String, String)> = Vec::new();

    for (key, value) in url.query_pairs() {
        if key == "search" {
            existing_search = Some(value.to_string());
        } else if key != "topic" {
            other_pairs.push((key.to_string(), value.to_string()));
        }
    }

    let mut combined_search = existing_search.unwrap_or_default();
    if let Some(query) = search_query {
        let trimmed = query.trim();
        if !trimmed.is_empty() {
            if combined_search.is_empty() {
                combined_search = trimmed.to_string();
            } else {
                combined_search = format!("{} {}", combined_search, trimmed);
            }
        }
    }

    let topic = topic.and_then(|t| {
        let trimmed = t.trim();
        if trimmed.is_empty() {
            None
        } else {
            Some(trimmed)
        }
    });

    url.set_query(None);
    {
        let mut qp = url.query_pairs_mut();
        for (key, value) in other_pairs {
            qp.append_pair(&key, &value);
        }
        if !combined_search.is_empty() {
            qp.append_pair("search", &combined_search);
        }
        if let Some(t) = topic {
            qp.append_pair("topic", t);
        }
    }

    Ok(url.to_string())
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
    search_query: Option<String>,
    topic: Option<String>,
) -> Result<GutendexResponse, anyhow::Error> {
    let url = if let Some(page_url) = page_url {
        sanitize_page_url(&page_url)?
    } else {
        let base_url = catalog_base_url(catalog_key)
            .ok_or_else(|| anyhow::anyhow!("Unknown catalog"))?;
        build_catalog_url(&base_url, search_query.as_deref(), topic.as_deref())?
    };

    let client = reqwest::Client::new();
    let resp = client.get(url).send().await?.error_for_status()?;
    Ok(resp.json::<GutendexResponse>().await?)
}
