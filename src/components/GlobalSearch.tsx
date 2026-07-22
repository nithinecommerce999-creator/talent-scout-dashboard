import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Building2, Users, Play, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{
    companies: { company_uid: number; company_name: string | null }[];
    pocs: { ranked_poc_id: number; full_name: string | null; company_name: string | null }[];
    runs: { run_id: string; run_label: string | null }[];
  }>({ companies: [], pocs: [], runs: [] });
  const navigate = useNavigate();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  useEffect(() => {
    if (!query || query.length < 2) {
      setResults({ companies: [], pocs: [], runs: [] });
      return;
    }
    const timeout = setTimeout(async () => {
      const [c, p, r] = await Promise.all([
        supabase.from("companies").select("company_uid, company_name").ilike("company_name", `%${query}%`).limit(5),
        supabase.from("ranked_pocs").select("ranked_poc_id, full_name, company_name").ilike("full_name", `%${query}%`).limit(5),
        supabase.from("runs").select("run_id, run_label").ilike("run_label", `%${query}%`).limit(5),
      ]);
      setResults({
        companies: c.data ?? [],
        pocs: p.data ?? [],
        runs: r.data ?? [],
      });
    }, 300);
    return () => clearTimeout(timeout);
  }, [query]);

  const go = (path: string) => {
    navigate(path);
    setOpen(false);
    setQuery("");
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-xl border border-border/50 bg-muted/50 px-3 py-2 text-sm text-muted-foreground hover:bg-muted transition-colors w-full"
      >
        <Search className="h-4 w-4" />
        <span className="flex-1 text-left">Search…</span>
        <kbd className="hidden sm:inline-flex h-5 items-center gap-0.5 rounded border border-border bg-background px-1.5 font-mono text-[10px] text-muted-foreground">
          ⌘K
        </kbd>
      </button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Search companies, POCs, runs..." value={query} onValueChange={setQuery} />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          {results.companies.length > 0 && (
            <CommandGroup heading="Companies">
              {results.companies.map((c) => (
                <CommandItem key={c.company_uid} onSelect={() => go(`/companies/${c.company_uid}`)}>
                  <Building2 className="mr-2 h-4 w-4 text-muted-foreground" />
                  {c.company_name || "Unknown"}
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {results.pocs.length > 0 && (
            <CommandGroup heading="POC Leads">
              {results.pocs.map((p) => (
                <CommandItem key={p.ranked_poc_id} onSelect={() => go("/poc-leads")}>
                  <Users className="mr-2 h-4 w-4 text-muted-foreground" />
                  {p.full_name || "Unknown"} — {p.company_name || ""}
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {results.runs.length > 0 && (
            <CommandGroup heading="Runs">
              {results.runs.map((r) => (
                <CommandItem key={r.run_id} onSelect={() => go(`/runs/${r.run_id}`)}>
                  <Play className="mr-2 h-4 w-4 text-muted-foreground" />
                  {r.run_label || r.run_id.slice(0, 20)}
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
