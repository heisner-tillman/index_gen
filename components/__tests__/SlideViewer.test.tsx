import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { SlideViewer } from '../SlideViewer';
import { Flashcard } from '../../types';

const createCards = (count: number): Flashcard[] =>
  Array.from({ length: count }, (_, i) => ({
    id: `card-${i + 1}`,
    front: `Concept ${i + 1}`,
    back: `Explanation for concept ${i + 1}`,
    pageNumber: i + 1,
    status: 'completed' as const,
    originalImage: i % 2 === 0 ? `data:image/jpeg;base64,img${i + 1}` : undefined,
  }));

describe('SlideViewer', () => {
  it('renders the first slide by default', () => {
    render(<SlideViewer cards={createCards(3)} lectureName="Test" />);
    expect(screen.getByText('Concept 1')).toBeInTheDocument();
    expect(screen.getByText('Explanation for concept 1')).toBeInTheDocument();
    expect(screen.getByText('1 / 3')).toBeInTheDocument();
  });

  it('shows empty state when no completed cards', () => {
    const failedCards: Flashcard[] = [
      { id: 'f1', front: 'X', back: 'Y', pageNumber: 1, status: 'failed' },
    ];
    render(<SlideViewer cards={failedCards} lectureName="Test" />);
    expect(screen.getByText('No completed slides to display.')).toBeInTheDocument();
  });

  it('navigates to next slide on next button click', () => {
    render(<SlideViewer cards={createCards(3)} lectureName="Test" />);
    fireEvent.click(screen.getByLabelText('Next slide'));
    expect(screen.getByText('Concept 2')).toBeInTheDocument();
    expect(screen.getByText('2 / 3')).toBeInTheDocument();
  });

  it('navigates to previous slide on prev button click', () => {
    render(<SlideViewer cards={createCards(3)} lectureName="Test" />);
    fireEvent.click(screen.getByLabelText('Next slide'));
    fireEvent.click(screen.getByLabelText('Previous slide'));
    expect(screen.getByText('Concept 1')).toBeInTheDocument();
    expect(screen.getByText('1 / 3')).toBeInTheDocument();
  });

  it('disables prev button on first slide', () => {
    render(<SlideViewer cards={createCards(3)} lectureName="Test" />);
    expect(screen.getByLabelText('Previous slide')).toBeDisabled();
  });

  it('disables next button on last slide', () => {
    render(<SlideViewer cards={createCards(2)} lectureName="Test" />);
    fireEvent.click(screen.getByLabelText('Next slide'));
    expect(screen.getByLabelText('Next slide')).toBeDisabled();
  });

  it('renders thumbnail strip with correct count', () => {
    render(<SlideViewer cards={createCards(4)} lectureName="Test" />);
    const thumbs = screen.getAllByLabelText(/Go to slide/);
    expect(thumbs).toHaveLength(4);
  });

  it('navigates to slide via thumbnail click', () => {
    render(<SlideViewer cards={createCards(4)} lectureName="Test" />);
    fireEvent.click(screen.getByLabelText('Go to slide 3'));
    expect(screen.getByText('Concept 3')).toBeInTheDocument();
    expect(screen.getByText('3 / 4')).toBeInTheDocument();
  });

  it('displays slide image when originalImage is present', () => {
    render(<SlideViewer cards={createCards(3)} lectureName="Test" />);
    // Card 1 (index 0) has an image
    const img = screen.getByAltText('Slide 1');
    expect(img).toHaveAttribute('src', 'data:image/jpeg;base64,img1');
  });

  it('shows "No image available" when originalImage is absent', () => {
    render(<SlideViewer cards={createCards(3)} lectureName="Test" />);
    fireEvent.click(screen.getByLabelText('Next slide'));
    // Card 2 (index 1) has no image
    expect(screen.getByText('No image available')).toBeInTheDocument();
  });

  it('displays page badge for current card', () => {
    render(<SlideViewer cards={createCards(3)} lectureName="Test" />);
    expect(screen.getByText('Page 1')).toBeInTheDocument();
  });

  it('shows lecture name in toolbar', () => {
    render(<SlideViewer cards={createCards(2)} lectureName="My Lecture" />);
    expect(screen.getByText('My Lecture')).toBeInTheDocument();
  });

  it('has a fullscreen toggle button', () => {
    render(<SlideViewer cards={createCards(2)} lectureName="Test" />);
    const btn = screen.getByLabelText('Enter fullscreen');
    expect(btn).toBeInTheDocument();
  });

  it('filters out non-completed cards', () => {
    const cards: Flashcard[] = [
      { id: 'c1', front: 'Good', back: 'Content', pageNumber: 1, status: 'completed' },
      { id: 'c2', front: 'Bad', back: '', pageNumber: 2, status: 'failed' },
      { id: 'c3', front: 'Also Good', back: 'More', pageNumber: 3, status: 'completed' },
    ];
    render(<SlideViewer cards={cards} lectureName="Test" />);
    expect(screen.getByText('1 / 2')).toBeInTheDocument();
    const thumbs = screen.getAllByLabelText(/Go to slide/);
    expect(thumbs).toHaveLength(2);
  });
});
