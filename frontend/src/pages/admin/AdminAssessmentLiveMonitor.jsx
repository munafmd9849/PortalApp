import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Activity, AlertCircle, ArrowLeft, Clock, Eye, Filter, Grid3x3, List, Loader2, Radio, Shield, TriangleAlert, Video, X, ZoomIn } from 'lucide-react';
import api from '../../services/api';
import { initSocket, subscribeProctoringMonitor } from '../../services/socket';
import { ProctoringViewer } from '../../proctoring-engine/liveProctoringRtc';

function formatTime(ts) {
  if (!ts) return '—';
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function normalizeType(t) {
  return String(t || '').replace(/_/g, ' ');
}

function formatEventLabel(event) {
  if (!event) return '—';
  return String(event)
    .split(',')
    .map((e) => normalizeType(e.trim()))
    .join(', ');
}

function buildEvidenceTimeline(screenshots) {
  return (Array.isArray(screenshots) ? screenshots : [])
    .map((s) => ({
      id: s.id,
      timestamp: s.timestamp,
      captureType: s.captureType || 'PERIODIC',
      event: s.event,
      imageUrl: s.signedUrl || s.imageUrl,
      riskFlag: Boolean(s.riskFlag),
      faceCount: s.faceCount,
    }))
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
}

export default function AdminAssessmentLiveMonitor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const basePath = location.pathname.startsWith('/super-admin') ? '/super-admin' : '/admin';

  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [details, setDetails] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [timelineFilter, setTimelineFilter] = useState('ALL');
  const [viewMode, setViewMode] = useState('table');
  const [expandedShot, setExpandedShot] = useState(null);
  const [rtcConnected, setRtcConnected] = useState(false);
  const [rtcConnecting, setRtcConnecting] = useState(false);
  const liveVideoRef = useRef(null);
  const rtcViewerRef = useRef(null);

  const refreshSessions = useCallback(async (showSpinner = false) => {
    try {
      if (showSpinner) setLoading(true);
      const data = await api.getLiveAssessmentSessions(id);
      const list = Array.isArray(data) ? data : [];
      setSessions(list);
      if (list.length > 0) {
        setSelectedSessionId((prev) => prev || list[0].id);
      }
    } finally {
      if (showSpinner) setLoading(false);
    }
  }, [id]);

  const applyLiveScreenshot = useCallback((payload) => {
    const shot = payload?.screenshot;
    if (!shot?.url || !payload?.sessionId) return;

    setSessions((prev) =>
      prev.map((s) =>
        s.id === payload.sessionId
          ? {
              ...s,
              latestScreenshot: {
                id: shot.id,
                url: shot.url,
                timestamp: shot.timestamp,
                captureType: shot.captureType,
                event: shot.event,
                riskFlag: shot.riskFlag,
              },
              screenshots: (s.screenshots || 0) + 1,
            }
          : s
      )
    );

    if (payload.sessionId === selectedSessionId) {
      setDetails((prev) => {
        if (!prev) return prev;
        const exists = prev.screenshots?.some((x) => x.id === shot.id);
        const signed = { ...shot, signedUrl: shot.url, imageUrl: shot.url };
        const screenshots = exists
          ? prev.screenshots
          : [...(prev.screenshots || []), signed];
        return { ...prev, screenshots };
      });
    }
  }, [selectedSessionId]);

  useEffect(() => {
    initSocket();
    refreshSessions(true);
    const interval = setInterval(() => refreshSessions(false), 2500);
    return () => clearInterval(interval);
  }, [refreshSessions]);

  useEffect(() => {
    const unsub = subscribeProctoringMonitor(id, {
      onScreenshot: applyLiveScreenshot,
      onViolation: () => refreshSessions(false),
    });
    return unsub;
  }, [id, applyLiveScreenshot, refreshSessions]);

  useEffect(() => {
    if (!selectedSessionId) {
      rtcViewerRef.current?.stop();
      rtcViewerRef.current = null;
      setRtcConnected(false);
      setRtcConnecting(false);
      return;
    }

    let cancelled = false;
    setRtcConnecting(true);
    setRtcConnected(false);

    const viewer = new ProctoringViewer({
      sessionId: selectedSessionId,
      assessmentId: id,
      videoEl: liveVideoRef.current,
      onConnected: () => {
        if (!cancelled) {
          setRtcConnected(true);
          setRtcConnecting(false);
        }
      },
      onDisconnected: () => {
        if (!cancelled) {
          setRtcConnected(false);
          setRtcConnecting(false);
        }
      },
    });
    rtcViewerRef.current = viewer;
    viewer.start().catch(() => {
      if (!cancelled) setRtcConnecting(false);
    });

    return () => {
      cancelled = true;
      viewer.stop();
      if (rtcViewerRef.current === viewer) rtcViewerRef.current = null;
      setRtcConnected(false);
      setRtcConnecting(false);
    };
  }, [selectedSessionId, id]);

  useEffect(() => {
    if (!selectedSessionId) {
      setDetails(null);
      return;
    }
    let cancelled = false;
    const load = async () => {
      try {
        setDetailLoading(true);
        const d = await api.getProctoringSessionDetails(selectedSessionId);

        const screenshots = Array.isArray(d?.screenshots) ? d.screenshots : [];
        const urls = await Promise.all(
          screenshots.map(async (s) => {
            try {
              const r = await api.getProctoringScreenshotUrl(s.id);
              return { id: s.id, url: r?.url || s.imageUrl };
            } catch {
              return { id: s.id, url: s.imageUrl };
            }
          })
        );
        const urlById = new Map(urls.map((u) => [u.id, u.url]));
        const hydrated = {
          ...d,
          screenshots: screenshots.map((s) => ({ ...s, signedUrl: urlById.get(s.id) || s.imageUrl })),
        };

        if (!cancelled) setDetails(hydrated);
      } finally {
        if (!cancelled) setDetailLoading(false);
      }
    };
    load();
    const poll = setInterval(load, 3000);
    return () => {
      cancelled = true;
      clearInterval(poll);
    };
  }, [selectedSessionId]);

  const selectedRow = useMemo(() => sessions.find((s) => s.id === selectedSessionId) || null, [sessions, selectedSessionId]);

  const evidenceTimeline = useMemo(
    () => buildEvidenceTimeline(details?.screenshots),
    [details?.screenshots]
  );

  const latestEvidence = evidenceTimeline.length > 0 ? evidenceTimeline[evidenceTimeline.length - 1] : null;

  const sessionStillActive = Boolean(
    selectedSessionId && sessions.some((s) => s.id === selectedSessionId)
  );
  const showLiveBadge = sessionStillActive && rtcConnected;
  const showConnectingBadge = sessionStillActive && rtcConnecting && !rtcConnected;

  const filteredTimeline = useMemo(() => {
    let rows = evidenceTimeline;
    if (timelineFilter === 'PERIODIC') rows = rows.filter((r) => r.captureType === 'PERIODIC');
    else if (timelineFilter === 'EVENT') rows = rows.filter((r) => r.captureType === 'EVENT');
    else if (timelineFilter === 'RISK') rows = rows.filter((r) => r.riskFlag);
    else if (timelineFilter !== 'ALL' && timelineFilter) {
      rows = rows.filter((r) => r.event && String(r.event).includes(timelineFilter));
    }
    return rows;
  }, [evidenceTimeline, timelineFilter]);

  const eventFilterOptions = useMemo(() => {
    const events = new Set();
    for (const r of evidenceTimeline) {
      if (r.event) {
        String(r.event)
          .split(',')
          .forEach((e) => events.add(e.trim()));
      }
    }
    return [...events].sort();
  }, [evidenceTimeline]);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="sticky top-0 z-20 bg-white border-b border-slate-200">
        <div className="max-w-[1400px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(`${basePath}?tab=assessments`)}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-900 text-white text-xs font-bold"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                <Shield className="w-4 h-4 text-indigo-600" />
              </div>
              <div>
                <div className="text-sm font-black text-slate-900">Live Proctoring Monitor</div>
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Assessment: {id}</div>
              </div>
            </div>
          </div>

          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right max-w-xs">
            <div className="flex items-center justify-end gap-2">
              <Radio className="w-4 h-4 text-emerald-500" />
              Live video (WebRTC)
            </div>
            <p className="normal-case font-medium text-slate-400 mt-0.5">
              Continuous webcam like a video call. Screenshots below are audit evidence only.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-6 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <div className="text-sm font-black text-slate-900">Candidates</div>
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                {loading ? 'Loading…' : `${sessions.length} active`}
              </div>
            </div>
            {loading && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
          </div>

          <div className="divide-y divide-slate-100">
            {sessions.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedSessionId(s.id)}
                className={`w-full text-left px-5 py-4 hover:bg-slate-50 transition ${
                  selectedSessionId === s.id ? 'bg-indigo-50/50' : 'bg-white'
                }`}
              >
                {s.latestScreenshot?.url ? (
                  <div className="mb-3 rounded-lg overflow-hidden border border-slate-200 aspect-video bg-slate-900">
                    {/* eslint-disable-next-line jsx-a11y/alt-text */}
                    <img
                      src={s.latestScreenshot.url}
                      className="w-full h-full object-cover"
                      alt=""
                    />
                  </div>
                ) : (
                  <div className="mb-3 rounded-lg border border-dashed border-slate-200 aspect-video flex items-center justify-center bg-slate-50 text-[10px] font-bold text-slate-400 uppercase">
                    {selectedSessionId === s.id && rtcConnected ? 'Live video' : 'In exam — select to watch'}
                  </div>
                )}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-bold text-slate-900">{s.studentName}</div>
                    <div className="flex items-center gap-2 mt-1 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                      <Clock className="w-3.5 h-3.5" /> {s.lastPing}
                      <span>· {s.screenshots || 0} shots</span>
                    </div>
                  </div>
                  <div className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-widest border ${
                    s.status === 'CRITICAL' || s.status === 'HIGH'
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : s.status === 'WARNING' || s.status === 'MEDIUM'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  }`}>
                    {s.status}
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <AlertCircle className={`w-4 h-4 ${s.violations > 0 ? 'text-amber-500' : 'text-slate-300'}`} />
                    {s.violations} violations
                  </div>
                  {s.lastViolation ? (
                    <div className="text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-100 px-2 py-1 rounded-md">
                      {s.lastViolation}
                    </div>
                  ) : (
                    <div className="text-[10px] font-bold text-slate-400">—</div>
                  )}
                </div>
              </button>
            ))}

            {!loading && sessions.length === 0 && (
              <div className="px-6 py-16 text-center">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 mx-auto flex items-center justify-center mb-3">
                  <Eye className="w-6 h-6 text-slate-300" />
                </div>
                <div className="text-sm font-bold text-slate-900">No active sessions</div>
                <div className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                  A student must click <strong>Start Secure Test</strong> (after pre-check) for monitoring to begin.
                  Screenshots upload every ~1 min and on tab switch / blur.
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <div className="text-sm font-black text-slate-900">Evidence timeline</div>
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                {selectedRow ? selectedRow.studentName : 'Select a candidate'}
              </div>
            </div>
            {detailLoading && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
          </div>

          {!selectedSessionId ? (
            <div className="px-6 py-16 text-center">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 mx-auto flex items-center justify-center mb-3">
                <TriangleAlert className="w-6 h-6 text-indigo-600" />
              </div>
              <div className="text-sm font-bold text-slate-900">Pick a candidate to review</div>
              <div className="text-xs text-slate-500 mt-1">Periodic and event-triggered screenshots with violation context.</div>
            </div>
          ) : (
            <div className="p-6 space-y-6">
              <div className="rounded-2xl border-2 border-indigo-200 overflow-hidden bg-slate-900 shadow-lg shadow-indigo-500/10">
                <div className="px-4 py-3 bg-gradient-to-r from-slate-800 to-slate-900 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Video className="w-4 h-4 text-indigo-400" />
                    <span className="text-[10px] font-black text-white uppercase tracking-widest">
                      Live webcam (WebRTC)
                    </span>
                    {sessionStillActive && (
                      <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest flex items-center gap-1 ${
                        showLiveBadge
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : showConnectingBadge
                            ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                            : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          showLiveBadge ? 'bg-emerald-400 animate-pulse' : showConnectingBadge ? 'bg-indigo-300 animate-pulse' : 'bg-amber-400'
                        }`} />
                        {showLiveBadge ? 'Live' : showConnectingBadge ? 'Connecting' : 'Waiting'}
                      </span>
                    )}
                  </div>
                  {showLiveBadge ? (
                    <span className="text-[10px] font-bold text-emerald-400/90">Streaming · video call</span>
                  ) : null}
                </div>
                <div className="relative bg-black">
                  <video
                    ref={liveVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full max-h-[400px] object-contain bg-black min-h-[240px]"
                  />
                  {!rtcConnected && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 text-sm px-6 bg-black/80">
                      <Video className="w-10 h-10 text-slate-500 mb-3" />
                      {showConnectingBadge
                        ? 'Connecting to student webcam…'
                        : 'Student must be in the exam with camera on. Select them once they start the test.'}
                    </div>
                  )}
                </div>
                <p className="px-4 py-2 text-[10px] text-slate-500 bg-slate-950 border-t border-slate-800">
                  Real-time peer video (not slideshow frames). Audit screenshots and timeline are below.
                </p>
              </div>

              {detailLoading && !details ? (
                <div className="py-12 text-center text-slate-500 flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Loading evidence timeline…
                </div>
              ) : (
              <>
              <div className="rounded-2xl border border-slate-200 overflow-hidden bg-slate-50">
                <div className="px-4 py-2 border-b border-slate-200 flex items-center justify-between bg-white">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    Latest capture (evidence)
                  </span>
                  {latestEvidence ? (
                    <span className="text-[10px] font-bold text-slate-400">
                      {formatTime(latestEvidence.timestamp)} · {latestEvidence.captureType}
                    </span>
                  ) : null}
                </div>
                {latestEvidence?.imageUrl ? (
                  <button type="button" onClick={() => setExpandedShot(latestEvidence)} className="block w-full">
                    {/* eslint-disable-next-line jsx-a11y/alt-text */}
                    <img src={latestEvidence.imageUrl} className="w-full max-h-[200px] object-contain bg-black" alt="" />
                  </button>
                ) : (
                  <div className="py-8 text-center text-slate-400 text-xs">No evidence yet</div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Risk</div>
                  <div className="text-lg font-black text-slate-900 mt-1">{details?.riskLevel || 'LOW'}</div>
                </div>
                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Violations</div>
                  <div className="text-lg font-black text-slate-900 mt-1">{details?.violationsCount ?? 0}</div>
                </div>
                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Screenshots</div>
                  <div className="text-lg font-black text-slate-900 mt-1">{evidenceTimeline.length}</div>
                </div>
                <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-4">
                  <div className="text-[10px] font-bold text-rose-600 uppercase tracking-widest">High-risk</div>
                  <div className="text-lg font-black text-rose-700 mt-1">
                    {evidenceTimeline.filter((r) => r.riskFlag).length}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  <Filter className="w-4 h-4 text-slate-400" />
                  {['ALL', 'PERIODIC', 'EVENT', 'RISK', ...eventFilterOptions].map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setTimelineFilter(f)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest border transition ${
                        timelineFilter === f
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {f === 'RISK' ? 'High risk' : f === 'ALL' ? 'All' : normalizeType(f)}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-1 rounded-lg border border-slate-200 p-0.5">
                  <button
                    type="button"
                    onClick={() => setViewMode('table')}
                    className={`p-2 rounded-md ${viewMode === 'table' ? 'bg-slate-900 text-white' : 'text-slate-500'}`}
                    title="Table view"
                  >
                    <List className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('gallery')}
                    className={`p-2 rounded-md ${viewMode === 'gallery' ? 'bg-slate-900 text-white' : 'text-slate-500'}`}
                    title="Gallery view"
                  >
                    <Grid3x3 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {viewMode === 'table' ? (
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Time</th>
                        <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Type</th>
                        <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Event</th>
                        <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Screenshot</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredTimeline.map((row) => (
                        <tr key={row.id} className={row.riskFlag ? 'bg-rose-50/30' : ''}>
                          <td className="px-4 py-3 text-xs font-mono text-slate-600">{formatTime(row.timestamp)}</td>
                          <td className="px-4 py-3">
                            <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${
                              row.captureType === 'EVENT'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}>
                              {row.captureType}
                            </span>
                            {row.riskFlag ? (
                              <span className="ml-2 text-[9px] font-black uppercase text-rose-600">Risk</span>
                            ) : null}
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-700">{formatEventLabel(row.event)}</td>
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              onClick={() => setExpandedShot(row)}
                              className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800"
                            >
                              <ZoomIn className="w-3.5 h-3.5" /> View
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredTimeline.length === 0 && (
                    <div className="px-4 py-8 text-center text-sm text-slate-500">No evidence for this filter.</div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {filteredTimeline.map((row) => (
                    <button
                      key={row.id}
                      type="button"
                      onClick={() => setExpandedShot(row)}
                      className={`text-left rounded-xl overflow-hidden border bg-slate-100 hover:shadow-md transition ${
                        row.riskFlag ? 'border-rose-300 ring-1 ring-rose-200' : 'border-slate-200'
                      }`}
                    >
                      {/* eslint-disable-next-line jsx-a11y/alt-text */}
                      <img src={row.imageUrl} className="w-full h-32 object-cover" />
                      <div className="px-2 py-2 bg-white">
                        <div className="text-[10px] font-bold text-slate-600 flex justify-between">
                          <span>{formatTime(row.timestamp)}</span>
                          <span className="uppercase">{row.captureType}</span>
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5 truncate">{formatEventLabel(row.event)}</div>
                      </div>
                    </button>
                  ))}
                  {filteredTimeline.length === 0 && (
                    <div className="col-span-full text-sm text-slate-500 text-center py-8">No evidence for this filter.</div>
                  )}
                </div>
              )}

              <div>
                <div className="text-xs font-black text-slate-900 uppercase tracking-widest mb-3">Violation log</div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {(Array.isArray(details?.violations) ? details.violations : []).map((v) => (
                    <div key={v.id} className="flex items-start gap-3 rounded-xl border border-slate-200 p-3">
                      <div className="text-[10px] font-black text-slate-500 w-24 shrink-0">{formatTime(v.timestamp)}</div>
                      <div className="flex-1">
                        <div className="text-xs font-bold text-slate-900">{normalizeType(v.type)}</div>
                        {v.details ? <div className="text-xs text-slate-500 mt-0.5">{v.details}</div> : null}
                      </div>
                    </div>
                  ))}
                  {(Array.isArray(details?.violations) ? details.violations : []).length === 0 && (
                    <div className="text-sm text-slate-500">No violations recorded.</div>
                  )}
                </div>
              </div>
              </>
              )}
            </div>
          )}
        </div>
      </div>

      {expandedShot ? (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setExpandedShot(null)}
          onKeyDown={(e) => e.key === 'Escape' && setExpandedShot(null)}
        >
          <div
            className="relative max-w-4xl w-full bg-white rounded-2xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setExpandedShot(null)}
              className="absolute top-3 right-3 z-10 p-2 rounded-full bg-black/50 text-white hover:bg-black/70"
            >
              <X className="w-5 h-5" />
            </button>
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <img src={expandedShot.imageUrl} className="w-full max-h-[70vh] object-contain bg-slate-900" />
            <div className="p-4 border-t border-slate-200 flex flex-wrap gap-4 text-sm">
              <div>
                <span className="text-slate-500 text-xs uppercase font-bold">Time</span>
                <div className="font-mono">{formatTime(expandedShot.timestamp)}</div>
              </div>
              <div>
                <span className="text-slate-500 text-xs uppercase font-bold">Type</span>
                <div>{expandedShot.captureType}</div>
              </div>
              <div>
                <span className="text-slate-500 text-xs uppercase font-bold">Event</span>
                <div>{formatEventLabel(expandedShot.event)}</div>
              </div>
              {expandedShot.riskFlag ? (
                <div className="text-rose-600 font-bold">High-risk capture</div>
              ) : null}
              {typeof expandedShot.faceCount === 'number' ? (
                <div>
                  <span className="text-slate-500 text-xs uppercase font-bold">Faces</span>
                  <div>{expandedShot.faceCount}</div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
