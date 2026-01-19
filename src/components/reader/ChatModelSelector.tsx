import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { ChevronDown, Check, Settings2 } from "lucide-react";

const RECOMMENDED_MODEL = "gpt-5.2";

function formatModelName(modelId: string): string {
  return modelId
    .replace(/^gpt-/, "GPT-")
    .replace(/-(\d{4})-(\d{2})-(\d{2})$/, " ($1)")
    .replace(/-preview$/, " Preview")
    .replace(/-mini$/, " Mini")
    .replace(/-turbo$/, " Turbo");
}

type ModelSelectorProps = {
  currentModel: string;
  availableModels: string[];
  onModelChange: (model: string) => void;
  modelsLoading?: boolean;
  disabled?: boolean;
};

export function ChatModelSelector({
  currentModel,
  availableModels,
  onModelChange,
  modelsLoading,
  disabled,
}: ModelSelectorProps) {
  const [open, setOpen] = useState(false);
  const [showMore, setShowMore] = useState(false);

  const hasRecommended = availableModels.includes(RECOMMENDED_MODEL);
  const otherModels = availableModels.filter((m) => m !== RECOMMENDED_MODEL);

  const handleSelect = (model: string) => {
    onModelChange(model);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          disabled={modelsLoading || disabled}
          className="h-7 gap-1.5 rounded-full border border-border/40 bg-background/80 px-3 text-[11px] font-medium backdrop-blur-sm transition-all hover:border-primary/30 hover:bg-primary/5"
        >
          <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          {modelsLoading ? "..." : formatModelName(currentModel)}
          <ChevronDown className="h-3 w-3 opacity-40" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56 rounded-xl border-border/50 bg-popover/95 p-2 shadow-xl backdrop-blur-md">
        {availableModels.length === 0 && !modelsLoading ? (
          <div className="px-2 py-1.5 text-xs text-muted-foreground">
            No models available
          </div>
        ) : (
          <>
            {hasRecommended && (
              <>
                <div className="mb-1 px-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  Recommended
                </div>
                <button
                  onClick={() => handleSelect(RECOMMENDED_MODEL)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-md px-2 py-1.5 text-xs hover:bg-muted",
                    currentModel === RECOMMENDED_MODEL && "bg-muted"
                  )}
                >
                  <span>{formatModelName(RECOMMENDED_MODEL)}</span>
                  {currentModel === RECOMMENDED_MODEL && <Check className="h-3 w-3" />}
                </button>
              </>
            )}

            {otherModels.length > 0 && (
              <>
                <button
                  onClick={() => setShowMore((v) => !v)}
                  className="mt-2 flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-[11px] text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <Settings2 className="h-3 w-3" />
                  {showMore ? "Hide" : `Show all models (${otherModels.length})`}
                </button>

                {showMore && (
                  <div className="mt-2 max-h-48 overflow-y-auto">
                    {otherModels.map((model) => (
                      <button
                        key={model}
                        onClick={() => handleSelect(model)}
                        className={cn(
                          "flex w-full items-center justify-between rounded-md px-2 py-1.5 text-xs hover:bg-muted",
                          currentModel === model && "bg-muted"
                        )}
                      >
                        <span>{formatModelName(model)}</span>
                        {currentModel === model && <Check className="h-3 w-3" />}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
