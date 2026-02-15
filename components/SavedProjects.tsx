import React, { useEffect, useState } from 'react';
import { Lecture } from '../types';
import { Trash2, FolderOpen, Loader2, AlertCircle, Clock } from 'lucide-react';

interface SavedProjectsProps {
  onSelect: (lecture: Lecture) => void;
}

export const SavedProjects: React.FC<SavedProjectsProps> = ({ onSelect }) => {
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchLectures = async () => {
    try {
      const res = await fetch('http://localhost:8000/lectures');
      if (res.ok) {
        const data = await res.json();
        setLectures(data);
      }
    } catch (e) {
      console.error('Failed to fetch lectures:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLectures();
  }, []);

  const handleDelete = async (id: string, filename: string) => {
    if (!confirm(`Delete "${filename}"? This cannot be undone.`)) return;
    setDeleting(id);
    try {
      const res = await fetch(`http://localhost:8000/lectures/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setLectures(prev => prev.filter(l => l.id !== id));
      } else {
        alert('Failed to delete.');
      }
    } catch (e) {
      console.error(e);
      alert('Error deleting project.');
    } finally {
      setDeleting(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-slate-400">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Loading saved projects...
      </div>
    );
  }

  if (lectures.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <FolderOpen className="w-12 h-12 mb-4 text-slate-300" />
        <p className="text-lg font-medium text-slate-500">No saved projects yet</p>
        <p className="text-sm mt-1">Process and save a document to see it here.</p>
      </div>
    );
  }

  const formatDate = (timestamp: number) => {
    const d = new Date(timestamp);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="w-full max-w-2xl mx-auto mt-10">
      <h3 className="text-lg font-semibold text-slate-700 mb-4 flex items-center gap-2">
        <FolderOpen className="w-5 h-5 text-slate-500" />
        Saved Projects ({lectures.length})
      </h3>
      <div className="space-y-2">
        {lectures.map(lecture => (
          <div
            key={lecture.id}
            className="flex items-center justify-between bg-white border border-slate-200 rounded-lg px-4 py-3 hover:shadow-sm transition-all group"
          >
            <div
              className="flex-1 cursor-pointer min-w-0"
              onClick={() => onSelect(lecture)}
            >
              <div className="font-medium text-slate-800 truncate">{lecture.filename}</div>
              <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatDate(lecture.uploadDate ?? lecture.upload_date)}
                </span>
                <span>{lecture.processedSlides ?? lecture.processed_slides}/{lecture.totalSlides ?? lecture.total_slides} slides</span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium uppercase ${
                  lecture.status === 'completed' ? 'bg-emerald-50 text-emerald-600' :
                  lecture.status === 'failed' ? 'bg-red-50 text-red-600' :
                  'bg-amber-50 text-amber-600'
                }`}>{lecture.status}</span>
              </div>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); handleDelete(lecture.id, lecture.filename); }}
              disabled={deleting === lecture.id}
              className="ml-3 p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors opacity-0 group-hover:opacity-100"
              title="Delete project"
            >
              {deleting === lecture.id
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Trash2 className="w-4 h-4" />
              }
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
