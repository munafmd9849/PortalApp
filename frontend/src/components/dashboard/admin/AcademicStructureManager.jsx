import React, { useState, useEffect } from 'react';
import { FaPlus, FaEdit, FaTrash, FaCheckCircle, FaTimesCircle, FaSpinner, FaGraduationCap, FaMapMarkerAlt, FaCalendarAlt } from 'react-icons/fa';
import api from '../../../services/api';
import { useToast } from '../../ui/Toast';

const AcademicStructureManager = () => {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('schools');
  const [data, setData] = useState({
    schools: [],
    centers: [],
    batches: []
  });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [modal, setModal] = useState({
    show: false,
    type: 'add', // add or edit
    category: 'schools', // schools, centers, batches
    item: null
  });

  const [form, setForm] = useState({
    name: '',
    code: '',
    location: '',
    year: '',
    label: '',
    status: 'ACTIVE'
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [s, c, b] = await Promise.all([
        api.getSchools({ includeInactive: true }),
        api.getCenters({ includeInactive: true }),
        api.getBatches({ includeInactive: true }),
      ]);
      setData({
        schools: s || [],
        centers: c || [],
        batches: b || []
      });
    } catch (err) {
      toast?.error('Failed to load academic structure data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenModal = (category, type = 'add', item = null) => {
    setModal({ show: true, type, category, item });
    if (type === 'edit' && item) {
      setForm({
        name: item.name || '',
        code: item.code || '',
        location: item.location || '',
        year: item.year || '',
        label: item.label || '',
        status: item.status || 'ACTIVE'
      });
    } else {
      setForm({
        name: '',
        code: '',
        location: '',
        year: '',
        label: '',
        status: 'ACTIVE'
      });
    }
  };

  const handleCloseModal = () => {
    setModal({ show: false, type: 'add', category: 'schools', item: null });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    const { category, type, item } = modal;

    try {
      let result;
      if (category === 'schools') {
        if (type === 'add') result = await api.createSchool({ name: form.name, code: form.code });
        else result = await api.updateSchool(item.id, { name: form.name, code: form.code, status: form.status });
      } else if (category === 'centers') {
        if (type === 'add') result = await api.createCenter({ name: form.name, location: form.location });
        else result = await api.updateCenter(item.id, { name: form.name, location: form.location, status: form.status });
      } else if (category === 'batches') {
        if (type === 'add') result = await api.createBatch({ year: form.year, label: form.label });
        else result = await api.updateBatch(item.id, { year: form.year, label: form.label, status: form.status });
      }

      toast?.success(`${category.slice(0, -1)} ${type === 'add' ? 'created' : 'updated'} successfully`);
      handleCloseModal();
      loadData();
    } catch (err) {
      toast?.error(err.message || `Failed to ${type} ${category.slice(0, -1)}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (category, id) => {
    if (!window.confirm('Are you sure you want to delete this? This action cannot be undone if no students are assigned.')) return;
    
    try {
      if (category === 'schools') await api.deleteSchool(id);
      else if (category === 'centers') await api.deleteCenter(id);
      else if (category === 'batches') await api.deleteBatch(id);
      
      toast?.success('Deleted successfully');
      loadData();
    } catch (err) {
      toast?.error(err.message || 'Failed to delete');
    }
  };

  const tabs = [
    { id: 'schools', label: 'Branches', icon: FaGraduationCap },
    { id: 'centers', label: 'Campuses', icon: FaMapMarkerAlt },
    { id: 'batches', label: 'Batches', icon: FaCalendarAlt }
  ];

  const activeTabMeta = tabs.find((t) => t.id === activeTab) || tabs[0];
  const addLabel = `Add New ${activeTabMeta.label.replace(/es$/, '').replace(/s$/, '')}`;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <FaSpinner className="animate-spin text-4xl text-blue-600 mb-4" />
        <p className="text-gray-500 font-medium">Loading academic structure...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="sticky top-[6.5rem] z-20 -mx-3 sm:-mx-6 md:-mx-8 px-3 sm:px-6 md:px-8 py-3 bg-gradient-to-br from-blue-50 via-sky-50 to-indigo-50 border-b border-blue-100/80">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Academic Structure</h2>
            <p className="text-sm text-gray-500">Manage branches, campuses, and student batches.</p>
          </div>
          <button
            type="button"
            onClick={() => handleOpenModal(activeTab)}
            className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-semibold transition-all shadow-md active:scale-95 shrink-0"
          >
            <FaPlus /> {addLabel}
          </button>
        </div>

        <div className="mt-4 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 border-b border-gray-200">
          <div className="flex flex-wrap border-b border-gray-200 sm:border-b-0 -mb-px">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 sm:px-6 py-3 font-semibold transition-all border-b-2 ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <tab.icon />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100 text-xs font-bold text-gray-500 uppercase tracking-wider">
              <th className="px-6 py-4">Name / Info</th>
              <th className="px-6 py-4">ID / Code</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data[activeTab].length === 0 ? (
              <tr>
                <td colSpan="4" className="px-6 py-12 text-center">
                  <p className="text-gray-500 mb-4">
                    No {activeTab} defined yet. Create your first {activeTabMeta.label.toLowerCase().replace(/es$/, '').replace(/s$/, '')} to get started.
                  </p>
                  <button
                    type="button"
                    onClick={() => handleOpenModal(activeTab)}
                    className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-semibold shadow-md"
                  >
                    <FaPlus /> {addLabel}
                  </button>
                </td>
              </tr>
            ) : (
              data[activeTab].map(item => (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-gray-900">
                      {activeTab === 'batches' ? item.year : item.name}
                    </div>
                    {activeTab === 'centers' && item.location && (
                      <div className="text-xs text-gray-500">{item.location}</div>
                    )}
                    {activeTab === 'batches' && item.label && (
                      <div className="text-xs text-gray-500">Label: {item.label}</div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <code className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-600">
                      {activeTab === 'schools' ? item.code || 'N/A' : item.id.substring(0, 8) + '...'}
                    </code>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      item.status === 'ACTIVE' 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {item.status === 'ACTIVE' ? <FaCheckCircle size={10} /> : <FaTimesCircle size={10} />}
                      {item.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleOpenModal(activeTab, 'edit', item)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                        title="Edit"
                      >
                        <FaEdit />
                      </button>
                      <button
                        onClick={() => handleDelete(activeTab, item.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        title="Delete"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {modal.show && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <h3 className="text-xl font-bold text-gray-900">
                {modal.type === 'add' ? 'Add' : 'Edit'}{' '}
                {(tabs.find((t) => t.id === modal.category) || tabs[0]).label.replace(/es$/, '').replace(/s$/, '')}
              </h3>
              <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600 transition-colors">
                <FaTimesCircle size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {modal.category === 'schools' && (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Branch Name</label>
                    <input
                      type="text"
                      required
                      value={form.name}
                      onChange={e => setForm({ ...form, name: e.target.value })}
                      placeholder="e.g. School of Technology"
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Branch Code</label>
                    <input
                      type="text"
                      value={form.code}
                      onChange={e => setForm({ ...form, code: e.target.value })}
                      placeholder="e.g. SOT"
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>
                </>
              )}

              {modal.category === 'centers' && (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Campus Name</label>
                    <input
                      type="text"
                      required
                      value={form.name}
                      onChange={e => setForm({ ...form, name: e.target.value })}
                      placeholder="e.g. Bangalore"
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Location Info</label>
                    <input
                      type="text"
                      value={form.location}
                      onChange={e => setForm({ ...form, location: e.target.value })}
                      placeholder="e.g. Electronic City"
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>
                </>
              )}

              {modal.category === 'batches' && (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Batch Year / Range</label>
                    <input
                      type="text"
                      required
                      value={form.year}
                      onChange={e => setForm({ ...form, year: e.target.value })}
                      placeholder="e.g. 2023-2027"
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Display Label</label>
                    <input
                      type="text"
                      value={form.label}
                      onChange={e => setForm({ ...form, label: e.target.value })}
                      placeholder="e.g. 23-27"
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>
                </>
              )}

              {modal.type === 'edit' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Status</label>
                  <select
                    value={form.status}
                    onChange={e => setForm({ ...form, status: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>
              )}

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 px-4 py-2 border border-gray-200 text-gray-600 font-semibold rounded-lg hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-md active:scale-95"
                >
                  {actionLoading ? <FaSpinner className="animate-spin" /> : (modal.type === 'add' ? 'Create' : 'Save Changes')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AcademicStructureManager;
