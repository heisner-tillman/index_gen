import React, { useState, useEffect, useCallback } from 'react';
import { Flashcard } from '../types';
import { ChevronLeft, ChevronRight, Maximize2, Minimize2, Image } from 'lucide-react';

interface SlideViewerProps {
  cards: Flashcard[];
  lectureName: string;
}

export const SlideViewer: React.FC<SlideViewerProps> = ({ cards, lectureName }) => {
  const completedCards = cards.filter(c => c.status === 'completed');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);

  const totalSlides = completedCards.length;
  const currentCard = completedCards[currentIndex];

  const goNext = useCallback(() => {
    setCurrentIndex(i => Math.min(i + 1, totalSlides - 1));
  }, [totalSlides]);

  const goPrev = useCallback(() => {
    setCurrentIndex(i => Math.max(i - 1, 0));
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        goNext();
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        goPrev();
      } else if (e.key === 'Escape' && isExpanded) {
        setIsExpanded(false);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [goNext, goPrev, isExpanded]);

  if (totalSlides === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
        <Image className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <p className="text-slate-400 text-sm">No completed slides to display.</p>
      </div>
    );
  }

  return (
    <div
      className={`bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden transition-all duration-300 ${
        isExpanded ? 'fixed inset-4 z-50 flex flex-col' : ''
      }`}
      data-testid="slide-viewer"
    >
      {/* Expanded backdrop */}
      {isExpanded && (
        <div className="fixed inset-0 bg-black/50 -z-10" onClick={() => setIsExpanded(false)} />
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between px-5 py-3 bg-gradient-to-r from-slate-800 to-slate-900 text-white">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold tracking-wide opacity-90">Slide Preview</span>
          <span className="text-xs text-slate-400">{lectureName}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 tabular-nums">
            {currentIndex + 1} / {totalSlides}
          </span>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-md hover:bg-white/10 transition-colors"
            aria-label={isExpanded ? 'Exit fullscreen' : 'Enter fullscreen'}
          >
            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Slide Area */}
      <div className={`relative flex ${isExpanded ? 'flex-1 min-h-0' : ''}`}>
        {/* Prev button */}
        <button
          onClick={goPrev}
          disabled={currentIndex === 0}
          className="absolute left-2 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-white/90 border border-slate-200 shadow-lg text-slate-600 hover:text-slate-900 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          aria-label="Previous slide"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {/* Slide content */}
        <div className={`w-full flex flex-col md:flex-row items-stretch ${isExpanded ? 'flex-1 min-h-0' : ''}`}>
          {/* Image pane */}
          {currentCard.originalImage ? (
            <div className={`md:w-3/5 bg-slate-50 flex items-center justify-center p-4 border-r border-slate-100 ${isExpanded ? 'min-h-0' : 'min-h-[400px]'}`}>
              <img
                src={currentCard.originalImage}
                alt={`Slide ${currentCard.pageNumber}`}
                className={`max-w-full object-contain rounded-lg shadow-sm ${isExpanded ? 'max-h-full' : 'max-h-[480px]'}`}
              />
            </div>
          ) : (
            <div className={`md:w-3/5 bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4 border-r border-slate-100 ${isExpanded ? 'min-h-0' : 'min-h-[400px]'}`}>
              <div className="text-center">
                <Image className="w-16 h-16 text-slate-200 mx-auto mb-2" />
                <p className="text-xs text-slate-400">No image available</p>
              </div>
            </div>
          )}

          {/* Text pane */}
          <div className={`md:w-2/5 p-6 flex flex-col justify-center gap-5 ${isExpanded ? 'overflow-y-auto' : ''}`}>
            {/* Page badge */}
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                Page {currentCard.pageNumber}
              </span>
              {currentCard.status === 'failed' && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-600 border border-red-100">
                  Failed
                </span>
              )}
            </div>

            {/* Concept (Front) */}
            <div>
              <label className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1 block">
                Concept
              </label>
              <h2 className="text-xl font-bold text-slate-900 leading-snug">
                {currentCard.front || <span className="text-slate-300 italic">No content</span>}
              </h2>
            </div>

            <div className="w-12 h-0.5 bg-gradient-to-r from-indigo-400 to-violet-400 rounded-full" />

            {/* Explanation (Back) */}
            <div>
              <label className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1 block">
                Explanation
              </label>
              <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                {currentCard.back || <span className="text-slate-300 italic">No content</span>}
              </p>
            </div>
          </div>
        </div>

        {/* Next button */}
        <button
          onClick={goNext}
          disabled={currentIndex === totalSlides - 1}
          className="absolute right-2 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-white/90 border border-slate-200 shadow-lg text-slate-600 hover:text-slate-900 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          aria-label="Next slide"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Thumbnail strip */}
      <div className="border-t border-slate-200 bg-slate-50 px-4 py-3 overflow-x-auto">
        <div className="flex gap-2 min-w-max">
          {completedCards.map((card, idx) => (
            <button
              key={card.id}
              onClick={() => setCurrentIndex(idx)}
              className={`flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all duration-200 ${
                idx === currentIndex
                  ? 'border-indigo-500 shadow-md scale-105'
                  : 'border-transparent hover:border-slate-300 opacity-60 hover:opacity-100'
              }`}
              aria-label={`Go to slide ${idx + 1}`}
            >
              {card.originalImage ? (
                <img
                  src={card.originalImage}
                  alt={`Thumbnail ${idx + 1}`}
                  className="w-20 h-14 object-cover"
                />
              ) : (
                <div className="w-20 h-14 bg-slate-200 flex items-center justify-center">
                  <span className="text-[10px] text-slate-500 font-mono">{idx + 1}</span>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
