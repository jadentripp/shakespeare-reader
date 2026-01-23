import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Edit2 } from "lucide-react";

type ChatThreadItemProps = {
  title: string;
  onRename: (newTitle: string) => void;
};

export function ChatThreadItem({
  title,
  onRename,
}: ChatThreadItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(title);

  const [prevTitle, setPrevTitle] = useState(title);
  if (title !== prevTitle) {
    setPrevTitle(title);
    setValue(title);
  }

  if (isEditing) {
    return (
      <form
        className="flex-1 flex items-center gap-1"
        onSubmit={(e) => {
          e.preventDefault();
          if (value.trim() && value !== title) {
            onRename(value.trim());
          }
          setIsEditing(false);
        }}
      >
        <Input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={() => {
            if (value.trim() && value !== title) {
              onRename(value.trim());
            }
            setIsEditing(false);
          }}
          className="h-7 text-[10px] font-bold px-1.5 py-0 min-w-0 rounded-none border-2 border-[#E02E2E]"
        />
      </form>
    );
  }

  return (
    <div className="flex-1 flex items-center gap-1 group/title min-w-0">
      <span className="truncate">{title}</span>
      <Button
        variant="ghost"
        size="icon"
        onClick={(e: React.MouseEvent) => {
          e.stopPropagation();
          setIsEditing(true);
        }}
        className="opacity-0 group-hover/title:opacity-100 h-5 w-5 p-0.5 hover:text-[#E02E2E] transition-[color,opacity,background-color] rounded-none"
        title="Rename thread"
        aria-label="Rename thread"
      >
        <Edit2 className="h-2.5 w-2.5" />
      </Button>
    </div>
  );
}
