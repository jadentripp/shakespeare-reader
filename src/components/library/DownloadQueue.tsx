import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { type DownloadTask } from "../../hooks/useLibrary";

interface DownloadQueueProps {
  queue: DownloadTask[];
  setQueue: React.Dispatch<React.SetStateAction<DownloadTask[]>>;
}

export function DownloadQueue({ queue, setQueue }: DownloadQueueProps) {
  if (queue.length === 0) return null;

  return (
    <section className="rounded-2xl border border-border/40 bg-card/50 p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-serif text-lg font-medium text-foreground">Download Queue</h3>
        <span className="text-sm text-muted-foreground">{queue.length} items</span>
      </div>
      <ScrollArea className="h-48">
        <div className="space-y-2 pr-4">
          {queue.slice().reverse().map((t) => (
            <div
              key={t.gutenbergId}
              className="flex items-center justify-between gap-3 rounded-lg border border-border/40 bg-background p-3"
            >
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium text-foreground">{t.title}</div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>#{t.gutenbergId}</span>
                  <Badge
                    variant={
                      t.status === "failed"
                        ? "destructive"
                        : t.status === "done"
                          ? "secondary"
                          : t.status === "downloading"
                            ? "default"
                            : "outline"
                    }
                    className="text-xs"
                  >
                    {t.status}
                  </Badge>
                </div>
                {t.error && <div className="mt-1 text-xs text-destructive">{t.error}</div>}
              </div>
              <div className="flex gap-1">
                {t.status === "failed" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setQueue((prev) =>
                        prev.map((x) =>
                          x.gutenbergId === t.gutenbergId ? { ...x, status: "queued", error: null } : x,
                        ),
                      )
                    }
                  >
                    Retry
                  </Button>
                )}
                {(t.status === "queued" || t.status === "failed" || t.status === "done") && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setQueue((prev) => prev.filter((x) => x.gutenbergId !== t.gutenbergId))}
                  >
                    Remove
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </section>
  );
}
