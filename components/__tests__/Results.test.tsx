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

/** Helper: switch to Card View */
const switchToCardView = () => {
  fireEvent.click(screen.getByText('Card View'));
};

describe('Results Component', () => {
  let mockOnReset: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnReset = vi.fn();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  // --- Header / general tests (visible in any view) ---

  it('renders the lecture filename as heading', () => {
    render(<Results lecture={createMockLecture()} onReset={mockOnReset} />);
    expect(screen.getByText('Test Lecture.pdf')).toBeInTheDocument();
  });

  it('displays correct concept count', () => {
    render(<Results lecture={createMockLecture()} onReset={mockOnReset} />);
    expect(screen.getByText(/Generated 2 concepts from 3 slides/)).toBeInTheDocument();
  });

  it('calls onReset when "Process another file" is clicked', () => {
    render(<Results lecture={createMockLecture()} onReset={mockOnReset} />);
    fireEvent.click(screen.getByText('Process another file'));
    expect(mockOnReset).toHaveBeenCalled();
  });

  // --- View toggle tests ---

  it('defaults to Slide View', () => {
    render(<Results lecture={createMockLecture()} onReset={mockOnReset} />);
    expect(screen.getByTestId('slide-viewer')).toBeInTheDocument();
  });

  it('shows Slide View and Card View toggle buttons', () => {
    render(<Results lecture={createMockLecture()} onReset={mockOnReset} />);
    expect(screen.getByText('Slide View')).toBeInTheDocument();
    expect(screen.getByText('Card View')).toBeInTheDocument();
  });

  it('switches to Card View when clicked', () => {
    render(<Results lecture={createMockLecture()} onReset={mockOnReset} />);
    switchToCardView();
    const labels = screen.getAllByText('Concept (Front)');
    expect(labels.length).toBe(3);
  });

  it('switches back to Slide View', () => {
    render(<Results lecture={createMockLecture()} onReset={mockOnReset} />);
    switchToCardView();
    fireEvent.click(screen.getByText('Slide View'));
    expect(screen.getByTestId('slide-viewer')).toBeInTheDocument();
  });

  // --- Card View tests ---

  it('renders all flashcards in Card View', () => {
    render(<Results lecture={createMockLecture()} onReset={mockOnReset} />);
    switchToCardView();
    expect(screen.getByText('What is React?')).toBeInTheDocument();
    expect(screen.getByText('What is TypeScript?')).toBeInTheDocument();
    expect(screen.getByText('Failed Card')).toBeInTheDocument();
  });

  it('renders page numbers in Card View', () => {
    render(<Results lecture={createMockLecture()} onReset={mockOnReset} />);
    switchToCardView();
    expect(screen.getByText('Page 1')).toBeInTheDocument();
    expect(screen.getByText('Page 2')).toBeInTheDocument();
    expect(screen.getByText('Page 3')).toBeInTheDocument();
  });

  it('shows "Failed" label for failed cards in Card View', () => {
    render(<Results lecture={createMockLecture()} onReset={mockOnReset} />);
    switchToCardView();
    expect(screen.getByText('Failed')).toBeInTheDocument();
  });

  it('renders card back text in Card View', () => {
    render(<Results lecture={createMockLecture()} onReset={mockOnReset} />);
    switchToCardView();
    expect(screen.getByText('A JS library for building UIs.')).toBeInTheDocument();
    expect(screen.getByText('A typed superset of JavaScript.')).toBeInTheDocument();
  });

  it('renders slide image in Card View', () => {
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
    switchToCardView();
    const img = screen.getByAltText('Slide 1');
    expect(img).toHaveAttribute('src', 'data:image/jpeg;base64,abc123');
  });

  // --- Export buttons ---

  it('renders all action buttons', () => {
    render(<Results lecture={createMockLecture()} onReset={mockOnReset} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThanOrEqual(4);
  });

  it('triggers generateObsidianVault on download button click', async () => {
    render(<Results lecture={createMockLecture()} onReset={mockOnReset} />);
    const buttons = screen.getAllByRole('button');
    const downloadBtn = buttons.find(btn => btn.textContent?.includes('Download Obsidian Vault'));
    fireEvent.click(downloadBtn!);
    await waitFor(() => {
      expect(generateObsidianVault).toHaveBeenCalled();
    });
  });

  it('has a save button that triggers saveVaultToDirectory', async () => {
    render(<Results lecture={createMockLecture({ is_saved: false })} onReset={mockOnReset} />);
    const buttons = screen.getAllByRole('button');
    const saveBtn = buttons.find(btn => btn.textContent?.includes('Save to Folder'));
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
  });

  it('has a Download Slides (.pptx) button that triggers generatePowerPoint', async () => {
    render(<Results lecture={createMockLecture()} onReset={mockOnReset} />);
    const buttons = screen.getAllByRole('button');
    const pptxBtn = buttons.find(btn => btn.textContent?.includes('Download Slides (.pptx)'));
    fireEvent.click(pptxBtn!);
    await waitFor(() => {
      expect(generatePowerPoint).toHaveBeenCalled();
    });
  });

  it('shows skipped count when cards have skipped status', () => {
    const lecture = createMockLecture({
      cards: [
        { id: 'c1', front: 'Title', back: 'Title slide', pageNumber: 1, status: 'skipped' },
        { id: 'c2', front: 'Concept', back: 'Content', pageNumber: 2, status: 'completed' },
      ],
    });
    render(<Results lecture={lecture} onReset={mockOnReset} />);
    expect(screen.getByText('(1 skipped)')).toBeInTheDocument();
    expect(screen.getByText(/Generated 1 concepts/)).toBeInTheDocument();
  });

  it('shows Skipped badge in Card View for skipped cards', () => {
    const lecture = createMockLecture({
      cards: [
        { id: 'c1', front: 'Title', back: 'Title slide', pageNumber: 1, status: 'skipped' },
        { id: 'c2', front: 'Concept', back: 'Content', pageNumber: 2, status: 'completed' },
      ],
    });
    render(<Results lecture={lecture} onReset={mockOnReset} />);
    switchToCardView();
    expect(screen.getByText('Skipped')).toBeInTheDocument();
  });
});
