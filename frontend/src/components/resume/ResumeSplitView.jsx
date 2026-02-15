import React, { useEffect, useRef, useState } from 'react';
import { ensureResumeDoc, subscribeResume, upsertResume } from '../../services/resumes';

export default function ResumeSplitView({ uid, resumeId = 'default' }) {
  const [data, setData] = useState({ originalText: '', enhancedText: '', previewMode: 'original' });
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);
  const unsubscribeRef = useRef(null);
  const debounceRef = useRef(null);
  const inFlightRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;

    const setup = async () => {
      try {
        await ensureResumeDoc(uid, resumeId);
        unsubscribeRef.current = subscribeResume(
          uid,
          resumeId,
          (snap) => {
            if (!mountedRef.current) return;
            if (snap.exists()) {
              const d = snap.data();
              setData((prev) => ({
                originalText: d.originalText ?? prev.originalText,
                enhancedText: d.enhancedText ?? prev.enhancedText,
                previewMode: d.previewMode ?? prev.previewMode,
              }));
            }
          },
          (err) => {
            if (!mountedRef.current) return;
            setError(err);
          }
        );
      } catch (e) {
        setError(e);
      }
    };

    setup();

    return () => {
      mountedRef.current = false;
      if (unsubscribeRef.current) {
        try { unsubscribeRef.current(); } catch {}
      }
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [uid, resumeId]);

  const debouncedWrite = (partial) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      if (inFlightRef.current) return; // prevent overlapping writes
      inFlightRef.current = true;
      try {
        await upsertResume(uid, resumeId, partial);
      } catch (e) {
        if (mountedRef.current) setError(e);
      } finally {
        inFlightRef.current = false;
      }
    }, 400);
  };

  const handleChange = (field) => (e) => {
    const value = e.target.value;
    setData((prev) => ({ ...prev, [field]: value })); // local-first
    debouncedWrite({ [field]: value });
  };

  const previewContent = data.previewMode === 'enhanced' ? data.enhancedText : data.originalText;

  return (
    <div className="w-full max-w-full h-full flex flex-col md:flex-row overflow-hidden">
      <div className="w-full md:w-1/2 h-1/2 md:h-full md:pr-2 flex-shrink-0 min-h-0">
        <div className="w-full h-full border border-gray-200 bg-white rounded-md overflow-hidden min-h-[200px]">
          <div className="px-3 py-2 text-xs text-gray-500 border-b">Editor ({data.previewMode === 'enhanced' ? 'Enhanced' : 'Original'})</div>
          <textarea
            className="w-full h-[calc(100%-32px)] min-h-[120px] p-3 outline-none resize-none"
            value={data.previewMode === 'enhanced' ? data.enhancedText : data.originalText}
            onChange={handleChange(data.previewMode === 'enhanced' ? 'enhancedText' : 'originalText')}
            placeholder={data.previewMode === 'enhanced' ? 'Type enhanced resume text...' : 'Type original resume text...'}
          />
        </div>
      </div>
      <div className="w-full md:w-1/2 h-1/2 md:h-full md:pl-2 flex-shrink-0 min-h-0 mt-2 md:mt-0">
        <div className="w-full h-full border border-gray-200 bg-white rounded-md overflow-auto min-h-[200px]">
          <div className="px-3 py-2 text-xs text-gray-500 border-b">Live Preview ({data.previewMode === 'enhanced' ? 'Enhanced' : 'Original'})</div>
          <div className="p-3 whitespace-pre-wrap text-sm text-gray-800 break-words">
            {previewContent || <span className="text-gray-400">Start typing to see the preview...</span>}
          </div>
        </div>
      </div>
      {error && (
        <div className="absolute bottom-2 left-2 right-2 text-xs text-red-600">
          {error.message || 'A synchronisation error occurred.'}
        </div>
      )}
    </div>
  );
}
