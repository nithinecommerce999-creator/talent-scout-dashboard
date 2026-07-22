import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// ── Mocks (hoisted) ──────────────────────────────────────────────────────────

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gt: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  },
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

// ── Helpers ──────────────────────────────────────────────────────────────────

const MOCK_TITLES = ['Finance Director', 'Controller', 'CFO', 'Treasurer'];

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

function stubFetchGemini(titles: string[] = MOCK_TITLES) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          candidates: [{ content: { parts: [{ text: JSON.stringify(titles) }] } }],
        }),
    }),
  );
}

async function navigateToStep2() {
  fireEvent.click(screen.getByText('Finance & Legal'));
  fireEvent.click(screen.getByRole('button', { name: /^next/i }));
  await waitFor(() => expect(screen.getByText(/title\(s\) selected/i)).toBeInTheDocument());
}

async function navigateToStep3(titlesToSelect: string[] = [MOCK_TITLES[0]]) {
  await navigateToStep2();
  for (const t of titlesToSelect) {
    fireEvent.click(screen.getByText(t));
  }
  fireEvent.click(screen.getByRole('button', { name: /next.*parameters/i }));
  await waitFor(() => expect(screen.getByDisplayValue('103644278')).toBeInTheDocument());
}

async function navigateToStep4(titlesToSelect: string[]) {
  await navigateToStep3(titlesToSelect);
  fireEvent.click(screen.getByRole('button', { name: /view job cards/i }));
  await waitFor(() => expect(screen.getAllByText('Pending').length).toBe(titlesToSelect.length));
}

// ── Tests ────────────────────────────────────────────────────────────────────

import { INDUSTRIES } from '@/data/industries';

describe('CreateRun wizard', () => {
  // Lazy-import the component so mocks are applied first
  let CreateRun: React.ComponentType;

  beforeEach(async () => {
    mockNavigate.mockClear();
    const mod = await import('@/pages/CreateRun');
    CreateRun = mod.default;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  // ── 1. Step 1: all group cards rendered ────────────────────────────────────
  it('renders all industry group cards and Next is disabled before selection', () => {
    render(<CreateRun />, { wrapper: makeWrapper() });

    const uniqueGroups = [...new Set(INDUSTRIES.map((i) => i.group as string))];
    for (const g of uniqueGroups) {
      expect(screen.getByText(g)).toBeInTheDocument();
    }

    expect(screen.getByRole('button', { name: /^next/i })).toBeDisabled();

    fireEvent.click(screen.getByText('Finance & Legal'));
    expect(screen.getByRole('button', { name: /^next/i })).not.toBeDisabled();
  });

  // ── 2. Step 1 → 2 navigation ───────────────────────────────────────────────
  it('navigates to step 2, shows title pills and 0-selected counter', async () => {
    stubFetchGemini();
    render(<CreateRun />, { wrapper: makeWrapper() });

    await navigateToStep2();

    for (const title of MOCK_TITLES) {
      expect(screen.getByText(title)).toBeInTheDocument();
    }
    expect(screen.getByText(/0 title\(s\) selected/i)).toBeInTheDocument();
  });

  // ── 3. Custom title input ──────────────────────────────────────────────────
  it('adds a custom title via Enter key and shows 1 title selected', async () => {
    stubFetchGemini();
    render(<CreateRun />, { wrapper: makeWrapper() });

    await navigateToStep2();

    const input = screen.getByPlaceholderText(/add custom title/i);
    fireEvent.change(input, { target: { value: 'Custom Title' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    await waitFor(() => expect(screen.getByText('Custom Title')).toBeInTheDocument());
    expect(screen.getByText(/1 title\(s\) selected/i)).toBeInTheDocument();
  });

  // ── 4. Next: Parameters disabled with 0 titles ─────────────────────────────
  it('Next: Parameters button is disabled when no title is selected', async () => {
    stubFetchGemini();
    render(<CreateRun />, { wrapper: makeWrapper() });

    await navigateToStep2();

    expect(screen.getByRole('button', { name: /next.*parameters/i })).toBeDisabled();
  });

  // ── 5. Step 3 default values ───────────────────────────────────────────────
  it('step 3 shows correct default GeoID, Max Items, and seniority selections', async () => {
    stubFetchGemini();
    render(<CreateRun />, { wrapper: makeWrapper() });

    await navigateToStep3([MOCK_TITLES[0]]);

    expect(screen.getByDisplayValue('103644278')).toBeInTheDocument();
    expect(screen.getByDisplayValue('100')).toBeInTheDocument();
    expect(screen.getByText('Mid-Senior level')).toBeInTheDocument();
    expect(screen.getByText('Director')).toBeInTheDocument();
  });

  // ── 6. Step 4 card rendering ───────────────────────────────────────────────
  it('step 4 renders 3 pending cards; Start Run is disabled until a card is selected', async () => {
    stubFetchGemini();
    render(<CreateRun />, { wrapper: makeWrapper() });

    const selected = MOCK_TITLES.slice(0, 3);
    await navigateToStep4(selected);

    expect(screen.getAllByText('Pending')).toHaveLength(3);
    expect(screen.getByRole('button', { name: /start run/i })).toBeDisabled();

    // Click the first card to select it
    fireEvent.click(screen.getByText('Finance Director'));
    expect(screen.getByRole('button', { name: /start run/i })).not.toBeDisabled();
  });
});
