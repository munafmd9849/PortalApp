import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MessageCircle, Plus, Trash2, Users, Calendar } from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../components/ui/Toast';

export default function ConversationalInterviewManagement() {
  const navigate = useNavigate();
  const location = useLocation();
  const adminBase = location.pathname.startsWith('/super-admin') ? '/super-admin' : '/admin';
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getConversationalInterviews();
      setItems(Array.isArray(data) ? data : []);
    } catch {
      toast.error('Failed to load conversational interviews');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this conversational interview?')) return;
    try {
      await api.deleteConversationalInterview(id);
      toast.success('Deleted');
      load();
    } catch (err) {
      toast.error(err.message || 'Delete failed');
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900">Conversational AI Interviews</h2>
          <p className="text-sm text-slate-500 mt-1">Dynamic follow-up questions — separate from guided interviews</p>
        </div>
        <button
          type="button"
          onClick={() => navigate(`${adminBase}/conversational-interviews/create`)}
          className="px-5 py-3 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-black uppercase flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Create conversational
        </button>
      </div>

      {loading ? (
        <p className="text-slate-500 text-sm">Loading...</p>
      ) : items.length === 0 ? (
        <div className="bg-white border rounded-2xl p-12 text-center">
          <MessageCircle className="w-12 h-12 text-violet-300 mx-auto mb-4" />
          <p className="text-slate-600 font-medium">No conversational interviews yet</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {items.map((iv) => (
            <div key={iv.id} className="bg-white border rounded-2xl p-6 flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="text-[9px] font-black uppercase text-violet-600 bg-violet-50 px-2 py-0.5 rounded border border-violet-100">
                  Conversational
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-2">{iv.title}</h3>
                <p className="text-sm text-slate-500 mt-1">{iv.conversationalTopic || 'Open topic'}</p>
                <p className="text-xs text-slate-400 mt-2 flex items-center gap-4">
                  <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {iv.stats?.assigned ?? 0} assigned</span>
                  <span>{iv.conversationalMaxTurns} exchanges max</span>
                </p>
              </div>
              <button type="button" onClick={() => handleDelete(iv.id)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
