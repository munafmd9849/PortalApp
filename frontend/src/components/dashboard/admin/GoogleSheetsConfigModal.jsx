import React, { useEffect, useState } from 'react';
import { X, FileSpreadsheet, Loader } from 'lucide-react';
import api from '../../../services/api';

export default function GoogleSheetsConfigModal({ isOpen, onClose, onSaved }) {
  const [spreadsheetUrl, setSpreadsheetUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState(null);

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    setLoading(true);
    setError('');

    api.get('/super-admin/google-sheets/config', { silent: true })
      .then((res) => {
        if (cancelled) return;
        const data = res?.data ?? res;
        setStatus(data);
        setSpreadsheetUrl(data?.spreadsheetUrl || '');
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err?.message || 'Failed to load Google Sheets settings');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [isOpen]);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const res = await api.put('/super-admin/google-sheets/config', { spreadsheetUrl }, { silent: true });
      const data = res?.data ?? res;
      setStatus(data);
      onSaved?.(data);
      onClose?.();
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl border border-slate-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
            <h3 className="text-lg font-semibold text-slate-900">Google Sheets Export</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <p className="text-sm text-slate-600">
            Set the master workbook URL. Each export creates a new tab with the currently filtered student list.
            Share the workbook with your service account email as Editor.
          </p>

          {loading ? (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Loader className="w-4 h-4 animate-spin" />
              Loading settings...
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Master spreadsheet URL
                </label>
                <input
                  type="url"
                  value={spreadsheetUrl}
                  onChange={(e) => setSpreadsheetUrl(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              {status && (
                <div className="text-xs text-slate-500 space-y-1">
                  <p>
                    Credentials:
                    {' '}
                    <span className={status.credentialsConfigured ? 'text-emerald-600 font-medium' : 'text-amber-600 font-medium'}>
                      {status.credentialsConfigured ? 'Configured on server' : 'Not configured on server'}
                    </span>
                  </p>
                  {!status.credentialsConfigured && (
                    <p>Set GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON or GOOGLE_SHEETS_SERVICE_ACCOUNT_KEY_PATH in backend env.</p>
                  )}
                </div>
              )}

              {error && (
                <p className="text-sm text-red-600">{error}</p>
              )}
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-xl"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={loading || saving || !spreadsheetUrl.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-xl"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
