use serde::{Deserialize, Serialize};
use tauri::AppHandle;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatMessage {
    pub role: String,
    pub content: String,
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

pub async fn chat(app_handle: &AppHandle, messages: Vec<ChatMessage>) -> Result<String, anyhow::Error> {
    let api_key = crate::db::get_setting(app_handle, "openai_api_key".to_string())?
        .ok_or_else(|| anyhow::anyhow!("Missing OpenAI API key (set settings.openai_api_key)"))?;
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
