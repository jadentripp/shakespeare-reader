use serde::Serialize;
use std::sync::Mutex;
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
