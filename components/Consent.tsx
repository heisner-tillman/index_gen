import React, { useState, useEffect } from 'react';
import { extractPDFInfo } from '../services';
import { Loader2, ArrowRight, Play, AlertCircle } from 'lucide-react';

interface ConsentProps {
  file: File;
  onConfirm: (limit: number | null) => void;
  onCancel: () => void;
}

export const Consent: React.FC<ConsentProps> = ({ file, onConfirm, onCancel }) => {
  const [loading, setLoading] = useState(true);
  const [pageCount, setPageCount] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [limit, setLimit] = useState<number | ''>('');
  const [useLimit, setUseLimit] = useState(false);

  useEffect(() => {
    const loadInfo = async () => {
      try {
        const { pageCount } = await extractPDFInfo(file);
        setPageCount(pageCount);
      } catch (err: any) {
         setError(err.message || 'Failed to read PDF');
      } finally {
        setLoading(false);
      }
    };
    loadInfo();
  }, [file]);

  const handleStart = () => {
    if (useLimit && typeof limit === 'number' && limit > 0) {
        onConfirm(limit);
    } else {
        onConfirm(null); // Process all (null means no limit)
    }
  };

  if (loading) {
    return (
        <div className="flex flex-col items-center justify-center p-12 text-slate-500">
            <Loader2 className="w-8 h-8 animate-spin mb-4 text-indigo-600" />
            <p>Analyzing document structure...</p>
        </div>
    );
  }

  if (error) {
      return (
          <div className="text-center p-8">
              <div className="bg-red-50 text-red-600 p-4 rounded-lg inline-flex items-center gap-2 mb-4">
                  <AlertCircle className="w-5 h-5" />
                  {error}
              </div>
              <div>
                  <button onClick={onCancel} className="text-slate-500 hover:text-slate-800 underline">
                      Go Back
                  </button>
              </div>
          </div>
      );
  }

  return (
    <div className="max-w-md mx-auto bg-white p-8 rounded-xl shadow-sm border border-slate-200">
      <h2 className="text-2xl font-bold text-slate-900 mb-2">Confirm Processing</h2>
      <p className="text-slate-600 mb-6">
        Ready to process <strong>{file.name}</strong>.
      </p>

      <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4 mb-6">
        <div className="flex justify-between items-center mb-1">
            <span className="text-indigo-900 font-medium">Total Slides Detected</span>
            <span className="text-2xl font-bold text-indigo-600">{pageCount}</span>
        </div>
        <p className="text-xs text-indigo-600/80">Each slide requires 1 API call.</p>
      </div>

      <div className="space-y-4 mb-8">
          <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${!useLimit ? 'bg-slate-50 border-indigo-500 ring-1 ring-indigo-500' : 'border-slate-200 hover:border-slate-300'}`}>
              <input 
                type="radio" 
                name="mode" 
                checked={!useLimit} 
                onChange={() => setUseLimit(false)}
                className="mt-1"
              />
              <div>
                  <span className="block font-medium text-slate-900">Process All Pages</span>
                  <span className="text-sm text-slate-500">Analyze everything. (~{pageCount} calls)</span>
              </div>
          </label>

          <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${useLimit ? 'bg-slate-50 border-indigo-500 ring-1 ring-indigo-500' : 'border-slate-200 hover:border-slate-300'}`}>
              <div className="flex gap-3 w-full">
                <input 
                    type="radio" 
                    name="mode" 
                    checked={useLimit} 
                    onChange={() => { setUseLimit(true); setLimit(5); }}
                    className="mt-1"
                />
                <div className="flex-1">
                    <span className="block font-medium text-slate-900">Limit Pages</span>
                    <span className="text-sm text-slate-500 block mb-2">Safety check or trial run.</span>
                    
                    {useLimit && (
                        <div className="flex items-center gap-2 mt-2">
                            <span className="text-sm text-slate-600">Process first</span>
                            <input 
                                type="number" 
                                min="1" 
                                max={pageCount}
                                value={limit} 
                                onChange={(e) => setLimit(parseInt(e.target.value) || '')}
                                onClick={(e) => e.stopPropagation()}
                                className="w-20 px-2 py-1 border border-slate-300 rounded text-sm"
                            />
                            <span className="text-sm text-slate-600">pages only.</span>
                        </div>
                    )}
                </div>
              </div>
          </label>
      </div>

      <div className="flex gap-3">
          <button 
            onClick={onCancel}
            className="flex-1 px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg font-medium transition-colors"
          >
              Cancel
          </button>
          <button 
            onClick={handleStart}
            className="flex-[2] bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={useLimit && (!limit || limit <= 0)}
          >
              Start Processing <ArrowRight className="w-4 h-4" />
          </button>
      </div>

    </div>
  );
};
