import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, ChevronLeft, ChevronRight, Linkedin, Download } from "lucide-react";
import { exportToCsv } from "@/lib/exportCsv";
import { PageTransition } from "@/components/PageTransition";

const PAGE_SIZE = 25;

export default function PocLeads() {
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [matchFilter, setMatchFilter] = useState("");
  const [seniorityFilter, setSeniorityFilter] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["poc-leads-page", page, search, matchFilter, seniorityFilter],
    queryFn: async () => {
      let query = supabase.from("ranked_pocs").select("*", { count: "exact" });
      if (search) {
        query = query.or(`full_name.ilike.%${search}%,company_name.ilike.%${search}%`);
      }
      if (matchFilter) {
        query = query.eq("match_type", matchFilter);
      }
      if (seniorityFilter) {
        // Filter by checking if job_title contains seniority keyword
        query = query.ilike("job_title", `%${seniorityFilter}%`);
      }
      const { data, error, count } = await query
        .order("lead_rank", { ascending: true })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
      if (error) throw error;
      return { data: data ?? [], total: count ?? 0 };
    },
  });

  const totalPages = Math.ceil((data?.total ?? 0) / PAGE_SIZE);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(0);
  };

  const handleExport = () => {
    if (!data?.data) return;
    exportToCsv("poc_leads.csv", data.data as Record<string, unknown>[], [
      { key: "lead_rank", label: "Rank" },
      { key: "full_name", label: "Name" },
      { key: "job_title", label: "Title" },
      { key: "company_name", label: "Company" },
      { key: "selected_email", label: "Email" },
      { key: "match_type", label: "Match Type" },
      { key: "partner_confidence_score", label: "Confidence" },
      { key: "linkedin", label: "LinkedIn" },
    ]);
  };

  return (
    <PageTransition>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">POC Leads</h1>
          <p className="text-sm text-muted-foreground">Ranked point-of-contact leads across companies</p>
        </div>

        <Card className="glass border-border/30">
          <CardHeader className="flex-row items-center justify-between gap-4 flex-wrap">
            <CardTitle className="text-lg shrink-0">Ranked POCs</CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <Select value={matchFilter} onValueChange={(v) => { setMatchFilter(v === "all" ? "" : v); setPage(0); }}>
                <SelectTrigger className="w-[150px] h-9">
                  <SelectValue placeholder="Match type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Match Types</SelectItem>
                  <SelectItem value="direct">Direct</SelectItem>
                  <SelectItem value="hr_fallback">HR Fallback</SelectItem>
                  <SelectItem value="inferred">Inferred</SelectItem>
                </SelectContent>
              </Select>
              <form onSubmit={handleSearch} className="flex items-center gap-2 max-w-sm">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input placeholder="Search name or company..." value={searchInput} onChange={(e) => setSearchInput(e.target.value)} className="pl-9" />
                </div>
                <Button type="submit" size="sm">Search</Button>
              </form>
              <Button variant="outline" size="sm" onClick={handleExport} className="gap-1">
                <Download className="h-3.5 w-3.5" /> CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[400px] w-full rounded-xl" />
            ) : (
              <>
                <div className="overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Rank</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Company</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Match</TableHead>
                        <TableHead>Confidence</TableHead>
                        <TableHead>LinkedIn</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data?.data.map((poc) => (
                        <TableRow key={poc.ranked_poc_id} className="hover:bg-accent/50 transition-colors">
                          <TableCell><Badge variant="outline">{poc.lead_rank ?? "—"}</Badge></TableCell>
                          <TableCell className="font-medium">{poc.full_name || "—"}</TableCell>
                          <TableCell className="max-w-[150px] truncate">{poc.job_title || "—"}</TableCell>
                          <TableCell>{poc.company_name || "—"}</TableCell>
                          <TableCell className="text-xs">{poc.selected_email || poc.email || "—"}</TableCell>
                          <TableCell>
                            {poc.match_type && <Badge variant="secondary" className="text-xs">{poc.match_type}</Badge>}
                          </TableCell>
                          <TableCell>
                            {poc.partner_confidence_score != null ? `${Number(poc.partner_confidence_score).toFixed(0)}%` : "—"}
                          </TableCell>
                          <TableCell>
                            {poc.linkedin ? (
                              <a href={poc.linkedin} target="_blank" rel="noopener noreferrer" className="text-primary"><Linkedin className="h-3.5 w-3.5" /></a>
                            ) : "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, data?.total ?? 0)} of {data?.total?.toLocaleString()}
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages - 1}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  );
}
