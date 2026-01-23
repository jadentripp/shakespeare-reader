type ReaderContextPanelProps = {
  label: string
  text: string
}

export default function ReaderContextPanel({ label, text }: ReaderContextPanelProps) {
  return (
    <div className="space-y-3">
      <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
      <div className="max-h-28 overflow-y-auto rounded-none border-2 border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 p-3 text-xs font-medium leading-relaxed italic">
        {text || 'NO READABLE CONTEXT FOUND ON THIS PAGE.'}
      </div>
    </div>
  )
}
