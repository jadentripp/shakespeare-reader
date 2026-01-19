import { invoke as tauriInvoke } from "@tauri-apps/api/core";

export const isTauri = typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__ !== undefined;

export async function invoke<T>(cmd: string, args?: any): Promise<T> {
  if (isTauri) {
    return await tauriInvoke(cmd, args);
  }
  console.warn(`Tauri invoke "${cmd}" suppressed - not in Tauri environment.`);
  return null as any;
}
