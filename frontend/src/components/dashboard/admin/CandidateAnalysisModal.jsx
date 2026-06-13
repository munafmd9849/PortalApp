import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  FaUserGraduate,
  FaTimes,
  FaSearch,
  FaCheckCircle,
  FaFilter,
  FaSpinner,
} from 'react-icons/fa';
import api from '../../../services/api';

const CandidateAnalysisModal = ({ isOpen, jobId, jobTitle, onClose, onApplySelection }) => {
  const [loading, setLoading] = useState(true);
  const [candidates, setCandidates] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [minScore, setMinScore] = useState(0);
  const [topCount, setTopCount] = useState(25);
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
      const sortedData = [...data].sort((a, b) => b.matchScore - a.matchScore);
      setCandidates(sortedData);
    } catch (err) {
      console.error('Error fetching analysis:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredCandidates = useMemo(() => {
    const results = candidates.filter((c) => {
      const matchesSearch =
        (c.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) || '') ||
        (c.email?.toLowerCase().includes(searchTerm.toLowerCase()) || '') ||
        (c.batch?.toLowerCase().includes(searchTerm.toLowerCase()) || '');
      const matchesScore = Math.round(c.matchScore || 0) >= (Number(minScore) || 0);
      return matchesSearch && matchesScore;
    });
    return results.slice(0, Number(topCount) || 1000);
  }, [searchTerm, minScore, topCount, candidates]);

  const toggleSelect = (id) => {
    if (!id) return;
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    setSelectedIds(newSelected);
  };

  const selectAllFiltered = () => {
    const newSelected = new Set(selectedIds);
    filteredCandidates.forEach((c) => {
      const id = c.studentId || c.id;
      if (id) newSelected.add(id);
    });
    setSelectedIds(new Set(newSelected));
  };

  const handleConfirm = () => {
    const selectedList = candidates
      .filter((c) => selectedIds.has(c.studentId || c.id))
      .map((c) => ({
        studentId: c.studentId || c.id,
        score: c.matchScore || 0,
        sourceMode: 'SYSTEM',
      }));
    onApplySelection(selectedList);
    onClose();
  };

  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/50">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full h-[85vh] overflow-hidden flex flex-col border border-gray-200">

        <div className="px-6 py-4 bg-slate-800 text-white flex justify-between items-center border-b border-slate-700">
          <div>
            <h2 className="text-lg font-semibold">Ranked Candidates</h2>
            <p className="text-slate-300 text-sm mt-0.5">
              {candidates.length} candidates evaluated for {jobTitle}
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 hover:bg-slate-700 rounded-md transition-colors">
            <FaTimes size={18} />
          </button>
        </div>

        <div className="px-6 py-3 border-b border-gray-200 bg-gray-50 flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
            <input
              type="text"
              placeholder="Search by name, email, or batch"
              className="w-full pl-9 pr-3 py-2 bg-white border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-blue-800 focus:border-blue-800 outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-600">
            <span>Top</span>
            <input
              type="number"
              className="w-14 px-2 py-1.5 border border-gray-300 rounded-md text-sm text-gray-900 outline-none focus:border-blue-800"
              value={topCount}
              onChange={(e) => setTopCount(e.target.value)}
            />
          </label>

          <label className="flex items-center gap-2 text-sm text-gray-600">
            <span>Min. match %</span>
            <input
              type="number"
              min="0"
              max="100"
              className="w-14 px-2 py-1.5 border border-gray-300 rounded-md text-sm text-gray-900 outline-none focus:border-blue-800"
              value={minScore}
              onChange={(e) => setMinScore(e.target.value)}
              onBlur={() => { if (minScore === '') setMinScore(0); }}
            />
          </label>

          <div className="flex gap-2 ml-auto">
            <button
              type="button"
              onClick={selectAllFiltered}
              className="px-3 py-1.5 text-sm font-medium text-blue-800 hover:bg-blue-50 rounded-md border border-transparent hover:border-blue-100 transition-colors"
            >
              Select all
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedIds(new Set());
                setMinScore(0);
                setSearchTerm('');
                setTopCount(candidates.length);
              }}
              className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
            >
              Reset filters
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-white">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <FaSpinner className="w-8 h-8 text-blue-800 animate-spin" />
              <p className="text-gray-500 text-sm">Loading candidate rankings…</p>
            </div>
          ) : filteredCandidates.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-500 gap-2 text-center px-6">
              <FaFilter className="w-10 h-10 text-gray-200" />
              <p className="text-base font-medium text-gray-700">No candidates match your criteria</p>
              <p className="text-sm">Adjust the search or minimum match score.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-gray-50 z-10 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 w-14 text-center">Select</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 w-16 text-center">Rank</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500">Candidate</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 text-center">Match</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500">Education</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredCandidates.map((candidate, index) => {
                  const id = candidate.studentId || candidate.id;
                  const selected = selectedIds.has(id);
                  return (
                    <tr
                      key={id}
                      className={`hover:bg-gray-50 transition-colors cursor-pointer ${selected ? 'bg-blue-50/40' : ''}`}
                      onClick={() => toggleSelect(id)}
                    >
                      <td className="px-6 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <div
                          className={`w-4 h-4 mx-auto rounded border flex items-center justify-center transition-colors ${
                            selected ? 'bg-blue-800 border-blue-800' : 'border-gray-300 hover:border-blue-800'
                          }`}
                          onClick={() => toggleSelect(id)}
                        >
                          {selected && <FaCheckCircle className="text-white text-[10px]" />}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center text-sm text-gray-500 font-medium">#{index + 1}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-md bg-gray-100 text-gray-600 flex items-center justify-center text-xs font-semibold">
                            {candidate.fullName?.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 text-sm">{candidate.fullName}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{candidate.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-block px-2.5 py-1 rounded-md text-xs font-semibold border ${
                          candidate.matchScore >= 80 ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                          candidate.matchScore >= 60 ? 'bg-blue-50 text-blue-800 border-blue-200' :
                          'bg-amber-50 text-amber-800 border-amber-200'
                        }`}>
                          {Math.round(candidate.matchScore)}%
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-800">{candidate.batch}</p>
                        <p className="text-xs text-gray-500 mt-0.5">CGPA {candidate.cgpa || '—'}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-medium ${
                          candidate.placementStatus === 'Placed'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-gray-100 text-gray-600 border border-gray-200'
                        }`}>
                          {candidate.placementStatus}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
          <p className="text-sm text-gray-600">
            <span className="font-semibold text-gray-900">{selectedIds.size}</span> selected
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={selectedIds.size === 0}
              className="px-5 py-2 bg-blue-800 text-white rounded-md text-sm font-medium hover:bg-blue-900 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              Confirm selection
              <FaCheckCircle className="text-xs" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default CandidateAnalysisModal;
