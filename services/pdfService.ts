import * as pdfjsLib from 'pdfjs-dist';

// Use Vite-native URL resolution for the worker
const workerUrl = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;
}

export const loadPDF = async (file: File): Promise<pdfjsLib.PDFDocumentProxy> => {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  return loadingTask.promise;
};

export const renderPageToImage = async (pdf: pdfjsLib.PDFDocumentProxy, pageNumber: number): Promise<string> => {
  const page = await pdf.getPage(pageNumber);
  
  // High scale for better OCR/Vision results and sharp slide display
  const scale = 3.0; 
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  
  if (!context) {
    throw new Error('Could not create canvas context');
  }

  canvas.height = viewport.height;
  canvas.width = viewport.width;

  await page.render({
    canvasContext: context,
    viewport: viewport,
  }).promise;

  // Return base64 string (remove prefix for API usage usually, but keep standard data uri for internal use)
  return canvas.toDataURL('image/jpeg', 0.92); 
};

export const extractPDFInfo = async (file: File) => {
  const pdf = await loadPDF(file);
  return {
    pageCount: pdf.numPages,
    pdfDoc: pdf
  };
};