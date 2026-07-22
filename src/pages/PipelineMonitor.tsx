import { useState, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  Activity, Play, RefreshCw, CheckCircle2, XCircle, Clock,
  Briefcase, Building2, Users, AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { PageTransition } from "@/components/PageTransition";
import { useToast } from "@/hooks/use-toast";
import { format, formatDistanceToNow } from "date-fns";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string,
);

const N8N_WEBHOOK_URL = import.meta.env.VITE_N8N_WEBHOOK_URL as string;

type Run = {
  run_id: string;
  run_label: string | null;
  run_date: string;
  started_at: string;
  finished_at: string | null;
  status: string | null;
  record_count: number | null;
  duration_secs: number | null;
  cost_usd: number | null;
};

type Stats = {
  jobs: number;
  companies: number;
  pocLeads: number;
  runs: number;
};

function StatusBadge({ status }: { status: string | null }) {
  const s = (status ?? "unknown").toLowerCase();
  if (s === "succeeded" || s === "completed") {
    return (
      <Badge className="gap-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
        <CheckCircle2 className="h-3 w-3" />
        {s}
      </Badge>
    );
  }
  if (s === "running") {
    return (
      <Badge className="gap-1 bg-blue-500/20 text-blue-400 border border-blue-500/30">
        <RefreshCw className="h-3 w-3 animate-spin" />
        running
      </Badge>
    );
  }
  if (s === "failed" || s === "aborted") {
    return (
      <Badge className="gap-1 bg-red-500/20 text-red-400 border border-red-500/30">
        <XCircle className="h-3 w-3" />
        {s}
      </Badge>
    );
  }
  return (
    <Badge className="gap-1 bg-muted text-muted-foreground border border-border">
      <AlertCircle className="h-3 w-3" />
      {s}
    </Badge>
  );
}

export default function PipelineMonitor() {
  const { toast } = useToast();
  const [runs, setRuns] = useState<Run[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [
        { data: runsData },
        { count: jobCount },
        { count: companyCount },
        { count: pocCount },
        { count: runCount },
      ] = await Promise.all([
        supabase.from("runs").select("*").order("started_at", { ascending: false }).limit(20),
        supabase.from("job_details").select("*", { count: "exact", head: true }),
        supabase.from("companies").select("*", { count: "exact", head: true }),
        supabase.from("poc_leads").select("*", { count: "exact", head: true }),
        supabase.from("runs").select("*", { count: "exact", head: true }),
      ]);
      setRuns(runsData ?? []);
      setStats({
        jobs: jobCount ?? 0,
        companies: companyCount ?? 0,
        pocLeads: pocCount ?? 0,
        runs: runCount ?? 0,
      });
      setLastRefresh(new Date());
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      toast({ title: "Failed to load pipeline data", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  async function triggerPipeline() {
    if (triggering) return;
    setTriggering(true);
    try {
      const res = await fetch(N8N_WEBHOOK_URL, { method: "POST" });
      if (!res.ok) throw new Error(`Webhook returned ${res.status}`);
      toast({ title: "Pipeline triggered", description: "The n8n workflow has been started." });
      setTimeout(fetchData, 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      toast({ title: "Failed to trigger pipeline", description: msg, variant: "destructive" });
    } finally {
      setTriggering(false);
    }
  }

  useEffect(() => {
    fetchData();
    const channel = supabase
      .channel("pipeline-runs-monitor")
      .on("postgres_changes", { event: "*", schema: "public", table: "runs" }, fetchData)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchData]);

  const latestRun = runs[0] ?? null;
  const isRunning = latestRun?.status?.toLowerCase() === "running";

  const statCards = [
    { label: "Total Jobs", value: stats?.jobs, icon: Briefcase },
    { label: "Companies", value: stats?.companies, icon: Building2 },
    { label: "POC Leads", value: stats?.pocLeads, icon: Users },
    { label: "Total Runs", value: stats?.runs, icon: Activity },
  ];

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
              <Activity className="h-6 w-6 text-primary" />
              Pipeline Monitor
            </h1>
            <p className="text-sm text-muted-foreground">
              HarvestAPI jobs pipeline &middot; refreshed{" "}
              {formatDistanceToNow(lastRefresh, { addSuffix: true })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchData}
              disabled={loading}
              className="gap-2 rounded-xl"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button
              onClick={triggerPipeline}
              disabled={triggering || isRunning}
              className="gap-2 rounded-xl shadow-lg shadow-primary/20"
            >
              <Play className="h-4 w-4" />
              {triggering ? "Triggering…" : isRunning ? "Pipeline Running…" : "Trigger Pipeline"}
            </Button>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {statCards.map(({ label, value, icon: Icon }) => (
            <Card key={label} className="glass border-border/30">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
                <Icon className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-7 w-20" />
                ) : (
                  <p className="text-2xl font-bold">{value?.toLocaleString() ?? "—"}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Latest run banner */}
        {latestRun && (
          <Card className="glass border-border/30">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <Clock className="h-4 w-4 text-primary" />
                Latest Run
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <StatusBadge status={latestRun.status} />
                {latestRun.run_label && (
                  <span className="font-medium">{latestRun.run_label}</span>
                )}
                <span className="font-mono text-xs text-muted-foreground">
                  {latestRun.run_id.slice(0, 20)}…
                </span>
                <span className="text-muted-foreground">
                  {format(new Date(latestRun.started_at), "MMM dd, yyyy HH:mm")}
                </span>
                {latestRun.record_count != null && (
                  <span>{latestRun.record_count.toLocaleString()} records</span>
                )}
                {latestRun.duration_secs != null && (
                  <span>{Math.round(Number(latestRun.duration_secs))}s</span>
                )}
                {latestRun.cost_usd != null && (
                  <span className="text-muted-foreground">
                    ${Number(latestRun.cost_usd).toFixed(3)}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Run history */}
        <Card className="glass border-border/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Recent Runs</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {loading ? (
              <Skeleton className="h-[300px] w-full rounded-xl" />
            ) : (
              <div className="overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Label</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Started</TableHead>
                      <TableHead>Records</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Cost</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {runs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                          No runs yet. Trigger the pipeline to get started.
                        </TableCell>
                      </TableRow>
                    ) : (
                      runs.map((run) => (
                        <TableRow key={run.run_id} className="transition-colors hover:bg-accent/50">
                          <TableCell className="font-medium">
                            {run.run_label ?? (
                              <span className="font-mono text-xs text-muted-foreground">
                                {run.run_id.slice(0, 16)}…
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={run.status} />
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {run.started_at
                              ? format(new Date(run.started_at), "MMM dd, HH:mm")
                              : "—"}
                          </TableCell>
                          <TableCell>
                            {run.record_count != null
                              ? run.record_count.toLocaleString()
                              : "—"}
                          </TableCell>
                          <TableCell>
                            {run.duration_secs != null
                              ? `${Math.round(Number(run.duration_secs))}s`
                              : "—"}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {run.cost_usd != null
                              ? `$${Number(run.cost_usd).toFixed(3)}`
                              : "—"}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
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
