import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { X, ChevronRight, ChevronLeft, Play, Check, Loader2, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { MultiSelect } from "@/components/ui/multi-select";
import { TagInput } from "@/components/ui/tag-input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  INDUSTRIES,
  INDUSTRY_GROUP_IDS,
  INDUSTRY_GROUP_SELECTIONS,
  DATE_POSTED_OPTIONS,
  SENIORITY_OPTIONS,
  WORK_TYPE_OPTIONS,
  EMPLOYMENT_TYPE_OPTIONS,
  RELEVANCE_OPTIONS,
  COMPANY_SIZE_OPTIONS,
} from "@/data/industries";
import { supabase } from "@/integrations/supabase/client";

type WizardStep = 1 | 2 | 3 | 4;
type CardStatus = "pending" | "running" | "success" | "failed" | "cancelled";
interface JobCard {
  title: string;
  status: CardStatus;
}

type RunPhaseStatus = {
  phase: 'phase1' | 'phase2a' | 'phase2b' | 'phase3';
  status: 'completed' | 'failed' | 'empty';
  record_count: number;
  error_message: string | null;
};

type PipelineState =
  | 'idle'
  | 'waiting_phase1'
  | 'phase1_done'
  | 'phase2_running'
  | 'phase3_running'
  | 'done'
  | 'aborted';

const WEBHOOK_URL = "https://primary-production-9f142.up.railway.app/webhook/harvestapi-jobs-pipeline-v2";

const PHASE_LABELS: Record<PipelineState, string> = {
  idle:           '',
  waiting_phase1: 'Phase 1 — scraping jobs & companies…',
  phase1_done:    'Phase 2 — scraping recruiter profiles…',
  phase2_running: 'Phase 2 — acquiring & ranking POC leads…',
  phase3_running: 'Phase 3 — validating emails…',
  done:           'Complete',
  aborted:        'Aborted',
};

const INDUSTRY_GROUPS = Array.from(
  new Map(
    INDUSTRIES.map(ind => [ind.group, ind.group])
  ).keys()
);

const STEP_LABELS = ["Industry", "Job Titles", "Parameters", "Run"];

const POSTED_MAP: Record<string, string> = {
  "past-24h": "24h",
  "past-week": "week",
  "past-month": "month",
};
const SENIORITY_MAP: Record<string, string> = {
  "Internship": "internship",
  "Entry level": "entry",
  "Associate": "associate",
  "Mid-Senior level": "mid-senior",
  "Director": "director",
  "Executive": "executive",
};
const WORKTYPE_MAP: Record<string, string> = {
  "On-site": "office",
  "Remote": "remote",
  "Hybrid": "hybrid",
};
const EMPTYPE_MAP: Record<string, string> = {
  "Full-time": "full-time",
  "Part-time": "part-time",
  "Contract": "contract",
  "Temporary": "temporary",
  "Internship": "internship",
};
const SORT_MAP: Record<string, string> = {
  "Most recent": "date",
  "Most relevant": "relevance",
};

const GEMINI_API_KEY = "AIzaSyA2BYgMz8Vjk6FU0YTT_PLe40FY_wLIp8w";

async function fetchJobTitles(industryName: string): Promise<string[]> {
  const MODELS = [
    "gemini-2.5-flash",
    "gemini-2.0-flash-lite",
  ];

  const PROMPT = `List 12 non-IT job titles for the ${industryName} industry at the Associate and Mid-Senior level. These are people who are actively involved in day-to-day operations and report to directors or VPs — roles like managers, supervisors, coordinators, and senior specialists. Companies are under 500 employees. Return ONLY a JSON array of strings, no explanation, no markdown. Example: ["Project Manager","Operations Manager","Finance Manager","HR Manager","Senior Accountant","Procurement Manager","Compliance Manager","Facilities Manager"]`;

  for (const model of MODELS) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: PROMPT }] }]
            }),
          }
        );
        const data = await res.json();

        // 503 overloaded — wait and retry same model
        if (data.error?.code === 503) {
          if (attempt < 2) {
            await new Promise(r => setTimeout(r, 3000 * (attempt + 1)));
            continue;
          }
          break;
        }

        if (data.error?.code === 404) break;
        if (data.error?.code === 429) break;
        if (data.error) break;

        const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
        const match = text.match(/\[[\s\S]*?\]/);
        if (match) {
          try { return JSON.parse(match[0]); } catch { break; }
        }
        break;
      } catch {
        if (attempt < 2) {
          await new Promise(r => setTimeout(r, 2000));
          continue;
        }
        break;
      }
    }
  }
  return [];
}

export default function CreateRun() {
  const navigate = useNavigate();
  const { toast } = useToast();

  // Wizard
  const [step, setStep] = useState<WizardStep>(1);
  const [isLoadingTitles, setIsLoadingTitles] = useState(false);

  // Step 1
  const [selectedGroup, setSelectedGroup] = useState("");

  // Step 2
  const [suggestedTitles, setSuggestedTitles] = useState<string[]>([]);
  const [selectedTitles, setSelectedTitles] = useState<string[]>([]);
  const [customTitleInput, setCustomTitleInput] = useState("");

  // Step 3
  const [geoId, setGeoId] = useState("103644278");
  const [maxItems, setMaxItems] = useState(100);
  const [datePosted, setDatePosted] = useState<string[]>(["past-24h"]);
  const [seniority, setSeniority] = useState<string[]>(["Mid-Senior level", "Director"]);
  const [workType, setWorkType] = useState<string[]>(["On-site", "Hybrid", "Remote"]);
  const [employmentType, setEmploymentType] = useState<string[]>(["Full-time"]);
  const [relevance, setRelevance] = useState<string[]>(["Most recent"]);
  const [locations, setLocations] = useState<string[]>([]);
  const [industries, setIndustries] = useState<string[]>([]);

  // Step 4
  const [jobCards, setJobCards] = useState<JobCard[]>([]);
  const [selectedCardTitle, setSelectedCardTitle] = useState("");
  const [pipelineState, setPipelineState] = useState<PipelineState>('idle');
  const [pipelineRunId, setPipelineRunId] = useState<string | null>(null);
  const pipelineRunIdRef = useRef<string | null>(null);
  const [pipelineError, setPipelineError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

  // ── Step 1 → 2 ──────────────────────────────────────────────────────────
  const handleGroupNext = async () => {
    setIsLoadingTitles(true);
    try {
      const titles = await fetchJobTitles(selectedGroup);
      setSuggestedTitles(titles);
      setSelectedTitles([]);
    } catch {
      toast({ title: "Failed to fetch title suggestions", variant: "destructive" });
      setSuggestedTitles([]);
    } finally {
      setIsLoadingTitles(false);
      setStep(2);
    }
  };

  // ── Step 2 helpers ───────────────────────────────────────────────────────
  const toggleTitle = (title: string) => {
    setSelectedTitles((prev) =>
      prev.includes(title) ? prev.filter((t) => t !== title) : [...prev, title]
    );
  };

  const addCustomTitle = () => {
    const trimmed = customTitleInput.trim();
    if (!trimmed) return;
    if (!suggestedTitles.includes(trimmed)) {
      setSuggestedTitles((prev) => [...prev, trimmed]);
    }
    if (!selectedTitles.includes(trimmed)) {
      setSelectedTitles((prev) => [...prev, trimmed]);
    }
    setCustomTitleInput("");
  };

  // ── Step 3 → 4 ───────────────────────────────────────────────────────────
  const goToStep4 = () => {
    setJobCards(selectedTitles.map((t) => ({ title: t, status: "pending" })));
    setSelectedCardTitle("");
    setStep(4);
  };

  // ── Step 4: helpers ──────────────────────────────────────────────────────
  function abortRun(title: string, reason: string) {
    setJobCards(prev => prev.map(c => c.title === title ? { ...c, status: 'failed' } : c));
    setPipelineState('aborted');
    setPipelineError(reason);

    import('sonner').then(({ toast: sonnerToast }) => {
      sonnerToast.error(`Run aborted — ${title}`, {
        description: reason,
        duration: Infinity,
        position: 'top-center',
        className: 'w-[520px] !max-w-[520px]',
        action: { label: 'Dismiss', onClick: () => {} },
      });
    });
  }

  function completeRun(title: string, description: string) {
    setJobCards(prev => {
      const updated = prev.map(c =>
        c.title === title ? { ...c, status: 'success' as CardStatus } : c
      );
      const nextPending = updated.find(c => c.status === 'pending');
      if (nextPending) {
        setTimeout(() => startRun(nextPending.title), 1500);
      } else {
        setTimeout(() => navigate(-1), 2000);
      }
      return updated;
    });
    setPipelineState('done');
    setSelectedCardTitle("");

    import('sonner').then(({ toast: sonnerToast }) => {
      sonnerToast.success(`✓ Run complete — ${title}`, {
        description,
        duration: Infinity,
        position: 'top-center',
        className: 'w-[520px] !max-w-[520px]',
        action: { label: 'Dismiss', onClick: () => {} },
      });
    });
  }

  function pollPipeline(title: string, triggerTime: string) {
    const TIMEOUT_MS  = 35 * 60 * 1000;
    const INTERVAL_MS = 10_000;
    const startedAt   = Date.now();
    let runId: string | null = null;
    let phase1DoneAt: number | null = null;
    let phase2bDoneAt: number | null = null;

    if (intervalRef.current) clearInterval(intervalRef.current);

    intervalRef.current = setInterval(async () => {

      // ── TIMEOUT ───────────────────────────────────────────────────────────
      if (Date.now() - startedAt > TIMEOUT_MS) {
        clearInterval(intervalRef.current!);
        abortRun(title, 'Pipeline timed out after 35 minutes with no completion signal.');
        return;
      }

      try {

        // ── STEP 1: Find run_id ────────────────────────────────────────────
        if (!runId) {
          const { data: runRow } = await supabase
            .from('runs')
            .select('run_id, pipeline_status, run_summary')
            .gt('started_at', triggerTime)
            .order('started_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (runRow) {
            runId = runRow.run_id;
            pipelineRunIdRef.current = runId;
            setPipelineRunId(runId);

            if (runRow.pipeline_status?.toLowerCase() === 'empty') {
              clearInterval(intervalRef.current!);
              abortRun(title, runRow.run_summary
                ?? 'Pipeline completed with 0 results. Try broader parameters.');
              return;
            }

            if (runRow.pipeline_status?.toLowerCase() === 'failed') {
              clearInterval(intervalRef.current!);
              abortRun(title, runRow.run_summary ?? 'Pipeline failed.');
              return;
            }

            if (runRow.pipeline_status?.toLowerCase() === 'completed') {
              clearInterval(intervalRef.current!);
              completeRun(title, runRow.run_summary ?? 'Pipeline completed.');
              return;
            }
          }
          return;
        }

        // ── STEP 2: Re-check pipeline_status on every tick ────────────────
        const { data: statusRow } = await supabase
          .from('runs')
          .select('pipeline_status, run_summary')
          .eq('run_id', runId)
          .maybeSingle();

        if (statusRow) {
          const status = statusRow.pipeline_status?.toLowerCase();
          if (status === 'completed') {
            clearInterval(intervalRef.current!);
            completeRun(title, statusRow.run_summary ?? 'Pipeline completed.');
            return;
          }
          if (status === 'empty') {
            clearInterval(intervalRef.current!);
            abortRun(title, statusRow.run_summary ?? 'No results found.');
            return;
          }
          if (status === 'failed') {
            clearInterval(intervalRef.current!);
            abortRun(title, statusRow.run_summary ?? 'Pipeline failed.');
            return;
          }
        }

        // ── STEP 3: Check run_phases ───────────────────────────────────────
        const { data: phases } = await supabase
          .from('run_phases')
          .select('phase, status, record_count, error_message')
          .eq('run_id', runId);

        const phaseMap: Record<string, RunPhaseStatus> = {};
        for (const p of phases ?? []) phaseMap[p.phase] = p as RunPhaseStatus;

        // ── Critical errors ────────────────────────────────────────────────
        const { data: criticalErrors } = await supabase
          .from('pipeline_errors')
          .select('node_name, error_message')
          .eq('run_id', runId)
          .eq('severity', 'CRITICAL')
          .limit(1);

        if (criticalErrors && criticalErrors.length > 0) {
          clearInterval(intervalRef.current!);
          abortRun(title,
            `Critical error in ${criticalErrors[0].node_name}: ${criticalErrors[0].error_message}`);
          return;
        }

        // ── Phase 1 ────────────────────────────────────────────────────────
        if (phaseMap['phase1']) {
          const p1 = phaseMap['phase1'];

          if (p1.status === 'failed' || p1.status === 'empty') {
            clearInterval(intervalRef.current!);
            abortRun(title, p1.error_message ?? 'Phase 1 completed with no results.');
            return;
          }

          if (p1.status === 'completed' && !phase1DoneAt) {
            phase1DoneAt = Date.now();
            setPipelineState('phase1_done');
          }
        }

        // ── Phase 1 done — Phase 2 must start within 5 min ────────────────
        if (phase1DoneAt && !phaseMap['phase2a'] && !phaseMap['phase2b']) {
          if (Date.now() - phase1DoneAt > 5 * 60 * 1000) {
            clearInterval(intervalRef.current!);
            abortRun(title,
              'Phase 1 completed successfully but Phase 2 was never triggered. ' +
              'Check n8n: Call Phase 2 nodes may have failed.');
            return;
          }
        }

        // ── Phase 2 running ────────────────────────────────────────────────
        if (phaseMap['phase2a'] || phaseMap['phase2b']) {
          setPipelineState('phase2_running');
        }

        // ── Phase 2A ───────────────────────────────────────────────────────
        if (phaseMap['phase2a'] && phaseMap['phase2a'].status !== 'completed') {
          if (phaseMap['phase2a'].status === 'failed') {
            clearInterval(intervalRef.current!);
            abortRun(title,
              'Phase 2A (LinkedIn scraper) failed: ' +
              (phaseMap['phase2a'].error_message ?? 'No recruiter profiles scraped.'));
            return;
          }
        }

        // ── Phase 2B ───────────────────────────────────────────────────────
        if (phaseMap['phase2b']) {
          const p2b = phaseMap['phase2b'];

          if (p2b.status === 'failed') {
            clearInterval(intervalRef.current!);
            abortRun(title,
              'Phase 2B (POC acquisition) failed: ' +
              (p2b.error_message ?? 'No ranked POC leads produced.'));
            return;
          }

          if (p2b.status === 'empty') {
            const p2aHasResults = (phaseMap['phase2a']?.record_count ?? 0) > 0;
            if (p2aHasResults) {
              clearInterval(intervalRef.current!);
              completeRun(title, 'Phase 2A scraped recruiter profiles. No POC leads required for this run.');
              return;
            }
            clearInterval(intervalRef.current!);
            abortRun(title,
              'Phase 2B found 0 ranked POC leads after processing all companies. ' +
              'The companies may have no matching contacts in the database.');
            return;
          }

          if (p2b.status === 'completed' && !phase2bDoneAt) {
            phase2bDoneAt = Date.now();
            setPipelineState('phase3_running');
          }
        }

        // ── Phase 2B done — Phase 3 must start within 10 min ──────────────
        if (phase2bDoneAt && !phaseMap['phase3']) {
          if (Date.now() - phase2bDoneAt > 10 * 60 * 1000) {
            clearInterval(intervalRef.current!);
            abortRun(title,
              'Phase 2B completed successfully but Phase 3 email validation was never triggered. ' +
              'Check n8n: Call Phase 3 node may have failed.');
            return;
          }
        }

        // ── Phase 3 ────────────────────────────────────────────────────────
        if (phaseMap['phase3']) {
          const p3 = phaseMap['phase3'];

          if (p3.status === 'failed') {
            clearInterval(intervalRef.current!);
            abortRun(title, 'Phase 3 email validation failed.');
            return;
          }

          if (p3.status === 'completed') {
            clearInterval(intervalRef.current!);
            completeRun(title,
              `${p3.record_count} email${p3.record_count !== 1 ? 's' : ''} validated. ` +
              `Pipeline complete.`);
            return;
          }
        }

      } catch (_) {
        // Silently ignore transient Supabase errors
      }
    }, INTERVAL_MS);
  }

  // ── Step 4: trigger run ──────────────────────────────────────────────────
  async function startRun(title: string) {
    setPipelineState('waiting_phase1');
    setPipelineError(null);
    setPipelineRunId(null);
    pipelineRunIdRef.current = null;
    setSelectedCardTitle("");
    setJobCards(prev => prev.map(c => c.title === title ? { ...c, status: 'running' } : c));

    const triggerTime = new Date().toISOString();

    const body = {
      jobTitles: [title],
      industryIds: INDUSTRY_GROUP_IDS[selectedGroup] ?? [],
      geoIds: [geoId].filter(Boolean),
      workplaceType: workType.map((v) => WORKTYPE_MAP[v]).filter(Boolean),
      employmentType: employmentType.map((v) => EMPTYPE_MAP[v]).filter(Boolean),
      experienceLevel: seniority.map((v) => SENIORITY_MAP[v]).filter(Boolean),
      postedLimit: POSTED_MAP[datePosted[0]] ?? "24h",
      maxItems: maxItems,
      sortBy: SORT_MAP[relevance[0]] ?? "date",
      under10Applicants: false,
    };

    try {
      console.log('[StartRun] Triggering webhook:', WEBHOOK_URL);
      console.log('[StartRun] Payload:', JSON.stringify(body, null, 2));
      const res = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`Webhook returned ${res.status}`);
      pollPipeline(title, triggerTime);
    } catch (err: unknown) {
      setJobCards(prev => prev.map(c => c.title === title ? { ...c, status: 'failed' } : c));
      setPipelineState('idle');
      const message = err instanceof Error ? err.message : 'Could not reach the webhook.';
      toast({ title: 'Failed to trigger run', description: message, variant: 'destructive' });
    }
  }

  async function stopRun() {
    const runId = pipelineRunIdRef.current;
    if (!runId) return;

    if (intervalRef.current) clearInterval(intervalRef.current);

    await supabase
      .from("runs")
      .update({
        pipeline_status: "cancelled" as any,
        run_summary: "Cancelled by user." as any,
      })
      .eq("run_id", runId);

    pipelineRunIdRef.current = null;
    setPipelineRunId(null);
    setPipelineState("aborted");
    setJobCards(prev =>
      prev.map(c => c.status === "running" ? { ...c, status: "cancelled" as CardStatus } : c)
    );
  }

  async function startSingleRun(title: string) {
    setPipelineRunId(null);
    pipelineRunIdRef.current = null;
    setPipelineError(null);
    setPipelineState("waiting_phase1");
    setJobCards(prev => prev.map(c => c.title === title ? { ...c, status: "running" as CardStatus } : c));

    const triggerTime = new Date().toISOString();

    const body = {
      jobTitles: [title],
      industryIds: INDUSTRY_GROUP_IDS[selectedGroup] ?? [],
      geoIds: [geoId].filter(Boolean),
      workplaceType: workType.map(v => WORKTYPE_MAP[v]).filter(Boolean),
      employmentType: employmentType.map(v => EMPTYPE_MAP[v]).filter(Boolean),
      experienceLevel: seniority.map(v => SENIORITY_MAP[v]).filter(Boolean),
      postedLimit: POSTED_MAP[datePosted[0]] ?? "24h",
      maxItems: maxItems,
      sortBy: SORT_MAP[relevance[0]] ?? "date",
      under10Applicants: false,
    };

    try {
      const res = await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error(`Webhook returned ${res.status}`);
      pollPipeline(title, triggerTime);
    } catch (err: unknown) {
      setJobCards(prev => prev.map(c => c.title === title ? { ...c, status: "failed" as CardStatus } : c));
      setPipelineState("idle");
      const message = err instanceof Error ? err.message : "Could not reach the webhook.";
      toast({ title: "Failed to trigger run", description: message, variant: "destructive" });
    }
  }

  const handleStartRun = async () => {
    if (!selectedCardTitle || pipelineState !== 'idle') return;
    await startRun(selectedCardTitle);
  };

  const allSuccess = jobCards.length > 0 && jobCards.every((c) => c.status === "success");
  const activePhaseLabel = PHASE_LABELS[pipelineState];
  const isPipelineActive = pipelineState !== 'idle' && pipelineState !== 'done' && pipelineState !== 'aborted';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={() => navigate(-1)}
    >
      <div
        className="relative w-full max-w-2xl max-h-[90vh] overflow-auto rounded-2xl border border-border bg-card shadow-2xl mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card/95 backdrop-blur px-6 py-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight">Start New Run</h2>
            <p className="text-sm text-muted-foreground">Configure your LinkedIn job scraping run</p>
          </div>
          <button
            onClick={() => navigate(-1)}
            className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* ── Step Indicator ─────────────────────────────────────────────── */}
        <div className="px-6 pt-5 pb-2">
          <div className="flex items-center">
            {STEP_LABELS.map((label, i) => {
              const stepNum = (i + 1) as WizardStep;
              const isCompleted = step > stepNum;
              const isCurrent = step === stepNum;
              return (
                <div key={label} className="flex flex-1 items-center">
                  <div className="flex flex-col items-center gap-1 shrink-0">
                    <div
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-semibold transition-colors",
                        isCompleted
                          ? "bg-green-500 border-green-500 text-white"
                          : isCurrent
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-muted-foreground/30 text-muted-foreground"
                      )}
                    >
                      {isCompleted ? <Check className="h-4 w-4" /> : stepNum}
                    </div>
                    <span
                      className={cn(
                        "text-[11px] font-medium whitespace-nowrap",
                        isCurrent ? "text-foreground" : "text-muted-foreground"
                      )}
                    >
                      {label}
                    </span>
                  </div>
                  {i < STEP_LABELS.length - 1 && (
                    <div
                      className={cn(
                        "h-0.5 flex-1 mb-5 mx-2",
                        step > stepNum ? "bg-green-500" : "bg-muted-foreground/20"
                      )}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Step Content ───────────────────────────────────────────────── */}
        <div className="px-6 pb-6">

          {/* STEP 1 — Industry */}
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Select the industry you want to target.</p>
              <div className="grid grid-cols-2 gap-3">
                {INDUSTRY_GROUPS.map((group) => (
                  <button
                    key={group}
                    type="button"
                    onClick={() => {
                      setSelectedGroup(group);
                      setIndustries(INDUSTRY_GROUP_SELECTIONS[group] ?? []);
                    }}
                    className={cn(
                      "rounded-xl border p-4 text-left transition-all hover:border-primary/50",
                      selectedGroup === group
                        ? "border-primary bg-primary/10"
                        : "border-border bg-background/50"
                    )}
                  >
                    <p className="font-medium text-sm">{group}</p>
                  </button>
                ))}
              </div>
              <div className="flex justify-end pt-2">
                <Button onClick={handleGroupNext} disabled={!selectedGroup || isLoadingTitles}>
                  {isLoadingTitles ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating titles…
                    </>
                  ) : (
                    <>
                      Next <ChevronRight className="h-4 w-4 ml-1" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* STEP 2 — Job Titles */}
          {step === 2 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Select job titles to target.{" "}
                <span className="text-foreground font-medium">{selectedTitles.length} title(s) selected.</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {suggestedTitles.map((title) => (
                  <button
                    key={title}
                    type="button"
                    onClick={() => toggleTitle(title)}
                    className={cn(
                      "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                      selectedTitles.includes(title)
                        ? "bg-primary text-primary-foreground"
                        : "border border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                    )}
                  >
                    {title}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <div className="flex min-h-[2.75rem] flex-1 items-center rounded-lg border border-input bg-background px-3 py-2 text-sm transition-colors focus-within:border-primary focus-within:ring-2 focus-within:ring-ring/30">
                  <input
                    value={customTitleInput}
                    onChange={(e) => setCustomTitleInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addCustomTitle();
                      }
                    }}
                    placeholder="Add custom title…"
                    className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={addCustomTitle}
                  disabled={!customTitleInput.trim()}
                >
                  Add
                </Button>
              </div>
              <div className="flex items-center justify-between pt-2">
                <Button variant="ghost" onClick={() => setStep(1)}>
                  <ChevronLeft className="h-4 w-4 mr-1" /> Back
                </Button>
                <Button onClick={() => setStep(3)} disabled={selectedTitles.length === 0}>
                  Next: Parameters <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 3 — Parameters */}
          {step === 3 && (
            <div className="space-y-4">
              {/* Row 1: GeoID + Max Items */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">GeoID</Label>
                  <div className="flex min-h-[2.75rem] w-full items-center rounded-lg border border-input bg-background px-3 py-2 text-sm transition-colors focus-within:border-primary focus-within:ring-2 focus-within:ring-ring/30">
                    <input
                      value={geoId}
                      onChange={(e) => setGeoId(e.target.value)}
                      placeholder="e.g. 103644278 for United States"
                      className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Max Items</Label>
                  <div className="flex min-h-[2.75rem] w-full items-center rounded-lg border border-input bg-background px-3 py-2 text-sm transition-colors focus-within:border-primary focus-within:ring-2 focus-within:ring-ring/30">
                    <input
                      type="number"
                      value={maxItems}
                      onChange={(e) => setMaxItems(Number(e.target.value))}
                      min={10}
                      max={500}
                      step={10}
                      className="flex-1 bg-transparent outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Row 2: Date Posted + Seniority */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Date Posted</Label>
                  <MultiSelect
                    options={DATE_POSTED_OPTIONS}
                    selected={datePosted}
                    onChange={setDatePosted}
                    placeholder="Select date range…"
                    searchable={false}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Seniority</Label>
                  <MultiSelect
                    options={SENIORITY_OPTIONS}
                    selected={seniority}
                    onChange={setSeniority}
                    placeholder="Select seniority…"
                    searchable={false}
                  />
                </div>
              </div>

              {/* Row 3: Work Type + Employment Type */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Work Type</Label>
                  <MultiSelect
                    options={WORK_TYPE_OPTIONS}
                    selected={workType}
                    onChange={setWorkType}
                    placeholder="Select work type…"
                    searchable={false}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Employment Type</Label>
                  <MultiSelect
                    options={EMPLOYMENT_TYPE_OPTIONS}
                    selected={employmentType}
                    onChange={setEmploymentType}
                    placeholder="Select employment type…"
                    searchable={false}
                  />
                </div>
              </div>

              {/* Row 4: Relevance + Location */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Relevance</Label>
                  <MultiSelect
                    options={RELEVANCE_OPTIONS}
                    selected={relevance}
                    onChange={setRelevance}
                    placeholder="Select relevance…"
                    searchable={false}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Location</Label>
                  <TagInput tags={locations} onChange={setLocations} placeholder="e.g. Mumbai, India" />
                </div>
              </div>

              {/* Row 5: Industries full width */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Industries ({INDUSTRIES.length} available)
                </Label>
                <MultiSelect
                  options={INDUSTRIES}
                  selected={industries}
                  onChange={setIndustries}
                  placeholder="Search and select industries…"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <Button variant="ghost" onClick={() => setStep(2)}>
                  <ChevronLeft className="h-4 w-4 mr-1" /> Back
                </Button>
                <Button onClick={goToStep4}>
                  View Job Cards <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 4 — Run Cards */}
          {step === 4 && (
            <div className="space-y-4">
              {allSuccess && (
                <div className="rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm font-medium text-green-400">
                  All runs triggered. Check the Runs page for results.
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                {jobCards.map((card) => {
                  const isRunningCard = card.status === "running";
                  const isSelectable = card.status !== "success" && !isRunningCard;
                  const isSelected = selectedCardTitle === card.title;
                  const anyRunning = jobCards.some(c => c.status === "running");
                  return (
                    <div
                      key={card.title}
                      onClick={() => {
                        if (!isSelectable) return;
                        if (pipelineState === 'done' || pipelineState === 'aborted') {
                          setPipelineState('idle');
                          setPipelineError(null);
                        }
                        setSelectedCardTitle(isSelected ? "" : card.title);
                      }}
                      className={cn(
                        "rounded-xl border p-4 text-left transition-all",
                        isRunningCard
                          ? "border-amber-500 bg-amber-500/10 animate-pulse cursor-default"
                          : isSelected
                          ? "border-primary bg-primary/10 cursor-pointer"
                          : isSelectable
                          ? "border-border bg-background/50 hover:border-primary/50 cursor-pointer"
                          : "border-border bg-background/20 opacity-60 cursor-default"
                      )}
                    >
                      <p className="font-medium text-sm">{card.title}</p>
                      <p className="text-muted-foreground text-xs mt-0.5">{selectedGroup}</p>
                      <div className="mt-2 flex items-center justify-between">
                        <div>
                          {card.status === "pending" && (
                            <Badge variant="secondary">Pending</Badge>
                          )}
                          {card.status === "running" && (
                            <Badge className="bg-amber-500/20 text-amber-400 border border-amber-500/30">
                              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                              Running
                            </Badge>
                          )}
                          {card.status === "success" && (
                            <Badge className="bg-green-500/20 text-green-400 border border-green-500/30">
                              <Check className="h-3 w-3 mr-1" />
                              Success
                            </Badge>
                          )}
                          {card.status === "failed" && (
                            <Badge className="bg-red-500/20 text-red-400 border border-red-500/30">
                              Failed
                            </Badge>
                          )}
                          {card.status === "cancelled" && (
                            <Badge className="bg-red-500/20 text-red-400 border border-red-500/30">
                              Cancelled
                            </Badge>
                          )}
                        </div>
                        <div onClick={e => e.stopPropagation()}>
                          {card.status === "running" && pipelineRunIdRef.current && (
                            <button
                              type="button"
                              onClick={stopRun}
                              className="flex items-center gap-1 rounded px-2 py-1 text-xs bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-colors"
                            >
                              <Square className="h-3 w-3" /> Stop
                            </button>
                          )}
                          {card.status === "pending" && (
                            <button
                              type="button"
                              onClick={() => startSingleRun(card.title)}
                              disabled={anyRunning}
                              className={cn(
                                "flex items-center gap-1 rounded px-2 py-1 text-xs transition-colors",
                                anyRunning
                                  ? "bg-muted text-muted-foreground border border-border cursor-not-allowed opacity-50"
                                  : "bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30"
                              )}
                            >
                              <Play className="h-3 w-3" /> Start
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Phase label */}
              {activePhaseLabel && (
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  {isPipelineActive && (
                    <Loader2 className="h-3 w-3 animate-spin shrink-0" />
                  )}
                  {activePhaseLabel}
                </p>
              )}

              {/* Abort error banner */}
              {pipelineState === 'aborted' && pipelineError && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-sm text-destructive mt-3">
                  <p className="font-medium mb-0.5">Run aborted</p>
                  <p className="opacity-80 text-xs">{pipelineError}</p>
                </div>
              )}

              {/* Summary bar */}
              <div className="rounded-lg bg-muted/40 px-4 py-2 text-xs text-muted-foreground">
                GeoID: {geoId || "—"} · Posted: {datePosted[0] ?? "—"} · Max: {maxItems} · Levels:{" "}
                {seniority.length > 0 ? seniority.join(", ") : "—"}
              </div>

              <div className="flex items-center justify-between pt-2">
                <Button variant="ghost" onClick={() => setStep(3)}>
                  <ChevronLeft className="h-4 w-4 mr-1" /> Back
                </Button>
                <Button onClick={handleStartRun} disabled={!selectedCardTitle || pipelineState !== 'idle'}>
                  <Play className="h-4 w-4 mr-1" /> Start Run
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
