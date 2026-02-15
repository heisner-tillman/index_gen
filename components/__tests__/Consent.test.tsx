import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { Consent } from '../Consent';

// Mock the extractPDFInfo service
vi.mock('../../services', () => ({
  extractPDFInfo: vi.fn(),
}));

import { extractPDFInfo } from '../../services';

const mockFile = new File(['pdf'], 'lecture.pdf', { type: 'application/pdf' });

describe('Consent Component', () => {
  let mockOnConfirm: ReturnType<typeof vi.fn>;
  let mockOnCancel: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnConfirm = vi.fn();
    mockOnCancel = vi.fn();
  });

  it('shows loading state initially', () => {
    (extractPDFInfo as any).mockReturnValue(new Promise(() => {})); // never resolves
    render(<Consent file={mockFile} onConfirm={mockOnConfirm} onCancel={mockOnCancel} />);
    expect(screen.getByText('Analyzing document structure...')).toBeInTheDocument();
  });

  it('shows page count after loading', async () => {
    (extractPDFInfo as any).mockResolvedValue({ pageCount: 10 });
    render(<Consent file={mockFile} onConfirm={mockOnConfirm} onCancel={mockOnCancel} />);

    await waitFor(() => {
      expect(screen.getByText('10')).toBeInTheDocument();
    });
    expect(screen.getByText('Confirm Processing')).toBeInTheDocument();
    expect(screen.getByText(/lecture\.pdf/)).toBeInTheDocument();
  });

  it('shows error state when PDF loading fails', async () => {
    (extractPDFInfo as any).mockRejectedValue(new Error('Corrupt file'));
    render(<Consent file={mockFile} onConfirm={mockOnConfirm} onCancel={mockOnCancel} />);

    await waitFor(() => {
      expect(screen.getByText('Corrupt file')).toBeInTheDocument();
    });
    expect(screen.getByText('Go Back')).toBeInTheDocument();
  });

  it('calls onCancel when Go Back is clicked in error state', async () => {
    (extractPDFInfo as any).mockRejectedValue(new Error('Bad PDF'));
    render(<Consent file={mockFile} onConfirm={mockOnConfirm} onCancel={mockOnCancel} />);

    await waitFor(() => {
      expect(screen.getByText('Go Back')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Go Back'));
    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('calls onConfirm with null when "Process All Pages" is selected', async () => {
    (extractPDFInfo as any).mockResolvedValue({ pageCount: 5 });
    render(<Consent file={mockFile} onConfirm={mockOnConfirm} onCancel={mockOnCancel} />);

    await waitFor(() => {
      expect(screen.getByText('Confirm Processing')).toBeInTheDocument();
    });

    // "Process All Pages" is selected by default
    fireEvent.click(screen.getByText(/Start Processing/));
    expect(mockOnConfirm).toHaveBeenCalledWith(null);
  });

  it('calls onConfirm with a limit when "Limit Pages" is selected', async () => {
    (extractPDFInfo as any).mockResolvedValue({ pageCount: 20 });
    render(<Consent file={mockFile} onConfirm={mockOnConfirm} onCancel={mockOnCancel} />);

    await waitFor(() => {
      expect(screen.getByText('Confirm Processing')).toBeInTheDocument();
    });

    // Click "Limit Pages" radio
    fireEvent.click(screen.getByText('Limit Pages'));

    // A number input should appear with default value 5
    const numberInput = screen.getByRole('spinbutton') as HTMLInputElement;
    expect(numberInput).toBeInTheDocument();
    expect(numberInput.value).toBe('5');

    // Change limit to 10
    fireEvent.change(numberInput, { target: { value: '10' } });

    fireEvent.click(screen.getByText(/Start Processing/));
    expect(mockOnConfirm).toHaveBeenCalledWith(10);
  });

  it('calls onCancel when Cancel button is clicked', async () => {
    (extractPDFInfo as any).mockResolvedValue({ pageCount: 5 });
    render(<Consent file={mockFile} onConfirm={mockOnConfirm} onCancel={mockOnCancel} />);

    await waitFor(() => {
      expect(screen.getByText('Confirm Processing')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Cancel'));
    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('disables Start Processing when limit is 0 or empty', async () => {
    (extractPDFInfo as any).mockResolvedValue({ pageCount: 20 });
    render(<Consent file={mockFile} onConfirm={mockOnConfirm} onCancel={mockOnCancel} />);

    await waitFor(() => {
      expect(screen.getByText('Confirm Processing')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Limit Pages'));

    const numberInput = screen.getByRole('spinbutton') as HTMLInputElement;
    fireEvent.change(numberInput, { target: { value: '0' } });

    const startButton = screen.getByText(/Start Processing/).closest('button')!;
    expect(startButton).toBeDisabled();
  });

  it('displays API call estimate based on page count', async () => {
    (extractPDFInfo as any).mockResolvedValue({ pageCount: 15 });
    render(<Consent file={mockFile} onConfirm={mockOnConfirm} onCancel={mockOnCancel} />);

    await waitFor(() => {
      expect(screen.getByText('Each slide requires 1 API call.')).toBeInTheDocument();
      expect(screen.getByText(/~15 calls/)).toBeInTheDocument();
    });
  });
});
