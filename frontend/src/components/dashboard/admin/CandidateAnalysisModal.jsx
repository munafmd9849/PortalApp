import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  FaUserGraduate, 
  FaTimes, 
  FaSearch, 
  FaCheckCircle, 
  FaFilter,
  FaSpinner,
  FaTrophy,
  FaChartLine
} from 'react-icons/fa';
import api from '../../../services/api'; 
import { showError } from '../../../utils/toast';

const CandidateAnalysisModal = ({ isOpen, jobId, jobTitle, onClose, onApplySelection }) => {
  const [loading, setLoading] = useState(true);
  const [candidates, setCandidates] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [minScore, setMinScore] = useState(0);
  const [topCount, setTopCount] = useState(25); // Default to top 25
  const [selectedIds, setSelectedIds] = useState(new Set());

  useEffect(() => {
    if (isOpen) {
      if (jobId) fetchAnalysis();
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen, jobId]);

  const fetchAnalysis = async () => {
    try {
      setLoading(true);
      const data = await api.analyzeCandidates(jobId);
      
      // Sort by match score descending initially
      const sortedData = [...data].sort((a, b) => b.matchScore - a.matchScore);
      setCandidates(sortedData);
    } catch (err) {
      console.error('Error fetching analysis:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredCandidates = useMemo(() => {
    // 1. First filter by search and min score
    const results = candidates.filter(c => {
      const matchesSearch = 
        (c.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) || '') ||
        (c.email?.toLowerCase().includes(searchTerm.toLowerCase()) || '') ||
        (c.batch?.toLowerCase().includes(searchTerm.toLowerCase()) || '');
      
      const matchesScore = Math.round(c.matchScore || 0) >= (Number(minScore) || 0);
      
      return matchesSearch && matchesScore;
    });

    // 2. Then limit by Top X count
    return results.slice(0, Number(topCount) || 1000);
  }, [searchTerm, minScore, topCount, candidates]);

  const toggleSelect = (id) => {
    if (!id) return;
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const selectAllFiltered = () => {
    const newSelected = new Set(selectedIds);
    filteredCandidates.forEach(c => {
      const id = c.studentId || c.id;
      if (id) newSelected.add(id);
    });
    setSelectedIds(new Set(newSelected));
  };

  const handleConfirm = () => {
    const selectedList = candidates
      .filter(c => selectedIds.has(c.studentId || c.id))
      .map(c => ({
        studentId: c.studentId || c.id,
        score: c.matchScore || 0,
        sourceMode: 'SYSTEM'
      }));
    
    onApplySelection(selectedList);
    onClose();
  };

  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/45 backdrop-blur-[2px]">
      <div className="bg-white rounded-3xl shadow-2xl max-w-6xl w-full h-[85vh] overflow-hidden flex flex-col border border-white/20">
        
        {/* Header */}
        <div className="px-8 py-6 bg-blue-600 text-white flex justify-between items-center relative">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md">
              <FaTrophy className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight leading-none">AI Candidate Rankings</h2>
              <p className="text-blue-100 text-xs font-medium mt-1">Analyzing <span className="text-white font-semibold">{candidates.length}</span> students for: <span className="font-semibold text-white">{jobTitle}</span></p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <FaTimes size={20} />
          </button>
        </div>

        {/* Dynamic Filters */}
        <div className="px-8 py-4 border-b border-gray-100 bg-gray-50 flex flex-wrap gap-4 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search candidates..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-blue-500/10 outline-none transition-all shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-2xl border border-gray-200 shadow-sm">
            <span className="text-[10px] font-bold text-gray-400 uppercase">Limit to Top</span>
            <input 
              type="number" 
              className="w-12 px-1 py-0.5 bg-gray-50 border border-gray-200 rounded text-xs font-bold text-blue-600 outline-none focus:border-blue-500"
              value={topCount}
              onChange={(e) => setTopCount(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-2xl border border-gray-200 shadow-sm">
            <FaChartLine className="text-blue-500 w-4 h-4" />
            <span className="text-xs font-bold text-gray-400 uppercase whitespace-nowrap">Min Score %</span>
            <input 
              type="number" 
              min="0" 
              max="100"
              className="w-16 px-2 py-1 bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold text-blue-600 outline-none focus:border-blue-500"
              value={minScore}
              onChange={(e) => setMinScore(e.target.value)}
              onBlur={() => { if (minScore === '') setMinScore(0); }}
            />
          </div>
          
          <div className="flex gap-2 ml-auto">
            <button 
              onClick={selectAllFiltered}
              className="px-4 py-2 text-xs font-bold text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors uppercase tracking-widest"
            >
              Select All Visible
            </button>
            <button 
              onClick={() => {
                setSelectedIds(new Set());
                setMinScore(0);
                setSearchTerm('');
                setTopCount(candidates.length);
              }}
              className="px-4 py-2 text-xs font-bold text-gray-500 hover:bg-gray-100 rounded-xl transition-colors uppercase tracking-widest"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Content Table */}
        <div className="flex-1 overflow-y-auto p-0 custom-scrollbar bg-white">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <FaSpinner className="w-10 h-10 text-blue-600 animate-spin" />
              <p className="text-gray-500 font-semibold italic">Processing algorithm...</p>
            </div>
          ) : filteredCandidates.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-4 text-center">
              <FaFilter className="w-12 h-12 text-gray-100" />
              <div>
                <p className="text-lg font-semibold text-gray-600">No matches found</p>
                <p className="text-sm">Try adjusting your filters.</p>
              </div>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-white shadow-sm z-10">
                <tr className="bg-gray-50/80 backdrop-blur-sm border-b border-gray-100">
                  <th className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest w-16 text-center">Pick</th>
                  <th className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest w-20 text-center">Rank</th>
                  <th className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Candidate</th>
                  <th className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">Match Score</th>
                  <th className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Education</th>
                  <th className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredCandidates.map((candidate, index) => (
                  <tr 
                    key={candidate.studentId || candidate.id} 
                    className={`group hover:bg-blue-50/30 transition-all cursor-pointer ${selectedIds.has(candidate.studentId || candidate.id) ? 'bg-blue-50/50' : ''}`}
                    onClick={() => toggleSelect(candidate.studentId || candidate.id)}
                  >
                    <td className="px-8 py-5 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className={`w-5 h-5 mx-auto rounded-lg border-2 flex items-center justify-center transition-all ${
                        selectedIds.has(candidate.studentId || candidate.id) 
                          ? 'bg-blue-600 border-blue-600 shadow-lg shadow-blue-100' 
                          : 'border-gray-200 group-hover:border-blue-300'
                      }`}>
                        {selectedIds.has(candidate.studentId || candidate.id) && <FaCheckCircle className="text-white text-xs" />}
                      </div>
                    </td>
                    <td className="px-8 py-5 text-center">
                      <span className="text-sm font-bold text-gray-400 group-hover:text-blue-500 transition-colors">#{index + 1}</span>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs group-hover:bg-blue-100 group-hover:text-blue-700 transition-all">
                          {candidate.fullName.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-gray-800 text-sm leading-tight">{candidate.fullName}</p>
                          <p className="text-[10px] text-gray-400 mt-1">{candidate.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-center">
                      <div className="inline-flex items-center justify-center">
                        <div className={`px-3 py-1.5 rounded-xl text-xs font-bold shadow-sm ${
                          candidate.matchScore >= 80 ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                          candidate.matchScore >= 60 ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                          'bg-amber-50 text-amber-700 border border-amber-100'
                        }`}>
                          {Math.round(candidate.matchScore)}%
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <p className="text-sm font-semibold text-gray-700">{candidate.batch}</p>
                      <p className="text-[10px] text-gray-400 mt-1 font-bold uppercase tracking-tighter">CGPA: {candidate.cgpa || 'N/A'}</p>
                    </td>
                    <td className="px-8 py-5">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest ${
                        candidate.placementStatus === 'Placed' 
                          ? 'bg-emerald-100 text-emerald-700' 
                          : 'bg-slate-100 text-slate-500'
                      }`}>
                        {candidate.placementStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="px-10 py-6 border-t border-gray-100 bg-gray-50 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <span className="text-xl font-bold text-blue-600 leading-none">{selectedIds.size}</span>
            <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Candidates Selected</span>
          </div>
          <div className="flex gap-4">
            <button 
              onClick={onClose}
              className="px-6 py-2 text-sm font-bold text-gray-500 hover:text-gray-800 transition-colors uppercase tracking-widest"
            >
              Cancel
            </button>
            <button 
              onClick={handleConfirm}
              disabled={selectedIds.size === 0}
              className="px-8 py-3 bg-blue-600 text-white rounded-2xl text-sm font-bold shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all flex items-center gap-3 uppercase tracking-widest disabled:opacity-50"
            >
              Apply Selection
              <FaCheckCircle />
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default CandidateAnalysisModal;
