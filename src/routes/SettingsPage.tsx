import { useEffect, useState } from "react";
import { getSetting, openAiChat, setSetting } from "../lib/tauri";

export default function SettingsPage() {
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("gpt-4.1-mini");
  const [status, setStatus] = useState<string | null>(null);

  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);

  useEffect(() => {
    (async () => {
      const savedKey = await getSetting("openai_api_key");
      const savedModel = await getSetting("openai_model");
      if (savedKey) setApiKey(savedKey);
      if (savedModel) setModel(savedModel);
    })();
  }, []);

  async function onSave() {
    setStatus(null);
    await setSetting({ key: "openai_api_key", value: apiKey });
    await setSetting({ key: "openai_model", value: model });
    setStatus("Saved.");
  }

  async function onAsk() {
    const q = question.trim();
    if (!q) return;
    setAsking(true);
    setAnswer(null);
    try {
      const res = await openAiChat([
        {
          role: "system",
          content: "You are a helpful assistant for a Shakespeare reading app.",
        },
        { role: "user", content: q },
      ]);
      setAnswer(res);
    } catch (e: any) {
      setAnswer(String(e?.message ?? e));
    } finally {
      setAsking(false);
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
        </label>

        <label className="label">
          Model
          <input
            className="input"
            value={model}
            onChange={(e) => setModel(e.currentTarget.value)}
            placeholder="gpt-4.1-mini"
          />
        </label>

        <div className="row">
          <button className="button" onClick={onSave}>
            Save
          </button>
          {status ? <div className="muted">{status}</div> : null}
        </div>
      </div>

      <div style={{ height: 16 }} />

      <h3>Ask OpenAI</h3>
      <div className="form">
        <textarea
          className="textarea"
          value={question}
          onChange={(e) => setQuestion(e.currentTarget.value)}
          placeholder='Ask something like: "Why are you removing that?"'
          style={{ minHeight: 90 }}
        />
        <div className="row">
          <button className="button" onClick={onAsk} disabled={asking}>
            {asking ? "Asking…" : "Ask"}
          </button>
        </div>
        {answer ? <div className="pre">{answer}</div> : null}
      </div>
    </div>
  );
}
