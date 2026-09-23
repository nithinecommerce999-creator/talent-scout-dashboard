# Talent Scout Dashboard — User Guide

**Website:** https://incomparable-starlight-0917b8.netlify.app  
**n8n Workflows:** https://primary-production-9f142.up.railway.app/projects/BqF5h9wCe0eLo6qE/workflows

---

## Table of Contents

1. [Overview](#1-overview)
2. [Workflow Architecture](#2-workflow-architecture)
3. [Starting a New Run](#3-starting-a-new-run)
4. [Monitoring a Run](#4-monitoring-a-run)
5. [Generating Email Drafts](#5-generating-email-drafts)
6. [Viewing Results](#6-viewing-results)
7. [Exporting Data](#7-exporting-data)
8. [Daily Backup Migration](#8-daily-backup-migration)
9. [Error Reference](#9-error-reference)
10. [Diagnosing Errors in n8n](#10-diagnosing-errors-in-n8n)
11. [External Services & Credentials](#11-external-services--credentials)
12. [Quick Troubleshooting Checklist](#12-quick-troubleshooting-checklist)

---

## 1. Overview

The Talent Scout Dashboard automates finding hiring companies and their decision-maker contacts (POC leads) from LinkedIn job postings.

**End-to-end flow:**

```
You configure a run in the dashboard
    → Phase 1: LinkedIn jobs scraped via Apify (HarvestAPI)
    → Phase 2A: Recruiter LinkedIn profiles scraped (Apify)
    → Phase 2B: POC leads acquired via Apollo, scored & ranked
    → Phase 3: Emails validated in batches of 20 (Apify)
    → Phase 4 (optional): Gmail drafts generated per verified contact
    → Results saved to Supabase, visible in dashboard
```

**Key terms:**

| Term | Meaning |
|------|---------|
| Run | One execution of the full pipeline for a set of job titles |
| Phase 1 | Scrape LinkedIn jobs + companies via HarvestAPI Apify actor |
| Phase 2A | Scrape LinkedIn recruiter profiles from job posts (batches of 10) |
| Phase 2B | Acquire POC leads via Apollo, score/rank by seniority + email |
| Phase 3 | Validate emails in batches of 20 via Apify email validator |
| Phase 4 | Generate personalised Gmail drafts for verified contacts |
| POC Lead | Ranked decision-maker contact at a hiring company |
| Unidentified POC | Person found by Apollo but couldn't be linked to a company |
| No POC | Company where Apollo returned zero usable contacts |
| Daily Migration | Nightly Supabase sync from main DB to backup DB (2 AM) |


---

## 2. Workflow Architecture

There are 6 n8n workflows. Here is what each one does and how they connect.

### Phase 1 — HarvestAPI Job Search
**Trigger:** HTTP POST webhook  
**Webhook path:** `/webhook/harvestapi-jobs-pipeline-v2`  
**Triggered by:** The dashboard "Start New Run" wizard

**What it does step by step:**
1. Receives search parameters (job titles, industry IDs, geo, seniority, etc.)
2. Validates that `jobTitles` is not empty — throws if missing
3. Checks today's existing runs in Supabase to assign a run sequence number (e.g. "2026-07-23 Run 2 (2nd run of day)")
4. Fetches all existing `company_uid` values from Supabase to use for deduplication
5. Calls the **HarvestAPI LinkedIn Job Search** Apify actor (actor ID: `zn01OAlzP853oqn4Z`, timeout 600s)
6. Applies 4 filters to the results:
   - Removes non-English rows and staffing/recruiting companies
   - Removes jobs with more than **30 applicants**
   - Deduplicates companies already in Supabase or seen in the current batch
   - Removes companies with **500+ employees**
7. Saves the run record and job/company data to Supabase
8. Marks `phase1` as started in `run_phases`
9. Calls Phase 2A and Phase 2B as sub-workflows
10. Marks `phase1` as completed, updates `run_phases`

**Data saved to:** `runs`, `job_details`, `companies`, `run_phases`

---

### Phase 2A — LinkedIn POC Scraper
**Trigger:** Called as a sub-workflow by Phase 1  
**What it does:**
1. Receives job records that have a `recruiter_profile` LinkedIn URL
2. Deduplicates recruiter URLs (one person may appear on multiple job posts)
3. Processes in **batches of 10** profiles
4. For each batch, calls **HarvestAPI LinkedIn Profile Scraper** Apify actor (actor ID: `LpVuK3Zozwuipa5bp`) — mode: "Profile details + email search"
5. Extracts: name, job title, headline, email, city, state, connections, followers, profile picture
6. Re-associates each scraped profile back to all job/company references
7. Upserts into `recruiter_poc_scraped` table (matching on `job_id` + `profile_linkedin`)

**Data saved to:** `recruiter_poc_scraped`

---

### Phase 2B — POC Lead Acquisition & Ranking
**Trigger:** Called as a sub-workflow by Phase 1  
**What it does:**
1. Receives company IDs from Phase 1
2. Reads company details (website, industry, size, LinkedIn ID) from Supabase
3. Groups companies into batches of 10
4. For each batch, calls the **Apollo POC enrichment** Apify actor — searches by company domain for contacts with seniority: owner, c-suite, director, VP, head, manager
5. Matches returned leads to companies using two methods:
   - **LinkedIn UID match** (company_linkedin_uid from Apollo vs company_linkedin_id in DB)
   - **Email domain match** (lead's work email domain vs company website domain)
6. Routes leads into 3 categories:
   - `raw_lead` — matched to a company → saved to `poc_leads`
   - `unidentified` — valid person but no company match → saved to `unidentified_poc_leads`
   - `no_poc` — company got zero leads → saved to `no_poc_companies`
7. Scores and ranks every `raw_lead`:
   - **Email score** (30 pts work email, 20 pts personal, 5 pts LinkedIn only)
   - **POC match score** (up to 50 pts — does the lead's title match what was searched for?)
   - **HR fallback score** (20 pts if HR/talent/people ops title)
   - **Seniority score** (15 pts C-suite, 13 VP, 11 Director, 8 Manager, 5 Senior)
   - **LinkedIn bonus** (5 pts if LinkedIn URL present)
8. Saves ranked POCs to `ranked_pocs` table
9. Calls Phase 3 with the ranked POC data

**Data saved to:** `poc_leads`, `ranked_pocs`, `unidentified_poc_leads`, `no_poc_companies`


---

### Phase 3 — Email Validation
**Trigger:** Called as a sub-workflow by Phase 2B  
**What it does:**
1. Receives all ranked POC records with a `selected_email`
2. Processes in **batches of 20 emails** at a time
3. For each batch, calls **Easy Bulk Email Validator** Apify actor (actor ID: `QM5YJIYftbZQiNpgN`, timeout 10s per email)
4. Maps each validation result back to its `poc_id`
5. Saves results (email_quality, email_result, subresult) to `ranked_poc_email_validations`
6. After all batches complete, marks the run `pipeline_status = completed` in Supabase

**Email result values:**
| Result | Quality | Meaning |
|--------|---------|---------|
| `ok` | `good` | Verified — email is valid and deliverable |
| `ok` | *(other)* | Acceptable — passed but not top quality |
| `error` | — | Invalid or undeliverable |
| `null` | — | Not validated yet |

**Data saved to:** `ranked_poc_email_validations`, updates `runs.pipeline_status`

---

### Phase 4 — Email Draft Generator
**Trigger:** HTTP POST webhook (no authentication)  
**Webhook path:** `/webhook/email-draft-generator`  
**Production URL:** `https://primary-production-9f142.up.railway.app/webhook/email-draft-generator`

**What it does:**
1. Receives a `run_id`
2. Fetches all ranked POCs for that run with a `selected_email`
3. Filters to only POCs with `email_result = ok` (validated emails only)
4. **Caps at 3 contacts per company** — prevents bursting near-identical emails at one company which triggers spam filters
5. Fetches active email templates from the `email_templates` Supabase table
6. Fetches last 300 draft records to know which template each company received most recently
7. **Anti-spam template rotation** — shuffles templates and avoids repeating the same template for a company across runs. Never assigns the same template twice in a row to the same company
8. Renders personalised variables per contact:
   - `{first_name}` → POC's first name
   - `{full_name}` → POC's full name
   - `{company_name}` → company name
   - `{job_title}` → the role being hired for
   - `{poc_title}` → the contact's own job title
   - `{location}` → company location
9. **Paces draft creation** — waits 3–8 seconds randomly between each draft to stay under provider limits
10. **Routes by provider** — currently Gmail-only; Outlook node exists but is disabled until credential is connected. Change `ACTIVE_PROVIDERS = ['gmail']` to `['gmail','outlook']` to enable 50/50 split
11. Creates a **Gmail draft** (or Outlook draft when enabled) for each contact
12. Saves every draft's status, provider, and mailbox draft ID to `email_drafts` table
13. **Loop safeguard** — aborts if iteration count exceeds queue size + 10, preventing runaway loops
14. Reports final summary: total attempted, succeeded, failed, Gmail/Outlook split
15. Updates run status to `emails_drafted` or `emails_drafted_with_errors`

**Data saved to:** `email_drafts`, updates `runs.pipeline_status`

**Requirements:**
- Gmail OAuth2 credential must be connected in n8n (`Gmail account`)
- At least one active template in `email_templates` with `is_active = true`

---

### Daily Migration — Main to Backup
**Trigger:** Scheduled — runs automatically at **2:00 AM every day**  
**What it does:**
1. Fetches all `run_id` values from the main Supabase database
2. Calls a Supabase Edge Function (`migrate-from-main`) on the backup database
3. The Edge Function copies all data for those run IDs into the backup Supabase project

**Purpose:** The dashboard uses two Supabase projects. The main DB (`sgnxqspc...`) is where n8n writes data. The backup DB (`thuxlgab...`) is used by the dashboard's summary stats and charts. This daily sync keeps them in sync.

**No action needed** — this runs fully automatically. If it fails, the dashboard stats may be 1 day behind but no data is lost.

---

## 3. Starting a New Run

### Step 1 — Open the wizard
Click **"Start New Run"** on the Dashboard or Runs page.

### Step 2 — Select an Industry
Choose an industry group (e.g. Manufacturing, Healthcare, Finance). This maps to a set of LinkedIn industry IDs sent to the Apify actor.

### Step 3 — Select Job Titles
- The app calls Gemini AI to generate 12 relevant job titles for the selected industry
- Click the pills to select titles — you need at least 1
- Add custom titles by typing and pressing Enter or clicking Add
- Each selected title = one separate sub-run executed sequentially

### Step 4 — Set Parameters

| Parameter | What it does | Default |
|-----------|-------------|---------|
| GeoID | LinkedIn geography ID | 103644278 (United States) |
| Max Items | Max job results per title | 100 |
| Date Posted | How recent the postings should be | Past 24h |
| Seniority Level | Filter by seniority | Mid-Senior, Director |
| Work Type | On-site / Remote / Hybrid | All three |
| Employment Type | Full-time / Part-time / Contract etc | Full-time |
| Sort By | Most recent or most relevant | Most recent |

**Common GeoIDs:**
- United States: `103644278`
- United Kingdom: `101165590`
- Canada: `101174742`
- Australia: `101452733`
- India: `102713980`

**Important filters applied automatically by the workflow:**
- Companies with 500+ employees are excluded
- Jobs with more than 30 applicants are excluded
- Staffing, recruiting, IT services, and non-English companies are excluded
- Companies already in your database are skipped (no duplicates)

### Step 5 — Run
Click **"Start All Runs"**. The wizard moves to the live status panel. Titles run one at a time sequentially.


---

## 4. Monitoring a Run

Once a run starts, the Step 4 panel shows live status per job title card. The dashboard polls Supabase every 10 seconds.

### Card Statuses

| Status | Color | Meaning |
|--------|-------|---------|
| Pending | Grey | Waiting to start |
| Running | Blue spinner | Currently being processed |
| Success | Green | Completed successfully |
| Failed | Red | Pipeline encountered an error |
| Cancelled | Muted | Manually stopped |

### Live Phase Labels

| Label shown | What's happening |
|-------------|-----------------|
| Phase 1 — scraping jobs & companies… | Apify HarvestAPI actor is running |
| Phase 2 — scraping recruiter profiles… | Phase 1 done, Phase 2A running |
| Phase 2 — acquiring & ranking POC leads… | Phase 2A done, Phase 2B/Apollo running |
| Phase 3 — validating emails… | Email validator batching through contacts |
| Complete | All phases finished |
| Aborted | Stopped due to error (see toast message for reason) |

### Timeouts the dashboard enforces

| Condition | Timeout | Error shown |
|-----------|---------|-------------|
| No run record found after trigger | 35 min total | "Pipeline timed out" |
| Phase 1 done but Phase 2 never started | 5 min | "Phase 2 never triggered" |
| Phase 2B done but Phase 3 never started | 10 min | "Phase 3 never triggered" |

### Stop a Run
Click **Stop** at any time. The current run is marked `cancelled` in Supabase and polling stops.

---

## 5. Generating Email Drafts

Phase 4 is triggered manually from the Run Details page after a run completes.

**Requirements before generating drafts:**
- The run must be completed (green status)
- At least some POC leads must have validated emails (`email_result = ok`)
- Active email templates must exist in the `email_templates` Supabase table with `is_active = true`
- Gmail OAuth2 credentials must be connected in n8n

**Steps:**
1. Go to **Runs** → click **View** on a completed run
2. Click the **POC Leads** tab — confirm there are Verified (green) or Acceptable (yellow) email badges
3. Click **"Generate Email Drafts"** button
4. Wait ~15–30 seconds — the workflow runs and the drafts section will populate
5. Each draft appears with subject, body, recipient name, and status

**What the workflow does per contact:**
- Caps at **3 drafts per company** per run (anti-spam)
- Picks a template using **shuffle rotation** — avoids repeating the same template a company received last time
- Fills in personalised placeholders: name, company, hiring role, location
- Waits **3–8 seconds** between each draft (pacing)
- Currently uses **Gmail only** — Outlook is prepared but disabled until credentials are set up

**Draft statuses:**
- `draft` — created successfully in Gmail (or Outlook)
- `failed` — provider node errored; draft still saved to Supabase for reference

**Run status after completion:**
- `emails_drafted` — all drafts succeeded
- `emails_drafted_with_errors` — some failed

**Note:** The "Generate Email Drafts" button only appears when at least one POC lead has `email_result = ok`.

---

## 6. Viewing Results

### Dashboard
High-level stats + charts:
- Total Jobs, Active Companies (have POCs), Inactive Companies (no POC), Total Runs, POC Leads, All Companies
- Companies by Industry chart
- Runs Over Time chart
- Top Clients by Jobs
- Recent POC Leads with confidence scores

### Runs Page
Full run history. Select multiple runs via checkboxes to export a combined report.

### Run Details Page
Click **View** on any run. Tabs:

| Tab | Contents |
|-----|----------|
| Companies | All companies scraped in this run |
| Jobs | All job postings found (up to 100 shown) |
| Unidentified | Contacts found by Apollo but not linked to a company |
| Recruiter POCs | LinkedIn profiles scraped from job posts (Phase 2A) |
| POC Leads | Ranked decision-maker contacts with email validation badges |

#### Email Validation Badges on POC Leads tab

| Badge | Meaning |
|-------|---------|
| Verified (green) | `email_result=ok` AND `email_quality=good` |
| Acceptable (yellow) | `email_result=ok` but lower quality |
| Unvalidated (grey) | Phase 3 hasn't run yet or no email found |
| Invalid (red) | `email_result` is not ok |

### Companies Page
All companies across all runs. Filter by industry category or search by name. Click **View** to open a company's full profile.

### POC Leads Page
All ranked POCs across all runs. Filter by match type:
- **Direct** — lead matched via LinkedIn UID or email domain to the hiring company
- **HR Fallback** — no direct POC match found, HR contact used instead
- **Inferred** — contact inferred from available signals

---

## 7. Exporting Data

### Single Run Report (Excel, 2 sheets)
Run Details page → **Download Report**
- Sheet 1: All POC leads + recruiter POCs consolidated with job and company data
- Sheet 2: Company POC coverage summary (how many companies had POCs vs not)

### Multi-Run Report (Excel, 10 sheets)
Runs page → check multiple runs → **Download Report**
- Sheets: runs, companies, job_details_with_poster, job_details, recruiter_poc_scraped, poc_leads, ranked_pocs, email_validations, unidentified_poc_leads, no_poc_companies

### Companies CSV
Companies page → **CSV** button — exports current filtered page.

### POC Leads CSV
POC Leads page → **CSV** button — exports current filtered page.

---

## 8. Daily Backup Migration

Every day at **2:00 AM**, n8n automatically runs the Daily Migration workflow.

**What it does:** Copies all run data from the main Supabase project to the backup Supabase project. The Dashboard's summary stats (total jobs, active companies, etc.) read from the backup project.

**If it fails:**
- Dashboard stats may be 1 day behind
- No data is lost — the main DB still has everything
- To check: open n8n → find "Daily Migration — Main to Backup" → click Executions → see if latest execution has errors
- To re-run manually: open the workflow → click **Test workflow** (or execute it manually)


---

## 9. Error Reference

These are every error you may see, what caused them, and exactly what to fix.

---

### "Failed to trigger run — Could not reach the webhook"
**Cause:** n8n instance on Railway is down or not responding.  
**Fix:**
1. Open https://primary-production-b6b96.up.railway.app — check if n8n loads
2. If Railway shows the service is sleeping/stopped, restart it from the Railway dashboard
3. Confirm the Phase 1 workflow is **Active** (toggle in top right of the workflow must be ON)

---

### "Webhook returned 404"
**Cause:** Workflow is inactive or the webhook path changed.  
**Fix:**
1. Open n8n → find **Phase 1 — HarvestAPI Job Search**
2. Toggle it to **Active** if it's off
3. Check the Webhook node — path must be exactly `harvestapi-jobs-pipeline-v2`

---

### "Webhook returned 500"
**Cause:** n8n received the request but the workflow threw an internal error immediately (usually the `Extract Search Params` validation node).  
**Fix:**
1. Open n8n → Executions → find the failed execution
2. Click the **Extract Search Params** node → check the error message
3. Most likely cause: `jobTitles` was empty or malformed in the request

---

### "Phase 1 completed with 0 results" / "Pipeline completed with 0 results"
**Cause:** The Apify actor returned no job postings matching your filters.  
**Fix:**
- Change **Date Posted** from "Past 24h" to "Past week"
- Reduce the number of seniority filters
- Try a broader job title (e.g. "Manager" instead of "Finance Manager")
- Verify the GeoID is correct for your target country

---

### "Phase 1 completed successfully but Phase 2 was never triggered"
**Cause:** Phase 1 finished but the node that calls Phase 2A/2B as a sub-workflow failed silently within 5 minutes.  
**Fix:**
1. Open n8n → Phase 1 workflow → Executions → click the run
2. Find the node named **"Call Phase 2A"** or **"Execute Phase 2B"** — check if it's red
3. Look at the error output on that node
4. Verify Phase 2A and Phase 2B workflows are **Active**

---

### "Phase 2B found 0 ranked POC leads"
**Cause:** Apollo returned no contacts for these companies.  
**Possible reasons:**
- Companies are very small or niche with no Apollo data
- All returned leads failed the hard-reject filter (intern, junior, temp roles)
- All leads had no email AND no LinkedIn — dropped by the email gate

**Fix:**
- This is sometimes expected — check the Unidentified tab in Run Details to see if Apollo returned people who just couldn't be matched
- Try industries/job titles that target slightly larger companies

---

### "Phase 2B completed successfully but Phase 3 email validation was never triggered"
**Cause:** Phase 2B finished but Phase 3 wasn't called within 10 minutes.  
**Fix:**
1. Open n8n → Phase 2B workflow → Executions → click the run
2. Find the node that triggers Phase 3 (Execute Workflow node pointing to Phase 3)
3. Check if it's red — look at the error
4. Verify **Phase 3 — Email Validation** workflow is **Active**

---

### "Critical error in [node name]: [message]"
**Cause:** A node in the workflow logged a CRITICAL severity error to the `pipeline_errors` table.  
**Fix:**
1. Note the exact node name in the error message
2. Open n8n → find the relevant workflow → open Executions
3. Click the failed execution → click that specific node
4. Read the full Output/Error tab

---

### "Pipeline timed out after 35 minutes"
**Cause:** The run never reached completed/failed/empty status within 35 minutes.  
**Likely causes:**
- Apify actor is stuck or queued
- One phase is taking much longer than expected due to API rate limits

**Fix:**
1. Open n8n → Executions → find the stuck execution
2. Identify the last node that ran successfully
3. Check if the next node is an Apify actor call — open Apify console to see if the actor is still running
4. If stuck, stop the execution manually in n8n
5. Wait 10–15 minutes before retrying

---

### "No active email templates found" (Phase 4)
**Cause:** The `email_templates` table in Supabase has no rows with `is_active = true`.  
**Fix:** Add at least one active template to the `email_templates` table in Supabase with `is_active = true`.

---

### "No POCs with validated emails found for this run" (Phase 4)
**Cause:** Either Phase 3 hasn't run yet, or all emails came back invalid.  
**Fix:**
- Wait for Phase 3 to complete first
- If Phase 3 ran and all emails are invalid, this run has no contactable leads — try a new run

---

### Dashboard shows blank/stale stats
**Cause:** Daily Migration hasn't run yet today, or it failed.  
**Fix:**
1. Open n8n → Daily Migration workflow → Executions → check last execution status
2. If failed, run it manually: open the workflow → click Test Workflow
3. If it succeeded today and stats are still old, try a hard refresh (Ctrl+Shift+R)


---

## 10. Diagnosing Errors in n8n

### How to open execution logs

1. Go to https://primary-production-b6b96.up.railway.app
2. Log in with your n8n credentials
3. Open the relevant workflow
4. Click **"Executions"** in the left sidebar
5. Click any execution to open it

### Reading an execution

- **Green node** = ran successfully
- **Red node** = failed
- **Grey node** = didn't run (upstream node failed)

Click any node to see three tabs:
- **Input** — data that came into this node
- **Output** — what the node returned
- **Error** — full error message if it failed

### Node map — what each key node does

#### Phase 1
| Node | What it does | What to check if red |
|------|-------------|---------------------|
| Webhook | Receives dashboard trigger | Is it getting the request? Check Input tab |
| Extract Search Params | Validates + normalises payload | jobTitles missing or wrong format |
| Run harvestapi/linkedin-job-search | Calls Apify actor | HTTP status, Apify quota |
| Get dataset items | Reads results from Apify dataset | Dataset ID valid? Actor completed? |
| Filter: Non English rows | Removes garbage data | Check console output for counts |
| Filter: Applicants Count | Drops jobs with >30 applicants | Normal — may filter many rows |
| Filter: Deduplication | Removes companies already in DB | Normal — may drop many |
| Filter: Company Size | Drops companies with 500+ employees | Normal — may drop many |
| Insert Run Record | Saves run to Supabase | Duplicate key = already exists (harmless) |

#### Phase 2A
| Node | What to check if red |
|------|---------------------|
| Run an Actor and get dataset | Apify 429 = rate limit, 401 = bad API key |
| Insert rows in a table | Postgres duplicate = already scraped (harmless) |

#### Phase 2B
| Node | What to check if red |
|------|---------------------|
| Prepare Apify Payload | No companies with website = nothing to search |
| Process & Tag All Leads | Check output counts: raw_lead / unidentified / no_poc |
| Clean → poc_leads | company_uid null = leads dropped (FK guard) |
| Score Leads | Check if all leads are being hard-rejected |

#### Phase 3
| Node | What to check if red |
|------|---------------------|
| Run an Actor | Apify 429 = rate limit, 401 = bad key |
| Insert into Postgres | Duplicate key = already validated (harmless) |
| Update a row | Supabase auth error = service role key expired |

#### Phase 4
| Node | What to check if red |
|------|---------------------|
| Fetch Active Templates | No templates in DB |
| Create Gmail Draft | Gmail OAuth token expired — reconnect credential |
| Insert Draft to Supabase | Duplicate draft for this POC (harmless) |

### Common error patterns in logs

**Rate limit (429):**
```
"statusCode": 429, "message": "Too many requests"
```
→ Wait 30–60 minutes and retry

**Auth error (401):**
```
"statusCode": 401, "message": "Unauthorized"
```
→ Check and update the API key in n8n Credentials (Apify, Supabase, or Gmail)

**Empty Apify results:**
```
"items": []
```
→ Actor returned nothing — search filters may be too narrow

**Supabase duplicate key:**
```
"duplicate key value violates unique constraint"
```
→ Data was already saved — this is harmless, workflow continues

**Gmail OAuth expired:**
```
"invalid_grant" or "Token has been expired or revoked"
```
→ Go to n8n Credentials → Gmail → reconnect the OAuth2 account

---

## 11. External Services & Credentials

These are the external services used by the workflows. If any of them go down or their credentials expire, the relevant phase will fail.

| Service | Used in | What it does | Credential in n8n |
|---------|---------|-------------|------------------|
| Apify | Phase 1, 2A, 3 | Runs LinkedIn scrapers + email validator | `Apify account` |
| Apollo (via Apify) | Phase 2B | Finds POC leads by company domain | Part of Apify actor |
| Supabase (main) | All phases | Stores all pipeline data | `Supabase account` + API key in HTTP nodes |
| Supabase (backup) | Daily Migration | Backup database for dashboard stats | Edge Function URL |
| Gmail OAuth2 | Phase 4 | Creates email drafts | `Gmail account` |
| Gemini AI | Dashboard (frontend) | Generates job title suggestions | API key in code |

**If Apify shows a quota warning:** Log into https://console.apify.com and check your usage. The HarvestAPI actors charge per run.

**To update a credential in n8n:** Settings (gear icon) → Credentials → find the credential → edit.

---

## 12. Quick Troubleshooting Checklist

Use this when a run fails and you're not sure where to start.

- [ ] Is n8n online? → Open https://primary-production-b6b96.up.railway.app
- [ ] Is Phase 1 workflow Active? → n8n → workflow → toggle must be ON
- [ ] What phase did it fail at? → Read the error toast on the dashboard
- [ ] Open n8n → Phase 1 Executions → find the most recent run → look for red nodes
- [ ] Is the error on an Apify node?
  - 429 → wait 30–60 min and retry
  - 401 → update Apify API key in n8n Credentials
  - Empty results → broaden filters
- [ ] Is the error on a Supabase/Postgres node?
  - Duplicate key → harmless, ignore
  - Auth error → check Supabase service role key
- [ ] Did Phase 1 return 0 results? → Broaden date range, seniority, or job title
- [ ] Did Phase 2 never start? → Check Phase 2A and 2B workflows are Active
- [ ] Did Phase 3 never start? → Check Phase 3 workflow is Active
- [ ] Is the run stuck after 35 min? → Stop manually in n8n → Executions
- [ ] Are dashboard stats stale? → Check Daily Migration last execution

---

*Last updated: July 2026*
