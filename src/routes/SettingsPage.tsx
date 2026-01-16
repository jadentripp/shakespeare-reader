import { useEffect, useMemo, useState } from "react";
import { getSetting, openAiKeyStatus, openAiListModels, setSetting } from "../lib/tauri";

export default function SettingsPage() {
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("gpt-4.1-mini");
  const [status, setStatus] = useState<string | null>(null);
  const [models, setModels] = useState<string[]>([]);
  const [modelsStatus, setModelsStatus] = useState<string | null>(null);
  const [keyStatus, setKeyStatus] = useState<{ has_env_key: boolean; has_saved_key: boolean } | null>(null);
  const [customModel, setCustomModel] = useState("");

  useEffect(() => {
    (async () => {
      const savedKey = await getSetting("openai_api_key");
      const savedModel = await getSetting("openai_model");
      const savedKeyStatus = await openAiKeyStatus();
      if (savedKey) setApiKey(savedKey);
      if (savedModel) setModel(savedModel);
      setKeyStatus(savedKeyStatus);
      if (savedKeyStatus.has_env_key || savedKeyStatus.has_saved_key || savedKey) {
        loadModels();
      }
    })();
  }, []);

  useEffect(() => {
    setCustomModel(model);
  }, [model]);

  const hasCustomModel = useMemo(() => !models.includes(model), [models, model]);

  async function onSave() {
    setStatus(null);
    if (apiKey.trim()) {
      await setSetting({ key: "openai_api_key", value: apiKey.trim() });
    }
    await setSetting({ key: "openai_model", value: model });
    const savedKeyStatus = await openAiKeyStatus();
    setKeyStatus(savedKeyStatus);
    setStatus("Saved.");
  }

  async function onClearKey() {
    setStatus(null);
    await setSetting({ key: "openai_api_key", value: "" });
    setApiKey("");
    const savedKeyStatus = await openAiKeyStatus();
    setKeyStatus(savedKeyStatus);
    setStatus("Cleared saved key.");
  }

  async function loadModels() {
    setModelsStatus(null);
    try {
      const list = await openAiListModels();
      setModels(list);
      if (list.length && !list.includes(model)) {
        setCustomModel(model);
      }
      setModelsStatus(list.length ? `Loaded ${list.length} models.` : "No recent models returned.");
    } catch (e: any) {
      setModelsStatus(String(e?.message ?? e));
    }
  }

  return (
    <div className="page">
      <h2>Settings</h2>

      <div className="form">
        <label className="label">
          OpenAI API Key
          <input
            className="input"
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.currentTarget.value)}
            placeholder="sk-..."
          />
          {keyStatus?.has_env_key ? (
            <span className="muted">An OpenAI key is also available from the environment.</span>
          ) : (
            <span className="muted">You can also set OPENAI_API_KEY in the environment.</span>
          )}
        </label>

        <label className="label">
          Model
          <div className="row" style={{ alignItems: "stretch" }}>
            <select
              className="select"
              value={hasCustomModel ? "__custom__" : model}
              onChange={(e) => {
                const value = e.currentTarget.value;
                if (value === "__custom__") {
                  setModel(customModel || model);
                } else {
                  setModel(value);
                }
              }}
            >
              <option value="__custom__">Custom model…</option>
              {models.map((modelId) => (
                <option key={modelId} value={modelId}>
                  {modelId}
                </option>
              ))}
            </select>
            <button className="buttonSecondary" type="button" onClick={loadModels}>
              Refresh
            </button>
          </div>
          {hasCustomModel ? (
            <input
              className="input"
              value={customModel}
              onChange={(e) => {
                setCustomModel(e.currentTarget.value);
                setModel(e.currentTarget.value);
              }}
              placeholder="gpt-4.1-mini"
            />
          ) : null}
          {modelsStatus ? <span className="muted">{modelsStatus}</span> : null}
        </label>

        <div className="row">
          <button className="button" onClick={onSave}>
            Save
          </button>
          <button className="buttonSecondary" onClick={onClearKey} type="button">
            Clear saved key
          </button>
          {status ? <div className="muted">{status}</div> : null}
        </div>
      </div>

    </div>
  );
}
