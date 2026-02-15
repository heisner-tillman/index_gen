export interface Flashcard {
  id: string;
  front: string;
  back: string;
  pageNumber: number;
  page_number?: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
  originalImage?: string; // Base64 of the slide for UI reference
}

export interface Lecture {
  id: string;
  filename: string;
  uploadDate: number;
  upload_date?: number;
  totalSlides: number;
  total_slides?: number;
  processedSlides: number;
  processed_slides?: number;
  cards: Flashcard[];
  status: 'idle' | 'extracting' | 'analyzing' | 'completed';
  is_saved: boolean;
}

export interface ProcessingStats {
  total: number;
  success: number;
  failed: number;
  startTime: number;
  endTime?: number;
}

export enum AppView {
  DASHBOARD = 'DASHBOARD',
  CONSENT = 'CONSENT',
  PROCESSING = 'PROCESSING',
  RESULTS = 'RESULTS',
}
