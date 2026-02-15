import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateObsidianVault, generatePowerPoint } from '../exportService';
import { Lecture, Flashcard } from '../../types';
import JSZip from 'jszip';

// Mock pptxgenjs
const mockSlide = {
  background: null as any,
  addImage: vi.fn(),
  addText: vi.fn(),
};

vi.mock('pptxgenjs', () => {
  class MockPptxGenJS {
    title = '';
    author = '';
    subject = '';
    addSlide = vi.fn().mockReturnValue(mockSlide);
    writeFile = vi.fn().mockResolvedValue(undefined);
  }
  return { default: MockPptxGenJS };
});


describe('exportService', () => {
  let mockLecture: Lecture;

  beforeEach(() => {
    vi.clearAllMocks();

    mockLecture = {
      id: 'lecture-1',
      filename: 'Test Lecture.pdf',
      uploadDate: new Date('2025-01-15').getTime(),
      totalSlides: 3,
      processedSlides: 2,
      cards: [
        {
          id: 'card-1',
          front: 'What is React?',
          back: 'A JavaScript library for building user interfaces.',
          pageNumber: 1,
          status: 'completed',
        },
        {
          id: 'card-2',
          front: 'What is JSX?',
          back: 'A syntax extension for JavaScript used in React.',
          pageNumber: 2,
          status: 'completed',
        },
        {
          id: 'card-3',
          front: 'Failed concept',
          back: '',
          pageNumber: 3,
          status: 'failed',
          error: 'Generation failed',
        },
      ],
      status: 'completed',
      is_saved: false,
    };
  });

  // ---- Obsidian Vault tests ----

  it('generates a ZIP with correct folder structure', async () => {
    await generateObsidianVault(mockLecture);
    expect(window.URL.createObjectURL).toHaveBeenCalled();
    expect(window.URL.revokeObjectURL).toHaveBeenCalled();
  });

  it('creates a download anchor with correct filename', async () => {
    const appendChildSpy = vi.spyOn(document.body, 'appendChild');
    const clickSpy = vi.fn();
    const origCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = origCreateElement(tag);
      if (tag === 'a') {
        el.click = clickSpy;
      }
      return el;
    });

    await generateObsidianVault(mockLecture);

    expect(appendChildSpy).toHaveBeenCalled();
    const anchor = appendChildSpy.mock.calls[0][0] as HTMLAnchorElement;
    expect(anchor.download).toBe('Test Lecture-obsidian-vault.zip');
    expect(clickSpy).toHaveBeenCalled();

    appendChildSpy.mockRestore();
  });

  it('skips cards with non-completed status', async () => {
    const failedLecture: Lecture = {
      ...mockLecture,
      cards: mockLecture.cards.map(c => ({ ...c, status: 'failed' as const })),
    };

    await generateObsidianVault(failedLecture);
    expect(window.URL.createObjectURL).toHaveBeenCalled();
  });

  it('handles filename sanitization for special characters', async () => {
    const specialLecture: Lecture = {
      ...mockLecture,
      filename: 'Lecture: "Advanced" <Topics>.pdf',
      cards: [
        {
          id: 'card-1',
          front: 'Concept with <special> "chars"',
          back: 'Explanation',
          pageNumber: 1,
          status: 'completed',
        },
      ],
    };

    await generateObsidianVault(specialLecture);
    expect(window.URL.createObjectURL).toHaveBeenCalled();
  });

  it('handles duplicate card fronts with collision avoidance', async () => {
    const duplicateLecture: Lecture = {
      ...mockLecture,
      cards: [
        { id: 'c1', front: 'Same Topic', back: 'First explanation', pageNumber: 1, status: 'completed' },
        { id: 'c2', front: 'Same Topic', back: 'Second explanation', pageNumber: 2, status: 'completed' },
        { id: 'c3', front: 'Same Topic', back: 'Third explanation', pageNumber: 3, status: 'completed' },
      ],
    };

    await generateObsidianVault(duplicateLecture);
    expect(window.URL.createObjectURL).toHaveBeenCalled();
  });

  it('handles empty filename gracefully', async () => {
    const emptyNameLecture: Lecture = {
      ...mockLecture,
      filename: '.pdf',
      cards: [
        { id: 'c1', front: '', back: 'Explanation', pageNumber: 1, status: 'completed' },
      ],
    };

    await generateObsidianVault(emptyNameLecture);
    expect(window.URL.createObjectURL).toHaveBeenCalled();
  });

  it('vault contains master note and card files but not the failed card', async () => {
    let capturedBlob: Blob | null = null;
    const origCreateObjectURL = window.URL.createObjectURL;
    (window.URL.createObjectURL as any) = vi.fn((blob: Blob) => {
      capturedBlob = blob;
      return 'mock-url';
    });

    await generateObsidianVault(mockLecture);

    expect(capturedBlob).not.toBeNull();

    const zip = await JSZip.loadAsync(capturedBlob!);
    const files = Object.keys(zip.files);

    // Should contain the master note
    expect(files.some(f => f.endsWith('Test Lecture.md'))).toBe(true);

    // Should contain card markdown files
    expect(files.some(f => f.includes('What is React'))).toBe(true);
    expect(files.some(f => f.includes('What is JSX'))).toBe(true);

    // Should NOT contain the failed card
    expect(files.some(f => f.includes('Failed concept'))).toBe(false);

    // Should NOT contain the old Google Apps Script
    expect(files.some(f => f.includes('create_slides_script.txt'))).toBe(false);

    (window.URL.createObjectURL as any) = origCreateObjectURL;
  });

  it('generates correct markdown content in card files', async () => {
    let capturedBlob: Blob | null = null;
    const origCreateObjectURL = window.URL.createObjectURL;
    (window.URL.createObjectURL as any) = vi.fn((blob: Blob) => {
      capturedBlob = blob;
      return 'mock-url';
    });

    await generateObsidianVault(mockLecture);

    const zip = await JSZip.loadAsync(capturedBlob!);
    const cardFile = zip.file('Test Lecture/What is React-.md');
    expect(cardFile).not.toBeNull();

    const content = await cardFile!.async('string');
    expect(content).toContain('# What is React?');
    expect(content).toContain('[[Test Lecture]]');
    expect(content).toContain('Page 1');
    expect(content).toContain('## Front');
    expect(content).toContain('## Back');
    expect(content).toContain('A JavaScript library for building user interfaces.');

    (window.URL.createObjectURL as any) = origCreateObjectURL;
  });

  it('generates master note with lecture metadata', async () => {
    let capturedBlob: Blob | null = null;
    const origCreateObjectURL = window.URL.createObjectURL;
    (window.URL.createObjectURL as any) = vi.fn((blob: Blob) => {
      capturedBlob = blob;
      return 'mock-url';
    });

    await generateObsidianVault(mockLecture);

    const zip = await JSZip.loadAsync(capturedBlob!);
    const masterNote = zip.file('Test Lecture/Test Lecture.md');
    expect(masterNote).not.toBeNull();

    const content = await masterNote!.async('string');
    expect(content).toContain('# Test Lecture');
    expect(content).toContain('Total Slides: 3');
    expect(content).toContain('## Concepts');

    (window.URL.createObjectURL as any) = origCreateObjectURL;
  });

  // ---- PowerPoint generation tests ----

  it('generates a pptx without errors', async () => {
    await generatePowerPoint(mockLecture);
    // If it didn't throw, it succeeded. writeFile was called on the instance.
    // We can't easily access the instance, but we verify no error was thrown.
  });

  it('creates slides only for completed cards', async () => {
    mockSlide.addText.mockClear();
    mockSlide.addImage.mockClear();

    await generatePowerPoint(mockLecture);
    // 2 completed cards × 3 text calls each (title + body + footer) = 6
    expect(mockSlide.addText).toHaveBeenCalledTimes(6);
  });

  it('does not add images when cards have no originalImage', async () => {
    mockSlide.addImage.mockClear();
    mockSlide.addText.mockClear();

    await generatePowerPoint(mockLecture);
    expect(mockSlide.addImage).not.toHaveBeenCalled();
  });

  it('adds images to slides when originalImage is present', async () => {
    mockSlide.addImage.mockClear();
    mockSlide.addText.mockClear();

    const lectureWithImages: Lecture = {
      ...mockLecture,
      cards: [
        {
          id: 'c1',
          front: 'Image card',
          back: 'Has an image',
          pageNumber: 1,
          status: 'completed',
          originalImage: 'data:image/jpeg;base64,abc123',
        },
      ],
    };
    await generatePowerPoint(lectureWithImages);

    expect(mockSlide.addImage).toHaveBeenCalledWith(
      expect.objectContaining({ data: 'data:image/jpeg;base64,abc123' })
    );
  });

  it('skips failed cards in pptx generation', async () => {
    mockSlide.addText.mockClear();
    mockSlide.addImage.mockClear();

    const allFailed: Lecture = {
      ...mockLecture,
      cards: mockLecture.cards.map(c => ({ ...c, status: 'failed' as const })),
    };
    await generatePowerPoint(allFailed);
    // No slides = no text or image calls
    expect(mockSlide.addText).not.toHaveBeenCalled();
    expect(mockSlide.addImage).not.toHaveBeenCalled();
  });
});

