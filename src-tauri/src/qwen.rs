use serde::Serialize;
use std::sync::Mutex;
use tauri::{AppHandle, State};
use tauri_plugin_shell::ShellExt;
use tauri_plugin_shell::process::CommandChild;

#[derive(Debug, Serialize, Clone, Copy, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum SidecarStatus {
    Stopped,
    Starting,
    Running,
    Errored,
}

pub struct SidecarState {
    pub status: Mutex<SidecarStatus>,
    pub child: Mutex<Option<CommandChild>>,
}

impl SidecarState {
    pub fn new() -> Self {
        Self {
            status: Mutex::new(SidecarStatus::Stopped),
            child: Mutex::new(None),
        }
    }
}

#[tauri::command]
pub async fn get_qwen_status(state: State<'_, SidecarState>) -> Result<SidecarStatus, String> {
    Ok(*state.status.lock().unwrap())
}

#[tauri::command]
pub async fn start_qwen_sidecar(
    app: AppHandle,
    state: State<'_, SidecarState>,
) -> Result<SidecarStatus, String> {
    let mut status = state.status.lock().unwrap();

    if *status == SidecarStatus::Running || *status == SidecarStatus::Starting {
        return Ok(*status);
    }

    *status = SidecarStatus::Starting;
    println!("[Sidecar] Starting qwen-tts sidecar...");

    let sidecar = app
        .shell()
        .sidecar("qwen-tts")
        .map_err(|e| format!("Failed to create sidecar: {e}"))?
        .args(["--host", "127.0.0.1", "--port", "5123"]);

    let (mut _rx, child) = sidecar
        .spawn()
        .map_err(|e| format!("Failed to spawn sidecar: {e}"))?;

    let mut child_guard = state.child.lock().unwrap();
    *child_guard = Some(child);
    *status = SidecarStatus::Running;

    println!("[Sidecar] qwen-tts sidecar is now running.");
    Ok(*status)
}

#[tauri::command]
pub async fn stop_qwen_sidecar(state: State<'_, SidecarState>) -> Result<SidecarStatus, String> {
    let mut status = state.status.lock().unwrap();
    let mut child_guard = state.child.lock().unwrap();

    if let Some(child) = child_guard.take() {
        println!("[Sidecar] Stopping qwen-tts sidecar...");
        let _ = child.kill();
    }

    *status = SidecarStatus::Stopped;
    println!("[Sidecar] qwen-tts sidecar stopped.");
    Ok(*status)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sidecar_state_initialization() {
        let state = SidecarState::new();
        assert_eq!(*state.status.lock().unwrap(), SidecarStatus::Stopped);
        assert!(state.child.lock().unwrap().is_none());
    }
}
