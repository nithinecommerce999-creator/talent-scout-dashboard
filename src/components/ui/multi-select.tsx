import * as React from "react";
import { Check, ChevronDown, X, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export interface MultiSelectOption {
  value: string;
  label: string;
  group?: string;
  linkedinId?: string;
}

interface MultiSelectProps {
  options: MultiSelectOption[];
  selected: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  searchable?: boolean;
  className?: string;
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = "Select...",
  searchable = true,
  className,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = options.filter((o) =>
    o.label.toLowerCase().includes(search.toLowerCase()) ||
    (o.group && o.group.toLowerCase().includes(search.toLowerCase()))
  );

  const toggle = (val: string) => {
    onChange(selected.includes(val) ? selected.filter((v) => v !== val) : [...selected, val]);
  };

  const removeTag = (val: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selected.filter((v) => v !== val));
  };

  const grouped = filtered.reduce<Record<string, MultiSelectOption[]>>((acc, o) => {
    const g = o.group || "Other";
    (acc[g] = acc[g] || []).push(o);
    return acc;
  }, {});

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          "flex min-h-[2.75rem] w-full items-center justify-between rounded-lg border border-input bg-background px-3 py-2 text-sm transition-colors",
          "hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-ring/30",
          open && "border-primary ring-2 ring-ring/30"
        )}
      >
        <div className="flex flex-wrap gap-1.5 flex-1 mr-2">
          {selected.length === 0 && (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          {selected.slice(0, 3).map((val) => {
            const opt = options.find((o) => o.value === val);
            return (
              <Badge key={val} variant="secondary" className="gap-1 text-xs font-normal px-2 py-0.5">
                {opt?.label || val}
                <X className="h-3 w-3 cursor-pointer opacity-60 hover:opacity-100" onClick={(e) => removeTag(val, e)} />
              </Badge>
            );
          })}
          {selected.length > 3 && (
            <Badge variant="secondary" className="text-xs font-normal px-2 py-0.5">
              +{selected.length - 3} more
            </Badge>
          )}
        </div>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-popover shadow-xl animate-in fade-in-0 zoom-in-95 duration-150">
          {searchable && (
            <div className="flex items-center border-b border-border px-3 py-2">
              <Search className="h-4 w-4 text-muted-foreground mr-2 shrink-0" />
              <input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
          )}
          <div className="max-h-[240px] overflow-auto p-1">
            {Object.keys(grouped).length === 0 && (
              <p className="py-4 text-center text-sm text-muted-foreground">No results</p>
            )}
            {Object.entries(grouped).map(([group, items]) => (
              <div key={group}>
                {options.some((o) => o.group) && (
                  <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {group}
                  </p>
                )}
                {items.map((option) => {
                  const isSelected = selected.includes(option.value);
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => toggle(option.value)}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                        isSelected ? "bg-primary/10 text-foreground" : "hover:bg-accent text-foreground"
                      )}
                    >
                      <div className={cn(
                        "flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
                        isSelected ? "bg-primary border-primary" : "border-muted-foreground/40"
                      )}>
                        {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                      </div>
                      <span>{option.label}</span>
                      {option.group && (
                        <span className="ml-auto text-[10px] text-muted-foreground">{option.group}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
