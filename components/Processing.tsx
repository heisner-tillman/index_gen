import React, { useEffect, useState, useRef } from 'react';
import { Lecture, Flashcard } from '../types';
import { analyzeSlide, extractPDFInfo, renderPageToImage } from '../services';
import { Loader2, CheckCircle2, AlertCircle, FileText, SkipForward } from 'lucide-react';

interface ProcessingProps {
  file: File;
  limit: number | null;
  onComplete: (lecture: Lecture) => void;
  onError: (error: string) => void;
}

const CONCURRENT_REQUESTS = 3; // Limit concurrency to avoid browser/API overload

export const Processing: React.FC<ProcessingProps> = ({ file, limit, onComplete, onError }) => {
  const [status, setStatus] = useState<string>('Initializing PDF engine...');
  const [progress, setProgress] = useState(0);
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [currentProcessingPage, setCurrentProcessingPage] = useState(0);

  // Use refs to keep track of processing state without triggering excessive re-renders during loops
  const cardsRef = useRef<Flashcard[]>([]);
  const isProcessing = useRef(false);

  useEffect(() => {
    const processPDF = async () => {
      if (isProcessing.current) return;
      isProcessing.current = true;

      try {
        setStatus('Extracting pages...');
        const { pageCount, pdfDoc } = await extractPDFInfo(file).catch(e => {
            throw new Error(`Failed to load PDF: ${e.message}`);
        });

        // Determine actual number of pages to process
        const totalToProcess = limit ? Math.min(limit, pageCount) : pageCount;

        const initialCards: Flashcard[] = Array.from({ length: totalToProcess }, (_, i) => ({
          id: crypto.randomUUID(),
          front: '',
          back: '',
          pageNumber: i + 1,
          status: 'pending'
        }));

        setCards(initialCards);
        cardsRef.current = initialCards;

        // Process in batches
        const queue = [...initialCards];
        const activeWorkers: Promise<void>[] = [];

        const processItem = async (card: Flashcard) => {
          try {
             // 1. Render Page
             const base64 = await renderPageToImage(pdfDoc, card.pageNumber);
             
             // Update ref and state to show preview (optional, consumes memory)
             const cardIndex = cardsRef.current.findIndex(c => c.id === card.id);
             if (cardIndex !== -1) {
                 cardsRef.current[cardIndex].originalImage = base64;
                 cardsRef.current[cardIndex].status = 'processing';
                 setCards([...cardsRef.current]);
             }

             // 2. Call Gemini
             setCurrentProcessingPage(card.pageNumber);
             const result = await analyzeSlide(base64, card.pageNumber);

             // 3. Update result
             if (cardIndex !== -1) {
                 const wasSkipped = result.skip === true;
                 cardsRef.current[cardIndex] = {
                     ...cardsRef.current[cardIndex],
                     front: result.front,
                     back: result.back,
                     status: wasSkipped ? 'skipped' : 'completed'
                 };
                 setCards([...cardsRef.current]);
             }

          } catch (err) {
             console.error(err);
             const cardIndex = cardsRef.current.findIndex(c => c.id === card.id);
             if (cardIndex !== -1) {
                 cardsRef.current[cardIndex].status = 'failed';
                 cardsRef.current[cardIndex].error = 'Generation failed';
                 setCards([...cardsRef.current]);
             }
          } finally {
              setProgress(prev => prev + 1);
          }
        };

        // Semaphore-like batch processing
        while (queue.length > 0 || activeWorkers.length > 0) {
            while (queue.length > 0 && activeWorkers.length < CONCURRENT_REQUESTS) {
                const card = queue.shift();
                if (card) {
                    const worker = processItem(card).then(() => {
                        activeWorkers.splice(activeWorkers.indexOf(worker), 1);
                    });
                    activeWorkers.push(worker);
                }
            }
            if (activeWorkers.length > 0) {
                await Promise.race(activeWorkers);
            }
        }

        setStatus('Finalizing knowledge graph...');
        
        // Final completion callback
        const finalLecture: Lecture = {
            id: crypto.randomUUID(),
            filename: file.name,
            uploadDate: Date.now(),
            totalSlides: pageCount,
            processedSlides: cardsRef.current.filter(c => c.status === 'completed').length,
            cards: cardsRef.current,
            status: 'completed',
            is_saved: false
        };

        onComplete(finalLecture);

      } catch (err: any) {
        onError(err.message || "An unexpected error occurred during processing.");
      }
    };

    processPDF();
  }, [file, onComplete, onError]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] w-full max-w-2xl mx-auto p-8 bg-white rounded-xl shadow-sm border border-slate-200">
      <div className="w-full mb-8">
        <div className="flex justify-between mb-2 text-sm font-medium text-slate-700">
          <span>{status}</span>
          <span>{Math.round((progress / cards.length) * 100) || 0}%</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
          <div 
            className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300 ease-out" 
            style={{ width: `${(progress / cards.length) * 100}%` }}
          ></div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 w-full max-h-[300px] overflow-y-auto p-2">
        {cards.map((card) => (
          <div 
            key={card.id} 
            className={`relative aspect-[4/3] rounded-lg border-2 flex items-center justify-center text-xs font-mono transition-all duration-300
              ${card.status === 'completed' ? 'border-emerald-100 bg-emerald-50 text-emerald-700' : 
                card.status === 'processing' ? 'border-indigo-200 bg-indigo-50 animate-pulse' : 
                card.status === 'failed' ? 'border-red-200 bg-red-50 text-red-600' :
                card.status === 'skipped' ? 'border-amber-200 bg-amber-50 text-amber-600' :
                'border-slate-100 bg-slate-50 text-slate-400'}`}
          >
            {card.originalImage && (
                <img src={card.originalImage} alt="" className="absolute inset-0 w-full h-full object-cover opacity-20 rounded-md" />
            )}
            <span className="relative z-10 flex flex-col items-center gap-1">
                {card.status === 'processing' && <Loader2 className="w-4 h-4 animate-spin" />}
                {card.status === 'completed' && <CheckCircle2 className="w-4 h-4" />}
                {card.status === 'failed' && <AlertCircle className="w-4 h-4" />}
                {card.status === 'skipped' && <SkipForward className="w-4 h-4" />}
                {card.status === 'pending' && <FileText className="w-4 h-4" />}
                Page {card.pageNumber}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};