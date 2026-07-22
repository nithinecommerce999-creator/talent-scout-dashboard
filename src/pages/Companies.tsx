import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Eye, ChevronLeft, ChevronRight, Download, ArrowUpDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCompanies, useIndustryCategories } from "@/hooks/useDashboardData";
import { exportToCsv } from "@/lib/exportCsv";
import { PageTransition } from "@/components/PageTransition";

const PAGE_SIZE = 25;

export default function Companies() {
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [industryFilter, setIndustryFilter] = useState("");

  const { data, isLoading } = useCompanies(page, PAGE_SIZE, search, industryFilter);
  const { data: categories } = useIndustryCategories();
  const totalPages = Math.ceil((data?.total ?? 0) / PAGE_SIZE);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(0);
  };

  const handleExport = () => {
    if (!data?.data) return;
    exportToCsv("companies.csv", data.data, [
      { key: "company_name", label: "Company" },
      { key: "company_industry", label: "Industry" },
      { key: "industry_category", label: "Category" },
      { key: "company_locality", label: "Location" },
      { key: "company_size", label: "Size" },
      { key: "company_website", label: "Website" },
    ]);
  };

  return (
    <PageTransition>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Companies</h1>
          <p className="text-sm text-muted-foreground">Browse and manage scraped companies</p>
        </div>

        <Card className="glass border-border/30">
          <CardHeader className="flex-row items-center justify-between gap-4 flex-wrap">
            <CardTitle className="text-lg shrink-0">All Companies</CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <Select value={industryFilter} onValueChange={(v) => { setIndustryFilter(v === "all" ? "" : v); setPage(0); }}>
                <SelectTrigger className="w-[180px] h-9">
                  <SelectValue placeholder="Filter by industry" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Industries</SelectItem>
                  {categories?.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <form onSubmit={handleSearch} className="flex items-center gap-2 max-w-sm">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input placeholder="Search company..." value={searchInput} onChange={(e) => setSearchInput(e.target.value)} className="pl-9" />
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
                        <TableHead>Company</TableHead>
                        <TableHead>Industry</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Size</TableHead>
                        <TableHead>Website</TableHead>
                        <TableHead className="w-[80px]">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data?.data.map((company) => (
                        <TableRow key={company.company_uid} className="hover:bg-accent/50 transition-colors">
                          <TableCell className="font-medium">{company.company_name || "—"}</TableCell>
                          <TableCell className="max-w-[150px] truncate">{company.company_industry || "—"}</TableCell>
                          <TableCell>
                            {company.industry_category ? (
                              <Badge variant="secondary" className="text-xs">{company.industry_category}</Badge>
                            ) : "—"}
                          </TableCell>
                          <TableCell>{company.company_locality || "—"}</TableCell>
                          <TableCell>{company.company_size || "—"}</TableCell>
                          <TableCell>
                            {company.company_website ? (
                              <a href={company.company_website.startsWith("http") ? company.company_website : `https://${company.company_website}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-xs truncate max-w-[120px] block">
                                {company.company_website}
                              </a>
                            ) : "—"}
                          </TableCell>
                          <TableCell>
                            <Button size="sm" variant="ghost" onClick={() => navigate(`/companies/${company.company_uid}`)} className="gap-1">
                              <Eye className="h-3.5 w-3.5" /> View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {data?.data.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No companies found</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, data?.total ?? 0)} of {data?.total?.toLocaleString()} companies
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
