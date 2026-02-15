import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { Upload } from '../Upload';

describe('Upload Component', () => {
  let mockOnFileSelect: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnFileSelect = vi.fn();
  });

  it('renders the upload area with correct text', () => {
    render(<Upload onFileSelect={mockOnFileSelect} />);
    expect(screen.getByText('Upload Lecture PDF')).toBeInTheDocument();
    expect(screen.getByText(/Drag and drop your lecture slides/)).toBeInTheDocument();
    expect(screen.getByText('PDF Document')).toBeInTheDocument();
  });

  it('renders the three workflow step cards', () => {
    render(<Upload onFileSelect={mockOnFileSelect} />);
    expect(screen.getByText('1. Ingest')).toBeInTheDocument();
    expect(screen.getByText('2. Synthesize')).toBeInTheDocument();
    expect(screen.getByText('3. Knowledge')).toBeInTheDocument();
  });

  it('renders a file input that accepts PDFs', () => {
    render(<Upload onFileSelect={mockOnFileSelect} />);
    const fileInput = screen.getByTestId('file-input') as HTMLInputElement;
    expect(fileInput).toBeInTheDocument();
    expect(fileInput.type).toBe('file');
    expect(fileInput.accept).toBe('application/pdf');
  });

  it('calls onFileSelect when a PDF file is selected via input', () => {
    render(<Upload onFileSelect={mockOnFileSelect} />);
    const fileInput = screen.getByTestId('file-input');
    const pdfFile = new File(['pdf content'], 'lecture.pdf', { type: 'application/pdf' });

    fireEvent.change(fileInput, { target: { files: [pdfFile] } });
    expect(mockOnFileSelect).toHaveBeenCalledWith(pdfFile);
  });

  it('calls onFileSelect when a PDF is dropped', () => {
    render(<Upload onFileSelect={mockOnFileSelect} />);
    const dropZone = screen.getByText('Upload Lecture PDF').closest('div')!.parentElement!;

    const pdfFile = new File(['pdf content'], 'lecture.pdf', { type: 'application/pdf' });
    fireEvent.drop(dropZone, {
      dataTransfer: { files: [pdfFile] },
    });
    expect(mockOnFileSelect).toHaveBeenCalledWith(pdfFile);
  });

  it('shows alert when a non-PDF file is dropped', () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    render(<Upload onFileSelect={mockOnFileSelect} />);
    const dropZone = screen.getByText('Upload Lecture PDF').closest('div')!.parentElement!;

    const textFile = new File(['text'], 'notes.txt', { type: 'text/plain' });
    fireEvent.drop(dropZone, {
      dataTransfer: { files: [textFile] },
    });
    expect(mockOnFileSelect).not.toHaveBeenCalled();
    expect(alertSpy).toHaveBeenCalledWith('Please upload a valid PDF file.');
    alertSpy.mockRestore();
  });

  it('does not call onFileSelect when no file is provided via input', () => {
    render(<Upload onFileSelect={mockOnFileSelect} />);
    const fileInput = screen.getByTestId('file-input');
    fireEvent.change(fileInput, { target: { files: [] } });
    expect(mockOnFileSelect).not.toHaveBeenCalled();
  });

  it('prevents default on dragOver', () => {
    render(<Upload onFileSelect={mockOnFileSelect} />);
    const dropZone = screen.getByText('Upload Lecture PDF').closest('div')!.parentElement!;
    const dragOverEvent = new Event('dragover', { bubbles: true, cancelable: true });
    const prevented = !dropZone.dispatchEvent(dragOverEvent);
    // dragOver should prevent default
    expect(prevented).toBe(true);
  });
});
