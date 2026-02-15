import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import React from 'react';
import { Results } from '../Results';
import { Lecture, Flashcard } from '../../types';

// Mock the exportService
vi.mock('../../services/exportService', () => ({
  generateObsidianVault: vi.fn().mockResolvedValue(undefined),
  saveVaultToDirectory: vi.fn().mockResolvedValue({ saved: true, path: '/test/path' }),
  generatePowerPoint: vi.fn().mockResolvedValue(undefined),
}));

import { generateObsidianVault, saveVaultToDirectory, generatePowerPoint } from '../../services/exportService';

const createMockLecture = (overrides?: Partial<Lecture>): Lecture => ({
  id: 'lecture-1',
  filename: 'Test Lecture.pdf',
  uploadDate: Date.now(),
  totalSlides: 3,
  processedSlides: 2,
  cards: [
    {
      id: 'card-1',
      front: 'What is React?',
      back: 'A JS library for building UIs.',
      pageNumber: 1,
      status: 'completed',
    },
    {
      id: 'card-2',
      front: 'What is TypeScript?',
      back: 'A typed superset of JavaScript.',
      pageNumber: 2,
      status: 'completed',
    },
    {
      id: 'card-3',
      front: 'Failed Card',
      back: '',
      pageNumber: 3,
      status: 'failed',
      error: 'Generation failed',
    },
  ],
  status: 'completed',
  is_saved: false,
  ...overrides,
});

describe('Results Component', () => {
  let mockOnReset: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnReset = vi.fn();
    // Mock fetch for the save endpoint
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('renders the lecture filename as heading', () => {
    render(<Results lecture={createMockLecture()} onReset={mockOnReset} />);
    expect(screen.getByText('Test Lecture.pdf')).toBeInTheDocument();
  });

  it('displays correct concept count', () => {
    render(<Results lecture={createMockLecture()} onReset={mockOnReset} />);
    expect(screen.getByText(/Generated 2 concepts from 3 slides/)).toBeInTheDocument();
  });

  it('renders all flashcards', () => {
    render(<Results lecture={createMockLecture()} onReset={mockOnReset} />);
    expect(screen.getByText('What is React?')).toBeInTheDocument();
    expect(screen.getByText('What is TypeScript?')).toBeInTheDocument();
    expect(screen.getByText('Failed Card')).toBeInTheDocument();
  });

  it('renders page numbers for each card', () => {
    render(<Results lecture={createMockLecture()} onReset={mockOnReset} />);
    expect(screen.getByText('Page 1')).toBeInTheDocument();
    expect(screen.getByText('Page 2')).toBeInTheDocument();
    expect(screen.getByText('Page 3')).toBeInTheDocument();
  });

  it('shows "Failed" label for failed cards', () => {
    render(<Results lecture={createMockLecture()} onReset={mockOnReset} />);
    expect(screen.getByText('Failed')).toBeInTheDocument();
  });

  it('calls onReset when "Process another file" is clicked', () => {
    render(<Results lecture={createMockLecture()} onReset={mockOnReset} />);
    fireEvent.click(screen.getByText('Process another file'));
    expect(mockOnReset).toHaveBeenCalled();
  });

  it('renders card back text', () => {
    render(<Results lecture={createMockLecture()} onReset={mockOnReset} />);
    expect(screen.getByText('A JS library for building UIs.')).toBeInTheDocument();
    expect(screen.getByText('A typed superset of JavaScript.')).toBeInTheDocument();
  });

  it('renders Concept (Front) labels', () => {
    render(<Results lecture={createMockLecture()} onReset={mockOnReset} />);
    const labels = screen.getAllByText('Concept (Front)');
    expect(labels.length).toBe(3); // one per card
  });

  it('renders Explanation (Back) labels', () => {
    render(<Results lecture={createMockLecture()} onReset={mockOnReset} />);
    const labels = screen.getAllByText('Explanation (Back)');
    expect(labels.length).toBe(3);
  });

  it('renders slide image when originalImage is present', () => {
    const lecture = createMockLecture({
      cards: [
        {
          id: 'card-img',
          front: 'Image Card',
          back: 'Has an image',
          pageNumber: 1,
          status: 'completed',
          originalImage: 'data:image/jpeg;base64,abc123',
        },
      ],
    });
    render(<Results lecture={lecture} onReset={mockOnReset} />);
    const img = screen.getByAltText('Slide 1');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'data:image/jpeg;base64,abc123');
  });

  it('does not render image when originalImage is absent', () => {
    render(<Results lecture={createMockLecture()} onReset={mockOnReset} />);
    expect(screen.queryByAltText('Slide 1')).not.toBeInTheDocument();
  });

  it('renders all action buttons', () => {
    render(<Results lecture={createMockLecture()} onReset={mockOnReset} />);
    // Buttons have text split across child elements (icon + text)
    // Look for all buttons in the action bar
    const buttons = screen.getAllByRole('button');
    // Should have at minimum: back button, Raw JSON, Save, Download, plus edit buttons on each card
    expect(buttons.length).toBeGreaterThanOrEqual(4);
  });

  it('triggers generateObsidianVault on download button click', async () => {
    render(<Results lecture={createMockLecture()} onReset={mockOnReset} />);
    // Find all buttons, the download button contains "Download" in its text content
    const buttons = screen.getAllByRole('button');
    const downloadBtn = buttons.find(btn => btn.textContent?.includes('Download Obsidian Vault'));
    expect(downloadBtn).toBeDefined();
    fireEvent.click(downloadBtn!);

    await waitFor(() => {
      expect(generateObsidianVault).toHaveBeenCalled();
    });
  });

  it('has a save button that triggers saveVaultToDirectory', async () => {
    render(<Results lecture={createMockLecture({ is_saved: false })} onReset={mockOnReset} />);
    const buttons = screen.getAllByRole('button');
    const saveBtn = buttons.find(btn => btn.textContent?.includes('Save to Folder'));
    expect(saveBtn).toBeDefined();
    fireEvent.click(saveBtn!);

    await waitFor(() => {
      expect(saveVaultToDirectory).toHaveBeenCalled();
    });
  });

  it('shows Saved state after successful save', async () => {
    render(<Results lecture={createMockLecture({ is_saved: false })} onReset={mockOnReset} />);
    const buttons = screen.getAllByRole('button');
    const saveBtn = buttons.find(btn => btn.textContent?.includes('Save to Folder'));
    fireEvent.click(saveBtn!);

    await waitFor(() => {
      const updatedButtons = screen.getAllByRole('button');
      const savedBtn = updatedButtons.find(btn => btn.textContent?.includes('Saved'));
      expect(savedBtn).toBeDefined();
    });
  });

  it('renders saved path after save', async () => {
    render(<Results lecture={createMockLecture({ is_saved: false })} onReset={mockOnReset} />);
    const buttons = screen.getAllByRole('button');
    const saveBtn = buttons.find(btn => btn.textContent?.includes('Save to Folder'));
    fireEvent.click(saveBtn!);

    await waitFor(() => {
      expect(screen.getByText(/Saved to \/test\/path/)).toBeInTheDocument();
    });
  });

  it('disables save button when lecture is already saved', () => {
    render(<Results lecture={createMockLecture({ is_saved: true })} onReset={mockOnReset} />);
    const buttons = screen.getAllByRole('button');
    const savedBtn = buttons.find(btn => btn.textContent?.includes('Saved'));
    expect(savedBtn).toBeDefined();
    expect(savedBtn).toBeDisabled();
  });

  it('has a Raw JSON export button', () => {
    render(<Results lecture={createMockLecture()} onReset={mockOnReset} />);
    const buttons = screen.getAllByRole('button');
    const jsonBtn = buttons.find(btn => btn.textContent?.includes('Raw JSON'));
    expect(jsonBtn).toBeDefined();
  });

  it('renders Presentation Export info', () => {
    render(<Results lecture={createMockLecture()} onReset={mockOnReset} />);
    expect(screen.getByText('Presentation Export')).toBeInTheDocument();
    expect(screen.getByText(/compatible with PowerPoint, Google Slides, and Keynote/)).toBeInTheDocument();
  });

  it('has a Download Slides (.pptx) button that triggers generatePowerPoint', async () => {
    render(<Results lecture={createMockLecture()} onReset={mockOnReset} />);
    const buttons = screen.getAllByRole('button');
    const pptxBtn = buttons.find(btn => btn.textContent?.includes('Download Slides (.pptx)'));
    expect(pptxBtn).toBeDefined();
    fireEvent.click(pptxBtn!);

    await waitFor(() => {
      expect(generatePowerPoint).toHaveBeenCalled();
    });
  });
});
