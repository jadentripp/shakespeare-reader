use reqwest::Url;
use serde::{Deserialize, Serialize};
use std::borrow::Cow;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum GutendexError {
    #[error("HTTP error: {0}")]
    Http(#[from] reqwest::Error),

    #[error("URL parse error: {0}")]
    Url(#[from] url::ParseError),

    #[error("Unknown catalog: {0}")]
    UnknownCatalog(String),

    #[error("Invalid URL: {0}")]
    InvalidUrl(String),

    #[allow(dead_code)]
    #[error("{0}")]
    Other(String),
}

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

fn catalog_base_url(catalog_key: &str) -> Option<&'static str> {
    match catalog_key {
        "all" => Some("https://gutendex.com/books/"),
        "shakespeare" => Some("https://gutendex.com/books/?search=Shakespeare%2C%20William"),
        "greek-tragedy" => {
            Some("https://gutendex.com/books/?search=aeschylus%20sophocles%20euripides%20tragedy")
        }
        "greek-epic" => Some("https://gutendex.com/books/?search=homer%20hesiod%20epic%20myth"),
        "roman-drama" => Some("https://gutendex.com/books/?search=roman%20drama"),
        "mythology" => Some("https://gutendex.com/books/?search=mythology"),
        "philosophy" => Some("https://gutendex.com/books/?search=philosophy"),
        "gothic" => Some("https://gutendex.com/books/?search=gothic"),
        "science-fiction" => Some("https://gutendex.com/books/?search=science%20fiction"),
        "poetry" => Some("https://gutendex.com/books/?search=poetry"),
        _ => None,
    }
}

fn build_catalog_url(
    base_url: &str,
    search_query: Option<&str>,
    topic: Option<&str>,
) -> Result<String, GutendexError> {
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
                combined_search.push(' ');
                combined_search.push_str(trimmed);
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

fn sanitize_page_url(page_url: &str) -> Result<Cow<'_, str>, GutendexError> {
    if page_url.starts_with("https://gutendex.com/books/") {
        Ok(Cow::Borrowed(page_url))
    } else {
        Err(GutendexError::InvalidUrl(
            "Invalid catalog URL.".to_string(),
        ))
    }
}

pub async fn search_catalog(
    catalog_key: &str,
    page_url: Option<String>,
    search_query: Option<String>,
    topic: Option<String>,
) -> Result<GutendexResponse, GutendexError> {
    let url: Cow<'_, str> = if let Some(ref page_url) = page_url {
        sanitize_page_url(page_url)?
    } else {
        let base_url = catalog_base_url(catalog_key)
            .ok_or_else(|| GutendexError::UnknownCatalog(catalog_key.to_string()))?;
        Cow::Owned(build_catalog_url(
            base_url,
            search_query.as_deref(),
            topic.as_deref(),
        )?)
    };

    let client = reqwest::Client::new();
    let resp = client.get(url.as_ref()).send().await?.error_for_status()?;
    Ok(resp.json::<GutendexResponse>().await?)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_catalog_base_urls() {
        // Greek Epic should include broader search
        let epic = catalog_base_url("greek-epic").unwrap();
        assert!(epic.contains("homer%20hesiod%20epic%20myth"));

        // Greek Tragedy should include major playwrights
        let tragedy = catalog_base_url("greek-tragedy").unwrap();
        assert!(tragedy.contains("aeschylus%20sophocles%20euripides%20tragedy"));

        // New categories
        assert!(catalog_base_url("gothic").is_some());
        assert!(catalog_base_url("philosophy").is_some());
    }
}
