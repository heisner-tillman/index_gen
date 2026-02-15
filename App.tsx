import React, { useState } from 'react';
import { Upload } from './components/Upload';
import { Processing } from './components/Processing';
import { Results } from './components/Results';
import { AppView, Lecture } from './types';
import { BrainCircuit, FilePlus2, FolderOpen } from 'lucide-react';

import { Consent } from './components/Consent';
import { SavedProjects } from './components/SavedProjects';

type DashboardTab = 'new' | 'saved';

const App: React.FC = () => {
  const [view, setView] = useState<AppView>(AppView.DASHBOARD);
  const [dashboardTab, setDashboardTab] = useState<DashboardTab>('new');
  const [file, setFile] = useState<File | null>(null);
  const [processingLimit, setProcessingLimit] = useState<number | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>('gemini-2.5-flash');
  const [lecture, setLecture] = useState<Lecture | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Warn on tab close if work is unsaved
  React.useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (lecture && !lecture.is_saved) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [lecture]);

  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile);
    setView(AppView.CONSENT);
    setError(null);
  };

  const handleConsent = (limit: number | null, model: string) => {
      setProcessingLimit(limit);
      setSelectedModel(model);
      setView(AppView.PROCESSING);
  };

  const handleProcessingComplete = (completedLecture: Lecture) => {
    setLecture(completedLecture);
    setView(AppView.RESULTS);
  };

  const handleProcessingError = (errorMessage: string) => {
    setError(errorMessage);
    alert(`Processing failed: ${errorMessage}`);
    setView(AppView.DASHBOARD);
    setFile(null);
  };

  const handleReset = () => {
    setFile(null);
    setLecture(null);
    setProcessingLimit(null);
    setSelectedModel('gemini-2.5-flash');
    setView(AppView.DASHBOARD);
  };

  const handleSelectSaved = (saved: Lecture) => {
    const normalized: Lecture = {
      ...saved,
      uploadDate: saved.uploadDate ?? saved.upload_date ?? 0,
      totalSlides: saved.totalSlides ?? saved.total_slides ?? 0,
      processedSlides: saved.processedSlides ?? saved.processed_slides ?? 0,
      cards: (saved.cards || []).map(c => ({
        ...c,
        pageNumber: c.pageNumber ?? c.page_number ?? 0,
      })),
    };
    setLecture(normalized);
    setView(AppView.RESULTS);
  };

  const showTabs = view === AppView.DASHBOARD;

  const tabs: { id: DashboardTab; label: string; icon: React.ReactNode }[] = [
    { id: 'new',   label: 'New Document',   icon: <FilePlus2 className="w-4 h-4" /> },
    { id: 'saved', label: 'Saved Projects', icon: <FolderOpen className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
        {/* Header */}
        <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
            <div className="max-w-6xl mx-auto px-4 sm:px-6">
                {/* Top bar: logo + meta */}
                <div className="h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2 cursor-pointer" onClick={handleReset}>
                        <div className="bg-indigo-600 p-2 rounded-lg text-white">
                            <BrainCircuit className="w-5 h-5" />
                        </div>
                        <span className="text-xl font-bold tracking-tight text-slate-800">Lecture<span className="text-indigo-600">Synth</span></span>
                    </div>
                    <div className="flex items-center gap-4 text-sm font-medium text-slate-500">
                        <span className="hidden sm:inline">v1.1.0 (Gemini 2.5)</span>
                    </div>
                </div>

                {/* Tab bar — only on dashboard */}
                {showTabs && (
                    <nav className="flex gap-1 -mb-px">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setDashboardTab(tab.id)}
                                className={`
                                    flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-all duration-200
                                    ${dashboardTab === tab.id
                                        ? 'border-indigo-600 text-indigo-600'
                                        : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                                    }
                                `}
                            >
                                {tab.icon}
                                {tab.label}
                            </button>
                        ))}
                    </nav>
                )}
            </div>
        </header>

        {/* Main Content Area */}
        <main className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
            
            {view === AppView.DASHBOARD && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    
                    {dashboardTab === 'new' && (
                        <>
                            <div className="text-center mb-12">
                                <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight mb-4">
                                    Turn Slides into <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">Knowledge</span>
                                </h1>
                                <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                                    Ingest complex PDF lectures, synthesize atomic concepts with AI, and export directly to your second brain.
                                </p>
                            </div>
                            <Upload onFileSelect={handleFileSelect} />
                        </>
                    )}

                    {dashboardTab === 'saved' && (
                        <SavedProjects onSelect={handleSelectSaved} />
                    )}
                </div>
            )}

            {view === AppView.CONSENT && file && (
                <div className="animate-in fade-in duration-500">
                    <Consent 
                        file={file} 
                        onConfirm={handleConsent} 
                        onCancel={handleReset} 
                    />
                </div>
            )}

            {view === AppView.PROCESSING && file && (
                <div className="animate-in fade-in duration-500 flex flex-col items-center">
                    <div className="mb-8 text-center">
                        <h2 className="text-2xl font-bold text-slate-900">Synthesizing Knowledge Graph</h2>
                        <p className="text-slate-500">Analyzing visual and semantic structure of {file.name}...</p>
                    </div>
                    <Processing 
                        file={file}
                        limit={processingLimit}
                        model={selectedModel}
                        onComplete={handleProcessingComplete} 
                        onError={handleProcessingError} 
                    />
                </div>
            )}

            {view === AppView.RESULTS && lecture && (
                <Results lecture={lecture} onReset={handleReset} />
            )}

        </main>
    </div>
  );
};

export default App;