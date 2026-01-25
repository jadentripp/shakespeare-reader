use serde::Serialize;
use std::process::{Child, Command, Stdio};
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
    pub child: Mutex<Option<PocketChild>>,
}

pub enum PocketChild {
    Sidecar(CommandChild),
    Process(Child),
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
pub async fn get_pocket_status(state: State<'_, SidecarState>) -> Result<SidecarStatus, String> {
    Ok(*state.status.lock().unwrap())
}

#[tauri::command]
pub async fn start_pocket_sidecar(
    app: AppHandle,
    state: State<'_, SidecarState>,
) -> Result<SidecarStatus, String> {
    start_pocket_sidecar_internal(&app, &state)
}

pub fn start_pocket_sidecar_internal(
    app: &AppHandle,
    state: &SidecarState,
) -> Result<SidecarStatus, String> {
    let mut status = state.status.lock().unwrap();

    if *status == SidecarStatus::Running || *status == SidecarStatus::Starting {
        return Ok(*status);
    }

    *status = SidecarStatus::Starting;
    println!("[Sidecar] Starting pocket-tts sidecar...");

    let sidecar = app
        .shell()
        .sidecar("pocket-tts")
        .map_err(|e| format!("Failed to create sidecar: {e}"));

    let sidecar = match sidecar {
        Ok(sidecar) => sidecar,
        Err(e) => {
            println!("[Sidecar] {e}");
            return spawn_dev_server(state);
        }
    }
        .args(["--host", "127.0.0.1", "--port", "5123", "--preload"]);

    let (mut rx, child) = sidecar
        .spawn()
        .map_err(|e| format!("Failed to spawn sidecar: {e}"))?;

    tauri::async_runtime::spawn(async move {
        while let Some(event) = rx.recv().await {
            match event {
                tauri_plugin_shell::process::CommandEvent::Stdout(line) => {
                    print!("{}", String::from_utf8_lossy(&line));
                }
                tauri_plugin_shell::process::CommandEvent::Stderr(line) => {
                    eprint!("{}", String::from_utf8_lossy(&line));
                }
                _ => {}
            }
        }
    });

    let mut child_guard = state.child.lock().unwrap();
    *child_guard = Some(PocketChild::Sidecar(child));
    *status = SidecarStatus::Running;

    println!("[Sidecar] pocket-tts sidecar process spawned.");
    Ok(*status)
}

fn spawn_dev_server(state: &SidecarState) -> Result<SidecarStatus, String> {
    let mut status = state.status.lock().unwrap();
    println!("[Sidecar] Attempting to start Pocket TTS via local python server...");

    let cwd = std::env::current_dir().map_err(|e| format!("Failed to read cwd: {e}"))?;
    let base = if cwd.ends_with("src-tauri") {
        cwd.parent().map(|p| p.to_path_buf()).unwrap_or(cwd)
    } else {
        cwd
    };
    let server_dir = base.join("conductor").join("pocket-tts");
    let server_path = server_dir.join("server.py");
    if !server_path.exists() {
        *status = SidecarStatus::Errored;
        return Err(format!(
            "Pocket TTS sidecar not found and server.py missing at {}",
            server_path.display()
        ));
    }

    let child = spawn_uv_run_server(&server_dir)?;

    let mut child_guard = state.child.lock().unwrap();
    *child_guard = Some(PocketChild::Process(child));
    *status = SidecarStatus::Running;
    println!("[Sidecar] Pocket TTS python server spawned.");
    Ok(*status)
}

fn spawn_uv_run_server(server_dir: &std::path::Path) -> Result<Child, String> {
    let mut command = Command::new("uv");
    command
        .arg("run")
        .arg("python")
        .arg("server.py")
        .arg("--host")
        .arg("127.0.0.1")
        .arg("--port")
        .arg("5123")
        .arg("--preload")
        .current_dir(server_dir)
        .stdout(Stdio::inherit())
        .stderr(Stdio::inherit());

    command.spawn().map_err(|e| format!("Failed to spawn uv run: {e}"))
}


#[tauri::command]
pub async fn stop_pocket_sidecar(state: State<'_, SidecarState>) -> Result<SidecarStatus, String> {
    let mut status = state.status.lock().unwrap();
    let mut child_guard = state.child.lock().unwrap();

    if let Some(child) = child_guard.take() {
        println!("[Sidecar] Stopping pocket-tts sidecar...");
        match child {
            PocketChild::Sidecar(child) => {
                let _ = child.kill();
            }
            PocketChild::Process(mut child) => {
                let _ = child.kill();
            }
        }
    }

    *status = SidecarStatus::Stopped;
    println!("[Sidecar] pocket-tts sidecar stopped.");
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
