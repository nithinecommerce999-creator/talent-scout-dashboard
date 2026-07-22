import { useState } from "react";
import { Search, ChevronLeft, ChevronRight, Linkedin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useUnidentifiedPocLeads } from "@/hooks/useDashboardData";
import { PageTransition } from "@/components/PageTransition";
import { Breadcrumbs } from "@/components/Breadcrumbs";

const PAGE_SIZE = 25;

export default function UnidentifiedPocLeads() {
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const { data, isLoading } = useUnidentifiedPocLeads(page, PAGE_SIZE, search);
  const totalPages = Math.ceil((data?.total ?? 0) / PAGE_SIZE);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(0);
  };

  return (
    <PageTransition>
      <div className="space-y-6">
        <Breadcrumbs items={[{ label: "Dashboard", to: "/" }, { label: "Unidentified Leads" }]} />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Unidentified POC Leads</h1>
          <p className="text-sm text-muted-foreground">Leads that couldn't be matched to a specific company</p>
        </div>

        <Card className="glass">
          <CardHeader className="flex-row items-center justify-between gap-4">
            <CardTitle className="text-lg shrink-0">Leads</CardTitle>
            <form onSubmit={handleSearch} className="flex items-center gap-2 max-w-sm w-full">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Search name..." value={searchInput} onChange={(e) => setSearchInput(e.target.value)} className="pl-9" />
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
                        <TableHead>Name</TableHead>
                        <TableHead>Job Title</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Industry</TableHead>
                        <TableHead>Searched Domain</TableHead>
                        <TableHead>Inferred Domain</TableHead>
                        <TableHead>City</TableHead>
                        <TableHead>Country</TableHead>
                        <TableHead>LinkedIn</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data?.data.map((poc) => (
                        <TableRow key={poc.id}>
                          <TableCell className="font-medium">{poc.full_name || "—"}</TableCell>
                          <TableCell className="max-w-[150px] truncate">{poc.job_title || "—"}</TableCell>
                          <TableCell className="text-xs">{poc.email || "—"}</TableCell>
                          <TableCell>{poc.industry || "—"}</TableCell>
                          <TableCell className="text-xs">{poc.searched_domain || "—"}</TableCell>
                          <TableCell className="text-xs">{poc.inferred_domain || "—"}</TableCell>
                          <TableCell>{poc.city || "—"}</TableCell>
                          <TableCell>{poc.country || "—"}</TableCell>
                          <TableCell>
                            {poc.linkedin ? (
                              <a href={poc.linkedin} target="_blank" rel="noopener noreferrer" className="text-primary">
                                <Linkedin className="h-3.5 w-3.5" />
                              </a>
                            ) : "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                      {data?.data.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No data found</TableCell>
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
