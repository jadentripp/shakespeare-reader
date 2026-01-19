import { useState, useEffect, useCallback } from "react";
import { openAiListModels, getSetting, setSetting } from "@/lib/tauri";
import { DEFAULT_MODEL } from "../constants";

export interface UseModelsResult {
  currentModel: string;
  availableModels: string[];
  modelsLoading: boolean;
  handleModelChange: (model: string) => Promise<void>;
}

export function useModels(): UseModelsResult {
  const [currentModel, setCurrentModel] = useState(DEFAULT_MODEL);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [modelsLoading, setModelsLoading] = useState(true);

  useEffect(() => {
    const loadModels = async () => {
      setModelsLoading(true);
      try {
        const [allModels, savedModel] = await Promise.all([
          openAiListModels().catch(() => [] as string[]),
          getSetting("openai_model").catch(() => null),
        ]);
        const chatModels = allModels.filter((model) => {
          const m = model.toLowerCase();
          if (m.includes("audio") || m.includes("transcribe") || m.includes("realtime") || m.includes("tts") || m.includes("whisper") || m.includes("embedding") || m.includes("moderation") || m.includes("dall-e") || m.includes("image")) {
            return false;
          }
          if (m.includes("gpt-") || m.includes("o1") || m.includes("o3") || m.includes("o4")) {
            return true;
          }
          return false;
        });
        const sortedModels = chatModels.sort((a, b) => {
          const aLower = a.toLowerCase();
          const bLower = b.toLowerCase();
          const aIsLatest = aLower.includes("latest");
          const bIsLatest = bLower.includes("latest");
          if (aIsLatest && !bIsLatest) return -1;
          if (!aIsLatest && bIsLatest) return 1;
          const extractVersion = (s: string) => {
            const match = s.match(/(\d+)\.(\d+)/);
            return match ? parseFloat(`${match[1]}.${match[2]}`) : 0;
          };
          return extractVersion(bLower) - extractVersion(aLower);
        });
        setAvailableModels(sortedModels);
        if (savedModel && sortedModels.includes(savedModel)) {
          setCurrentModel(savedModel);
        } else if (sortedModels.length > 0 && !sortedModels.includes(currentModel)) {
          setCurrentModel(sortedModels[0]);
        }
      } catch (error) {
        console.error("Failed to load models:", error);
      } finally {
        setModelsLoading(false);
      }
    };
    loadModels();
  }, []);

  const handleModelChange = useCallback(async (model: string) => {
    setCurrentModel(model);
    try {
      await setSetting({ key: "openai_model", value: model });
    } catch (error) {
      console.error("Failed to save model setting:", error);
    }
  }, []);

  return {
    currentModel,
    availableModels,
    modelsLoading,
    handleModelChange,
  };
}
