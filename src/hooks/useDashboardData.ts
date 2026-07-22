import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useStats() {
  return useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const [jobsRes, companiesRes, runsRes, pocRes, noPocRes] = await Promise.all([
        supabase.from("job_details").select("job_id", { count: "exact", head: true }),
        supabase.from("companies").select("company_uid", { count: "exact", head: true }),
        supabase.from("runs").select("run_id", { count: "exact", head: true }),
        supabase.from("poc_leads").select("poc_id", { count: "exact", head: true }),
        supabase.from("no_poc_companies").select("id", { count: "exact", head: true }),
      ]);

      // Active = companies that have ranked POCs
      const activeRes = await supabase.from("ranked_pocs").select("company_uid");
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
}

export function useRuns() {
  return useQuery({
    queryKey: ["runs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("runs")
        .select("*")
        .order("started_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });
}

export function useIndustryChart() {
  return useQuery({
    queryKey: ["industry-chart"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("industry_category");
      if (error) throw error;

      const counts: Record<string, number> = {};
      data.forEach((c) => {
        const cat = c.industry_category || "Unknown";
        counts[cat] = (counts[cat] || 0) + 1;
      });

      return Object.entries(counts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 15);
    },
  });
}

export function useRunsOverTime() {
  return useQuery({
    queryKey: ["runs-over-time"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("runs")
        .select("run_date, record_count")
        .order("run_date", { ascending: true });
      if (error) throw error;

      const byDate: Record<string, { runs: number; records: number }> = {};
      (data ?? []).forEach((r) => {
        const d = r.run_date;
        if (!byDate[d]) byDate[d] = { runs: 0, records: 0 };
        byDate[d].runs += 1;
        byDate[d].records += r.record_count ?? 0;
      });

      return Object.entries(byDate).map(([date, v]) => ({
        date,
        runs: v.runs,
        records: v.records,
      }));
    },
  });
}

export function useRecentPocs() {
  return useQuery({
    queryKey: ["recent-pocs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ranked_pocs")
        .select("ranked_poc_id, full_name, company_name, job_title, partner_confidence_score, lead_rank")
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useTopClients() {
  return useQuery({
    queryKey: ["top-clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("job_details")
        .select("company_id");
      if (error) throw error;

      const counts: Record<number, number> = {};
      (data ?? []).forEach((j) => {
        if (j.company_id) counts[j.company_id] = (counts[j.company_id] || 0) + 1;
      });

      const topIds = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

      if (topIds.length === 0) return [];

      const { data: companies } = await supabase
        .from("companies")
        .select("company_uid, company_name, company_industry")
        .in("company_uid", topIds.map(([id]) => Number(id)));

      return topIds.map(([id, jobCount]) => {
        const c = companies?.find((co) => co.company_uid === Number(id));
        return {
          company_uid: Number(id),
          company_name: c?.company_name ?? "Unknown",
          company_industry: c?.company_industry ?? null,
          jobCount,
        };
      });
    },
  });
}

export function useCompanies(page: number, pageSize = 25, search = "", industryFilter = "") {
  return useQuery({
    queryKey: ["companies", page, pageSize, search, industryFilter],
    queryFn: async () => {
      let query = supabase
        .from("companies")
        .select("*", { count: "exact" });

      if (search) {
        query = query.ilike("company_name", `%${search}%`);
      }
      if (industryFilter) {
        query = query.eq("industry_category", industryFilter);
      }

      const { data, error, count } = await query
        .order("company_uid", { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (error) throw error;
      return { data: data ?? [], total: count ?? 0 };
    },
  });
}

export function useCompanyDetails(companyUid: number) {
  return useQuery({
    queryKey: ["company", companyUid],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .eq("company_uid", companyUid)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!companyUid,
  });
}

export function useCompanyJobs(companyUid: number) {
  return useQuery({
    queryKey: ["company-jobs", companyUid],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("job_details")
        .select("job_id, job_title, location, posted_time, applicants, base_salary, seniority_level, employment_type, job_url")
        .eq("company_id", companyUid)
        .order("posted_time", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!companyUid,
  });
}

export function useCompanyRankedPocs(companyUid: number) {
  return useQuery({
    queryKey: ["company-ranked-pocs", companyUid],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ranked_pocs")
        .select("*")
        .eq("company_uid", companyUid)
        .order("lead_rank", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!companyUid,
  });
}

export function useCompanyAllPocs(companyUid: number) {
  return useQuery({
    queryKey: ["company-all-pocs", companyUid],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("poc_leads")
        .select("*")
        .eq("company_uid", companyUid);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!companyUid,
  });
}

export function useJobDetailsWithPoster(companyUid: number) {
  return useQuery({
    queryKey: ["job-details-poster", companyUid],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("job_details_with_poster")
        .select("*")
        .eq("company_id", companyUid)
        .order("posted_time", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!companyUid,
  });
}

export function useRecruiterPocScraped(companyUid: number) {
  return useQuery({
    queryKey: ["recruiter-poc-scraped", companyUid],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recruiter_poc_scraped")
        .select("*")
        .eq("company_uid", companyUid);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!companyUid,
  });
}

export function useEmailValidations(pocIds: number[]) {
  return useQuery({
    queryKey: ["email-validations", pocIds],
    queryFn: async () => {
      if (pocIds.length === 0) return [];
      const { data, error } = await supabase
        .from("ranked_poc_email_validations")
        .select("*")
        .in("poc_id", pocIds);
      if (error) throw error;
      return data ?? [];
    },
    enabled: pocIds.length > 0,
  });
}

export function useNoPocCompanies(page: number, pageSize = 25, search = "") {
  return useQuery({
    queryKey: ["no-poc-companies", page, pageSize, search],
    queryFn: async () => {
      let query = supabase.from("no_poc_companies").select("*", { count: "exact" });
      if (search) {
        query = query.ilike("company_name", `%${search}%`);
      }
      const { data, error, count } = await query
        .order("id", { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);
      if (error) throw error;
      return { data: data ?? [], total: count ?? 0 };
    },
  });
}

export function useUnidentifiedPocLeads(page: number, pageSize = 25, search = "") {
  return useQuery({
    queryKey: ["unidentified-poc-leads", page, pageSize, search],
    queryFn: async () => {
      let query = supabase.from("unidentified_poc_leads").select("*", { count: "exact" });
      if (search) {
        query = query.ilike("full_name", `%${search}%`);
      }
      const { data, error, count } = await query
        .order("id", { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);
      if (error) throw error;
      return { data: data ?? [], total: count ?? 0 };
    },
  });
}

export function useRunUnidentifiedPocs(runId: string) {
  return useQuery({
    queryKey: ["run-unidentified-pocs", runId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("unidentified_poc_leads")
        .select("*")
        .eq("run_id", runId)
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!runId,
  });
}

export function useRunRecruiterPocScraped(runId: string) {
  return useQuery({
    queryKey: ["run-recruiter-poc-scraped", runId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recruiter_poc_scraped")
        .select("*")
        .eq("run_id", runId)
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!runId,
  });
}

export function useIndustryCategories() {
  return useQuery({
    queryKey: ["industry-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("industry_category");
      if (error) throw error;
      const cats = new Set<string>();
      (data ?? []).forEach((c) => {
        if (c.industry_category) cats.add(c.industry_category);
      });
      return Array.from(cats).sort();
    },
  });
}
