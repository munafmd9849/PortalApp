import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { 
  Plus, Search, Filter, MoreVertical, 
  Clock, Users, CheckCircle, AlertCircle,
  Settings, Trash2, Edit3, Eye, FileText, Camera,
  Video, Shield, Maximize2, Mic, AlertTriangle,
  Layout, BookOpen, Terminal, ChevronRight,
  MoreHorizontal, Activity, Target, X, Layers
} from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../components/ui/Toast';
import AssessmentSettingsModal from '../../components/dashboard/admin/AssessmentSettingsModal';
import { fromDatetimeLocalValue } from '../../utils/assessmentEntryWindow';
import StudentSelectorModal from '../../components/dashboard/admin/StudentSelectorModal';
import DirectoryLoadingPanel from '../../components/dashboard/admin/DirectoryLoading';
import CodingQuestionEditor from '../../components/admin/CodingQuestionEditor';
import AllowedCodingLanguagesPicker from '../../components/admin/AllowedCodingLanguagesPicker';
import {
  createEmptyStarterCodesByLang,
  parseStarterCodesByLang,
  mergeCodingIntoConfig,
  ALL_CODING_LANGUAGE_IDS,
} from '../../coding-engine/starterCodeStorage';

const COMPLETED_SESSION_STATUSES = new Set(['SUBMITTED', 'COMPLETED', 'PENDING_REVIEW', 'TERMINATED']);

function assessmentHasLiveSession(assessment) {
  return (assessment.sessions || []).some((s) => s.status === 'IN_PROGRESS');
}

function assessmentIsDraft(assessment) {
  return assessment.status === 'DRAFT';
}

function assessmentIsActiveWindow(assessment) {
  if (assessmentIsDraft(assessment)) return false;
  const now = new Date();
  const start = assessment.startTime ? new Date(assessment.startTime) : null;
  const end = assessment.endTime ? new Date(assessment.endTime) : null;
  if (assessmentHasLiveSession(assessment)) return true;
  if (start && end && now >= start && now <= end) return true;
  if (start && !end && now >= start) return true;
  return false;
}

function assessmentIsUpcoming(assessment) {
  if (assessmentIsDraft(assessment)) return false;
  if (!assessment.startTime || assessmentHasLiveSession(assessment)) return false;
  return new Date(assessment.startTime) > new Date();
}

function assessmentIsPast(assessment) {
  if (assessmentIsDraft(assessment)) return false;
  if (assessmentHasLiveSession(assessment)) return false;
  const end = assessment.endTime ? new Date(assessment.endTime) : null;
  if (end) return end < new Date();
  const start = assessment.startTime ? new Date(assessment.startTime) : null;
  return start ? start < new Date() : false;
}

export default function AdminAssessments() {
  const navigate = useNavigate();
  const location = useLocation();
  const basePath = location.pathname.startsWith('/super-admin') ? '/super-admin' : '/admin';
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [settingsAssessment, setSettingsAssessment] = useState(null);
  const [step, setStep] = useState(1);
  const [batches, setBatches] = useState([]);
  const [showStudentSelector, setShowStudentSelector] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const toast = useToast();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'MOCK_TEST', 
    difficulty: 'MEDIUM',
    duration: 60,
    startTime: '',
    endTime: '',
    questions: [],
    targetBatchIds: [],
    targetStudentIds: [],
    scheduledAtMap: {},
    config: {
      proctoring: { webcam: true, mic: true, tabSwitch: true, fullscreen: true, snapshotInterval: 60 },
      joinWindow: { opensMinutesBeforeStart: 10, closesMinutesAfterStart: 10 },
      coding: { allowedLanguages: [...ALL_CODING_LANGUAGE_IDS] },
    },
  });

  const hasCodingQuestions =
    formData.type === 'CODING_TEST' ||
    (formData.questions || []).some((q) => q.type === 'CODING');

  const fetchBatches = useCallback(async () => {
    try {
      const data = await api.getBatches();
      setBatches(data);
    } catch (e) {
      console.error('Failed to load batches');
    }
  }, []);

  const fetchAssessments = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getAssessments();
      const list = Array.isArray(data) ? data : (data?.assessments || []);
      setAssessments(list);
    } catch (e) {
      toast?.error(e?.message || 'Failed to load assessments');
      setAssessments([]);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchAssessments();
    fetchBatches();
  }, [fetchAssessments, fetchBatches]);

  // Drop stale localStorage cache from before assessments existed (5-min TTL hid new items)
  useEffect(() => {
    try {
      Object.keys(localStorage).forEach((key) => {
        if (key.includes('api_cache_/assessments/all')) localStorage.removeItem(key);
      });
    } catch {
      /* ignore */
    }
  }, []);

  const [availableStudents, setAvailableStudents] = useState([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [loadingStudents, setLoadingStudents] = useState(false);

  useEffect(() => {
    if (step === 3 && formData.type === 'MOCK_INTERVIEW_LIVE') {
      const fetchStudents = async () => {
        try {
          setLoadingStudents(true);
          const data = await api.getAllStudents();
          setAvailableStudents(data?.students || (Array.isArray(data) ? data : []));
        } catch (e) {
          console.error('Failed to load students');
        } finally {
          setLoadingStudents(false);
        }
      };
      fetchStudents();
    }
  }, [step, formData.type]);

  const filteredStudents = Array.isArray(availableStudents) 
    ? availableStudents.filter(s => 
        s.fullName?.toLowerCase().includes(studentSearch.toLowerCase()) ||
        s.enrollmentId?.toLowerCase().includes(studentSearch.toLowerCase())
      )
    : [];

  const allowedLangs =
    formData.config?.coding?.allowedLanguages?.length > 0
      ? formData.config.coding.allowedLanguages
      : [...ALL_CODING_LANGUAGE_IDS];

  const validateCodingQuestions = (forPublish = true) => {
    const codingQs = (formData.questions || []).filter((q) => q.type === 'CODING');
    if (!codingQs.length) return true;

    if (forPublish) {
      if (allowedLangs.length < 1) {
        toast?.error('Select at least one allowed coding language');
        return false;
      }
    }

    for (const q of codingQs) {
      if (!q.text?.trim()) {
        toast?.error('Each coding question needs a title');
        return false;
      }
      if (forPublish) {
        const starters = parseStarterCodesByLang(q.starterCodes ?? q.starterCode);
        for (const lang of allowedLangs) {
          if (!String(starters[lang] ?? '').trim()) {
            toast?.error(
              `"${q.text}": add starter code for ${lang}`
            );
            return false;
          }
        }
        const cases = Array.isArray(q.testCases) ? q.testCases : [];
        const valid = cases.filter(
          (tc) =>
            String(tc.input ?? '').trim() &&
            String(tc.expectedOutput ?? tc.output ?? '').trim()
        );
        if (valid.length === 0) {
          toast?.error(
            `"${q.text || 'Coding question'}": add at least one judge test case with input and expected output`
          );
          return false;
        }
      }
    }
    return true;
  };

  const buildAssessmentPayload = (publish) => ({
    ...formData,
    title: formData.title?.trim(),
    config: mergeCodingIntoConfig(formData.config, {
      allowedLanguages: hasCodingQuestions ? allowedLangs : undefined,
    }),
    questions: (formData.questions || []).map((q) =>
      q.type === 'CODING'
        ? { ...q, starterCodes: parseStarterCodesByLang(q.starterCodes ?? q.starterCode) }
        : q
    ),
    startTime: fromDatetimeLocalValue(formData.startTime),
    endTime: fromDatetimeLocalValue(formData.endTime),
    joinOpensMinutesBeforeStart: formData.config?.joinWindow?.opensMinutesBeforeStart,
    joinClosesMinutesAfterStart: formData.config?.joinWindow?.closesMinutesAfterStart,
    allowedCodingLanguages: hasCodingQuestions ? allowedLangs : undefined,
    publish,
  });

  const handleSaveDraft = async () => {
    if (!formData.title?.trim()) {
      toast?.error('Assessment title is required');
      return;
    }
    try {
      await api.createAssessment(buildAssessmentPayload(false));
      toast?.success('Draft saved');
      setShowCreateModal(false);
      setStep(1);
      fetchAssessments();
    } catch (e) {
      toast?.error(e?.message || 'Failed to save draft');
    }
  };

  const handlePublish = async () => {
    if (!formData.title?.trim()) {
      toast?.error('Assessment title is required');
      return;
    }
    if (!validateCodingQuestions(true)) return;
    try {
      await api.createAssessment(buildAssessmentPayload(true));
      toast?.success('Assessment published');
      setShowCreateModal(false);
      setStep(1);
      fetchAssessments();
    } catch (e) {
      toast?.error(e?.message || 'Failed to publish assessment');
    }
  };

  const handlePublishExisting = async (id) => {
    try {
      await api.publishAssessment(id);
      toast?.success('Assessment published');
      fetchAssessments();
    } catch (e) {
      toast?.error(e?.message || 'Failed to publish');
    }
  };

  const addQuestion = () => {
    const defaultType = formData.type === 'MOCK_TEST' ? 'MCQ' : 
                       formData.type === 'CODING_TEST' ? 'CODING' : 'DESCRIPTIVE';
    setFormData({
      ...formData,
      questions: [
        ...formData.questions, 
        { 
          text: '', 
          description: '',
          type: defaultType, 
          options: defaultType === 'MCQ' ? ['', '', '', ''] : [''], 
          correctAnswer: '', 
          points: 1,
          difficulty: 'MEDIUM',
          starterCodes: createEmptyStarterCodesByLang(),
          constraints: '',
          examples: [{ input: '', output: '', explanation: '' }],
          testCases: [{ input: '', expectedOutput: '', hidden: false }]
        }
      ]
    });
  };

  const updateQuestion = (index, field, value) => {
    const newQuestions = [...formData.questions];
    newQuestions[index][field] = value;

    // Auto-initialize 4 options if type is changed to MCQ and it doesn't have 4 yet
    if (field === 'type' && value === 'MCQ' && (!newQuestions[index].options || newQuestions[index].options.length < 4)) {
      newQuestions[index].options = ['', '', '', ''];
    }

    setFormData({ ...formData, questions: newQuestions });
  };

  const getAssessmentTypeIcon = (type) => {
    switch (type) {
      case 'MOCK_TEST': return <FileText className="w-5 h-5" />;
      case 'CODING_TEST': return <Terminal className="w-5 h-5" />;
      case 'DESCRIPTIVE': return <BookOpen className="w-5 h-5" />;
      default: return <Activity className="w-5 h-5" />;
    }
  };

  const totalAssessments = assessments.length;
  const upcomingScheduled = assessments.filter(assessmentIsUpcoming).length;
  const activeSessions = assessments.reduce(
    (acc, a) => acc + (a.sessions || []).filter((s) => s.status === 'IN_PROGRESS').length,
    0,
  );
  const completedAttempts = assessments.reduce(
    (acc, a) => acc + (a.sessions || []).filter((s) => COMPLETED_SESSION_STATUSES.has(s.status)).length,
    0,
  );
  const activeAssessmentsCount = assessments.filter(
    (a) => assessmentIsActiveWindow(a) || assessmentHasLiveSession(a),
  ).length;
  const pastAssessmentsCount = assessments.filter(assessmentIsPast).length;

  const filteredAssessments = assessments.filter((item) => {
    if (searchQuery && !item.title?.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (activeTab === 'all') return true;
    if (activeTab === 'active') {
      return assessmentIsActiveWindow(item) || assessmentHasLiveSession(item);
    }
    if (activeTab === 'upcoming') return assessmentIsUpcoming(item);
    if (activeTab === 'past') return assessmentIsPast(item);
    return true;
  });

  return (
    <>
      <div className="space-y-6 sm:space-y-8 p-4 sm:p-6 max-w-[1600px] mx-auto animate-in fade-in duration-500">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Assessments
            </h1>
            <p className="text-slate-500 text-sm mt-1 font-medium">Design, deploy and monitor student assessments</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setStep(1);
              setShowCreateModal(true);
            }}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all shadow-md shadow-indigo-500/10 active:scale-95"
          >
            <Plus className="w-4 h-4" /> Create Assessment
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
          {[
            { label: 'Total Assessments', val: totalAssessments, icon: Layout, color: 'bg-indigo-50 text-indigo-600 border-indigo-100' },
            { label: 'Upcoming Scheduled', val: upcomingScheduled, icon: Clock, color: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
            { label: 'Active Sessions', val: activeSessions, icon: Users, color: 'bg-amber-50 text-amber-600 border-amber-100' },
            { label: 'Completed', val: completedAttempts, icon: CheckCircle, color: 'bg-blue-50 text-blue-600 border-blue-100' },
          ].map((stat, i) => (
            <div
              key={i}
              className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 transition-all hover:shadow-md"
            >
              <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center border ${stat.color}`}>
                <stat.icon className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{stat.label}</p>
                <p className="text-xl sm:text-2xl font-bold text-slate-900 tabular-nums">{stat.val}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 sm:p-6 border-b border-slate-100 bg-slate-50/30 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="grid w-full grid-cols-4 gap-1 rounded-xl bg-slate-200/50 p-1 shadow-inner lg:max-w-3xl lg:flex-1">
              {[
                { id: 'all', label: 'All Assessments', shortLabel: 'All', count: totalAssessments },
                { id: 'active', label: 'Active Now', shortLabel: 'Active', count: activeAssessmentsCount },
                { id: 'upcoming', label: 'Upcoming', shortLabel: 'Upcoming', count: upcomingScheduled },
                { id: 'past', label: 'Past Archives', shortLabel: 'Past', count: pastAssessmentsCount },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center justify-center gap-1.5 rounded-lg px-2 py-2.5 text-[10px] font-bold transition-all sm:gap-2 sm:px-3 sm:text-[11px] ${
                    activeTab === tab.id
                      ? 'bg-white text-indigo-600 shadow-md'
                      : 'text-slate-500 hover:bg-white/40 hover:text-slate-700'
                  }`}
                >
                  <span className="hidden sm:inline whitespace-nowrap">{tab.label}</span>
                  <span className="sm:hidden whitespace-nowrap">{tab.shortLabel}</span>
                  <span
                    className={`shrink-0 rounded-md px-1.5 py-0.5 text-[9px] tabular-nums ${
                      activeTab === tab.id ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            <div className="relative w-full shrink-0 lg:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by assessment title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all shadow-sm"
              />
            </div>
          </div>

          <div className="p-4 sm:p-6">
            {loading ? (
              <DirectoryLoadingPanel title="Loading assessments..." subtitle="Please wait while we fetch the data" />
            ) : filteredAssessments.length === 0 ? (
              <div className="py-24 flex flex-col items-center justify-center gap-6 text-center">
                <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center">
                  <AlertCircle className="w-10 h-10 text-slate-200" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">No {activeTab === 'all' ? '' : `${activeTab} `}assessments found</h3>
                  <p className="text-sm text-slate-500 max-w-xs mx-auto mt-2 font-medium">
                    {assessments.length === 0
                      ? 'Create your first assessment to get started.'
                      : 'Try another tab or adjust your search.'}
                  </p>
                </div>
                {assessments.length === 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setStep(1);
                      setShowCreateModal(true);
                    }}
                    className="px-6 py-3 bg-slate-900 text-white rounded-xl font-bold text-xs hover:bg-slate-800 transition-all active:scale-95"
                  >
                    Create Your First Assessment
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredAssessments.map((item) => (
            <div key={item.id} className="bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-xl hover:shadow-slate-200/50 transition-all group flex flex-col h-full relative overflow-hidden">
              <div className="flex justify-between items-start mb-5">
                <div className={`p-3 rounded-xl ${item.type === 'MOCK_TEST' ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600'} border border-current opacity-20`}>
                  {getAssessmentTypeIcon(item.type)}
                </div>
                <div className="flex items-center gap-2 flex-wrap justify-end">
                   {assessmentIsDraft(item) && (
                     <span className="px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider rounded-md border bg-amber-50 border-amber-100 text-amber-700">
                       Draft
                     </span>
                   )}
                   <span className={`px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider rounded-md border ${
                     item.type === 'MOCK_TEST' ? 'bg-indigo-50 border-indigo-100 text-indigo-600' : 'bg-emerald-50 border-emerald-100 text-emerald-600'
                   }`}>
                     {item.type?.replace(/_/g, ' ')}
                   </span>
                </div>
              </div>

              <div className="flex-1">
                <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-indigo-600 transition-colors">{item.title}</h3>
                <p className="text-sm text-slate-500 font-medium line-clamp-2 mb-6">{item.description || 'No description provided.'}</p>
                
                <div className="flex flex-wrap gap-4 mb-6">
                   <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400">
                      <Clock className="w-3.5 h-3.5" /> {item.duration} Mins
                   </div>
                   <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400">
                      <Users className="w-3.5 h-3.5" /> {item.sessions?.length || 0} Attempts
                   </div>
                   <div className="flex items-center gap-2 text-[11px] font-bold text-indigo-500">
                      <Target className="w-3.5 h-3.5" /> {item.questions?.length || 0} Items
                   </div>
                </div>
              </div>

              <div className="pt-5 border-t border-slate-100 flex flex-col gap-2">
                {assessmentIsDraft(item) ? (
                  <button
                    type="button"
                    onClick={() => handlePublishExisting(item.id)}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" /> Publish assessment
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => navigate(`${basePath}/assessments/${item.id}/live-monitor`)}
                      className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-bold uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2"
                    >
                      <Video className="w-4 h-4" /> Live Monitor (webcam & violations)
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate(`${basePath}?tab=assessmentResults&assessmentId=${item.id}`)}
                      className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-bold uppercase tracking-wider rounded-xl transition-all shadow-md shadow-slate-900/10 active:scale-95"
                    >
                      View Results
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => setSettingsAssessment(item)}
                  className="w-full py-2.5 bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-900 border border-slate-100 rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-wider"
                >
                  <Settings className="w-4 h-4" /> Settings
                </button>
              </div>
            </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Full-Screen Overlay Components - Placed outside animated container to ensure true fixed inset-0 */}
      
      {/* Creation Wizard - Clean Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-md z-[9999] flex items-center justify-center p-4 sm:p-8 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-5xl h-[85vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-8 duration-500">
            {/* Modal Header */}
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
               <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-600/20">
                     <FileText className="w-5 h-5" />
                  </div>
                  <div>
                     <h2 className="text-lg font-bold text-slate-900">New Assessment</h2>
                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Configuration Wizard • Step {step} of 3</p>
                  </div>
               </div>
               <button 
                 onClick={() => setShowCreateModal(false)}
                 className="w-10 h-10 bg-slate-100 text-slate-400 hover:bg-rose-50 hover:text-rose-600 rounded-xl flex items-center justify-center transition-all"
               >
                 <X className="w-5 h-5" />
               </button>
            </div>

            {/* Step Progress Bar */}
            <div className="h-1.5 w-full bg-slate-100 relative">
               <div 
                 className="absolute inset-0 bg-indigo-600 transition-all duration-500 ease-out shadow-[0_0_10px_rgba(79,70,229,0.5)]" 
                 style={{ width: `${(step / 3) * 100}%` }} 
               />
            </div>

            <div className="flex-1 overflow-y-auto p-8 sm:p-10 custom-scrollbar bg-white">
               {step === 1 && (
                 <div className="max-w-3xl mx-auto space-y-10 animate-in fade-in slide-in-from-right-4 duration-500">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                       <div className="space-y-2.5">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Assessment Title</label>
                          <input 
                            value={formData.title}
                            onChange={e => setFormData({...formData, title: e.target.value})}
                            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 ring-indigo-500/10 outline-none font-bold text-slate-900 transition-all" 
                            placeholder="e.g. SOT Fullstack Mock Test" 
                          />
                       </div>
                       <div className="space-y-2.5">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Assessment Category</label>
                          <div className="grid grid-cols-2 gap-2">
                             {[
                               { id: 'MOCK_TEST', label: 'MCQ Test', icon: FileText },
                               { id: 'CODING_TEST', label: 'Coding', icon: Terminal },
                               { id: 'DESCRIPTIVE', label: 'Descriptive', icon: BookOpen },
                               { id: 'MIXED', label: 'Mixed Mode', icon: Layers }
                             ].map(type => (
                               <button 
                                 key={type.id}
                                 onClick={() => setFormData({...formData, type: type.id})}
                                 className={`p-3 rounded-xl border-2 transition-all flex items-center gap-3 ${formData.type === type.id ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-md shadow-indigo-500/5' : 'border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-200'}`}
                               >
                                 <type.icon className="w-4 h-4 flex-shrink-0" />
                                 <span className="text-[10px] font-bold uppercase truncate">{type.label}</span>
                               </button>
                             ))}
                          </div>
                       </div>
                    </div>

                    <div className="space-y-2.5">
                       <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Assessment Description</label>
                       <textarea 
                         value={formData.description}
                         onChange={e => setFormData({...formData, description: e.target.value})}
                         className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 ring-indigo-500/10 outline-none font-medium text-slate-700 h-32 resize-none transition-all shadow-inner" 
                         placeholder="Describe the scope and rules of this test..." 
                       />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                       {[
                         { label: 'Duration (Min)', type: 'number', key: 'duration' },
                         { label: 'Scheduled Start', type: 'datetime-local', key: 'startTime' },
                         { label: 'Overall End (optional)', type: 'datetime-local', key: 'endTime' },
                       ].map((field) => (
                         <div key={field.key} className="space-y-2.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{field.label}</label>
                            <input
                              type={field.type}
                              value={formData[field.key]}
                              onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 ring-indigo-500/10 outline-none font-bold text-slate-900 transition-all text-xs"
                            />
                         </div>
                       ))}
                    </div>

                    <div className="p-5 bg-indigo-50/50 border border-indigo-100 rounded-2xl space-y-4">
                      <p className="text-xs font-bold text-indigo-900">Join window (when students can enter)</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                            Can join before start (minutes)
                          </label>
                          <input
                            type="number"
                            min={0}
                            value={formData.config.joinWindow.opensMinutesBeforeStart}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                config: {
                                  ...formData.config,
                                  joinWindow: {
                                    ...formData.config.joinWindow,
                                    opensMinutesBeforeStart: parseInt(e.target.value, 10) || 0,
                                  },
                                },
                              })
                            }
                            className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-800"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                            Must join within after start (minutes)
                          </label>
                          <input
                            type="number"
                            min={0}
                            value={formData.config.joinWindow.closesMinutesAfterStart}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                config: {
                                  ...formData.config,
                                  joinWindow: {
                                    ...formData.config.joinWindow,
                                    closesMinutesAfterStart: parseInt(e.target.value, 10) || 0,
                                  },
                                },
                              })
                            }
                            className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-800"
                          />
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-600 font-medium">
                        Example: start 10:00, join within 10 min after start → students must enter by 10:10.
                        Pre-check can open 10 min early if you set 10 above.
                      </p>
                    </div>
                 </div>
               )}

               {step === 2 && (
                 <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50 p-6 rounded-2xl border border-slate-200">
                       <div>
                          <h3 className="text-lg font-bold text-slate-900">Manage Content</h3>
                          <p className="text-xs text-slate-500 font-medium">Add questions, prompts or grading criteria.</p>
                       </div>
                       <button 
                         onClick={addQuestion}
                         className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-lg shadow-slate-900/10 active:scale-95"
                       >
                         <Plus className="w-4 h-4" /> Add Item
                       </button>
                    </div>

                    <div className="space-y-4">
                       {formData.questions.map((q, idx) => (
                         <div key={idx} className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-6 relative group border-l-4 border-l-indigo-600 animate-in slide-in-from-bottom-2 duration-300">
                            <button 
                              onClick={() => {
                                const newQs = [...formData.questions];
                                newQs.splice(idx, 1);
                                setFormData({ ...formData, questions: newQs });
                              }}
                              className="absolute top-4 right-4 w-8 h-8 bg-rose-50 text-rose-500 rounded-lg hover:bg-rose-600 hover:text-white transition-all flex items-center justify-center opacity-0 group-hover:opacity-100 shadow-sm"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>

                            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                               {q.type !== 'CODING' && (
                               <div className="md:col-span-8 space-y-2.5">
                                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Question {idx + 1}</label>
                                  <input 
                                     value={q.text}
                                     onChange={e => updateQuestion(idx, 'text', e.target.value)}
                                     className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm focus:ring-2 ring-indigo-500/10 outline-none transition-all" 
                                     placeholder="Enter question text here..." 
                                  />
                               </div>
                               )}
                               {q.type === 'CODING' && <div className="md:col-span-8" />}
                               <div className="md:col-span-4 space-y-2.5">
                                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Type & Points</label>
                                  <div className="flex gap-2">
                                     <select 
                                       value={q.type}
                                       onChange={e => updateQuestion(idx, 'type', e.target.value)}
                                       className="flex-1 p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-[10px] uppercase tracking-widest cursor-pointer outline-none focus:ring-2 ring-indigo-500/10"
                                     >
                                       <option value="MCQ">MCQ</option>
                                       <option value="CODING">Coding</option>
                                       <option value="DESCRIPTIVE">Descriptive</option>
                                     </select>
                                     <input 
                                       type="number"
                                       value={q.points}
                                       onChange={e => updateQuestion(idx, 'points', e.target.value)}
                                       className="w-20 p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-center outline-none focus:ring-2 ring-indigo-500/10" 
                                     />
                                  </div>
                               </div>
                            </div>

                            {q.type === 'MCQ' && (
                              <div className="bg-slate-50/50 p-6 rounded-xl border border-slate-100 space-y-4">
                                 <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Options (Click Circle to Mark Correct)</label>
                                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {(q.options || ['', '', '', '']).map((opt, optIdx) => (
                                      <div key={optIdx} className="flex gap-2 group/opt">
                                         <button 
                                           onClick={() => updateQuestion(idx, 'correctAnswer', optIdx.toString())}
                                           className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all border shrink-0 ${q.correctAnswer === optIdx.toString() ? 'bg-emerald-600 border-emerald-600 text-white shadow-md' : 'bg-white text-slate-300 border-slate-200'}`}
                                           title="Mark as correct"
                                         >
                                            <CheckCircle className="w-4 h-4" />
                                         </button>
                                         <div className="relative flex-1">
                                           <input 
                                             value={opt}
                                             onChange={e => {
                                               const newOpts = [...q.options];
                                               newOpts[optIdx] = e.target.value;
                                               updateQuestion(idx, 'options', newOpts);
                                             }}
                                             className="w-full p-3 bg-white border border-slate-200 rounded-lg text-xs font-bold outline-none focus:border-indigo-400 transition-all pr-10" 
                                             placeholder={`Option ${String.fromCharCode(65 + optIdx)}`} 
                                           />
                                           {q.options?.length > 2 && (
                                             <button 
                                               onClick={() => {
                                                 const newOpts = q.options.filter((_, i) => i !== optIdx);
                                                 updateQuestion(idx, 'options', newOpts);
                                                 if (q.correctAnswer === optIdx.toString()) {
                                                   updateQuestion(idx, 'correctAnswer', '');
                                                 } else if (parseInt(q.correctAnswer) > optIdx) {
                                                   updateQuestion(idx, 'correctAnswer', (parseInt(q.correctAnswer) - 1).toString());
                                                 }
                                               }}
                                               className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-300 hover:text-rose-500 transition-colors opacity-0 group-hover/opt:opacity-100"
                                               title="Remove option"
                                             >
                                               <Trash2 className="w-3.5 h-3.5" />
                                             </button>
                                           )}
                                         </div>
                                      </div>
                                    ))}
                                    <button 
                                      onClick={() => {
                                        const newOpts = [...(q.options || []), ''];
                                        updateQuestion(idx, 'options', newOpts);
                                      }}
                                      className="flex items-center justify-center gap-2 p-3 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 hover:border-indigo-300 hover:text-indigo-600 transition-all text-[10px] font-bold uppercase tracking-widest"
                                    >
                                       <Plus className="w-3.5 h-3.5" /> Add Option
                                    </button>
                                 </div>
                              </div>
                            )}

                            {q.type === 'CODING' && (
                              <CodingQuestionEditor
                                question={q}
                                onChange={(updated) => {
                                  const newQuestions = [...formData.questions];
                                  newQuestions[idx] = { ...newQuestions[idx], ...updated };
                                  setFormData({ ...formData, questions: newQuestions });
                                }}
                              />
                            )}
                         </div>
                       ))}

                       {formData.questions.length === 0 && (
                         <div className="py-20 border-2 border-dashed border-slate-100 rounded-3xl flex flex-col items-center justify-center text-slate-300">
                            <Layers className="w-12 h-12 mb-3 opacity-20" />
                            <p className="font-bold text-xs">No questions defined yet.</p>
                         </div>
                       )}
                    </div>
                 </div>
               )}

               {step === 3 && (
                 <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                    <div className="bg-slate-900 rounded-3xl p-8 text-white relative overflow-hidden shadow-2xl shadow-indigo-900/20">
                       <Shield className="absolute top-0 right-0 w-48 h-48 text-indigo-500/10 -mr-10 -mt-10" />
                       <div className="relative z-10">
                          <h4 className="text-xl font-bold mb-1">Sentinel Configuration</h4>
                          <p className="text-slate-400 text-xs font-medium">Define AI proctoring rules and session security.</p>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
                             {[
                               { key: 'webcam', label: 'Webcam Monitoring', icon: Camera, desc: 'Capture regular candidate snapshots' },
                               { key: 'mic', label: 'Audio Sentinel', icon: Mic, desc: 'Detect speech or high background noise' },
                               { key: 'tabSwitch', label: 'Anti-Switch', icon: Layers, desc: 'Detect and log browser tab switching' },
                               { key: 'fullscreen', label: 'Force Fullscreen', icon: Maximize2, desc: 'Assessment must remain in fullscreen' }
                             ].map(feature => (
                               <button
                                 key={feature.key}
                                 onClick={() => setFormData({
                                   ...formData,
                                   config: {
                                     ...formData.config,
                                     proctoring: { ...formData.config.proctoring, [feature.key]: !formData.config.proctoring[feature.key] }
                                   }
                                 })}
                                 className={`p-5 rounded-2xl border text-left transition-all flex items-start gap-4 ${formData.config.proctoring[feature.key] ? 'border-indigo-500/50 bg-indigo-500/10' : 'border-white/5 bg-white/5 hover:bg-white/10'}`}
                               >
                                 <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${formData.config.proctoring[feature.key] ? 'bg-indigo-500 text-white' : 'bg-white/10 text-slate-500'}`}>
                                    <feature.icon className="w-5 h-5" />
                                 </div>
                                 <div>
                                   <p className="text-sm font-bold text-white">{feature.label}</p>
                                   <p className="text-[10px] font-medium text-slate-400 mt-0.5 leading-relaxed">{feature.desc}</p>
                                 </div>
                               </button>
                             ))}
                          </div>
                       </div>
                    </div>

                    {hasCodingQuestions && (
                      <AllowedCodingLanguagesPicker
                        selected={allowedLangs}
                        onChange={(ids) =>
                          setFormData({
                            ...formData,
                            config: mergeCodingIntoConfig(formData.config, {
                              allowedLanguages: ids,
                            }),
                          })
                        }
                      />
                    )}

                    <div className="bg-white border border-slate-200 rounded-3xl p-8 space-y-6">
                       <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                             <Users className="w-5 h-5 text-indigo-600" />
                          </div>
                          <div>
                             <h4 className="text-sm font-bold text-slate-900">Target Audience</h4>
                             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Assign Batches or specific Candidates</p>
                          </div>
                       </div>

                       <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-56 overflow-y-auto p-1 custom-scrollbar">
                          {batches.map(batch => (
                            <button 
                              key={batch.id}
                              onClick={() => {
                                const ids = formData.targetBatchIds.includes(batch.id)
                                  ? formData.targetBatchIds.filter(id => id !== batch.id)
                                  : [...formData.targetBatchIds, batch.id];
                                setFormData({...formData, targetBatchIds: ids});
                              }}
                              className={`p-4 rounded-xl border-2 text-left transition-all ${
                                formData.targetBatchIds.includes(batch.id)
                                ? 'border-indigo-600 bg-indigo-50'
                                : 'border-slate-100 bg-slate-50 hover:border-slate-200'
                              }`}
                            >
                              <div className="text-xs font-bold text-slate-900">{batch.label || batch.year}</div>
                              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-tight mt-0.5">{batch.school?.name || 'General Batch'}</div>
                            </button>
                          ))}
                       </div>
                       
                       <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                             <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                             <span className="text-[10px] font-bold text-slate-500">Selected {formData.targetBatchIds.length} Batches</span>
                          </div>
                          <button 
                             onClick={() => setShowStudentSelector(true)}
                             className="text-[10px] font-bold text-indigo-600 hover:underline uppercase tracking-wider"
                           >
                             Advanced Selection
                           </button>
                       </div>
                    </div>
                 </div>
               )}
            </div>

            {/* Modal Footer */}
            <div className="px-8 py-6 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center">
               <button 
                 disabled={step === 1}
                 onClick={() => setStep(step - 1)}
                 className="px-6 py-3 text-xs font-bold text-slate-400 hover:text-slate-900 disabled:opacity-0 transition-all uppercase tracking-widest"
               >
                 Back
               </button>
               
               <div className="flex gap-3">
                 {step < 3 ? (
                   <button 
                     onClick={() => setStep(step + 1)}
                     className="px-8 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-lg active:scale-95 flex items-center gap-2"
                   >
                     Next Step <ChevronRight className="w-4 h-4" />
                   </button>
                 ) : (
                   <>
                     <button
                       type="button"
                       onClick={handleSaveDraft}
                       className="px-6 py-3 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-white"
                     >
                       Save draft
                     </button>
                     <button
                       type="button"
                       onClick={handlePublish}
                       className="px-10 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xl shadow-indigo-500/20 active:scale-95"
                     >
                       Publish assessment
                     </button>
                   </>
                 )}
               </div>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal Hookup */}
      {settingsAssessment && (
        <AssessmentSettingsModal
          assessment={settingsAssessment}
          onUpdate={fetchAssessments}
          onClose={() => setSettingsAssessment(null)}
        />
      )}

      {/* Student Selector Modal for Advanced Targeting */}
      <StudentSelectorModal 
        isOpen={showStudentSelector}
        onClose={() => setShowStudentSelector(false)}
        onSelect={(studentIds) => {
          setFormData({ ...formData, targetStudentIds: studentIds });
          toast?.success(`${studentIds.length} students selected for targeting`);
        }}
        initialSelected={formData.targetStudentIds}
        jobTitle={formData.title || 'New Assessment'}
      />
    </>
  );
}
