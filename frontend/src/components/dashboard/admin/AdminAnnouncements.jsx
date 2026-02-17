/**
 * Admin Announcements Section
 * GenZ / Retro styled. Target by school, batch, or center. Sends email to matching students.
 */

import React, { useState, useEffect, useRef } from 'react';
import api from '../../../services/api';
import {
  Megaphone,
  Send,
  ImagePlus,
  Link as LinkIcon,
  Loader2,
  CheckCircle,
  Calendar,
  ExternalLink,
  Users,
  ChevronDown,
  GraduationCap,
  MapPin,
} from 'lucide-react';

// GenZ / Retro palette
const COLORS = {
  gold: '#FFC567',
  pink: '#FB7DA8',
  coral: '#FD5A46',
  purple: '#552CB7',
  green: '#00995E',
  blue: '#058CD7',
};

const SCHOOL_OPTIONS = [
  { id: 'ALL', label: 'All Schools' },
  { id: 'SOT', label: 'SOT' },
  { id: 'SOM', label: 'SOM' },
  { id: 'SOH', label: 'SOH' },
];

const BATCH_OPTIONS = [
  { id: 'ALL', label: 'All Batches' },
  { id: '23-27', label: '23-27' },
  { id: '24-28', label: '24-28' },
  { id: '25-29', label: '25-29' },
  { id: '26-30', label: '26-30' },
];

const CENTER_OPTIONS = [
  { id: 'ALL', label: 'All Centers' },
  { id: 'BANGALORE', label: 'Bangalore' },
  { id: 'NOIDA', label: 'Noida' },
  { id: 'LUCKNOW', label: 'Lucknow' },
  { id: 'PUNE', label: 'Pune' },
  { id: 'PATNA', label: 'Patna' },
  { id: 'INDORE', label: 'Indore' },
];

export default function AdminAnnouncements() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [link, setLink] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [targetSchools, setTargetSchools] = useState([]);
  const [targetBatches, setTargetBatches] = useState([]);
  const [targetCenters, setTargetCenters] = useState([]);
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState('');
  const [list, setList] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [showSchoolDropdown, setShowSchoolDropdown] = useState(false);
  const [showBatchDropdown, setShowBatchDropdown] = useState(false);
  const [showCenterDropdown, setShowCenterDropdown] = useState(false);
  const schoolDropdownRef = useRef(null);
  const batchDropdownRef = useRef(null);
  const centerDropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        schoolDropdownRef.current && !schoolDropdownRef.current.contains(e.target) &&
        batchDropdownRef.current && !batchDropdownRef.current.contains(e.target) &&
        centerDropdownRef.current && !centerDropdownRef.current.contains(e.target)
      ) {
        setShowSchoolDropdown(false);
        setShowBatchDropdown(false);
        setShowCenterDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleFilter = (setter, id) => {
    setter((prev) => {
      if (id === 'ALL') return prev.includes('ALL') ? [] : ['ALL'];
      const next = prev.filter((x) => x !== 'ALL');
      if (next.includes(id)) return next.length === 1 ? [] : next.filter((x) => x !== id);
      return [...next, id];
    });
  };

  useEffect(() => {
    const load = async () => {
      try {
        setLoadingList(true);
        const res = await api.getAnnouncements();
        setList(res?.announcements || []);
      } catch (e) {
        console.error('Failed to load announcements:', e);
      } finally {
        setLoadingList(false);
      }
    };
    load();
  }, []);

  const onImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) {
      setImageFile(null);
      setImagePreview(null);
      return;
    }
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image (JPG, PNG, or WebP)');
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      setError('Image must be under 3MB');
      return;
    }
    setError('');
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(null);
    const trimmedTitle = title.trim();
    const trimmedDesc = description.trim();
    if (!trimmedTitle) {
      setError('Title is required');
      return;
    }
    if (!trimmedDesc) {
      setError('Description is required');
      return;
    }

    setSending(true);
    try {
      const formData = new FormData();
      formData.append('title', trimmedTitle);
      formData.append('description', trimmedDesc);
      if (link.trim()) formData.append('link', link.trim());
      if (imageFile) formData.append('image', imageFile);
      if (targetSchools.length) formData.append('targetSchools', JSON.stringify(targetSchools));
      if (targetBatches.length) formData.append('targetBatches', JSON.stringify(targetBatches));
      if (targetCenters.length) formData.append('targetCenters', JSON.stringify(targetCenters));

      const res = await api.createAnnouncement(formData);
      setSuccess(
        `Sent! ${res.emailsSent || 0} students notified${res.emailsFailed ? ` (${res.emailsFailed} failed)` : ''}.`
      );
      setTitle('');
      setDescription('');
      setLink('');
      setImageFile(null);
      setImagePreview(null);
      setTargetSchools([]);
      setTargetBatches([]);
      setTargetCenters([]);
      setList((prev) => [res.announcement, ...prev]);
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || 'Failed to send announcement';
      setError(msg);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 min-h-screen p-4 sm:p-6 md:p-8 overflow-x-hidden" style={{ background: '#fff' }}>
      {/* Header - GenZ / Retro (solid colors) */}
      <div
        className="rounded-2xl p-4 sm:p-6 text-center shadow-lg"
        style={{
          background: COLORS.gold,
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        <h1 className="text-3xl md:text-4xl font-black text-gray-900 flex items-center justify-center gap-3">
          <Megaphone className="w-10 h-10" />
          Announcements
        </h1>
        <p className="text-gray-800 font-semibold mt-2 text-lg">
          Share placement drives, success stories, opportunities & guidelines — students get it by email
        </p>
      </div>

      {/* Create form - bubbly card */}
      <div
        className="rounded-2xl p-6 md:p-8 shadow-xl border border-slate-200"
        style={{ backgroundColor: '#fff', fontFamily: 'system-ui, sans-serif' }}
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Filters at start: School, Batch, Center dropdowns (like Manage Jobs) */}
          <div className="flex flex-wrap items-end gap-4 pb-4 border-b-2 border-slate-200">
            <div className="flex-1 min-w-[140px] max-w-[200px]">
              <div className="flex items-center gap-2 mb-1">
                <GraduationCap className="w-4 h-4 text-slate-500" />
                <span className="text-sm font-medium text-slate-600">School</span>
              </div>
              <div className="relative" ref={schoolDropdownRef}>
                <button
                  type="button"
                  className={`w-full border-2 border-slate-300 rounded-lg px-3 py-2.5 text-sm text-left flex items-center justify-between hover:border-slate-400 ${targetSchools.length ? 'border-green-600' : ''}`}
                  style={{ backgroundColor: targetSchools.length ? '#d1fae5' : '#fff' }}
                  onClick={() => { setShowSchoolDropdown((v) => !v); setShowBatchDropdown(false); setShowCenterDropdown(false); }}
                >
                  <span className="truncate">
                    {targetSchools.length ? targetSchools.map((id) => SCHOOL_OPTIONS.find((o) => o.id === id)?.label || id).join(', ') : 'Select Schools'}
                  </span>
                  <ChevronDown className="w-4 h-4 text-slate-500 flex-shrink-0 ml-1" />
                </button>
                {showSchoolDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white border-2 border-slate-300 rounded-lg shadow-lg overflow-hidden">
                    {SCHOOL_OPTIONS.map((opt) => (
                      <label key={opt.id} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-b-0">
                        <input
                          type="checkbox"
                          checked={targetSchools.includes(opt.id)}
                          onChange={() => toggleFilter(setTargetSchools, opt.id)}
                          className="rounded border-slate-300"
                        />
                        <span>{opt.label}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex-1 min-w-[140px] max-w-[200px]">
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-4 h-4 text-slate-500" />
                <span className="text-sm font-medium text-slate-600">Batch</span>
              </div>
              <div className="relative" ref={batchDropdownRef}>
                <button
                  type="button"
                  className={`w-full border-2 border-slate-300 rounded-lg px-3 py-2.5 text-sm text-left flex items-center justify-between hover:border-slate-400 ${targetBatches.length ? 'border-green-600' : ''}`}
                  style={{ backgroundColor: targetBatches.length ? '#d1fae5' : '#fff' }}
                  onClick={() => { setShowBatchDropdown((v) => !v); setShowSchoolDropdown(false); setShowCenterDropdown(false); }}
                >
                  <span className="truncate">
                    {targetBatches.length ? targetBatches.map((id) => BATCH_OPTIONS.find((o) => o.id === id)?.label || id).join(', ') : 'Select Batches'}
                  </span>
                  <ChevronDown className="w-4 h-4 text-slate-500 flex-shrink-0 ml-1" />
                </button>
                {showBatchDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white border-2 border-slate-300 rounded-lg shadow-lg overflow-hidden">
                    {BATCH_OPTIONS.map((opt) => (
                      <label key={opt.id} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-b-0">
                        <input
                          type="checkbox"
                          checked={targetBatches.includes(opt.id)}
                          onChange={() => toggleFilter(setTargetBatches, opt.id)}
                          className="rounded border-slate-300"
                        />
                        <span>{opt.label}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex-1 min-w-[140px] max-w-[200px]">
              <div className="flex items-center gap-2 mb-1">
                <MapPin className="w-4 h-4 text-slate-500" />
                <span className="text-sm font-medium text-slate-600">Center</span>
              </div>
              <div className="relative" ref={centerDropdownRef}>
                <button
                  type="button"
                  className={`w-full border-2 border-slate-300 rounded-lg px-3 py-2.5 text-sm text-left flex items-center justify-between hover:border-slate-400 ${targetCenters.length ? 'border-green-600' : ''}`}
                  style={{ backgroundColor: targetCenters.length ? '#d1fae5' : '#fff' }}
                  onClick={() => { setShowCenterDropdown((v) => !v); setShowSchoolDropdown(false); setShowBatchDropdown(false); }}
                >
                  <span className="truncate">
                    {targetCenters.length ? targetCenters.map((id) => CENTER_OPTIONS.find((o) => o.id === id)?.label || id).join(', ') : 'Select Centers'}
                  </span>
                  <ChevronDown className="w-4 h-4 text-slate-500 flex-shrink-0 ml-1" />
                </button>
                {showCenterDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white border-2 border-slate-300 rounded-lg shadow-lg overflow-hidden max-h-56 overflow-y-auto">
                    {CENTER_OPTIONS.map((opt) => (
                      <label key={opt.id} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-b-0">
                        <input
                          type="checkbox"
                          checked={targetCenters.includes(opt.id)}
                          onChange={() => toggleFilter(setTargetCenters, opt.id)}
                          className="rounded border-slate-300"
                        />
                        <span>{opt.label}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <p className="text-xs text-slate-500 self-center">Leave empty = all students</p>
          </div>

          <h2 className="text-xl font-bold text-gray-900 pt-2" style={{ color: COLORS.purple }}>
            New announcement
          </h2>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. New placement drive, Student success, Opportunity..."
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-2 focus:outline-none"
              style={{ focusBorderColor: COLORS.blue }}
              maxLength={200}
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Description *</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Write your announcement (placement drive, success, opportunity, guideline...)"
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-2 focus:outline-none min-h-[120px] resize-y"
              rows={4}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              <LinkIcon className="w-4 h-4 inline mr-1" />
              Link (optional)
            </label>
            <input
              type="url"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="https://..."
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-2 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              <ImagePlus className="w-4 h-4 inline mr-1" />
              Photo (optional, attached in email)
            </label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={onImageChange}
              className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-2 file:font-bold file:cursor-pointer"
              style={{ borderColor: COLORS.pink, backgroundColor: '#fff' }}
            />
            {imagePreview && (
              <div className="mt-3">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="rounded-xl border-2 border-gray-200 max-h-40 object-cover"
                />
              </div>
            )}
          </div>

          {error && (
            <div className="p-3 rounded-xl text-sm font-medium" style={{ background: COLORS.coral, color: '#fff' }}>
              {error}
            </div>
          )}
          {success && (
            <div className="p-3 rounded-xl flex items-center gap-2" style={{ background: COLORS.green, color: '#fff' }}>
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
              <span className="font-medium">{success}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={sending}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white shadow-lg disabled:cursor-not-allowed transition-all"
            style={{
              background: sending ? '#94a3b8' : COLORS.purple,
            }}
          >
            {sending ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                Send to students
              </>
            )}
          </button>
        </form>
      </div>

      {/* Past announcements */}
      <div
        className="rounded-2xl p-6 md:p-8 shadow-xl border border-slate-200"
        style={{ backgroundColor: '#fff' }}
      >
        <h2 className="text-xl font-bold mb-4" style={{ color: COLORS.purple }}>
          Past announcements
        </h2>
        {loadingList ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: COLORS.blue }} />
          </div>
        ) : list.length === 0 ? (
          <p className="text-gray-500 py-6">No announcements yet.</p>
        ) : (
          <ul className="space-y-4">
            {list.map((a) => (
              <li
                key={a.id}
                className="p-4 rounded-xl border-2 border-gray-100 hover:border-gray-200 transition-colors"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-gray-900">{a.title}</h3>
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">{a.description}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-gray-500">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(a.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                      {([a.targetSchools, a.targetBatches, a.targetCenters].some((x) => x != null && x !== '')) && (
                        <span className="ml-2 px-2 py-0.5 rounded bg-gray-200 text-gray-700">
                          Targeted
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {a.imageUrl && (
                      <img
                        src={a.imageUrl}
                        alt=""
                        className="w-12 h-12 rounded-lg object-cover border border-gray-200"
                      />
                    )}
                    {a.link && (
                      <a
                        href={a.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-sm font-medium border-2"
                        style={{ borderColor: COLORS.blue, color: COLORS.blue }}
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Link
                      </a>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
