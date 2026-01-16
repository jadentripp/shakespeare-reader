type ReaderContextPanelProps = {
  label: string;
  text: string;
};

export default function ReaderContextPanel({ label, text }: ReaderContextPanelProps) {
  return (
    <div className="space-y-2">
      <div className="text-sm font-semibold">{label}</div>
      <div className="max-h-28 overflow-y-auto rounded-lg border bg-muted/40 p-3 text-sm">
        {text || "No readable context found on this page yet."}
      </div>
    </div>
  );
}
