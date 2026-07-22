import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Linkedin, MapPin, Building2, ChevronDown, ChevronUp, ExternalLink, ShieldCheck, ShieldX, Crown, BadgeCheck, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useCompanyDetails, useCompanyJobs, useCompanyRankedPocs, useCompanyAllPocs, useJobDetailsWithPoster, useRecruiterPocScraped, useEmailValidations } from "@/hooks/useDashboardData";
import { useState, useMemo } from "react";
import { format } from "date-fns";
import { PageTransition } from "@/components/PageTransition";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const EMAIL_VERIFY_WEBHOOK = "https://453423.xyz/webhook/poc-email-verify";

export default function CompanyDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const companyUid = Number(id);
  const { toast } = useToast();
  const [showAllPocs, setShowAllPocs] = useState(false);

  const [replacingRank, setReplacingRank] = useState<number | null>(null);
  const [swapping, setSwapping] = useState(false);

  const [verifyStates, setVerifyStates] = useState<Record<number, 'idle' | 'verifying' | string>>({});
  const [emailValidations, setEmailValidations] = useState<Record<number, string>>({});

  const { data: company, isLoading: companyLoading } = useCompanyDetails(companyUid);
  const { data: jobs } = useCompanyJobs(companyUid);
  const { data: rankedPocs, refetch: refetchRankedPocs } = useCompanyRankedPocs(companyUid);
  const { data: allPocs } = useCompanyAllPocs(companyUid);
  const { data: jobsWithPoster } = useJobDetailsWithPoster(companyUid);
  const { data: recruiterPocs } = useRecruiterPocScraped(companyUid);

  const pocIds = useMemo(() => (rankedPocs ?? []).map((p) => p.poc_id).filter((id): id is number => id != null), [rankedPocs]);
  const { data: emailValidationsData } = useEmailValidations(pocIds);

  const validationMap = useMemo(() => {
    const m: Record<number, { email_quality: string | null; email_result: string | null }> = {};
    (emailValidationsData ?? []).forEach((v) => {
      if (v.poc_id) m[v.poc_id] = { email_quality: v.email_quality, email_result: v.email_result };
    });
    return m;
  }, [emailValidationsData]);

  async function handlePromotePoc(pocLead: any) {
    if (!replacingRank || swapping) return;
    setSwapping(true);

    try {
      const { error: delError } = await supabase
        .from('ranked_pocs')
        .delete()
        .eq('company_uid', companyUid)
        .eq('lead_rank', replacingRank);

      if (delError) throw delError;

      const { error: insError } = await supabase
        .from('ranked_pocs')
        .insert({
          poc_id:                   pocLead.poc_id       ?? null,
          company_uid:              companyUid,
          lead_rank:                replacingRank,
          match_type:               'MANUAL_OVERRIDE',
          selection_reason:         'Manually promoted via dashboard',
          partner_confidence_score: 0,
          score_email:              0,
          score_poc_match:          0,
          score_hr_fallback:        0,
          score_seniority:          0,
          score_linkedin_bonus:     0,
          total_leads_found:        0,
          first_name:               pocLead.first_name    || '',
          last_name:                pocLead.last_name     || '',
          full_name:                pocLead.full_name     || '',
          job_title:                pocLead.job_title     || '',
          selected_email:           pocLead.email         || null,
          email_type:               'manual',
          email:                    pocLead.email         || '',
          personal_email:           pocLead.personal_email|| '',
          mobile_number:            pocLead.mobile_number || '',
          linkedin:                 pocLead.linkedin      || '',
          company_name:             pocLead.company_name  || '',
          company_domain:           pocLead.company_domain|| '',
          industry:                 pocLead.industry      || '',
          run_id:                   pocLead.run_id        ?? null,
        });

      if (insError) throw insError;

      setReplacingRank(null);
      await refetchRankedPocs();
      toast({
        title: 'POC replaced',
        description: `${pocLead.full_name} is now Rank ${replacingRank}`,
      });
    } catch (err: any) {
      toast({
        title: 'Swap failed',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setSwapping(false);
    }
  }

  async function handleVerifyEmail(poc: any) {
    const pocId = poc.poc_id;
    const email = poc.selected_email || poc.email;
    if (!email || !pocId) return;

    setVerifyStates(s => ({ ...s, [pocId]: 'verifying' }));

    try {
      const res = await fetch(EMAIL_VERIFY_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ poc_id: pocId, email }),
      });

      if (!res.ok) throw new Error(`Webhook returned ${res.status}`);

      let quality: string | null = null;
      for (let attempt = 0; attempt < 12; attempt++) {
        await new Promise(r => setTimeout(r, 5000));
        const { data } = await supabase
          .from('ranked_poc_email_validations')
          .select('email_quality')
          .eq('poc_id', pocId)
          .order('validated_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (data?.email_quality) { quality = data.email_quality; break; }
      }

      if (quality) {
        setVerifyStates(s => ({ ...s, [pocId]: quality! }));
        setEmailValidations(s => ({ ...s, [pocId]: quality! }));
        toast({ title: 'Verification complete', description: `Email quality: ${quality}` });
      } else {
        setVerifyStates(s => ({ ...s, [pocId]: 'timeout' }));
        toast({ title: 'Verification timed out', description: 'Check back later', variant: 'destructive' });
      }
    } catch (err: any) {
      setVerifyStates(s => ({ ...s, [pocId]: 'error' }));
      toast({ title: 'Verification failed', description: err.message, variant: 'destructive' });
    }
  }

  if (companyLoading) {
    return <div className="space-y-6"><Skeleton className="h-8 w-48" /><Skeleton className="h-[200px] w-full rounded-xl" /></div>;
  }

  if (!company) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Company not found</p>
        <Button variant="link" onClick={() => navigate("/companies")}>Back to Companies</Button>
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="space-y-6">
        <Breadcrumbs items={[{ label: "Dashboard", to: "/" }, { label: "Companies", to: "/companies" }, { label: company.company_name || "Details" }]} />

        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-xl">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{company.company_name || "Unknown Company"}</h1>
            <p className="text-sm text-muted-foreground">Company Details & Linked Data</p>
          </div>
        </div>

        {/* Company Info */}
        <Card className="glass border-border/30">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" /> Company Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <InfoItem label="Industry" value={company.company_industry} />
              <InfoItem label="Category" value={company.industry_category} badge />
              <InfoItem label="Location" value={company.company_locality} icon={<MapPin className="h-3.5 w-3.5" />} />
              <InfoItem label="Size" value={company.company_size} />
              <InfoItem label="Website" value={company.company_website} link />
              <InfoItem label="LinkedIn" value={company.company_profile} link icon={<Linkedin className="h-3.5 w-3.5" />} />
              <InfoItem label="Run Label" value={company.run_label} />
              <InfoItem label="Run ID" value={company.run_id} mono />
            </div>
          </CardContent>
        </Card>

        {/* Job Details With Poster */}
        {jobsWithPoster && jobsWithPoster.length > 0 && (
          <Card className="glass border-border/30">
            <CardHeader>
              <CardTitle className="text-lg">
                Jobs with Poster Info <span className="text-muted-foreground font-normal text-sm">({jobsWithPoster.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Seniority</TableHead>
                      <TableHead>Salary</TableHead>
                      <TableHead>Recruiter</TableHead>
                      <TableHead>Profile</TableHead>
                      <TableHead>Link</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {jobsWithPoster.map((j) => (
                      <TableRow key={j.job_id}>
                        <TableCell className="font-medium max-w-[200px] truncate">{j.job_title || "—"}</TableCell>
                        <TableCell>{j.location || "—"}</TableCell>
                        <TableCell>{j.seniority_level || "—"}</TableCell>
                        <TableCell>{j.base_salary || "—"}</TableCell>
                        <TableCell>{j.recruiter_name || "—"}</TableCell>
                        <TableCell>
                          {j.recruiter_profile ? (
                            <a href={j.recruiter_profile} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                              <Linkedin className="h-3.5 w-3.5" />
                            </a>
                          ) : "—"}
                        </TableCell>
                        <TableCell>
                          {j.job_url ? (
                            <a href={j.job_url} target="_blank" rel="noopener noreferrer" className="text-primary"><ExternalLink className="h-3.5 w-3.5" /></a>
                          ) : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Regular Jobs */}
        {jobs && jobs.length > 0 && (
          <Card className="glass border-border/30">
            <CardHeader>
              <CardTitle className="text-lg">
                Job Details <span className="text-muted-foreground font-normal text-sm">({jobs.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Seniority</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Salary</TableHead>
                      <TableHead>Applicants</TableHead>
                      <TableHead>Posted</TableHead>
                      <TableHead>Link</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {jobs.map((job) => (
                      <TableRow key={job.job_id}>
                        <TableCell className="font-medium max-w-[200px] truncate">{job.job_title || "—"}</TableCell>
                        <TableCell>{job.location || "—"}</TableCell>
                        <TableCell>{job.seniority_level || "—"}</TableCell>
                        <TableCell>{job.employment_type || "—"}</TableCell>
                        <TableCell>{job.base_salary || "—"}</TableCell>
                        <TableCell>{job.applicants ?? "—"}</TableCell>
                        <TableCell>{job.posted_time ? format(new Date(job.posted_time), "MMM dd, yyyy") : "—"}</TableCell>
                        <TableCell>
                          {job.job_url ? (
                            <a href={job.job_url} target="_blank" rel="noopener noreferrer" className="text-primary"><ExternalLink className="h-3.5 w-3.5" /></a>
                          ) : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Ranked POCs with email validation badges */}
        <Card className="glass border-border/30">
          <CardHeader>
            <CardTitle className="text-lg">
              Ranked POC Contacts {rankedPocs && <span className="text-muted-foreground font-normal text-sm">({rankedPocs.length})</span>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {rankedPocs && rankedPocs.length > 0 ? (
              <div className="overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rank</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Verified</TableHead>
                      <TableHead>Match</TableHead>
                      <TableHead>Confidence</TableHead>
                      <TableHead>LinkedIn</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rankedPocs.map((poc) => {
                      const pocId = poc.poc_id;
                      const isBeingReplaced = replacingRank != null && replacingRank === poc.lead_rank;
                      const isVerifying = pocId != null && verifyStates[pocId] === 'verifying';
                      const quality = pocId != null
                        ? (emailValidations[pocId] ?? validationMap[pocId]?.email_quality ?? null)
                        : null;
                      const hasEmail = !!(poc.selected_email || poc.email);

                      return (
                        <TableRow
                          key={poc.ranked_poc_id}
                          className={isBeingReplaced ? "border-l-4 border-amber-400" : ""}
                        >
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <Badge variant="outline">{poc.lead_rank ?? "—"}</Badge>
                              {isBeingReplaced && (
                                <Badge className="text-xs bg-amber-500/20 text-amber-400 border border-amber-500/30">
                                  Selecting replacement…
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">{poc.full_name || "—"}</TableCell>
                          <TableCell className="max-w-[150px] truncate">{poc.job_title || "—"}</TableCell>
                          <TableCell className="text-xs">{poc.selected_email || poc.email || "—"}</TableCell>
                          <TableCell>
                            {isVerifying ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                            ) : quality === 'good' ? (
                              <Badge className="text-xs gap-1 bg-green-500/20 text-green-400 border border-green-500/30">
                                <ShieldCheck className="h-3 w-3" /> good
                              </Badge>
                            ) : quality === 'bad' ? (
                              <Badge variant="destructive" className="text-xs gap-1">
                                <ShieldX className="h-3 w-3" /> bad
                              </Badge>
                            ) : quality ? (
                              <Badge variant="secondary" className="text-xs">{quality}</Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {poc.match_type && <Badge variant="secondary" className="text-xs">{poc.match_type}</Badge>}
                          </TableCell>
                          <TableCell>
                            {poc.partner_confidence_score != null ? `${Number(poc.partner_confidence_score).toFixed(0)}%` : "—"}
                          </TableCell>
                          <TableCell>
                            {poc.linkedin ? (
                              <a href={poc.linkedin} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline"><Linkedin className="h-3.5 w-3.5" /></a>
                            ) : "—"}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {isBeingReplaced ? (
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  className="h-6 text-xs px-2"
                                  onClick={() => setReplacingRank(null)}
                                  disabled={swapping}
                                >
                                  Cancel
                                </Button>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-6 text-xs px-2"
                                  onClick={() => poc.lead_rank != null && setReplacingRank(poc.lead_rank)}
                                  disabled={swapping || poc.lead_rank == null}
                                >
                                  Replace
                                </Button>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-6 text-xs px-2"
                                onClick={() => handleVerifyEmail(poc)}
                                disabled={!hasEmail || isVerifying || swapping}
                                title={!hasEmail ? "No email to verify" : undefined}
                              >
                                {isVerifying ? <Loader2 className="h-3 w-3 animate-spin" /> : "Verify Email"}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-6">No ranked POCs found</p>
            )}
          </CardContent>
        </Card>

        {/* Recruiter POC Scraped */}
        {recruiterPocs && recruiterPocs.length > 0 && (
          <Card className="glass border-border/30">
            <CardHeader>
              <CardTitle className="text-lg">
                Recruiter POCs (Scraped) <span className="text-muted-foreground font-normal text-sm">({recruiterPocs.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Connections</TableHead>
                      <TableHead>Followers</TableHead>
                      <TableHead>Premium</TableHead>
                      <TableHead>Verified</TableHead>
                      <TableHead>LinkedIn</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recruiterPocs.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {r.profile_pic ? (
                              <img src={r.profile_pic} alt="" className="h-7 w-7 rounded-full object-cover" />
                            ) : (
                              <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
                                {(r.first_name || "?")[0]}
                              </div>
                            )}
                            {r.full_name || "—"}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[150px] truncate">{r.job_title || "—"}</TableCell>
                        <TableCell className="text-xs">{r.email || "—"}</TableCell>
                        <TableCell>{r.connections?.toLocaleString() ?? "—"}</TableCell>
                        <TableCell>{r.followers?.toLocaleString() ?? "—"}</TableCell>
                        <TableCell>
                          {r.is_premium ? <Crown className="h-4 w-4 text-warning" /> : "—"}
                        </TableCell>
                        <TableCell>
                          {r.is_verified ? <BadgeCheck className="h-4 w-4 text-primary" /> : "—"}
                        </TableCell>
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
            </CardContent>
          </Card>
        )}

        {/* All POCs */}
        <Card className="glass border-border/30">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-lg">
              All POC Leads {allPocs && <span className="text-muted-foreground font-normal text-sm">({allPocs.length})</span>}
            </CardTitle>
            <Button variant="outline" size="sm" onClick={() => setShowAllPocs(!showAllPocs)} className="gap-1">
              {showAllPocs ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              {showAllPocs ? "Hide" : "Show All POCs"}
            </Button>
          </CardHeader>
          {showAllPocs && (
            <CardContent>
              {replacingRank !== null && (
                <div className="mb-4 flex items-center justify-between rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-400">
                  <span>⚠ Replace mode: select a person below to replace Rank {replacingRank}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 text-xs px-2 border-amber-500/50 text-amber-400 hover:bg-amber-500/20"
                    onClick={() => setReplacingRank(null)}
                  >
                    Cancel
                  </Button>
                </div>
              )}
              {allPocs && allPocs.length > 0 ? (
                <div className="overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Seniority</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>City</TableHead>
                        <TableHead>LinkedIn</TableHead>
                        {replacingRank !== null && <TableHead>Promote</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allPocs.map((poc) => (
                        <TableRow key={poc.poc_id}>
                          <TableCell className="font-medium">{poc.full_name || "—"}</TableCell>
                          <TableCell className="max-w-[150px] truncate">{poc.job_title || "—"}</TableCell>
                          <TableCell>{poc.seniority_level || "—"}</TableCell>
                          <TableCell className="text-xs">{poc.email || "—"}</TableCell>
                          <TableCell className="text-xs">{poc.mobile_number || "—"}</TableCell>
                          <TableCell>{poc.city || "—"}</TableCell>
                          <TableCell>
                            {poc.linkedin ? (
                              <a href={poc.linkedin} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline"><Linkedin className="h-3.5 w-3.5" /></a>
                            ) : "—"}
                          </TableCell>
                          {replacingRank !== null && (
                            <TableCell>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-6 text-xs px-2 border-green-500/50 text-green-400 hover:bg-green-500/20"
                                onClick={() => handlePromotePoc(poc)}
                                disabled={swapping}
                              >
                                {swapping ? <Loader2 className="h-3 w-3 animate-spin" /> : "Promote ↑"}
                              </Button>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-6">No POC leads found</p>
              )}
            </CardContent>
          )}
        </Card>
      </div>
    </PageTransition>
  );
}

function InfoItem({ label, value, link, badge, icon, mono }: {
  label: string; value: string | null | undefined; link?: boolean; badge?: boolean; icon?: React.ReactNode; mono?: boolean;
}) {
  if (!value) return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm mt-0.5">—</p>
    </div>
  );

  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="mt-0.5 flex items-center gap-1.5">
        {icon}
        {badge ? (
          <Badge variant="secondary" className="text-xs">{value}</Badge>
        ) : link ? (
          <a href={value.startsWith("http") ? value : `https://${value}`} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline truncate max-w-[200px]">{value}</a>
        ) : (
          <p className={`text-sm ${mono ? "font-mono text-xs" : ""}`}>{value}</p>
        )}
      </div>
    </div>
  );
}
