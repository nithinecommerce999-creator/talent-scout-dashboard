import { useState } from "react";
import { Search, ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useNoPocCompanies } from "@/hooks/useDashboardData";
import { PageTransition } from "@/components/PageTransition";
import { Breadcrumbs } from "@/components/Breadcrumbs";

const PAGE_SIZE = 25;

export default function NoPocCompanies() {
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const { data, isLoading } = useNoPocCompanies(page, PAGE_SIZE, search);
  const totalPages = Math.ceil((data?.total ?? 0) / PAGE_SIZE);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(0);
  };

  return (
    <PageTransition>
      <div className="space-y-6">
        <Breadcrumbs items={[{ label: "Dashboard", to: "/" }, { label: "No POC Companies" }]} />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">No POC Companies</h1>
          <p className="text-sm text-muted-foreground">Companies where no point-of-contact was found</p>
        </div>

        <Card className="glass">
          <CardHeader className="flex-row items-center justify-between gap-4">
            <CardTitle className="text-lg shrink-0">Companies</CardTitle>
            <form onSubmit={handleSearch} className="flex items-center gap-2 max-w-sm w-full">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Search company name..." value={searchInput} onChange={(e) => setSearchInput(e.target.value)} className="pl-9" />
              </div>
              <Button type="submit" size="sm">Search</Button>
            </form>
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
                        <TableHead>Company</TableHead>
                        <TableHead>Website</TableHead>
                        <TableHead>Industry</TableHead>
                        <TableHead>Job Titles Searched</TableHead>
                        <TableHead>Run Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data?.data.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell className="font-medium">{c.company_name || "—"}</TableCell>
                          <TableCell>
                            {c.company_website ? (
                              <a href={c.company_website.startsWith("http") ? c.company_website : `https://${c.company_website}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-xs flex items-center gap-1">
                                {c.company_website} <ExternalLink className="h-3 w-3" />
                              </a>
                            ) : "—"}
                          </TableCell>
                          <TableCell>{c.company_industry || "—"}</TableCell>
                          <TableCell className="max-w-[200px] truncate text-xs">{c.job_titles_searched || "—"}</TableCell>
                          <TableCell>{c.run_date || "—"}</TableCell>
                        </TableRow>
                      ))}
                      {data?.data.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No data found</TableCell>
                        </TableRow>
                      )}
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
