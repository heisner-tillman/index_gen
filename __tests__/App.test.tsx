import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import App from '../App';
import { AppView } from '../types';

// Mock the services used by child components
vi.mock('../services', () => ({
  extractPDFInfo: vi.fn(),
  renderPageToImage: vi.fn(),
  analyzeSlide: vi.fn(),
}));

vi.mock('../services/exportService', () => ({
  generateObsidianVault: vi.fn().mockResolvedValue(undefined),
  saveVaultToDirectory: vi.fn().mockResolvedValue({ saved: true, path: '/test' }),
}));

describe('App Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock fetch for SavedProjects
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });
  });

  it('renders the dashboard with LectureSynth header', () => {
    render(<App />);
    expect(screen.getByText('Lecture')).toBeInTheDocument();
    expect(screen.getByText('Synth')).toBeInTheDocument();
  });

  it('renders the hero section on dashboard', () => {
    render(<App />);
    expect(screen.getByText(/Turn Slides into/)).toBeInTheDocument();
    expect(screen.getByText('Knowledge')).toBeInTheDocument();
  });

  it('renders the version badge', () => {
    render(<App />);
    expect(screen.getByText('v1.1.0 (Gemini 2.5)')).toBeInTheDocument();
  });

  it('shows Upload component on the "New Document" tab by default', () => {
    render(<App />);
    expect(screen.getByText('Upload Lecture PDF')).toBeInTheDocument();
  });

  it('shows tab navigation with New Document and Saved Projects', () => {
    render(<App />);
    expect(screen.getByText('New Document')).toBeInTheDocument();
    expect(screen.getByText('Saved Projects')).toBeInTheDocument();
  });

  it('switches to Saved Projects tab when clicked', async () => {
    render(<App />);
    fireEvent.click(screen.getByText('Saved Projects'));

    await waitFor(() => {
      // Should show empty state or loading
      expect(screen.getByText(/No saved projects yet|Loading/)).toBeInTheDocument();
    });
  });

  it('switches back to New Document tab', async () => {
    render(<App />);

    // Go to Saved Projects
    fireEvent.click(screen.getByText('Saved Projects'));
    await waitFor(() => {
      expect(screen.queryByText('Upload Lecture PDF')).not.toBeInTheDocument();
    });

    // Go back to New Document
    fireEvent.click(screen.getByText('New Document'));
    expect(screen.getByText('Upload Lecture PDF')).toBeInTheDocument();
  });

  it('navigates to Consent view when a file is selected', async () => {
    const { extractPDFInfo } = await import('../services');
    (extractPDFInfo as any).mockReturnValue(new Promise(() => {})); // hangs — shows loading

    render(<App />);

    const fileInput = screen.getByTestId('file-input');
    const pdfFile = new File(['pdf'], 'lecture.pdf', { type: 'application/pdf' });
    fireEvent.change(fileInput, { target: { files: [pdfFile] } });

    // Should now show Consent screen (loading state)
    await waitFor(() => {
      expect(screen.getByText('Analyzing document structure...')).toBeInTheDocument();
    });

    // Tab navigation should be hidden in Consent view
    expect(screen.queryByText('New Document')).not.toBeInTheDocument();
  });

  it('can return to dashboard from Consent by clicking logo', async () => {
    const { extractPDFInfo } = await import('../services');
    (extractPDFInfo as any).mockResolvedValue({ pageCount: 5 });

    render(<App />);

    const fileInput = screen.getByTestId('file-input');
    const pdfFile = new File(['pdf'], 'lecture.pdf', { type: 'application/pdf' });
    fireEvent.change(fileInput, { target: { files: [pdfFile] } });

    await waitFor(() => {
      expect(screen.getByText('Confirm Processing')).toBeInTheDocument();
    });

    // Cancel should return to dashboard
    fireEvent.click(screen.getByText('Cancel'));

    await waitFor(() => {
      expect(screen.getByText('Upload Lecture PDF')).toBeInTheDocument();
    });
  });
});
