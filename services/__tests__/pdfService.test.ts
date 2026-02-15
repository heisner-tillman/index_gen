import { describe, it, expect, vi, beforeEach } from 'vitest';
import { extractPDFInfo, renderPageToImage } from '../pdfService';
import * as pdfjsLib from 'pdfjs-dist';

// Mock pdfjs-dist
vi.mock('pdfjs-dist', () => {
  const mockPage = {
    getViewport: vi.fn(() => ({ width: 100, height: 100 })),
    render: vi.fn(() => ({ promise: Promise.resolve() })),
  };
  
  const mockDoc = {
    numPages: 3,
    getPage: vi.fn(() => Promise.resolve(mockPage)),
  };

  return {
    getDocument: vi.fn(() => ({ promise: Promise.resolve(mockDoc) })),
    GlobalWorkerOptions: {},
    version: '1.0.0',
  };
});

describe('pdfService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('extractPDFInfo successfully loads PDF and returns page count', async () => {
    const mockFile = new File(['dummy'], 'test.pdf', { type: 'application/pdf' });
    // Polyfill arrayBuffer for jsdom's File implementation
    if (!mockFile.arrayBuffer) {
      mockFile.arrayBuffer = () => Promise.resolve(new ArrayBuffer(5));
    }
    const result = await extractPDFInfo(mockFile);
    
    expect(pdfjsLib.getDocument).toHaveBeenCalled();
    expect(result.pageCount).toBe(3);
    expect(result.pdfDoc).toBeDefined();
  });

  it('renderPageToImage renders a page to base64', async () => {
    // We need to pass the mock doc returned by getDocument
    const mockDoc = await (pdfjsLib.getDocument({} as any).promise);
    
    const result = await renderPageToImage(mockDoc, 1);
    
    // Check that getPage was called with correct number
    expect(mockDoc.getPage).toHaveBeenCalledWith(1);
    
    // Check that canvas methods were called (via our setupTests mock)
    // The result should be the mock string from setupTests
    expect(result).toBe('data:image/jpeg;base64,mock-image-data');
  });
});