/**
 * Admin Announcements — formal admin UI; email matching students by school/batch/center.
 */

import React, { useState, useEffect, useRef } from 'react';
import api from '../../../services/api';
import {
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

  const [academicOptions, setAcademicOptions] = useState({
    schools: [],
    batches: [],
    centers: [],
  });

  const SCHOOL_OPTIONS = [{ id: 'ALL', label: 'All Branches' }, ...academicOptions.schools.map((s) => ({ id: s.name, label: s.name }))];
  const BATCH_OPTIONS = [{ id: 'ALL', label: 'All Batches' }, ...academicOptions.batches.map((b) => ({ id: b.year, label: b.year }))];
  const CENTER_OPTIONS = [{ id: 'ALL', label: 'All Campuses' }, ...academicOptions.centers.map((c) => ({ id: c.name, label: c.name }))];

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
        const [annRes, s, c, b] = await Promise.all([
          api.getAnnouncements(),
          api.getSchools(),
          api.getCenters(),
          api.getBatches(),
        ]);
        setList(annRes?.announcements || []);
        const { filterActiveAcademicRecords } = await import('../../../utils/academicOptions');
        setAcademicOptions({
          schools: filterActiveAcademicRecords(s),
          centers: filterActiveAcademicRecords(c),
          batches: filterActiveAcademicRecords(b),
        });
      } catch (e) {
        console.error('Failed to load data for announcements:', e);
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
        `Announcement sent. ${res.emailsSent || 0} students notified${res.emailsFailed ? ` (${res.emailsFailed} failed)` : ''}.`,
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
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to send announcement';
      setError(msg);
    } finally {
      setSending(false);
    }
  };

  const filterDropdown = (label, Icon, options, selected, setter, show, setShow, ref, otherSetters) => (
    <div className="flex-1 min-w-[140px] max-w-[200px]">
      <div className="flex items-center gap-2 mb-1.5">
        <Icon className="w-4 h-4 text-slate-500" />
        <span className="text-sm font-medium text-slate-700">{label}</span>
      </div>
      <div className="relative" ref={ref}>
        <button
          type="button"
          className={`w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-left flex items-center justify-between bg-white hover:border-slate-300 ${
            selected.length ? 'border-indigo-300 ring-1 ring-indigo-100' : ''
          }`}
          onClick={() => {
            setShow((v) => !v);
            otherSetters.forEach((fn) => fn(false));
          }}
        >
          <span className="truncate text-slate-700">
            {selected.length
              ? selected.map((id) => options.find((o) => o.id === id)?.label || id).join(', ')
              : `Select ${label}`}
          </span>
          <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
        </button>
        {show && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-36 overflow-y-auto">
            {options.map((opt) => (
              <label
                key={opt.id}
                className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-b-0"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(opt.id)}
                  onChange={() => toggleFilter(setter, opt.id)}
                  className="rounded border-slate-300 text-indigo-600"
                />
                <span className="text-slate-700">{opt.label}</span>
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 md:p-8">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="flex flex-wrap items-end gap-4 pb-5 border-b border-slate-100">
            {filterDropdown(
              'School',
              GraduationCap,
              SCHOOL_OPTIONS,
              targetSchools,
              setTargetSchools,
              showSchoolDropdown,
              setShowSchoolDropdown,
              schoolDropdownRef,
              [setShowBatchDropdown, setShowCenterDropdown],
            )}
            {filterDropdown(
              'Batch',
              Users,
              BATCH_OPTIONS,
              targetBatches,
              setTargetBatches,
              showBatchDropdown,
              setShowBatchDropdown,
              batchDropdownRef,
              [setShowSchoolDropdown, setShowCenterDropdown],
            )}
            {filterDropdown(
              'Center',
              MapPin,
              CENTER_OPTIONS,
              targetCenters,
              setTargetCenters,
              showCenterDropdown,
              setShowCenterDropdown,
              centerDropdownRef,
              [setShowSchoolDropdown, setShowBatchDropdown],
            )}
            <span
              className="inline-flex items-center shrink-0 px-3 py-2.5 rounded-lg text-xs font-medium border border-slate-200 bg-slate-50 text-slate-600"
              title="No filters selected sends to all students"
            >
              No selection = all students
            </span>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Announcement title"
              className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm"
              maxLength={200}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter announcement details"
              className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm min-h-[120px] resize-y"
              rows={4}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              <LinkIcon className="w-4 h-4 inline mr-1 text-slate-500" />
              Link (optional)
            </label>
            <input
              type="url"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="https://"
              className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              <ImagePlus className="w-4 h-4 inline mr-1 text-slate-500" />
              Attachment image (optional)
            </label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={onImageChange}
              className="block w-full text-sm text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border file:border-slate-200 file:bg-white file:text-slate-700 file:font-medium file:cursor-pointer hover:file:bg-slate-50"
            />
            {imagePreview && (
              <img
                src={imagePreview}
                alt="Preview"
                className="mt-3 rounded-lg border border-slate-200 max-h-40 object-cover"
              />
            )}
          </div>

          {error && (
            <div className="p-3 rounded-lg text-sm font-medium bg-red-50 text-red-800 border border-red-100">
              {error}
            </div>
          )}
          {success && (
            <div className="p-3 rounded-lg flex items-center gap-2 bg-emerald-50 text-emerald-800 border border-emerald-100 text-sm">
              <CheckCircle className="w-5 h-5 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={sending}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors"
          >
            {sending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Sending
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Send announcement
              </>
            )}
          </button>
        </form>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 md:p-8">
        <h2 className="text-lg font-semibold text-slate-900 mb-4 pb-3 border-b border-slate-200">
          Announcement history
        </h2>
        {loadingList ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-7 h-7 animate-spin text-indigo-600" />
          </div>
        ) : list.length === 0 ? (
          <p className="text-sm text-slate-500 py-8 text-center">No announcements have been sent yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {list.map((a) => (
              <li key={a.id} className="py-4 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-slate-900">{a.title}</h3>
                    <p className="text-sm text-slate-600 mt-1 line-clamp-2">{a.description}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-slate-500">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(a.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                      {[a.targetSchools, a.targetBatches, a.targetCenters].some((x) => x != null && x !== '') && (
                        <span className="px-2 py-0.5 rounded-lg text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-100">
                          Targeted
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {a.imageUrl && (
                      <img
                        src={a.imageUrl}
                        alt=""
                        className="w-12 h-12 rounded-lg object-cover border border-slate-200"
                      />
                    )}
                    {a.link && (
                      <a
                        href={a.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-slate-200 text-slate-700 hover:bg-slate-50"
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
