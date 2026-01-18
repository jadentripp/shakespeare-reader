use serde::{Deserialize, Serialize};
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::AppHandle;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatMessage {
    pub role: String,
    pub content: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KeyStatus {
    pub has_env_key: bool,
    pub has_saved_key: bool,
}

#[derive(Debug, Serialize)]
struct ChatRequest {
    model: String,
    input: Vec<ChatMessage>,
    #[serde(skip_serializing_if = "Option::is_none")]
    reasoning: Option<ReasoningConfig>,
}

#[derive(Debug, Serialize)]
struct ReasoningConfig {
    summary: String,
}

#[derive(Debug, Deserialize)]
struct ChatResponse {
    output: Vec<ResponseItem>,
}

#[derive(Debug, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
enum ResponseItem {
    Message {
        content: Vec<ContentPart>,
    },
    Reasoning {
        summary: Option<String>,
    },
    #[serde(other)]
    Unknown,
}

#[derive(Debug, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
enum ContentPart {
    OutputText {
        text: String,
    },
    #[serde(other)]
    Unknown,
}

#[derive(Debug, Deserialize)]
struct ModelsResponse {
    data: Vec<ModelInfo>,
}

#[derive(Debug, Deserialize)]
struct ModelInfo {
    id: String,
    created: Option<i64>,
}

fn resolve_api_key(app_handle: &AppHandle) -> Result<String, anyhow::Error> {
    let saved = crate::db::get_setting(app_handle, "openai_api_key".to_string())?;
    if let Some(key) = saved {
        let trimmed = key.trim();
        if !trimmed.is_empty() {
            return Ok(trimmed.to_string());
        }
    }
    if let Ok(env_key) = std::env::var("OPENAI_API_KEY") {
        let trimmed = env_key.trim();
        if !trimmed.is_empty() {
            return Ok(trimmed.to_string());
        }
    }
    Err(anyhow::anyhow!(
        "Missing OpenAI API key (set settings.openai_api_key or OPENAI_API_KEY)"
    ))
}

pub fn key_status(app_handle: &AppHandle) -> Result<KeyStatus, anyhow::Error> {
    let saved = crate::db::get_setting(app_handle, "openai_api_key".to_string())?;
    let has_saved_key = saved.map(|value| !value.trim().is_empty()).unwrap_or(false);
    let has_env_key = std::env::var("OPENAI_API_KEY")
        .map(|value| !value.trim().is_empty())
        .unwrap_or(false);
    Ok(KeyStatus {
        has_env_key,
        has_saved_key,
    })
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ChatResult {
    pub content: String,
    pub reasoning_summary: Option<String>,
}

pub async fn chat(app_handle: &AppHandle, messages: Vec<ChatMessage>, model_override: Option<String>) -> Result<ChatResult, anyhow::Error> {
    let api_key = resolve_api_key(app_handle)?;
    let model = model_override.unwrap_or_else(|| {
        crate::db::get_setting(app_handle, "openai_model".to_string())
            .ok()
            .flatten()
            .unwrap_or_else(|| "gpt-4o".to_string())
    });

    let client = reqwest::Client::new();
    let request_body = ChatRequest {
        model,
        input: messages,
        reasoning: None,
    };

    let json_payload = serde_json::to_string(&request_body).unwrap_or_default();
    
    let resp = client
        .post("https://api.openai.com/v1/responses")
        .bearer_auth(api_key)
        .header("Content-Type", "application/json")
        .body(json_payload)
        .send()
        .await?;

    if !resp.status().is_success() {
        let status = resp.status();
        let error_body = resp.text().await.unwrap_or_else(|_| "Could not read error body".to_string());
        return Err(anyhow::anyhow!("OpenAI API error {}: {}", status, error_body));
    }

    let response_text = resp.text().await?;
    println!("[OpenAI] Response body: {}", &response_text[..response_text.len().min(500)]);
    
    let body: ChatResponse = serde_json::from_str(&response_text)
        .map_err(|e| anyhow::anyhow!("Failed to parse response: {}. Body: {}", e, &response_text[..response_text.len().min(500)]))?;
    
    let mut content = String::new();
    let mut reasoning_summary = None;

    for item in body.output {
        match item {
            ResponseItem::Message { content: parts } => {
                for part in parts {
                    if let ContentPart::OutputText { text } = part {
                        content.push_str(&text);
                    }
                }
            }
            ResponseItem::Reasoning { summary } => {
                reasoning_summary = summary;
            }
            ResponseItem::Unknown => {}
        }
    }

    Ok(ChatResult {
        content,
        reasoning_summary,
    })
}

pub async fn list_models(app_handle: &AppHandle) -> Result<Vec<String>, anyhow::Error> {
    let api_key = resolve_api_key(app_handle)?;
    let client = reqwest::Client::new();
    let resp = client
        .get("https://api.openai.com/v1/models")
        .bearer_auth(api_key)
        .header("Content-Type", "application/json")
        .send()
        .await?
        .error_for_status()?;

    let body: ModelsResponse = resp.json().await?;
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64;
    let cutoff = now - 60 * 60 * 24 * 540;

    let mut models: Vec<ModelInfo> = body
        .data
        .into_iter()
        .filter(|model| {
            let id = model.id.as_str();
            if !id.starts_with("gpt-") {
                return false;
            }
            if id.starts_with("gpt-3.5") {
                return false;
            }
            if id.starts_with("gpt-5") {
                return true;
            }
            match model.created {
                Some(created) => created >= cutoff,
                None => true,
            }
        })
        .collect();

    models.sort_by(|a, b| b.created.unwrap_or_default().cmp(&a.created.unwrap_or_default()));
    Ok(models.into_iter().map(|model| model.id).collect())
}
