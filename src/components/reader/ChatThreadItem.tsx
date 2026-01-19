import { useState } from "react";
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
          className="h-7 text-xs px-1.5 py-0 min-w-0"
        />
      </form>
    );
  }

  return (
    <div className="flex-1 flex items-center gap-1 group/title min-w-0">
      <span className="truncate">{title}</span>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsEditing(true);
        }}
        className="opacity-0 group-hover/title:opacity-100 p-0.5 hover:text-primary transition-all"
        title="Rename thread"
      >
        <Edit2 className="h-2.5 w-2.5" />
      </button>
    </div>
  );
}
