import React, { useState } from 'react';
import { Lecture, Flashcard } from '../types';
import { generateObsidianVault, saveVaultToDirectory, generatePowerPoint } from '../services/exportService';
import { SlideViewer } from './SlideViewer';
import { Download, FileJson, ArrowLeft, Layers, PenLine, ExternalLink, Save, CheckCircle, Loader2, FolderOpen, Presentation, LayoutGrid, MonitorPlay, SkipForward } from 'lucide-react';

interface ResultsProps {
  lecture: Lecture;
  onReset: () => void;
}

export const Results: React.FC<ResultsProps> = ({ lecture, onReset }) => {
  const [cards, setCards] = useState<Flashcard[]>(lecture.cards);
  const [filter, setFilter] = useState<'all' | 'flagged'>('all');
  const [saving, setSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(lecture.is_saved);
  const [savedPath, setSavedPath] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'slides' | 'cards'>('slides');

  const handleSave = async () => {
      setSaving(true);
      try {
          // Let the user pick a directory and write vault files there
          const result = await saveVaultToDirectory({ ...lecture, cards });
          
          if (!result.saved) {
              // User cancelled the picker
              setSaving(false);
              return;
          }

          setSavedPath(result.path || null);

          // Also store on backend for the saved projects list
          await fetch(`http://localhost:8000/lectures/store`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  id: lecture.id,
                  filename: lecture.filename,
                  upload_date: lecture.uploadDate,
                  total_slides: lecture.totalSlides,
                  processed_slides: lecture.processedSlides,
                  cards: cards.map(c => ({
                      id: c.id,
                      front: c.front,
                      back: c.back,
                      page_number: c.pageNumber,
                      status: c.status,
                      error: c.error || null
                  })),
                  status: lecture.status === 'completed' ? 'completed' : lecture.status,
                  is_saved: true
              })
          }).catch(() => {}); // Non-critical — files are already saved locally

          setIsSaved(true);
          lecture.is_saved = true;
      } catch (e: any) {
          console.error(e);
          alert(`Error saving project: ${e.message}`);
      } finally {
          setSaving(false);
      }
  }

  const handleExportObsidian = () => {
    generateObsidianVault({ ...lecture, cards });
  };

  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(lecture, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `${lecture.filename.replace('.pdf', '')}_processed.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleDownload = async () => {
    await generateObsidianVault({ ...lecture, cards });
  };

  const handleExportPptx = async () => {
    await generatePowerPoint({ ...lecture, cards });
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      
      {/* Header Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <button onClick={onReset} className="flex items-center text-sm text-slate-500 hover:text-indigo-600 mb-2 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-1" /> Process another file
          </button>
          <h1 className="text-2xl font-bold text-slate-900">{lecture.filename}</h1>
          <p className="text-slate-500 text-sm mt-1">
            Generated {cards.filter(c => c.status === 'completed').length} concepts from {lecture.totalSlides} slides.
            {cards.filter(c => c.status === 'skipped').length > 0 && (
              <span className="ml-1 text-amber-600">
                ({cards.filter(c => c.status === 'skipped').length} skipped)
              </span>
            )}
            {savedPath && <span className="ml-2 text-emerald-600">• Saved to {savedPath}</span>}
          </p>
        </div>

        <div className="flex gap-3">
            <button 
                onClick={handleExportJSON}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
                <FileJson className="w-4 h-4" />
                Raw JSON
            </button>
            <button 
                onClick={handleSave}
                disabled={isSaved || saving}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg shadow-sm transition-all text-white
                    ${isSaved ? 'bg-emerald-600 cursor-default' : 'bg-slate-700 hover:bg-slate-800'}`}
            >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : (isSaved ? <CheckCircle className="w-4 h-4" /> : <FolderOpen className="w-4 h-4" />)}
                {saving ? 'Saving...' : (isSaved ? 'Saved' : 'Save to Folder')}
            </button>
            <button 
                onClick={handleDownload}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-lg hover:bg-indigo-700 shadow-sm transition-all hover:shadow-md"
            >
                <Download className="w-4 h-4" />
                Download Obsidian Vault
            </button>
            <button 
                onClick={handleExportPptx}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-violet-600 border border-transparent rounded-lg hover:bg-violet-700 shadow-sm transition-all hover:shadow-md"
            >
                <Presentation className="w-4 h-4" />
                Download Slides (.pptx)
            </button>
        </div>
      </div>

      {/* View Toggle */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setViewMode('slides')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
            viewMode === 'slides'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <MonitorPlay className="w-4 h-4" />
          Slide View
        </button>
        <button
          onClick={() => setViewMode('cards')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
            viewMode === 'cards'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <LayoutGrid className="w-4 h-4" />
          Card View
        </button>
      </div>

      {/* Slide Viewer */}
      {viewMode === 'slides' && (
        <SlideViewer cards={cards} lectureName={lecture.filename.replace('.pdf', '')} />
      )}

      {/* Card Grid */}
      {viewMode === 'cards' && (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cards.map((card) => (
          <div key={card.id} className={`group relative bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col ${card.status === 'skipped' ? 'opacity-50' : ''}`}>
            {/* Slide Image */}
            {card.originalImage && (
                <div className="bg-slate-100 border-b border-slate-200">
                    <img 
                        src={card.originalImage} 
                        alt={`Slide ${card.pageNumber}`}
                        className="w-full h-40 object-contain"
                    />
                </div>
            )}

            {/* Card Header (Source) */}
            <div className="bg-slate-50 px-4 py-2 border-b border-slate-100 flex justify-between items-center text-xs text-slate-500 font-mono">
                <span>Page {card.pageNumber}</span>
                {card.status === 'failed' && <span className="text-red-500">Failed</span>}
                {card.status === 'skipped' && <span className="text-amber-500 flex items-center gap-1"><SkipForward className="w-3 h-3" />Skipped</span>}
            </div>
            
            {/* Card Content */}
            <div className="p-5 flex-1 flex flex-col gap-4">
                <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Concept (Front)</label>
                    <div className="font-semibold text-slate-800 leading-tight">
                        {card.front || <span className="text-slate-300 italic">No content generated</span>}
                    </div>
                </div>
                
                <div className="w-full h-px bg-slate-100"></div>

                <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Explanation (Back)</label>
                    <div className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                        {card.back || <span className="text-slate-300 italic">No content generated</span>}
                    </div>
                </div>
            </div>

            {/* Actions overlay */}
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button className="p-1.5 bg-white border border-slate-200 rounded-md text-slate-500 hover:text-indigo-600 shadow-sm">
                    <PenLine className="w-3.5 h-3.5" />
                </button>
            </div>
          </div>
        ))}
      </div>
      )}
      
      {/* Footer Info */}
      <div className="bg-violet-50 border border-violet-100 rounded-lg p-4 flex items-start gap-3">
        <div className="p-1 bg-violet-100 rounded-full text-violet-600 mt-0.5">
            <Presentation className="w-4 h-4" />
        </div>
        <div className="text-sm text-violet-800">
            <p className="font-semibold mb-1">Presentation Export</p>
            <p className="opacity-80">
                Click "Download Slides (.pptx)" to generate a PowerPoint file with your slide images and concepts. 
                The file is compatible with PowerPoint, Google Slides, and Keynote.
            </p>
        </div>
      </div>
    </div>
  );
};