import { invoke } from './core'

const SETTINGS_PREFIX = 'reader-settings-'

export async function setSetting(params: { key: string; value: string }): Promise<void> {
  try {
    const res = await invoke('set_setting', { key: params.key, value: params.value })
    // If invoke didn't throw, we assume it worked.
    // But if we are in web mode, invoke returns null but doesn't persist.
    // We can check if we are in Tauri mode (isTauri from core) or just fallback if invoke returns null?
    // Actually invoke returns null in web mode.
    // But invoke might return null in Tauri mode too if the command returns (), so that's ambiguous.
    // Best to rely on isTauri check from core.
  } catch (e) {
    /* ignore */
  }

  // Always save to localStorage as backup/web-mode persistence
  if (typeof window !== 'undefined') {
    localStorage.setItem(SETTINGS_PREFIX + params.key, params.value)
  }
}

export async function getSetting(key: string): Promise<string | null> {
  try {
    const val = await invoke<string | null>('get_setting', { key })
    if (val !== null) return val
  } catch (e) {
    /* ignore */
  }

  // Fallback to localStorage
  if (typeof window !== 'undefined') {
    return localStorage.getItem(SETTINGS_PREFIX + key)
  }
  return null
}

export type SidecarStatus = 'stopped' | 'starting' | 'running' | 'errored'

export async function startPocketSidecar(): Promise<SidecarStatus> {
  return await invoke<SidecarStatus>('start_pocket_sidecar')
}

export async function stopPocketSidecar(): Promise<SidecarStatus> {
  return await invoke<SidecarStatus>('stop_pocket_sidecar')
}

export async function getPocketStatus(): Promise<SidecarStatus> {
  return await invoke<SidecarStatus>('get_pocket_status')
}
