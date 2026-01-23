import { useState } from "react";

export function useChatSidebar() {
  const [modelSelectorOpen, setModelSelectorOpen] = useState(false);
  const [showAllModels, setShowAllModels] = useState(false);

  return {
    modelSelectorOpen,
    setModelSelectorOpen,
    showAllModels,
    setShowAllModels,
  };
}
