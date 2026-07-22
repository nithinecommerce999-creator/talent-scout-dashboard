import * as React from "react";
import { X, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  className?: string;
}

export function TagInput({ tags, onChange, placeholder = "Type and press Enter...", className }: TagInputProps) {
  const [input, setInput] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  const addTag = () => {
    const val = input.trim();
    if (val && !tags.includes(val)) {
      onChange([...tags, val]);
    }
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTag();
    }
    if (e.key === "Backspace" && !input && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  };

  return (
    <div
      className={cn(
        "flex min-h-[2.75rem] w-full flex-wrap items-center gap-1.5 rounded-lg border border-input bg-background px-3 py-2 text-sm transition-colors focus-within:border-primary focus-within:ring-2 focus-within:ring-ring/30",
        className
      )}
      onClick={() => inputRef.current?.focus()}
    >
      {tags.map((tag) => (
        <Badge key={tag} variant="secondary" className="gap-1 text-xs font-normal px-2 py-0.5">
          {tag}
          <X className="h-3 w-3 cursor-pointer opacity-60 hover:opacity-100" onClick={() => onChange(tags.filter((t) => t !== tag))} />
        </Badge>
      ))}
      <div className="flex flex-1 items-center gap-1">
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={tags.length === 0 ? placeholder : ""}
          className="flex-1 min-w-[100px] bg-transparent outline-none placeholder:text-muted-foreground"
        />
        {input.trim() && (
          <button type="button" onClick={addTag} className="shrink-0 rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
            Add
          </button>
        )}
      </div>
    </div>
  );
}
