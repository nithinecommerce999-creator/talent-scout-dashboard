import { useState } from "react";
import * as XLSX from 'xlsx';
import { Play, Eye, Download } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { useRuns } from "@/hooks/useDashboardData";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { PageTransition } from "@/components/PageTransition";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

function StatusBadge({ status }: { status: string | null }) {
  const s = (status || "unknown").toLowerCase();
  const variant = s === "succeeded" || s === "completed" ? "default" : s === "running" ? "secondary" : "destructive";
  return <Badge variant={variant} className="capitalize">{s}</Badge>;
}

export default function Runs() {
  const navigate = useNavigate();
  const { data: runs, isLoading } = useRuns();
  const { toast } = useToast();
  const [selectedRunIds, setSelectedRunIds] = useState<Set<string>>(new Set());
  const [exportLoading, setExportLoading] = useState(false);

  function toggleRun(runId: string) {
    setSelectedRunIds(prev => {
      const next = new Set(prev);
      next.has(runId) ? next.delete(runId) : next.add(runId);
      return next;
    });
  }

  function toggleAll(allRuns: any[]) {
    if (selectedRunIds.size === allRuns.length) {
      setSelectedRunIds(new Set());
    } else {
      setSelectedRunIds(new Set(allRuns.map(r => r.run_id)));
    }
  }

  async function handleExportSelected() {
    if (selectedRunIds.size === 0 || exportLoading) return;
    setExportLoading(true);

    try {
      const runIds = [...selectedRunIds];

      const [
        { data: runsData },
        { data: companies },
        { data: jobsWithPoster },
        { data: jobsNoPoster },
        { data: pocLeads },
        { data: rankedPocs },
        { data: recruiterPocs },
        { data: unidentifiedPocs },
        { data: noPocCompanies },
      ] = await Promise.all([
        supabase.from('runs').select('*').in('run_id', runIds).order('started_at', { ascending: true }),
        supabase.from('companies').select('*').in('run_id', runIds),
        supabase.from('job_details_with_poster').select('*').in('run_id', runIds),
        supabase.from('job_details').select('*').in('run_id', runIds),
        supabase.from('poc_leads').select('*').in('run_id', runIds),
        supabase.from('ranked_pocs').select('*').in('run_id', runIds),
        supabase.from('recruiter_poc_scraped').select('*').in('run_id', runIds),
        supabase.from('unidentified_poc_leads').select('*').in('run_id', runIds),
        supabase.from('no_poc_companies').select('*').in('run_id', runIds),
      ]);

      const pocIds = (rankedPocs ?? []).map((p: any) => p.poc_id).filter(Boolean);
      const { data: emailValidations } = pocIds.length > 0
        ? await supabase
            .from('ranked_poc_email_validations')
            .select('*')
            .in('poc_id', pocIds)
        : { data: [] };

      function makeSheet(headers: string[], rows: any[][], colWidths: number[]) {
        const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
        ws['!cols'] = colWidths.map(w => ({ wch: w }));
        return ws;
      }

      const runsHeaders = [
        'run_id','run_date','started_at','finished_at',
        'run_sequence_of_day','run_label','dataset_id',
        'record_count','status','duration_secs','cost_usd','created_at'
      ];
      const runsRows = (runsData ?? []).map((r: any) => [
        r.run_id, r.run_date, r.started_at, r.finished_at,
        r.run_sequence_of_day, r.run_label, r.dataset_id,
        r.record_count, r.status, r.duration_secs, r.cost_usd, r.created_at
      ]);

      const companiesHeaders = [
        'company_uid','company_name','company_profile','company_linkedin_id',
        'company_size','company_website','company_locality','company_industry',
        'industry_category','run_id','run_label','company_domain'
      ];
      const companiesRows = (companies ?? []).map((c: any) => [
        c.company_uid, c.company_name, c.company_profile, c.company_linkedin_id,
        c.company_size, c.company_website, c.company_locality, c.company_industry,
        c.industry_category, c.run_id, c.run_label, c.company_domain
      ]);

      const jwpHeaders = [
        'job_id','job_title','location','posted_time','applicants',
        'base_salary','seniority_level','employment_type','industry',
        'job_description','job_url','company_id','recruiter_name',
        'recruiter_details','recruiter_profile','run_id','run_label','apply_url'
      ];
      const jwpRows = (jobsWithPoster ?? []).map((j: any) => [
        j.job_id, j.job_title, j.location, j.posted_time, j.applicants,
        j.base_salary, j.seniority_level, j.employment_type, j.industry,
        j.job_description, j.job_url, j.company_id, j.recruiter_name,
        j.recruiter_details, j.recruiter_profile, j.run_id, j.run_label, j.apply_url
      ]);

      const jdHeaders = [
        'job_id','job_title','location','posted_time','applicants',
        'base_salary','seniority_level','employment_type','industry',
        'job_description','job_url','company_id','run_id','run_label','apply_url'
      ];
      const jdRows = (jobsNoPoster ?? []).map((j: any) => [
        j.job_id, j.job_title, j.location, j.posted_time, j.applicants,
        j.base_salary, j.seniority_level, j.employment_type, j.industry,
        j.job_description, j.job_url, j.company_id, j.run_id, j.run_label, j.apply_url
      ]);

      const rpsHeaders = [
        'id','company_uid','run_id','run_label','recruiter_name',
        'profile_linkedin','first_name','last_name','full_name','job_title',
        'headline','email','mobile_no','city','state','scraped_at','created_at',
        'linkedin_id','scraped_company_name','scraped_company_website',
        'connections','followers','is_premium','is_verified','profile_pic','job_id'
      ];
      const rpsRows = (recruiterPocs ?? []).map((r: any) => [
        r.id, r.company_uid, r.run_id, r.run_label, r.recruiter_name,
        r.profile_linkedin, r.first_name, r.last_name, r.full_name, r.job_title,
        r.headline, r.email, r.mobile_no, r.city, r.state, r.scraped_at, r.created_at,
        r.linkedin_id, r.scraped_company_name, r.scraped_company_website,
        r.connections, r.followers, r.is_premium, r.is_verified, r.profile_pic, r.job_id
      ]);

      const plHeaders = [
        'poc_id','company_uid','first_name','last_name','full_name','job_title',
        'headline','seniority_level','email','personal_email','mobile_number',
        'linkedin','city','state','country','company_name','company_domain',
        'company_website','company_linkedin','company_linkedin_uid','company_size',
        'industry','original_job_titles','created_at','run_id'
      ];
      const plRows = (pocLeads ?? []).map((p: any) => [
        p.poc_id, p.company_uid, p.first_name, p.last_name, p.full_name, p.job_title,
        p.headline, p.seniority_level, p.email, p.personal_email, p.mobile_number,
        p.linkedin, p.city, p.state, p.country, p.company_name, p.company_domain,
        p.company_website, p.company_linkedin, p.company_linkedin_uid, p.company_size,
        p.industry, p.original_job_titles, p.created_at, p.run_id
      ]);

      const rpHeaders = [
        'ranked_poc_id','poc_id','company_uid','lead_rank','match_type',
        'partner_confidence_score','selection_reason','score_email',
        'score_poc_match','score_hr_fallback','score_seniority',
        'score_linkedin_bonus','total_leads_found','first_name','last_name',
        'full_name','job_title','selected_email','email_type','email',
        'personal_email','mobile_number','linkedin','company_name',
        'company_domain','industry','created_at','run_id'
      ];
      const rpRows = (rankedPocs ?? []).map((r: any) => [
        r.ranked_poc_id, r.poc_id, r.company_uid, r.lead_rank, r.match_type,
        r.partner_confidence_score, r.selection_reason, r.score_email,
        r.score_poc_match, r.score_hr_fallback, r.score_seniority,
        r.score_linkedin_bonus, r.total_leads_found, r.first_name, r.last_name,
        r.full_name, r.job_title, r.selected_email, r.email_type, r.email,
        r.personal_email, r.mobile_number, r.linkedin, r.company_name,
        r.company_domain, r.industry, r.created_at, r.run_id
      ]);

      const evHeaders = [
        'id','poc_id','email','email_quality','email_result','subresult','validated_at'
      ];
      const evRows = (emailValidations ?? []).map((v: any) => [
        v.id, v.poc_id, v.email, v.email_quality,
        v.email_result, v.subresult, v.validated_at
      ]);

      const upHeaders = [
        'id','first_name','last_name','full_name','job_title','headline',
        'seniority_level','email','personal_email','mobile_number','linkedin',
        'city','state','country','inferred_domain','searched_domain',
        'company_size','industry','run_id','created_at'
      ];
      const upRows = (unidentifiedPocs ?? []).map((u: any) => [
        u.id, u.first_name, u.last_name, u.full_name, u.job_title, u.headline,
        u.seniority_level, u.email, u.personal_email, u.mobile_number, u.linkedin,
        u.city, u.state, u.country, u.inferred_domain, u.searched_domain,
        u.company_size, u.industry, u.run_id, u.created_at
      ]);

      const npcHeaders = [
        'id','company_uid','company_name','company_website',
        'company_industry','job_titles_searched','run_date','created_at'
      ];
      const npcRows = (noPocCompanies ?? []).map((n: any) => [
        n.id, n.company_uid, n.company_name, n.company_website,
        n.company_industry, n.job_titles_searched, n.run_date, n.created_at
      ]);

      const wb = XLSX.utils.book_new();

      XLSX.utils.book_append_sheet(wb, makeSheet(runsHeaders, runsRows,
        [30,14,22,22,20,38,28,12,12,14,12,22]), 'runs_rows');

      XLSX.utils.book_append_sheet(wb, makeSheet(companiesHeaders, companiesRows,
        [14,32,44,18,18,36,26,28,28,28,36,24]), 'companies_rows');

      XLSX.utils.book_append_sheet(wb, makeSheet(jwpHeaders, jwpRows,
        [14,28,18,20,10,14,18,14,24,60,40,14,24,24,40,28,36,40]),
        'job_details_with_poster_rows');

      XLSX.utils.book_append_sheet(wb, makeSheet(jdHeaders, jdRows,
        [14,28,18,20,10,14,18,14,24,60,40,14,28,36,40]), 'job_details_rows');

      XLSX.utils.book_append_sheet(wb, makeSheet(rpsHeaders, rpsRows,
        [8,14,28,36,24,44,14,14,22,28,44,30,14,16,16,20,20,14,28,34,12,12,10,10,50,14]),
        'recruiter_poc_scraped_rows');

      XLSX.utils.book_append_sheet(wb, makeSheet(plHeaders, plRows,
        [10,14,14,14,22,28,40,14,30,24,16,44,14,16,14,28,22,34,44,18,14,24,30,20,28]),
        'poc_leads_rows');

      XLSX.utils.book_append_sheet(wb, makeSheet(rpHeaders, rpRows,
        [14,10,14,10,20,20,50,12,14,16,14,16,14,14,14,22,28,30,14,30,24,16,44,28,14,24,20,28]),
        'ranked_pocs_rows');

      XLSX.utils.book_append_sheet(wb, makeSheet(evHeaders, evRows,
        [8,10,30,14,14,14,20]), 'ranked_poc_email_validations_ro');

      XLSX.utils.book_append_sheet(wb, makeSheet(upHeaders, upRows,
        [8,14,14,22,28,40,14,30,24,16,44,14,16,14,22,22,14,24,28,20]),
        'unidentified_poc_leads_rows');

      XLSX.utils.book_append_sheet(wb, makeSheet(npcHeaders, npcRows,
        [8,14,32,34,28,32,14,20]), 'no_poc_companies_rows');

      const today = new Date().toISOString().slice(0, 10);
      const runCount = runIds.length;
      XLSX.writeFile(wb, `QntmLogic_${runCount}_runs_${today}.xlsx`);

      toast({
        title: 'Report downloaded',
        description: `${runCount} run${runCount > 1 ? 's' : ''} exported across 10 sheets.`,
      });

      setSelectedRunIds(new Set());

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

  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Runs</h1>
            <p className="text-sm text-muted-foreground">All scraping run history</p>
          </div>
          <Button onClick={() => navigate("/create-run")} className="gap-2 rounded-xl shadow-lg shadow-primary/20">
            <Play className="h-4 w-4" /> Start New Run
          </Button>
        </div>

        <Card className="glass border-border/30">
          <CardContent className="pt-6">
            {isLoading ? (
              <Skeleton className="h-[400px] w-full rounded-xl" />
            ) : (
              <div className="overflow-auto">
                {selectedRunIds.size > 0 && (
                  <div className="flex items-center justify-between px-4 py-2.5 mb-3
                    rounded-lg border border-border bg-muted/50">
                    <span className="text-sm text-muted-foreground">
                      {selectedRunIds.size} run{selectedRunIds.size > 1 ? 's' : ''} selected
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedRunIds(new Set())}
                        className="text-xs"
                      >
                        Clear
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleExportSelected}
                        disabled={exportLoading}
                        className="flex items-center gap-1.5 text-xs"
                      >
                        {exportLoading ? (
                          <>
                            <span className="inline-block w-3 h-3 border-2 border-primary-foreground/30
                              border-t-primary-foreground rounded-full animate-spin" />
                            Exporting…
                          </>
                        ) : (
                          <>
                            <Download className="h-3.5 w-3.5" />
                            Download Report
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10 px-4 py-3">
                        <Checkbox
                          checked={selectedRunIds.size === (runs?.length ?? 0) && (runs?.length ?? 0) > 0}
                          onCheckedChange={() => toggleAll(runs ?? [])}
                          aria-label="Select all runs"
                        />
                      </TableHead>
                      <TableHead>Label</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Records</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Cost (USD)</TableHead>
                      <TableHead className="w-[80px]">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {runs?.map((run) => (
                      <TableRow key={run.run_id} className="hover:bg-accent/50 transition-colors">
                        <TableCell className="px-4 py-3">
                          <Checkbox
                            checked={selectedRunIds.has(run.run_id)}
                            onCheckedChange={() => toggleRun(run.run_id)}
                            aria-label={`Select run ${run.run_label}`}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{run.run_label || <span className="text-muted-foreground font-mono text-xs">{run.run_id.slice(0, 16)}…</span>}</TableCell>
                        <TableCell>{run.started_at ? format(new Date(run.started_at), "MMM dd, yyyy HH:mm") : "—"}</TableCell>
                        <TableCell><StatusBadge status={run.status} /></TableCell>
                        <TableCell>{run.record_count?.toLocaleString() ?? "—"}</TableCell>
                        <TableCell>{run.duration_secs ? `${Math.round(Number(run.duration_secs))}s` : "—"}</TableCell>
                        <TableCell>{run.cost_usd ? `$${Number(run.cost_usd).toFixed(2)}` : "—"}</TableCell>
                        <TableCell>
                          <Button size="sm" variant="ghost" onClick={() => navigate(`/runs/${run.run_id}`)} className="gap-1">
                            <Eye className="h-3.5 w-3.5" /> View
                          </Button>
                        </TableCell>
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
