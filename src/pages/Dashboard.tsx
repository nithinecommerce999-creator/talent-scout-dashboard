import { Briefcase, Building2, Play, Users, ExternalLink, TrendingUp, CheckCircle, XCircle, Trophy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useRuns, useIndustryChart, useRunsOverTime, useRecentPocs, useTopClients } from "@/hooks/useDashboardData";
import { useCountUp } from "@/hooks/useCountUp";
import { useNavigate } from "react-router-dom";
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { PageTransition } from "@/components/PageTransition";
import { useQuery } from "@tanstack/react-query";
import { supabaseBackup } from "@/integrations/supabase/backup-client";

const CHART_COLORS = [
  "hsl(162, 72%, 46%)",
  "hsl(217, 91%, 60%)",
  "hsl(30, 80%, 55%)",
  "hsl(280, 65%, 60%)",
  "hsl(340, 75%, 55%)",
];

function StatCard({ label, value, icon: Icon, gradient, iconColor }: {
  label: string; value: number; icon: React.ElementType; gradient: string; iconColor: string;
}) {
  const animated = useCountUp(value);
  return (
    <Card className="glass overflow-hidden border-border/30 hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5">
      <CardContent className="p-0">
        <div className={`flex items-center gap-4 p-5 bg-gradient-to-br ${gradient}`}>
          <div className={`rounded-xl bg-background/80 p-3 ${iconColor} shadow-sm`}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
            <p className="text-2xl font-extrabold tracking-tight">{animated.toLocaleString()}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: string | null }) {
  const s = (status || "unknown").toLowerCase();
  const variant = s === "succeeded" || s === "completed" ? "default" : s === "running" ? "secondary" : "destructive";
  return <Badge variant={variant} className="capitalize">{s}</Badge>;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const [jobsRes, companiesRes, runsRes, pocRes, noPocRes] = await Promise.all([
        supabaseBackup.from("job_details").select("job_id", { count: "exact", head: true }),
        supabaseBackup.from("companies").select("company_uid", { count: "exact", head: true }),
        supabaseBackup.from("runs").select("run_id", { count: "exact", head: true }),
        supabaseBackup.from("poc_leads").select("poc_id", { count: "exact", head: true }),
        supabaseBackup.from("no_poc_companies").select("id", { count: "exact", head: true }),
      ]);

      const activeRes = await supabaseBackup.from("ranked_pocs").select("company_uid");
      const activeUids = new Set((activeRes.data ?? []).map((r) => r.company_uid));

      return {
        totalJobs: jobsRes.count ?? 0,
        totalCompanies: companiesRes.count ?? 0,
        activeCompanies: activeUids.size,
        inactiveCompanies: noPocRes.count ?? 0,
        totalRuns: runsRes.count ?? 0,
        totalPocLeads: pocRes.count ?? 0,
      };
    },
  });
  const { data: runs, isLoading: runsLoading } = useRuns();
  const { data: industryData, isLoading: chartLoading } = useIndustryChart();
  const { data: runsOverTime } = useRunsOverTime();
  const { data: recentPocs } = useRecentPocs();
  const { data: topClients } = useTopClients();

  const statCards = [
    { label: "Total Jobs", value: stats?.totalJobs ?? 0, icon: Briefcase, gradient: "from-blue-500/10 to-blue-600/5", iconColor: "text-blue-500" },
    { label: "Active Companies", value: stats?.activeCompanies ?? 0, icon: CheckCircle, gradient: "from-emerald-500/10 to-emerald-600/5", iconColor: "text-emerald-500" },
    { label: "Inactive Companies", value: stats?.inactiveCompanies ?? 0, icon: XCircle, gradient: "from-orange-500/10 to-orange-600/5", iconColor: "text-orange-500" },
    { label: "Total Runs", value: stats?.totalRuns ?? 0, icon: Play, gradient: "from-amber-500/10 to-amber-600/5", iconColor: "text-amber-500" },
    { label: "POC Leads", value: stats?.totalPocLeads ?? 0, icon: Users, gradient: "from-violet-500/10 to-violet-600/5", iconColor: "text-violet-500" },
    { label: "All Companies", value: stats?.totalCompanies ?? 0, icon: Building2, gradient: "from-cyan-500/10 to-cyan-600/5", iconColor: "text-cyan-500" },
  ];

  const tooltipStyle = {
    backgroundColor: "hsl(var(--card))",
    border: "1px solid hsl(var(--border))",
    borderRadius: "12px",
    color: "hsl(var(--foreground))",
    boxShadow: "0 10px 30px -10px rgba(0,0,0,0.3)",
  };

  return (
    <PageTransition>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">Overview of your scraping operations</p>
          </div>
          <Button onClick={() => navigate("/create-run")} className="gap-2 rounded-xl px-5 shadow-lg shadow-primary/20">
            <Play className="h-4 w-4" /> Start New Run
          </Button>
        </div>

        {/* Stats */}
        {statsLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-[88px] rounded-xl" />)}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {statCards.map((card) => (
              <StatCard key={card.label} {...card} />
            ))}
          </div>
        )}

        {/* Charts Row */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Industry Line Chart */}
          <Card className="glass border-border/30">
            <CardHeader className="flex-row items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <CardTitle className="text-base font-semibold">Companies by Industry</CardTitle>
            </CardHeader>
            <CardContent>
              {chartLoading ? (
                <Skeleton className="h-[300px] w-full rounded-xl" />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={industryData} margin={{ top: 5, right: 20, left: 0, bottom: 80 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
                    <XAxis
                      dataKey="name"
                      angle={-45}
                      textAnchor="end"
                      interval={0}
                      tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                      height={100}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Line type="monotone" dataKey="count" stroke="hsl(162, 72%, 46%)" strokeWidth={2.5} dot={{ fill: "hsl(162, 72%, 46%)", r: 4 }} activeDot={{ r: 6, fill: "hsl(162, 72%, 46%)" }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Runs Over Time */}
          <Card className="glass border-border/30">
            <CardHeader className="flex-row items-center gap-2">
              <Play className="h-5 w-5 text-primary" />
              <CardTitle className="text-base font-semibold">Runs Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              {!runsOverTime ? (
                <Skeleton className="h-[300px] w-full rounded-xl" />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={runsOverTime} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <defs>
                      <linearGradient id="runsGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Area type="monotone" dataKey="runs" stroke="hsl(217, 91%, 60%)" strokeWidth={2} fill="url(#runsGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Bottom Row: Top Clients + Recent POCs */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Top Clients */}
          <Card className="glass border-border/30">
            <CardHeader className="flex-row items-center gap-2">
              <Trophy className="h-5 w-5 text-warning" />
              <CardTitle className="text-base font-semibold">Top Clients by Jobs</CardTitle>
            </CardHeader>
            <CardContent>
              {!topClients ? (
                <Skeleton className="h-[200px] w-full rounded-xl" />
              ) : topClients.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No data yet</p>
              ) : (
                <div className="space-y-3">
                  {topClients.map((c, i) => (
                    <div key={c.company_uid} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => navigate(`/companies/${c.company_uid}`)}>
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{c.company_name}</p>
                        <p className="text-xs text-muted-foreground">{c.company_industry || "—"}</p>
                      </div>
                      <Badge variant="secondary" className="text-xs">{c.jobCount} jobs</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent POC Leads */}
          <Card className="glass border-border/30">
            <CardHeader className="flex-row items-center gap-2">
              <Users className="h-5 w-5 text-violet-500" />
              <CardTitle className="text-base font-semibold">Recent POC Leads</CardTitle>
            </CardHeader>
            <CardContent>
              {!recentPocs ? (
                <Skeleton className="h-[200px] w-full rounded-xl" />
              ) : recentPocs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No POCs yet</p>
              ) : (
                <div className="space-y-3">
                  {recentPocs.map((p) => (
                    <div key={p.ranked_poc_id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-500/10 text-xs font-bold text-violet-500">
                        #{p.lead_rank ?? "—"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{p.full_name || "Unknown"}</p>
                        <p className="text-xs text-muted-foreground truncate">{p.job_title || "—"} · {p.company_name || "—"}</p>
                      </div>
                      {p.partner_confidence_score != null && (
                        <Badge variant="outline" className="text-xs">{Number(p.partner_confidence_score).toFixed(0)}%</Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Runs Table */}
        <Card className="glass border-border/30">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold">Recent Runs</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate("/runs")} className="gap-1 text-primary hover:text-primary">
              View All <ExternalLink className="h-3 w-3" />
            </Button>
          </CardHeader>
          <CardContent>
            {runsLoading ? (
              <Skeleton className="h-[200px] w-full rounded-xl" />
            ) : (
              <div className="overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/50">
                      <TableHead>Label</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Records</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Cost</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {runs?.slice(0, 8).map((run) => (
                      <TableRow key={run.run_id} className="border-border/30 cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => navigate(`/runs/${run.run_id}`)}>
                        <TableCell className="font-medium">{run.run_label || <span className="font-mono text-xs text-muted-foreground">{run.run_id.slice(0, 16)}…</span>}</TableCell>
                        <TableCell className="text-muted-foreground">{run.started_at ? format(new Date(run.started_at), "MMM dd, yyyy") : "—"}</TableCell>
                        <TableCell><StatusBadge status={run.status} /></TableCell>
                        <TableCell>{run.record_count?.toLocaleString() ?? "—"}</TableCell>
                        <TableCell>{run.duration_secs ? `${Math.round(Number(run.duration_secs))}s` : "—"}</TableCell>
                        <TableCell>{run.cost_usd ? `$${Number(run.cost_usd).toFixed(2)}` : "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  );
}
