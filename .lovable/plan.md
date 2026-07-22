

# Dashboard Comprehensive Improvement Plan

## Summary
Implement all approved improvements: split active/inactive companies, add client cards, change bar chart to line chart, add new pages/tabs (No POC Companies, Unidentified POC Leads, Job Details With Poster, Recruiter POC Scraped), add company navigation from Run details, visual polish with framer-motion, glassmorphism, animated counters, filters, sorting, export, and global search.

## Technical Details

### 1. Dashboard Home Page (`Dashboard.tsx`)
- **Split company stat** into "Active Companies" (those with entries in `ranked_pocs`) and "Inactive Companies" (those in `no_poc_companies`)
- **Add Client Details card** — small list of top 5 companies by job count
- **Change bar chart to line chart** (Recharts `LineChart` instead of `BarChart`)
- **Add "Runs Over Time" area chart** — aggregate runs by date from `runs.run_date`
- **Add "Recent POC Leads" widget** — latest 5 ranked POCs
- **Animated count-up numbers** on stat cards using a simple `useCountUp` hook
- Install `framer-motion` for page transitions

### 2. Data Hooks (`useDashboardData.ts`)
Add new hooks:
- `useActiveInactiveCompanies()` — count companies with POCs vs in `no_poc_companies`
- `useRunsOverTime()` — aggregate run counts by date
- `useRecentPocs()` — latest 5 ranked POCs
- `useNoPocCompanies(page, search)` — paginated `no_poc_companies`
- `useUnidentifiedPocLeads(page, search)` — paginated `unidentified_poc_leads`
- `useJobDetailsWithPoster(companyUid)` — from `job_details_with_poster` by company
- `useRecruiterPocScraped(companyUid)` — from `recruiter_poc_scraped` by company
- `useRunNoPocCompanies(runId)` — no_poc_companies for a run (placeholder, no run_id yet)
- `useRunUnidentifiedPocs(runId)` — unidentified_poc_leads by run_id
- `useRunRecruiterPocScraped(runId)` — recruiter_poc_scraped by run_id

### 3. Sidebar Navigation (`AppLayout.tsx`)
Add new nav items:
- "No POC Companies" → `/no-poc-companies`
- "Unidentified Leads" → `/unidentified-leads`

### 4. New Pages

**`NoPocCompanies.tsx`** — Paginated table from `no_poc_companies` with search. Columns: company_name, company_website, company_industry, job_titles_searched, run_date.

**`UnidentifiedPocLeads.tsx`** — Paginated table from `unidentified_poc_leads` with search. Columns: full_name, job_title, email, industry, searched_domain, inferred_domain, city, country, run_id.

### 5. Updated Pages

**`CompanyDetails.tsx`** — Add two new sections:
- **Job Details With Poster**: table from `job_details_with_poster` showing job_title, location, recruiter_name, recruiter_profile (link), base_salary, seniority_level
- **Recruiter POC Scraped**: table from `recruiter_poc_scraped` showing full_name, job_title, email, linkedin (profile_linkedin), connections, followers, is_premium badge, is_verified badge, profile_pic avatar
- Add email validation badges on ranked POCs by joining `ranked_poc_email_validations` (fetch by poc_id)

**`RunDetails.tsx`** — Add tabs using Radix Tabs:
- **Companies tab** (existing) — add "View" button linking to `/companies/:id`
- **Jobs tab** (existing)
- **No POC Companies tab** — companies from `no_poc_companies` (will show "run_id not yet available" note)
- **Unidentified Leads tab** — from `unidentified_poc_leads` filtered by run_id
- **Recruiter POCs tab** — from `recruiter_poc_scraped` filtered by run_id
- Company rows in all tabs should be clickable → navigate to company details

**`Runs.tsx`** — Company names in run rows clickable where applicable

**`Companies.tsx`** — Add column sorting (click headers), industry filter dropdown, CSV export button

**`PocLeads.tsx`** — Add filters for match_type, seniority, industry; add CSV export

### 6. Visual & UX Overhaul

**`index.css`** — Add utility classes:
- `.glass` — `backdrop-blur-xl bg-card/60 border border-white/10`
- Shimmer keyframe animation for loading states

**`framer-motion`** — Wrap page content in `motion.div` with fade+slide transitions

**Glassmorphism cards** — Apply glass effect to stat cards and key sections

**Empty states** — Illustrated empty states with relevant icons and CTA buttons

**Breadcrumbs** — Add breadcrumb nav on CompanyDetails and RunDetails pages

### 7. Global Search (`Cmd+K`)
- Create `GlobalSearch.tsx` component using `CommandDialog` from cmdk (already have `command.tsx`)
- Search across companies, POCs, and runs
- Accessible from sidebar with search icon + keyboard shortcut

### 8. Filters & Export Utilities
- Create `useTableSort` hook for column sorting
- Create `exportToCsv` utility function
- Create `FilterBar` component for reusable filter dropdowns

### 9. Routing Updates (`App.tsx`)
Add routes:
- `/no-poc-companies` → `NoPocCompanies`
- `/unidentified-leads` → `UnidentifiedPocLeads`

### File Change Summary

| File | Action |
|------|--------|
| `package.json` | Add `framer-motion` |
| `src/index.css` | Add glass utilities, shimmer animation |
| `src/App.tsx` | Add 2 new routes |
| `src/components/AppLayout.tsx` | Add 2 nav items, global search trigger |
| `src/components/GlobalSearch.tsx` | New — Cmd+K search dialog |
| `src/components/Breadcrumbs.tsx` | New — reusable breadcrumb component |
| `src/hooks/useDashboardData.ts` | Add ~10 new query hooks |
| `src/hooks/useCountUp.ts` | New — animated counter hook |
| `src/hooks/useTableSort.ts` | New — column sorting hook |
| `src/lib/exportCsv.ts` | New — CSV export utility |
| `src/components/FilterBar.tsx` | New — reusable filter component |
| `src/pages/Dashboard.tsx` | Rework: split stats, line chart, runs-over-time chart, recent POCs, glassmorphism, animated counters |
| `src/pages/Companies.tsx` | Add sorting, industry filter, CSV export |
| `src/pages/CompanyDetails.tsx` | Add job_details_with_poster section, recruiter_poc_scraped section, email validation badges, breadcrumbs |
| `src/pages/Runs.tsx` | Minor: ensure company links work |
| `src/pages/RunDetails.tsx` | Add tabs: No POC Companies, Unidentified Leads, Recruiter POCs; breadcrumbs; company navigation |
| `src/pages/PocLeads.tsx` | Add filters, CSV export |
| `src/pages/NoPocCompanies.tsx` | New page |
| `src/pages/UnidentifiedPocLeads.tsx` | New page |

