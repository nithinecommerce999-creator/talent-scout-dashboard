import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      delete: vi.fn().mockReturnThis(),
      insert: vi.fn().mockResolvedValue({ error: null }),
    })),
  },
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useParams: () => ({ id: '456' }), useNavigate: () => vi.fn() };
});

vi.mock('@/hooks/useDashboardData', () => ({
  useCompanyDetails: vi.fn(),
  useCompanyJobs: vi.fn(),
  useCompanyRankedPocs: vi.fn(),
  useCompanyAllPocs: vi.fn(),
  useJobDetailsWithPoster: vi.fn(),
  useRecruiterPocScraped: vi.fn(),
  useEmailValidations: vi.fn(),
}));

// ── Imports after mocks ────────────────────────────────────────────────────────

import {
  useCompanyDetails,
  useCompanyJobs,
  useCompanyRankedPocs,
  useCompanyAllPocs,
  useJobDetailsWithPoster,
  useRecruiterPocScraped,
  useEmailValidations,
} from '@/hooks/useDashboardData';

// ── Fixtures ───────────────────────────────────────────────────────────────────

const mockCompany = {
  company_uid: 456,
  company_name: 'Acme Corp',
  company_industry: 'Finance',
  company_locality: 'New York',
  company_size: '50-200',
  company_website: 'acme.com',
  company_profile: null,
  industry_category: 'Finance & Legal',
  run_label: 'Test Run',
  run_id: 'run-123',
};

const makeRankedPoc = (
  ranked_poc_id: number,
  poc_id: number,
  lead_rank: number,
  emailVal: string | null,
) => ({
  ranked_poc_id,
  poc_id,
  lead_rank,
  company_uid: 456,
  full_name: `Person ${ranked_poc_id}`,
  first_name: 'Person',
  last_name: `${ranked_poc_id}`,
  job_title: 'Director',
  selected_email: emailVal,
  email: emailVal,
  match_type: 'DIRECT',
  partner_confidence_score: 80,
  linkedin: null,
  run_id: 'run-123',
});

const mockAllPocs = [
  { poc_id: 10, full_name: 'Extra One', job_title: 'VP', seniority_level: 'Director', email: 'extra1@co.com', mobile_number: null, city: 'NYC', linkedin: null },
  { poc_id: 11, full_name: 'Extra Two', job_title: 'Manager', seniority_level: 'Mid-Senior', email: 'extra2@co.com', mobile_number: null, city: 'LA', linkedin: null },
];

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

let CompanyDetails: React.ComponentType;

beforeEach(async () => {
  vi.clearAllMocks();
  const mod = await import('@/pages/CompanyDetails');
  CompanyDetails = mod.default;

  // Default hook returns
  vi.mocked(useCompanyDetails).mockReturnValue({ data: mockCompany, isLoading: false } as any);
  vi.mocked(useCompanyJobs).mockReturnValue({ data: [] } as any);
  vi.mocked(useJobDetailsWithPoster).mockReturnValue({ data: [] } as any);
  vi.mocked(useRecruiterPocScraped).mockReturnValue({ data: [] } as any);
  vi.mocked(useEmailValidations).mockReturnValue({ data: [] } as any);
  vi.mocked(useCompanyAllPocs).mockReturnValue({ data: mockAllPocs } as any);
});

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('CompanyDetails — Replace mode', () => {
  it('activates replace mode banner and Promote column, then cancels', async () => {
    const rankedPocs = [
      makeRankedPoc(1, 123, 1, 'alice@corp.com'),
      makeRankedPoc(2, 456, 2, 'bob@corp.com'),
    ];
    vi.mocked(useCompanyRankedPocs).mockReturnValue({
      data: rankedPocs,
      refetch: vi.fn(),
    } as any);

    render(<CompanyDetails />, { wrapper: makeWrapper() });

    // Expand "All POC Leads" first
    fireEvent.click(screen.getByRole('button', { name: /show all pocs/i }));

    // Click Replace on Rank 1
    const replaceButtons = screen.getAllByRole('button', { name: /^replace$/i });
    fireEvent.click(replaceButtons[0]);

    // Banner should appear
    await waitFor(() =>
      expect(screen.getByText(/replace mode.*select a person below to replace rank 1/i)).toBeInTheDocument(),
    );

    // Promote column header appears
    expect(screen.getByRole('columnheader', { name: /promote/i })).toBeInTheDocument();

    // Cancel — use the banner's Cancel button
    const cancelButtons = screen.getAllByRole('button', { name: /cancel/i });
    fireEvent.click(cancelButtons[0]);

    await waitFor(() =>
      expect(screen.queryByText(/replace mode.*select a person below/i)).not.toBeInTheDocument(),
    );
    expect(screen.queryByRole('columnheader', { name: /promote/i })).not.toBeInTheDocument();
  });
});

describe('CompanyDetails — Verify Email button', () => {
  it('is disabled for a POC with no email, enabled for one with an email', () => {
    const rankedPocs = [
      makeRankedPoc(1, 123, 1, 'alice@corp.com'), // has email
      makeRankedPoc(2, 456, 2, null),              // no email
    ];
    vi.mocked(useCompanyRankedPocs).mockReturnValue({ data: rankedPocs, refetch: vi.fn() } as any);

    render(<CompanyDetails />, { wrapper: makeWrapper() });

    const verifyButtons = screen.getAllByRole('button', { name: /verify email/i });
    expect(verifyButtons).toHaveLength(2);
    expect(verifyButtons[0]).not.toBeDisabled(); // has email
    expect(verifyButtons[1]).toBeDisabled();     // no email
  });
});

describe('CompanyDetails — Email quality badges', () => {
  it('shows green "good", red "bad", and dash for unknown quality', () => {
    const rankedPocs = [
      makeRankedPoc(1, 123, 1, 'a@co.com'),
      makeRankedPoc(2, 456, 2, 'b@co.com'),
      makeRankedPoc(3, 789, 3, 'c@co.com'),
    ];
    vi.mocked(useCompanyRankedPocs).mockReturnValue({ data: rankedPocs, refetch: vi.fn() } as any);
    vi.mocked(useEmailValidations).mockReturnValue({
      data: [
        { poc_id: 123, email_quality: 'good', email_result: null },
        { poc_id: 456, email_quality: 'bad',  email_result: null },
        // 789 has no entry
      ],
    } as any);

    render(<CompanyDetails />, { wrapper: makeWrapper() });

    // Green badge for poc 123
    expect(screen.getByText('good')).toBeInTheDocument();
    // Red badge for poc 456
    expect(screen.getByText('bad')).toBeInTheDocument();
    // Null quality for poc 789 renders a dash (at least one "—" on screen)
    const dashes = screen.getAllByText('—');
    expect(dashes.length).toBeGreaterThan(0);
  });
});
