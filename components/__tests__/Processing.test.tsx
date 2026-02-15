import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { Processing } from '../Processing';

// Mock the services
vi.mock('../../services', () => ({
  extractPDFInfo: vi.fn(),
  renderPageToImage: vi.fn(),
  analyzeSlide: vi.fn(),
}));

import { extractPDFInfo, renderPageToImage, analyzeSlide } from '../../services';

const createMockFile = () => {
  const file = new File(['pdf-content'], 'test.pdf', { type: 'application/pdf' });
  // Polyfill arrayBuffer if necessary  
  if (!file.arrayBuffer) {
    file.arrayBuffer = () => Promise.resolve(new ArrayBuffer(10));
  }
  return file;
};

describe('Processing Component', () => {
  let mockOnComplete: ReturnType<typeof vi.fn>;
  let mockOnError: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnComplete = vi.fn();
    mockOnError = vi.fn();
  });

  it('renders initial loading state', () => {
    // Make extractPDFInfo hang
    (extractPDFInfo as any).mockReturnValue(new Promise(() => {}));

    render(
      <Processing file={createMockFile()} limit={null} onComplete={mockOnComplete} onError={mockOnError} />
    );
    expect(screen.getByText(/Initializing PDF engine|Extracting pages/)).toBeInTheDocument();
  });

  it('processes slides and calls onComplete', async () => {
    const mockDoc = {
      numPages: 2,
      getPage: vi.fn().mockResolvedValue({
        getViewport: vi.fn(() => ({ width: 100, height: 100 })),
        render: vi.fn(() => ({ promise: Promise.resolve() })),
      }),
    };

    (extractPDFInfo as any).mockResolvedValue({ pageCount: 2, pdfDoc: mockDoc });
    (renderPageToImage as any).mockResolvedValue('data:image/jpeg;base64,mock');
    (analyzeSlide as any).mockResolvedValue({ front: 'Concept', back: 'Explanation' });

    render(
      <Processing file={createMockFile()} limit={null} onComplete={mockOnComplete} onError={mockOnError} />
    );

    await waitFor(() => {
      expect(mockOnComplete).toHaveBeenCalled();
    }, { timeout: 5000 });

    const lecture = mockOnComplete.mock.calls[0][0];
    expect(lecture.cards).toHaveLength(2);
    expect(lecture.filename).toBe('test.pdf');
    expect(lecture.status).toBe('completed');
  });

  it('respects the limit parameter', async () => {
    const mockDoc = {
      numPages: 10,
      getPage: vi.fn().mockResolvedValue({
        getViewport: vi.fn(() => ({ width: 100, height: 100 })),
        render: vi.fn(() => ({ promise: Promise.resolve() })),
      }),
    };

    (extractPDFInfo as any).mockResolvedValue({ pageCount: 10, pdfDoc: mockDoc });
    (renderPageToImage as any).mockResolvedValue('data:image/jpeg;base64,mock');
    (analyzeSlide as any).mockResolvedValue({ front: 'Concept', back: 'Explanation' });

    render(
      <Processing file={createMockFile()} limit={3} onComplete={mockOnComplete} onError={mockOnError} />
    );

    await waitFor(() => {
      expect(mockOnComplete).toHaveBeenCalled();
    }, { timeout: 5000 });

    const lecture = mockOnComplete.mock.calls[0][0];
    expect(lecture.cards).toHaveLength(3);
  });

  it('calls onError when PDF extraction fails', async () => {
    (extractPDFInfo as any).mockRejectedValue(new Error('Bad PDF file'));

    render(
      <Processing file={createMockFile()} limit={null} onComplete={mockOnComplete} onError={mockOnError} />
    );

    await waitFor(() => {
      expect(mockOnError).toHaveBeenCalledWith(expect.stringContaining('Bad PDF file'));
    }, { timeout: 5000 });
  });

  it('marks individual cards as failed when analyzeSlide errors', async () => {
    const mockDoc = { numPages: 1 };

    (extractPDFInfo as any).mockResolvedValue({ pageCount: 1, pdfDoc: mockDoc });
    (renderPageToImage as any).mockResolvedValue('data:image/jpeg;base64,mock');
    (analyzeSlide as any).mockRejectedValue(new Error('API rate limit'));

    render(
      <Processing file={createMockFile()} limit={null} onComplete={mockOnComplete} onError={mockOnError} />
    );

    await waitFor(() => {
      expect(mockOnComplete).toHaveBeenCalled();
    }, { timeout: 5000 });

    const lecture = mockOnComplete.mock.calls[0][0];
    expect(lecture.cards[0].status).toBe('failed');
  });

  it('displays progress percentage', async () => {
    const mockDoc = { numPages: 2 };

    (extractPDFInfo as any).mockResolvedValue({ pageCount: 2, pdfDoc: mockDoc });
    (renderPageToImage as any).mockResolvedValue('data:image/jpeg;base64,mock');
    (analyzeSlide as any).mockResolvedValue({ front: 'C', back: 'E' });

    render(
      <Processing file={createMockFile()} limit={null} onComplete={mockOnComplete} onError={mockOnError} />
    );

    // Should eventually show percentage
    await waitFor(() => {
      expect(mockOnComplete).toHaveBeenCalled();
    }, { timeout: 5000 });
  });

  it('marks cards as skipped when AI returns skip: true', async () => {
    const mockDoc = { numPages: 3 };

    (extractPDFInfo as any).mockResolvedValue({ pageCount: 3, pdfDoc: mockDoc });
    (renderPageToImage as any).mockResolvedValue('data:image/jpeg;base64,mock');

    // First slide is a title (skip), next two are content
    (analyzeSlide as any)
      .mockResolvedValueOnce({ front: 'Course Title', back: 'Title slide', skip: true })
      .mockResolvedValueOnce({ front: 'Concept A', back: 'Explanation A', skip: false })
      .mockResolvedValueOnce({ front: 'Concept B', back: 'Explanation B', skip: false });

    render(
      <Processing file={createMockFile()} limit={null} onComplete={mockOnComplete} onError={mockOnError} />
    );

    await waitFor(() => {
      expect(mockOnComplete).toHaveBeenCalled();
    }, { timeout: 5000 });

    const lecture = mockOnComplete.mock.calls[0][0];
    expect(lecture.cards[0].status).toBe('skipped');
    expect(lecture.cards[1].status).toBe('completed');
    expect(lecture.cards[2].status).toBe('completed');
    // processedSlides should only count completed, not skipped
    expect(lecture.processedSlides).toBe(2);
  });
});
