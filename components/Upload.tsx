import React, { useCallback } from 'react';
import { UploadCloud, FileType } from 'lucide-react';

interface UploadProps {
  onFileSelect: (file: File) => void;
}

export const Upload: React.FC<UploadProps> = ({ onFileSelect }) => {
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const files = e.dataTransfer.files;
      if (files && files[0] && files[0].type === 'application/pdf') {
        onFileSelect(files[0]);
      } else {
        alert('Please upload a valid PDF file.');
      }
    },
    [onFileSelect]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileSelect(e.target.files[0]);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto">
        <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            className="group relative flex flex-col items-center justify-center w-full h-80 bg-white border-2 border-dashed border-slate-300 rounded-2xl cursor-pointer hover:border-indigo-500 hover:bg-indigo-50/30 transition-all duration-300 ease-out"
        >
            <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center px-4">
                <div className="p-4 bg-indigo-50 text-indigo-600 rounded-full mb-4 group-hover:scale-110 transition-transform duration-300">
                    <UploadCloud className="w-10 h-10" />
                </div>
                <p className="mb-2 text-xl font-semibold text-slate-700">
                    Upload Lecture PDF
                </p>
                <p className="mb-6 text-sm text-slate-500 max-w-xs mx-auto leading-relaxed">
                    Drag and drop your lecture slides here, or click to browse. We support high-resolution PDFs.
                </p>
                <div className="flex items-center gap-2 text-xs text-slate-400 uppercase tracking-widest font-bold">
                    <FileType className="w-3 h-3" />
                    PDF Document
                </div>
            </div>
            <input 
                id="dropzone-file" 
                data-testid="file-input"
                type="file" 
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                accept="application/pdf"
                onChange={handleChange}
            />
        </div>
        
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-100">
                <div className="font-bold text-slate-700 text-lg mb-1">1. Ingest</div>
                <p className="text-xs text-slate-500">Secure local parsing & page isolation</p>
            </div>
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-100">
                <div className="font-bold text-slate-700 text-lg mb-1">2. Synthesize</div>
                <p className="text-xs text-slate-500">Multimodal Gemini 2.5 Analysis</p>
            </div>
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-100">
                <div className="font-bold text-slate-700 text-lg mb-1">3. Knowledge</div>
                <p className="text-xs text-slate-500">Export to Obsidian & Slides</p>
            </div>
        </div>
    </div>
  );
};