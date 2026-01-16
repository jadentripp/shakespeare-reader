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
    messages: Vec<ChatMessage>,
    temperature: f32,
}

#[derive(Debug, Deserialize)]
struct ChatResponse {
    choices: Vec<ChatChoice>,
}

#[derive(Debug, Deserialize)]
struct ChatChoice {
    message: ChatChoiceMessage,
}

#[derive(Debug, Deserialize)]
struct ChatChoiceMessage {
    content: Option<String>,
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
    if let Some(key) = saved.filter(|value| !value.trim().is_empty()) {
        return Ok(key);
    }
    if let Ok(env_key) = std::env::var("OPENAI_API_KEY") {
        if !env_key.trim().is_empty() {
            return Ok(env_key);
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

pub async fn chat(app_handle: &AppHandle, messages: Vec<ChatMessage>) -> Result<String, anyhow::Error> {
    let api_key = resolve_api_key(app_handle)?;
    let model = crate::db::get_setting(app_handle, "openai_model".to_string())?
        .unwrap_or_else(|| "gpt-4.1-mini".to_string());

    let client = reqwest::Client::new();
    let resp = client
        .post("https://api.openai.com/v1/chat/completions")
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Content-Type", "application/json")
        .json(&ChatRequest {
            model,
            messages,
            temperature: 0.2,
        })
        .send()
        .await?
        .error_for_status()?;

    let body: ChatResponse = resp.json().await?;
    let content = body
        .choices
        .into_iter()
        .next()
        .and_then(|c| c.message.content)
        .unwrap_or_default();

    Ok(content)
}

pub async fn list_models(app_handle: &AppHandle) -> Result<Vec<String>, anyhow::Error> {
    let api_key = resolve_api_key(app_handle)?;
    let client = reqwest::Client::new();
    let resp = client
        .get("https://api.openai.com/v1/models")
        .header("Authorization", format!("Bearer {}", api_key))
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
