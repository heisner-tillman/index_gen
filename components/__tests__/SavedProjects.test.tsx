import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { SavedProjects } from '../SavedProjects';

const mockLectures = [
  {
    id: 'lec-1',
    filename: 'Machine Learning.pdf',
    uploadDate: new Date('2025-06-01').getTime(),
    totalSlides: 25,
    processedSlides: 20,
    cards: [],
    status: 'completed' as const,
    is_saved: true,
  },
  {
    id: 'lec-2',
    filename: 'Data Structures.pdf',
    uploadDate: new Date('2025-05-15').getTime(),
    totalSlides: 15,
    processedSlides: 15,
    cards: [],
    status: 'completed' as const,
    is_saved: true,
  },
];

describe('SavedProjects Component', () => {
  let mockOnSelect: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnSelect = vi.fn();
  });

  it('shows loading state', () => {
    global.fetch = vi.fn().mockReturnValue(new Promise(() => {})); // never resolves
    render(<SavedProjects onSelect={mockOnSelect} />);
    expect(screen.getByText('Loading saved projects...')).toBeInTheDocument();
  });

  it('shows empty state when no projects exist', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });
    render(<SavedProjects onSelect={mockOnSelect} />);

    await waitFor(() => {
      expect(screen.getByText('No saved projects yet')).toBeInTheDocument();
    });
    expect(screen.getByText('Process and save a document to see it here.')).toBeInTheDocument();
  });

  it('renders list of saved projects', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockLectures),
    });
    render(<SavedProjects onSelect={mockOnSelect} />);

    await waitFor(() => {
      expect(screen.getByText('Machine Learning.pdf')).toBeInTheDocument();
    });
    expect(screen.getByText('Data Structures.pdf')).toBeInTheDocument();
    expect(screen.getByText('Saved Projects (2)')).toBeInTheDocument();
  });

  it('shows slide counts for each project', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockLectures),
    });
    render(<SavedProjects onSelect={mockOnSelect} />);

    await waitFor(() => {
      expect(screen.getByText('20/25 slides')).toBeInTheDocument();
      expect(screen.getByText('15/15 slides')).toBeInTheDocument();
    });
  });

  it('calls onSelect when a project is clicked', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockLectures),
    });
    render(<SavedProjects onSelect={mockOnSelect} />);

    await waitFor(() => {
      expect(screen.getByText('Machine Learning.pdf')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Machine Learning.pdf'));
    expect(mockOnSelect).toHaveBeenCalledWith(mockLectures[0]);
  });

  it('handles delete confirmation and removal', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockLectures) })  // GET
      .mockResolvedValueOnce({ ok: true }); // DELETE

    global.fetch = fetchMock;
    render(<SavedProjects onSelect={mockOnSelect} />);

    await waitFor(() => {
      expect(screen.getByText('Machine Learning.pdf')).toBeInTheDocument();
    });

    // Find delete buttons
    const deleteButtons = screen.getAllByTitle('Delete project');
    fireEvent.click(deleteButtons[0]);

    expect(confirmSpy).toHaveBeenCalled();

    await waitFor(() => {
      expect(screen.queryByText('Machine Learning.pdf')).not.toBeInTheDocument();
    });

    confirmSpy.mockRestore();
  });

  it('does not delete when user cancels confirmation', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockLectures),
    });
    render(<SavedProjects onSelect={mockOnSelect} />);

    await waitFor(() => {
      expect(screen.getByText('Machine Learning.pdf')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByTitle('Delete project');
    fireEvent.click(deleteButtons[0]);

    // Should still be there
    expect(screen.getByText('Machine Learning.pdf')).toBeInTheDocument();
    confirmSpy.mockRestore();
  });

  it('handles fetch failure gracefully', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
    render(<SavedProjects onSelect={mockOnSelect} />);

    // Should eventually show empty state (no crash)
    await waitFor(() => {
      expect(screen.getByText('No saved projects yet')).toBeInTheDocument();
    });
  });

  it('shows status badges (completed status)', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockLectures),
    });
    render(<SavedProjects onSelect={mockOnSelect} />);

    await waitFor(() => {
      const badges = screen.getAllByText('completed');
      expect(badges.length).toBe(2);
    });
  });
});
