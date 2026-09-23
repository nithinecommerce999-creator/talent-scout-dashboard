import { useState, useEffect } from "react";
import * as XLSX from 'xlsx';
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Clock, DollarSign, Database, Timer, Calendar, Eye, Linkedin, AlertCircle, Download, Mail, CheckCircle, XCircle, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRunUnidentifiedPocs, useRunRecruiterPocScraped } from "@/hooks/useDashboardData";
import { format } from "date-fns";
import { PageTransition } from "@/components/PageTransition";
import { Breadcrumbs } from "@/components/Breadcrumbs";

const DRAFT_WEBHOOK_URL = "https://primary-production-9f142.up.railway.app/webhook/email-draft-generator";

interface PocRow {
  ranked_poc_id: number;
  poc_id: number;
  poc_name: string;
  poc_title: string;
  hiring_job_title: string;
  company_name: string;
  location: string;
  email: string;
  email_quality: string | null;
  email_result: string | null;
  subresult: string | null;
}

function StatusBadge({ status }: { status: string | null }) {
  const s = (status || "unknown").toLowerCase();
  const variant = s === "succeeded" || s === "completed" ? "default" : s === "running" ? "secondary" : "destructive";
  return <Badge variant={variant} className="capitalize">{s}</Badge>;
}

function ValidityBadge({ email_result, email_quality }: { email_result: string | null; email_quality: string | null }) {
  if (email_result === 'ok' && email_quality === 'good') {
    return <Badge className="bg-green-100 text-green-800 border-green-200 hover:bg-green-100">Verified</Badge>;
  }
  if (email_result === 'ok') {
    return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-100">Acceptable</Badge>;
  }
  if (email_result === null) {
    return <Badge variant="secondary" className="text-muted-foreground">Unvalidated</Badge>;
  }
  return <Badge variant="destructive">Invalid</Badge>;
}

export default function RunDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [exportLoading, setExportLoading] = useState(false);

  const [pocRows, setPocRows] = useState<PocRow[]>([]);
  const [pocLoading, setPocLoading] = useState(false);
  const [pocError, setPocError] = useState<string | null>(null);
  const [emailDrafts, setEmailDrafts] = useState<any[]>([]);
  const [draftLoading, setDraftLoading] = useState(false);
  const [draftSuccess, setDraftSuccess] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [showDrafts, setShowDrafts] = useState(true);

  async function fetchPocLeads(runId: string) {
    setPocLoading(true);
    setPocError(null);
    try {
      const { data: rankedPocs, error: pocErr } = await supabase
        .from('ranked_pocs')
        .select('ranked_poc_id, poc_id, first_name, full_name, job_title, selected_email, company_name, company_uid, lead_rank, run_id')
        .eq('run_id', runId)
        .order('lead_rank', { ascending: true });

      if (pocErr) throw pocErr;
      if (!rankedPocs || rankedPocs.length === 0) {
        setPocRows([]);
        return;
      }

      const pocIds = rankedPocs.map(p => p.poc_id).filter(Boolean) as number[];
      const companyUids = [...new Set(rankedPocs.map(p => p.company_uid).filter(Boolean) as number[])];

      const [
        { data: validations, error: valErr },
        { data: jobDetails, error: jobErr },
        { data: companiesData, error: compErr },
      ] = await Promise.all([
        pocIds.length > 0
          ? (supabase as any).from('ranked_poc_email_validations').select('poc_id, email, email_quality, email_result, subresult').in('poc_id', pocIds)
          : Promise.resolve({ data: [], error: null }),
        companyUids.length > 0
          ? supabase.from('job_details').select('job_title, location, company_id, run_id').eq('run_id', runId).in('company_id', companyUids)
          : Promise.resolve({ data: [], error: null }),
        companyUids.length > 0
          ? supabase.from('companies').select('company_uid, company_locality').in('company_uid', companyUids)
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (valErr) throw valErr;
      if (jobErr) throw jobErr;
      if (compErr) throw compErr;

      const validationMap: Record<number, any> = {};
      for (const v of validations ?? []) {
        if (v.poc_id != null) validationMap[v.poc_id] = v;
      }

      const jobMap: Record<number, any> = {};
      for (const j of jobDetails ?? []) {
        if (j.company_id != null && !(j.company_id in jobMap)) {
          jobMap[j.company_id] = j;
        }
      }

      const localityMap: Record<number, string> = {};
      for (const c of companiesData ?? []) {
        if (c.company_uid != null) localityMap[c.company_uid] = c.company_locality ?? '';
      }

      const rows: PocRow[] = rankedPocs.map(poc => {
        const validation = poc.poc_id != null ? (validationMap[poc.poc_id] ?? {}) : {};
        const job = poc.company_uid != null ? (jobMap[poc.company_uid] ?? {}) : {};
        const locality = poc.company_uid != null ? (localityMap[poc.company_uid] ?? '') : '';

        return {
          ranked_poc_id: poc.ranked_poc_id,
          poc_id: poc.poc_id ?? 0,
          poc_name: poc.full_name ?? poc.first_name ?? '—',
          poc_title: poc.job_title ?? '—',
          hiring_job_title: job.job_title ?? '—',
          company_name: poc.company_name ?? '—',
          location: locality || job.location || '—',
          email: poc.selected_email ?? '—',
          email_quality: validation.email_quality ?? null,
          email_result: validation.email_result ?? null,
          subresult: validation.subresult ?? null,
        };
      });

      setPocRows(rows);
    } catch (err: any) {
      setPocError(err.message ?? 'Failed to load POC leads');
    } finally {
      setPocLoading(false);
    }
  }

  async function fetchEmailDrafts(runId: string) {
    try {
      const { data, error } = await (supabase as any)
        .from('email_drafts')
        .select('draft_id, to_name, to_email, subject, status, created_at, hiring_job_title')
        .eq('run_id', runId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEmailDrafts(data ?? []);
    } catch {
      // silently ignore — drafts section just won't appear
    }
  }

  async function handleGenerateDrafts() {
    setDraftLoading(true);
    setDraftError(null);
    setDraftSuccess(false);

    try {
      const res = await fetch(DRAFT_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ run_id: id }),
      });

      if (!res.ok) throw new Error(`Webhook returned ${res.status}`);

      setDraftSuccess(true);
      setTimeout(() => {
        if (id) fetchEmailDrafts(id);
      }, 15000);
      setTimeout(() => setDraftSuccess(false), 5000);
    } catch (err: any) {
      setDraftError('Failed to trigger email generation. Please try again.');
    } finally {
      setDraftLoading(false);
    }
  }

  useEffect(() => {
    if (id) {
      fetchPocLeads(id);
      fetchEmailDrafts(id);
    }
  }, [id]);

  async function handleDownloadReport() {
    setExportLoading(true);
    try {
      const runId = id;

      const [
        { data: rankedPocs },
        { data: recruiterPocs },
        { data: companies },
        { data: jobsWithPoster },
        { data: jobsNoPoster },
        { data: emailValidations },
      ] = await Promise.all([
        supabase.from('ranked_pocs').select('*').eq('run_id', runId),
        supabase.from('recruiter_poc_scraped').select('*').eq('run_id', runId),
        supabase.from('companies').select('*').eq('run_id', runId),
        supabase.from('job_details_with_poster').select('*').eq('run_id', runId),
        supabase.from('job_details').select('*').eq('run_id', runId),
        supabase.from('ranked_poc_email_validations').select('*'),
      ]);

      const validationMap: Record<number, any> = {};
      for (const v of emailValidations ?? []) {
        if (v.poc_id) validationMap[v.poc_id] = v;
      }

      const jobMap: Record<string, any> = {};
      for (const j of [...(jobsNoPoster ?? []), ...(jobsWithPoster ?? [])]) {
        const cid = String(j.company_id ?? '');
        if (cid) jobMap[cid] = j;
      }

      const companyMap: Record<string, any> = {};
      for (const c of companies ?? []) {
        companyMap[String(c.company_uid)] = c;
      }

      const sheet1Headers = [
        'Source', 'Full Name', 'First Name', 'Last Name', 'Job Title',
        'Work Email', 'Email Quality', 'Email Result', 'Email Subresult',
        'Personal Email', 'Mobile Number', 'LinkedIn URL',
        'Company Name', 'Location',
        'Job ID', 'Job Title (Posting)', 'Posted Time', 'Applicants',
        'Base Salary', 'Job Seniority Level', 'Employment Type', 'Industry',
        'Job URL',
        'Company ID', 'Company LinkedIn ID', 'Company Size',
        'Company Website', 'Company Locality', 'Company Industry',
      ];

      const sheet1Rows: any[][] = [sheet1Headers];

      for (const poc of rankedPocs ?? []) {
        const validation = validationMap[poc.poc_id] ?? {};
        const job = jobMap[String(poc.company_uid)] ?? {};
        const company = companyMap[String(poc.company_uid)] ?? {};

        sheet1Rows.push([
          'Ranked POC',
          poc.full_name ?? '',
          poc.first_name ?? '',
          poc.last_name ?? '',
          poc.job_title ?? '',
          poc.selected_email ?? poc.email ?? '',
          validation.email_quality ?? '',
          validation.email_result ?? '',
          validation.subresult ?? '',
          poc.personal_email ?? '',
          poc.mobile_number ?? '',
          poc.linkedin ?? '',
          poc.company_name ?? company.company_name ?? '',
          company.company_locality ?? '',
          job.job_id ?? '',
          job.job_title ?? '',
          job.posted_time ? new Date(job.posted_time).toLocaleDateString() : '',
          job.applicants ?? '',
          job.base_salary ?? '',
          job.seniority_level ?? '',
          job.employment_type ?? '',
          poc.industry ?? company.company_industry ?? '',
          job.job_url ?? '',
          poc.company_uid ?? '',
          company.company_linkedin_id ?? poc.company_uid ?? '',
          company.company_size ?? '',
          company.company_website ?? '',
          company.company_locality ?? '',
          company.company_industry ?? '',
        ]);
      }

      for (const rec of recruiterPocs ?? []) {
        const job = jobMap[String(rec.company_uid)] ?? {};
        const company = companyMap[String(rec.company_uid)] ?? {};

        sheet1Rows.push([
          'Recruiter POC',
          rec.recruiter_name ?? rec.full_name ?? '',
          '',
          '',
          rec.headline ?? rec.job_title ?? '',
          '',
          '',
          '',
          '',
          '',
          '',
          rec.profile_linkedin ?? '',
          company.company_name ?? '',
          company.company_locality ?? '',
          job.job_id ?? '',
          job.job_title ?? '',
          job.posted_time ? new Date(job.posted_time).toLocaleDateString() : '',
          job.applicants ?? '',
          job.base_salary ?? '',
          job.seniority_level ?? '',
          job.employment_type ?? '',
          company.company_industry ?? '',
          job.job_url ?? '',
          rec.company_uid ?? '',
          company.company_linkedin_id ?? rec.company_uid ?? '',
          company.company_size ?? '',
          company.company_website ?? '',
          company.company_locality ?? '',
          company.company_industry ?? '',
        ]);
      }

      const rankedCompanyIds = new Set(
        (rankedPocs ?? []).map(p => String(p.company_uid))
      );
      const recruiterCompanyIds = new Set(
        (recruiterPocs ?? []).map(r => String(r.company_uid))
      );

      const allCompanies = companies ?? [];
      const total = allCompanies.length;
      let withAny = 0, bothTypes = 0, rankedOnly = 0,
          recruiterOnly = 0, noPoc = 0;

      const companySummaryRows: any[][] = [];
      for (const c of allCompanies) {
        const cid = String(c.company_uid);
        const hasRanked    = rankedCompanyIds.has(cid);
        const hasRecruiter = recruiterCompanyIds.has(cid);

        let status = 'No POC Found';
        if (hasRanked && hasRecruiter) {
          status = 'Both Ranked + Recruiter POC';
          bothTypes++;
          withAny++;
        } else if (hasRanked) {
          status = 'Ranked POC Only';
          rankedOnly++;
          withAny++;
        } else if (hasRecruiter) {
          status = 'Recruiter POC Only';
          recruiterOnly++;
          withAny++;
        } else {
          noPoc++;
        }

        companySummaryRows.push([
          c.company_uid ?? '',
          c.company_name ?? '',
          c.company_industry ?? '',
          c.company_size ?? '',
          c.company_website ?? '',
          c.company_locality ?? '',
          status,
          hasRanked ? 'Yes' : 'No',
        ]);
      }

      const pct = (n: number) =>
        total > 0 ? `${((n / total) * 100).toFixed(1)}%` : '0.0%';

      const sheet2Rows: any[][] = [
        ['📊  Company POC Coverage Summary'],
        ['Total Companies', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', total, pct(total)],
        ['Companies WITH Any POC', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', withAny, pct(withAny)],
        ['Both Ranked + Recruiter POC', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', bothTypes, pct(bothTypes)],
        ['Ranked POC Only', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', rankedOnly, pct(rankedOnly)],
        ['Recruiter POC Only', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', recruiterOnly, pct(recruiterOnly)],
        ['No POC Found', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', noPoc, pct(noPoc)],
        [],
        ['🏢  Company Details'],
        ['Company ID', 'Company Name', 'Company Industry', 'Company Size',
         'Company Website', 'Company Locality', 'POC Coverage Status', 'Has Ranked POC'],
        ...companySummaryRows,
      ];

      const wb = XLSX.utils.book_new();

      const ws1 = XLSX.utils.aoa_to_sheet(sheet1Rows);
      ws1['!cols'] = [
        {wch:14},{wch:22},{wch:14},{wch:14},{wch:28},
        {wch:30},{wch:13},{wch:12},{wch:14},
        {wch:24},{wch:16},{wch:38},
        {wch:32},{wch:22},
        {wch:14},{wch:28},{wch:14},{wch:10},
        {wch:16},{wch:18},{wch:16},{wch:22},
        {wch:36},
        {wch:12},{wch:18},{wch:18},
        {wch:34},{wch:24},{wch:22},
      ];

      const ws2 = XLSX.utils.aoa_to_sheet(sheet2Rows);
      ws2['!cols'] = [
        {wch:14},{wch:36},{wch:36},{wch:20},
        {wch:36},{wch:28},{wch:26},{wch:14},
      ];

      XLSX.utils.book_append_sheet(wb, ws1, 'Consolidated POC + Job Data');
      XLSX.utils.book_append_sheet(wb, ws2, 'Company Coverage Summary');

      const runLabel = (companies?.[0]?.run_label ?? runId ?? 'run')
        .replace(/[^a-zA-Z0-9\-_. ]/g, '')
        .replace(/\s+/g, '_');
      XLSX.writeFile(wb, `QntmLogic_${runLabel}.xlsx`);

      toast({ title: 'Report downloaded', description: `${sheet1Rows.length - 1} POC records exported.` });

    } catch (err: any) {
      toast({
        title: 'Export failed',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setExportLoading(false);
    }
  }

  const { data: run, isLoading } = useQuery({
    queryKey: ["run-detail", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("runs").select("*").eq("run_id", id!).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: companies } = useQuery({
    queryKey: ["run-companies", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("companies").select("company_uid, company_name, company_industry, company_locality, company_size").eq("run_id", id!).limit(100);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!id,
  });

  const { data: jobs } = useQuery({
    queryKey: ["run-jobs", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("job_details").select("job_id, job_title, location, seniority_level, employment_type, applicants").eq("run_id", id!).limit(100);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!id,
  });

  const { data: unidentifiedPocs } = useRunUnidentifiedPocs(id ?? "");
  const { data: recruiterPocs } = useRunRecruiterPocScraped(id ?? "");

  if (isLoading) return <div className="space-y-6"><Skeleton className="h-8 w-48" /><Skeleton className="h-[300px] w-full rounded-xl" /></div>;
  if (!run) return <div className="text-center py-12"><p className="text-muted-foreground">Run not found</p><Button variant="link" onClick={() => navigate("/runs")}>Back to Runs</Button></div>;

  const infoItems = [
    { icon: Calendar, label: "Started", value: run.started_at ? format(new Date(run.started_at), "MMM dd, yyyy HH:mm") : "—" },
    { icon: Clock, label: "Finished", value: run.finished_at ? format(new Date(run.finished_at), "MMM dd, yyyy HH:mm") : "—" },
    { icon: Timer, label: "Duration", value: run.duration_secs ? `${Math.round(Number(run.duration_secs))}s` : "—" },
    { icon: Database, label: "Records", value: run.record_count?.toLocaleString() ?? "—" },
    { icon: DollarSign, label: "Cost", value: run.cost_usd ? `$${Number(run.cost_usd).toFixed(2)}` : "—" },
  ];

  const noDraftButton =
    pocRows.length === 0 ||
    pocRows.filter(p => p.email_result === 'ok').length === 0 ||
    draftLoading;

  return (
    <PageTransition>
      <div className="space-y-6">
        <Breadcrumbs items={[{ label: "Dashboard", to: "/" }, { label: "Runs", to: "/runs" }, { label: run.run_label || run.run_id.slice(0, 16) }]} />

        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/runs")} className="rounded-xl">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">{run.run_label || "Untitled Run"}</h1>
              <StatusBadge status={run.status} />
            </div>
            <p className="text-sm text-muted-foreground font-mono">{run.run_id}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadReport}
            disabled={exportLoading}
            className="flex items-center gap-2"
          >
            {exportLoading
              ? <><span className="inline-block w-3.5 h-3.5 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />Exporting…</>
              : <><Download className="h-4 w-4" />Download Report</>
            }
          </Button>
        </div>

        {/* Info Cards */}
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {infoItems.map((item) => (
            <Card key={item.label} className="glass border-border/30">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="rounded-lg bg-primary/10 p-2.5">
                  <item.icon className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{item.label}</p>
                  <p className="text-sm font-semibold">{item.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabs for different data */}
        <Tabs defaultValue="companies" className="space-y-4">
          <TabsList className="bg-muted/50">
            <TabsTrigger value="companies">Companies ({companies?.length ?? 0})</TabsTrigger>
            <TabsTrigger value="jobs">Jobs ({jobs?.length ?? 0})</TabsTrigger>
            <TabsTrigger value="unidentified">Unidentified ({unidentifiedPocs?.length ?? 0})</TabsTrigger>
            <TabsTrigger value="recruiters">Recruiter POCs ({recruiterPocs?.length ?? 0})</TabsTrigger>
            <TabsTrigger value="poc-leads">
              POC Leads
              {pocRows.length > 0 && (
                <span className="ml-1.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-xs font-medium">
                  {pocRows.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="companies">
            <Card className="glass border-border/30">
              <CardContent className="pt-6">
                {companies && companies.length > 0 ? (
                  <div className="overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Company</TableHead>
                          <TableHead>Industry</TableHead>
                          <TableHead>Location</TableHead>
                          <TableHead>Size</TableHead>
                          <TableHead className="w-[80px]">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {companies.map((c) => (
                          <TableRow key={c.company_uid} className="hover:bg-accent/50 transition-colors">
                            <TableCell className="font-medium">{c.company_name || "—"}</TableCell>
                            <TableCell>{c.company_industry || "—"}</TableCell>
                            <TableCell>{c.company_locality || "—"}</TableCell>
                            <TableCell>{c.company_size || "—"}</TableCell>
                            <TableCell>
                              <Button size="sm" variant="ghost" onClick={() => navigate(`/companies/${c.company_uid}`)} className="gap-1">
                                <Eye className="h-3.5 w-3.5" /> View
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="text-center py-8 text-muted-foreground">No companies in this run</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="jobs">
            <Card className="glass border-border/30">
              <CardContent className="pt-6">
                {jobs && jobs.length > 0 ? (
                  <div className="overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Title</TableHead>
                          <TableHead>Location</TableHead>
                          <TableHead>Seniority</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Applicants</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {jobs.map((j) => (
                          <TableRow key={j.job_id}>
                            <TableCell className="font-medium">{j.job_title || "—"}</TableCell>
                            <TableCell>{j.location || "—"}</TableCell>
                            <TableCell>{j.seniority_level || "—"}</TableCell>
                            <TableCell>{j.employment_type || "—"}</TableCell>
                            <TableCell>{j.applicants ?? "—"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="text-center py-8 text-muted-foreground">No jobs in this run</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="unidentified">
            <Card className="glass border-border/30">
              <CardContent className="pt-6">
                {unidentifiedPocs && unidentifiedPocs.length > 0 ? (
                  <div className="overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Job Title</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Industry</TableHead>
                          <TableHead>Searched Domain</TableHead>
                          <TableHead>City</TableHead>
                          <TableHead>LinkedIn</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {unidentifiedPocs.map((p) => (
                          <TableRow key={p.id}>
                            <TableCell className="font-medium">{p.full_name || "—"}</TableCell>
                            <TableCell className="max-w-[150px] truncate">{p.job_title || "—"}</TableCell>
                            <TableCell className="text-xs">{p.email || "—"}</TableCell>
                            <TableCell>{p.industry || "—"}</TableCell>
                            <TableCell className="text-xs">{p.searched_domain || "—"}</TableCell>
                            <TableCell>{p.city || "—"}</TableCell>
                            <TableCell>
                              {p.linkedin ? (
                                <a href={p.linkedin} target="_blank" rel="noopener noreferrer" className="text-primary"><Linkedin className="h-3.5 w-3.5" /></a>
                              ) : "—"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">No unidentified leads in this run</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="recruiters">
            <Card className="glass border-border/30">
              <CardContent className="pt-6">
                {recruiterPocs && recruiterPocs.length > 0 ? (
                  <div className="overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Title</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Company</TableHead>
                          <TableHead>Connections</TableHead>
                          <TableHead>LinkedIn</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {recruiterPocs.map((r) => (
                          <TableRow key={r.id}>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                {r.profile_pic ? (
                                  <img src={r.profile_pic} alt="" className="h-6 w-6 rounded-full object-cover" />
                                ) : null}
                                {r.full_name || r.recruiter_name || "—"}
                              </div>
                            </TableCell>
                            <TableCell className="max-w-[150px] truncate">{r.job_title || "—"}</TableCell>
                            <TableCell className="text-xs">{r.email || "—"}</TableCell>
                            <TableCell>{r.scraped_company_name || "—"}</TableCell>
                            <TableCell>{r.connections?.toLocaleString() ?? "—"}</TableCell>
                            <TableCell>
                              <a href={r.profile_linkedin} target="_blank" rel="noopener noreferrer" className="text-primary">
                                <Linkedin className="h-3.5 w-3.5" />
                              </a>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="text-center py-8 text-muted-foreground">No recruiter POCs in this run</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="poc-leads">
            <Card className="glass border-border/30">
              <CardContent className="pt-6 space-y-4">
                {/* Header row */}
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-semibold">POC Leads</h2>
                    {!pocLoading && !pocError && (
                      <p className="text-sm text-muted-foreground">
                        {pocRows.length} contact{pocRows.length !== 1 ? 's' : ''} found
                        {pocRows.filter(p => p.email_result === 'ok').length > 0 && (
                          <> &middot; {pocRows.filter(p => p.email_result === 'ok' && p.email_quality === 'good').length} verified</>
                        )}
                      </p>
                    )}
                  </div>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span>
                          <Button
                            size="sm"
                            onClick={handleGenerateDrafts}
                            disabled={noDraftButton}
                            className={draftSuccess ? "bg-green-600 hover:bg-green-600 text-white" : "gap-2"}
                          >
                            {draftLoading ? (
                              <>
                                <span className="inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                Generating…
                              </>
                            ) : draftSuccess ? (
                              "Drafts Queued ✓"
                            ) : (
                              <>
                                <Mail className="h-4 w-4" />
                                Generate Email Drafts
                              </>
                            )}
                          </Button>
                        </span>
                      </TooltipTrigger>
                      {noDraftButton && !draftLoading && (
                        <TooltipContent>
                          <p>No verified emails available for this run</p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TooltipProvider>
                </div>

                {draftError && (
                  <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {draftError}
                  </div>
                )}

                {/* Email drafts acknowledgement */}
                {showDrafts && emailDrafts.length > 0 && (
                  <div className="rounded-lg border border-border/50 bg-muted/30 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-medium text-sm">
                        <Mail className="h-4 w-4 text-primary" />
                        Email Drafts Generated
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs text-muted-foreground"
                        onClick={() => setShowDrafts(false)}
                      >
                        hide
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {emailDrafts.length} draft{emailDrafts.length !== 1 ? 's' : ''} created successfully for this run
                    </p>
                    <div className="divide-y divide-border/50 rounded-md border border-border/40 bg-background overflow-hidden">
                      {emailDrafts.map((draft: any) => {
                        const isOk = draft.status === 'draft' || draft.status === 'sent';
                        return (
                          <div key={draft.draft_id} className="flex items-start gap-3 px-3 py-2.5">
                            {isOk
                              ? <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                              : <XCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                            }
                            <div className="flex-1 min-w-0 space-y-0.5">
                              <p className="text-sm font-medium">
                                {draft.to_name ?? '—'}{draft.hiring_job_title ? ` — ${draft.hiring_job_title}` : ''}
                              </p>
                              <p className="text-xs text-muted-foreground">{draft.to_email ?? '—'}</p>
                              {draft.subject && (
                                <p className="text-xs text-muted-foreground italic truncate max-w-[420px]">
                                  {draft.subject.length > 60 ? `${draft.subject.slice(0, 60)}…` : draft.subject}
                                </p>
                              )}
                            </div>
                            <div className="shrink-0 ml-2">
                              {draft.status === 'sent' && (
                                <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">sent</Badge>
                              )}
                              {draft.status === 'draft' && (
                                <Badge variant="secondary" className="text-xs">draft</Badge>
                              )}
                              {draft.status === 'failed' && (
                                <Badge variant="destructive" className="text-xs">failed</Badge>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* POC table */}
                {pocLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map(i => (
                      <Skeleton key={i} className="h-10 w-full rounded-md" />
                    ))}
                  </div>
                ) : pocError ? (
                  <div className="flex items-center gap-3 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span className="flex-1">{pocError}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1 text-destructive hover:text-destructive"
                      onClick={() => id && fetchPocLeads(id)}
                    >
                      <RefreshCw className="h-3.5 w-3.5" /> Retry
                    </Button>
                  </div>
                ) : pocRows.length === 0 ? (
                  <div className="text-center py-10">
                    <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground text-sm">
                      No POC leads found for this run. The pipeline may still be processing.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>POC Title</TableHead>
                          <TableHead>Hiring For</TableHead>
                          <TableHead>Company</TableHead>
                          <TableHead>Location</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Validity</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pocRows.map((row) => (
                          <TableRow key={row.ranked_poc_id} className="hover:bg-accent/50 transition-colors">
                            <TableCell className="font-semibold whitespace-nowrap">{row.poc_name}</TableCell>
                            <TableCell className="max-w-[160px] truncate text-sm">{row.poc_title}</TableCell>
                            <TableCell className="max-w-[160px] truncate text-sm">{row.hiring_job_title}</TableCell>
                            <TableCell className="max-w-[140px] truncate text-sm">{row.company_name}</TableCell>
                            <TableCell className="text-sm">{row.location}</TableCell>
                            <TableCell className="font-mono text-xs max-w-[180px] truncate">{row.email}</TableCell>
                            <TableCell>
                              <ValidityBadge
                                email_result={row.email_result}
                                email_quality={row.email_quality}
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </PageTransition>
  );
}
