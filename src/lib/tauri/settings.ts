import { invoke } from "./core";

export async function setSetting(params: { key: string; value: string }): Promise<void> {
  await invoke("set_setting", { key: params.key, value: params.value });
}

export async function getSetting(key: string): Promise<string | null> {
  return await invoke("get_setting", { key });
}
