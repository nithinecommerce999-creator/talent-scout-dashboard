import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('@/components/PageTransition', () => ({
  PageTransition: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('@/components/Breadcrumbs', () => ({
  Breadcrumbs: () => null,
}));

vi.mock('@/hooks/useDashboardData', () => ({
  useRunUnidentifiedPocs:   vi.fn().mockReturnValue({ data: [] }),
  useRunRecruiterPocScraped: vi.fn().mockReturnValue({ data: [] }),
  // CreateRun doesn't use hooks from here, but provide them anyway
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: vi.fn() },
}));

vi.mock('xlsx', () => ({
  utils: {
    book_new:          vi.fn(() => ({})),
    aoa_to_sheet:      vi.fn(() => ({ '!ref': 'A1' })),
    book_append_sheet: vi.fn(),
  },
  writeFile: vi.fn(),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useParams: () => ({ id: 'test-run' }) };
});

// ── Imports after mocks ────────────────────────────────────────────────────────

import { supabase } from '@/integrations/supabase/client';
import * as XLSX from 'xlsx';

// ── Shared helpers ─────────────────────────────────────────────────────────────

function makeChain(data: unknown, count?: number) {
  const chain: Record<string, unknown> = {};
  for (const m of ['select', 'eq', 'gt', 'in', 'order', 'limit', 'delete']) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  chain.single = vi.fn().mockResolvedValue({
    data: Array.isArray(data) ? (data as unknown[])[0] ?? null : data,
    error: null,
  });
  chain.insert = vi.fn().mockResolvedValue({ data: null, error: null });
  chain.upsert = vi.fn().mockResolvedValue({ data: null, error: null });
  // Make thenable so `await supabase.from(...).select(...).eq(...)` resolves
  chain.then = (onfulfilled: (v: unknown) => unknown, onrejected?: (e: unknown) => unknown) =>
    Promise.resolve({ data, error: null, count: count ?? null }).then(onfulfilled, onrejected);
  chain.catch = (onrejected: (e: unknown) => unknown) =>
    Promise.resolve({ data, error: null, count: count ?? null }).catch(onrejected);
  return chain;
}

const mockRun = {
  run_id: 'test-run',
  run_label: 'test-label',
  status: 'completed',
  started_at: null,
  finished_at: null,
  duration_secs: null,
  record_count: null,
  cost_usd: null,
};

// Test data: 2 ranked POCs (companies 100+200), 1 recruiter (company 300), 3 companies
const mockRankedPocs = [
  { poc_id: 1, company_uid: 100, run_id: 'test-run', full_name: 'Alice', first_name: 'Alice', last_name: 'Smith', job_title: 'CFO', selected_email: 'alice@a.com', email: 'alice@a.com', personal_email: '', mobile_number: '', linkedin: '', company_name: 'Corp A', industry: 'Finance' },
  { poc_id: 2, company_uid: 200, run_id: 'test-run', full_name: 'Bob', first_name: 'Bob', last_name: 'Jones', job_title: 'Controller', selected_email: 'bob@b.com', email: 'bob@b.com', personal_email: '', mobile_number: '', linkedin: '', company_name: 'Corp B', industry: 'Finance' },
];
const mockRecruiterPocs = [
  { id: 1, company_uid: 300, run_id: 'test-run', recruiter_name: 'Carol', full_name: 'Carol', headline: 'Recruiter', profile_linkedin: 'https://li.com/carol', job_title: 'Recruiter', email: null },
];
const mockCompanies = [
  { company_uid: 100, run_id: 'test-run', run_label: 'test-label', company_name: 'Corp A', company_industry: 'Finance', company_size: '50-200', company_website: 'a.com', company_locality: 'NYC', company_linkedin_id: 'ca' },
  { company_uid: 200, run_id: 'test-run', run_label: 'test-label', company_name: 'Corp B', company_industry: 'Finance', company_size: '10-50', company_website: 'b.com', company_locality: 'LA', company_linkedin_id: 'cb' },
  { company_uid: 300, run_id: 'test-run', run_label: 'test-label', company_name: 'Corp C', company_industry: 'Tech', company_size: '100-500', company_website: 'c.com', company_locality: 'SF', company_linkedin_id: 'cc' },
];
const mockJobsWithPoster = [
  { job_id: 'j1', company_id: 100, job_title: 'Finance Manager', posted_time: null, applicants: 10, base_salary: null, seniority_level: 'Mid-Senior', employment_type: 'Full-time', job_url: 'http://j1.com' },
];
const mockJobsNoPoster = [
  { job_id: 'j2', company_id: 200, job_title: 'Accountant', posted_time: null, applicants: 5, base_salary: null, seniority_level: 'Entry', employment_type: 'Full-time', job_url: 'http://j2.com' },
];
const mockEmailValidations = [
  { poc_id: 1, email_quality: 'good', email_result: 'deliverable', subresult: null },
];

const TABLE_DATA: Record<string, { data: unknown[] }> = {
  runs:                          { data: [mockRun] },
  companies:                     { data: mockCompanies },
  ranked_pocs:                   { data: mockRankedPocs },
  recruiter_poc_scraped:         { data: mockRecruiterPocs },
  job_details_with_poster:       { data: mockJobsWithPoster },
  job_details:                   { data: mockJobsNoPoster },
  ranked_poc_email_validations:  { data: mockEmailValidations },
};

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={qc}>
        <MemoryRouter>{children}</MemoryRouter>
      </QueryClientProvider>
    );
  };
}

function setupSupabaseMock() {
  vi.mocked(supabase.from).mockImplementation((table: string) => {
    const { data = [] } = TABLE_DATA[table] ?? {};
    return makeChain(data) as ReturnType<typeof supabase.from>;
  });
}

// ── Test suite 1: handleDownloadReport ─────────────────────────────────────────

describe('RunDetails — handleDownloadReport', () => {
  let RunDetails: React.ComponentType;

  beforeEach(async () => {
    vi.clearAllMocks();
    setupSupabaseMock();
    const mod = await import('@/pages/RunDetails');
    RunDetails = mod.default;
  });

  it('builds sheet 1 with header + 3 data rows (2 ranked + 1 recruiter)', async () => {
    render(<RunDetails />, { wrapper: makeWrapper() });

    // Wait for the component to finish loading
    await waitFor(() => expect(screen.getByText('Download Report')).toBeInTheDocument());

    fireEvent.click(screen.getByText('Download Report'));

    await waitFor(() => expect(vi.mocked(XLSX.utils.aoa_to_sheet)).toHaveBeenCalled());

    const calls = vi.mocked(XLSX.utils.aoa_to_sheet).mock.calls;
    expect(calls.length).toBeGreaterThanOrEqual(1);

    const sheet1Rows = calls[0][0] as unknown[][];
    // 1 header row + 2 ranked POC rows + 1 recruiter row
    expect(sheet1Rows).toHaveLength(4);
    expect(sheet1Rows[0][0]).toBe('Source');   // header
    expect(sheet1Rows[1][0]).toBe('Ranked POC');
    expect(sheet1Rows[2][0]).toBe('Ranked POC');
    expect(sheet1Rows[3][0]).toBe('Recruiter POC');
  });

  // ── Test suite 2: company coverage status ──────────────────────────────────

  it('correctly classifies company coverage statuses', async () => {
    render(<RunDetails />, { wrapper: makeWrapper() });
    await waitFor(() => expect(screen.getByText('Download Report')).toBeInTheDocument());

    fireEvent.click(screen.getByText('Download Report'));

    await waitFor(() => {
      const calls = vi.mocked(XLSX.utils.aoa_to_sheet).mock.calls;
      expect(calls.length).toBeGreaterThanOrEqual(2);
    });

    const sheet2Rows = vi.mocked(XLSX.utils.aoa_to_sheet).mock.calls[1][0] as unknown[][];

    // Row index 1: Total Companies
    expect(sheet2Rows[1][18]).toBe(3);   // total = 3
    // Row index 2: Companies WITH Any POC (all 3 companies have at least one POC)
    expect(sheet2Rows[2][18]).toBe(3);   // withAny = 3
    // Row index 6: No POC Found
    expect(sheet2Rows[6][18]).toBe(0);   // noPoc = 0

    // Company detail rows start at sheet2Rows[10]
    const detailRows = sheet2Rows.slice(10) as unknown[][];
    const statusByUid: Record<string, string> = {};
    for (const r of detailRows) {
      statusByUid[String(r[0])] = r[6] as string;
    }
    expect(statusByUid['100']).toBe('Ranked POC Only');
    expect(statusByUid['200']).toBe('Ranked POC Only');
    expect(statusByUid['300']).toBe('Recruiter POC Only');
  });
});

// ── Test suite 3: pollPipeline ─────────────────────────────────────────────────

describe('CreateRun — pollPipeline', () => {
  const MOCK_TITLES = ['Finance Director', 'Controller', 'CFO'];

  let CreateRun: React.ComponentType;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('@/pages/CreateRun');
    CreateRun = mod.default;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('card transitions pending → running → success when poll detects validations', async () => {
    // Setup supabase: ranked_poc_email_validations returns count=1
    const pollChain: Record<string, unknown> = {};
    for (const m of ['select', 'eq', 'gt', 'in', 'order', 'limit']) {
      pollChain[m] = vi.fn().mockReturnValue(pollChain);
    }
    pollChain.then = (resolve: (v: unknown) => unknown) =>
      Promise.resolve({ count: 1, data: null, error: null }).then(resolve);

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'ranked_poc_email_validations') return pollChain as ReturnType<typeof supabase.from>;
      return makeChain([]) as ReturnType<typeof supabase.from>;
    });

    // Mock fetch: Gemini API + webhook
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string) => {
        if (String(url).includes('generativelanguage')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                candidates: [{ content: { parts: [{ text: JSON.stringify(MOCK_TITLES) }] } }],
              }),
          });
        }
        // webhook
        return Promise.resolve({ ok: true });
      }),
    );

    // Capture the setInterval callback so we can fire it manually
    let capturedCallback: (() => Promise<void>) | null = null;
    vi.stubGlobal(
      'setInterval',
      vi.fn((cb: () => Promise<void>, _delay: number) => {
        capturedCallback = cb;
        return 999; // fake interval ID
      }),
    );
    vi.stubGlobal('clearInterval', vi.fn());

    render(<CreateRun />, { wrapper: makeWrapper() });

    // Navigate to step 2
    fireEvent.click(screen.getByText('Finance & Legal'));
    fireEvent.click(screen.getByRole('button', { name: /^next/i }));
    await waitFor(() => screen.getByText(/title\(s\) selected/i));

    // Select one title
    fireEvent.click(screen.getByText('Finance Director'));

    // Step 3
    fireEvent.click(screen.getByRole('button', { name: /next.*parameters/i }));
    await waitFor(() => screen.getByDisplayValue('103644278'));

    // Step 4
    fireEvent.click(screen.getByRole('button', { name: /view job cards/i }));
    await waitFor(() => screen.getByText('Pending'));

    // Select the card and start run
    fireEvent.click(screen.getByText('Finance Director'));
    fireEvent.click(screen.getByRole('button', { name: /start run/i }));

    // Wait for webhook fetch to complete and card to go "running"
    await waitFor(() => expect(screen.getByText('Running')).toBeInTheDocument());

    // Manually fire the poll callback
    await act(async () => {
      if (capturedCallback) await capturedCallback();
    });

    // Card should now show "Success"
    await waitFor(() => expect(screen.getByText('Success')).toBeInTheDocument());
  });
});
