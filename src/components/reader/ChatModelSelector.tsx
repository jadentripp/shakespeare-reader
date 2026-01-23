import { Check, ChevronDown, Settings2 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

const RECOMMENDED_MODEL = 'gpt-5.2'

function formatModelName(modelId: string): string {
  return modelId
    .replace(/^gpt-/, 'GPT-')
    .replace(/-(\d{4})-(\d{2})-(\d{2})$/, ' ($1)')
    .replace(/-preview$/, ' Preview')
    .replace(/-mini$/, ' Mini')
    .replace(/-turbo$/, ' Turbo')
}

type ModelSelectorProps = {
  currentModel: string
  availableModels: string[]
  onModelChange: (model: string) => void
  modelsLoading?: boolean
  disabled?: boolean
}

export function ChatModelSelector({
  currentModel,
  availableModels,
  onModelChange,
  modelsLoading,
  disabled,
}: ModelSelectorProps) {
  const [open, setOpen] = useState(false)
  const [showMore, setShowMore] = useState(false)

  const hasRecommended = availableModels.includes(RECOMMENDED_MODEL)
  const otherModels = availableModels.filter((m) => m !== RECOMMENDED_MODEL)

  const handleSelect = (model: string) => {
    onModelChange(model)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          disabled={modelsLoading || disabled}
          className="h-7 gap-1.5 rounded-none border-2 border-black/20 dark:border-white/20 bg-background px-3 text-[10px] font-bold uppercase tracking-widest transition-[color,background-color,border-color] hover:border-black dark:hover:border-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black"
        >
          <div className="h-2 w-2 rounded-none bg-emerald-500" />
          {modelsLoading ? '…' : formatModelName(currentModel)}
          <ChevronDown className="h-3 w-3 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-56 rounded-none border-2 border-black dark:border-white bg-background p-2 shadow-xl"
      >
        {availableModels.length === 0 && !modelsLoading ? (
          <div className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            No models available
          </div>
        ) : (
          <>
            {hasRecommended && (
              <>
                <div className="mb-1 px-2 text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                  Recommended
                </div>
                <Button
                  variant="ghost"
                  onClick={() => handleSelect(RECOMMENDED_MODEL)}
                  className={cn(
                    'flex w-full items-center h-auto justify-between rounded-none px-2 py-1.5 text-[10px] font-bold uppercase tracking-widest transition-colors hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black',
                    currentModel === RECOMMENDED_MODEL &&
                      'bg-black text-white dark:bg-white dark:text-black',
                  )}
                >
                  <span>{formatModelName(RECOMMENDED_MODEL)}</span>
                  {currentModel === RECOMMENDED_MODEL && <Check className="h-3 w-3" />}
                </Button>
              </>
            )}

            {otherModels.length > 0 && (
              <>
                <Button
                  variant="ghost"
                  onClick={() => setShowMore((v) => !v)}
                  className="mt-2 flex w-full items-center h-auto gap-1.5 rounded-none px-2 py-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground border border-transparent hover:border-black dark:hover:border-white hover:text-foreground hover:bg-transparent"
                >
                  <Settings2 className="h-3 w-3" />
                  {showMore ? 'Hide' : `Show all models (${otherModels.length})`}
                </Button>

                {showMore && (
                  <div className="mt-2 max-h-48 overflow-y-auto space-y-1">
                    {otherModels.map((model) => (
                      <Button
                        key={model}
                        variant="ghost"
                        onClick={() => handleSelect(model)}
                        className={cn(
                          'flex w-full items-center h-auto justify-between rounded-none px-2 py-1.5 text-[10px] font-bold uppercase tracking-widest transition-colors hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black',
                          currentModel === model &&
                            'bg-black text-white dark:bg-white dark:text-black',
                        )}
                      >
                        <span>{formatModelName(model)}</span>
                        {currentModel === model && <Check className="h-3 w-3" />}
                      </Button>
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </PopoverContent>
    </Popover>
  )
}
