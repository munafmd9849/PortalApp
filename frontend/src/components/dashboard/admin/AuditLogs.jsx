import React, { useState, useEffect, useCallback } from 'react';
import {
    Search,
    Filter,
    ChevronLeft,
    ChevronRight,
    Download,
    Calendar,
    User,
    Activity,
    Info,
    RefreshCw,
    X
} from 'lucide-react';
import { getAuditLogs } from '../../../services/auditLogs';
import { useAuth } from '../../../hooks/useAuth';

const ROLE_COLORS = {
    'STUDENT': 'bg-blue-100 text-blue-700 border-blue-200',
    'ADMIN': 'bg-purple-100 text-purple-700 border-purple-200',
    'RECRUITER': 'bg-orange-100 text-orange-700 border-orange-200',
    'SUPER_ADMIN': 'bg-red-100 text-red-700 border-red-200'
};

export default function AuditLogs() {
    const { user } = useAuth();
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 50,
        total: 0,
        totalPages: 0
    });

    const [filters, setFilters] = useState({
        role: '',
        actionType: '',
        search: '',
        startDate: '',
        endDate: ''
    });

    const [availableActionTypes, setAvailableActionTypes] = useState([]);
    const [showFilters, setShowFilters] = useState(false);

    const fetchLogs = useCallback(async (page = 1) => {
        setLoading(true);
        setError(null);
        try {
            const data = await getAuditLogs({
                ...filters,
                page,
                limit: pagination.limit
            });
            if (data.success) {
                setLogs(data.logs);
                setPagination(data.pagination);
                if (data.filters?.actionTypes) {
                    setAvailableActionTypes(data.filters.actionTypes);
                }
            }
        } catch (err) {
            setError('Failed to fetch audit logs. Please try again.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [filters, pagination.limit]);

    useEffect(() => {
        fetchLogs(1);
    }, [filters, fetchLogs]);

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= pagination.totalPages) {
            fetchLogs(newPage);
        }
    };

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const clearFilters = () => {
        setFilters({
            role: '',
            actionType: '',
            search: '',
            startDate: '',
            endDate: ''
        });
    };

    const exportToCSV = () => {
        if (logs.length === 0) return;

        const headers = ['Timestamp', 'Actor', 'Role', 'Action', 'Target', 'Target ID', 'Details'];
        const csvData = logs.map(log => [
            new Date(log.timestamp).toLocaleString(),
            log.actorName,
            log.actorRole,
            log.actionType,
            log.targetType,
            log.targetId,
            log.details || ''
        ]);

        const csvContent = [
            headers.join(','),
            ...csvData.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `audit_logs_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Activity className="h-6 w-6 text-violet-600" />
                        System Audit Logs
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Track and monitor all significant actions across the portal
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => fetchLogs(pagination.page)}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
                        title="Refresh"
                        disabled={loading}
                    >
                        <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                        onClick={exportToCSV}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
                    >
                        <Download className="h-4 w-4" />
                        Export CSV
                    </button>
                </div>
            </div>

            {/* Search and Quick Filters */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-4">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            name="search"
                            placeholder="Search by actor name, details, or target ID..."
                            value={filters.search}
                            onChange={handleFilterChange}
                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all"
                        />
                    </div>
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${showFilters
                                ? 'bg-violet-100 text-violet-700 border-violet-200'
                                : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                            } border`}
                    >
                        <Filter className="h-4 w-4" />
                        Advanced Filters
                        {(filters.role || filters.actionType || filters.startDate || filters.endDate) && (
                            <span className="w-2 h-2 rounded-full bg-violet-600"></span>
                        )}
                    </button>
                </div>

                {/* Advanced Filters Panel */}
                {showFilters && (
                    <div className="pt-4 border-t border-gray-100 grid grid-cols-1 md:grid-cols-4 gap-4 animate-in slide-in-from-top-2 duration-300">
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Actor Role</label>
                            <select
                                name="role"
                                value={filters.role}
                                onChange={handleFilterChange}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                            >
                                <option value="">All Roles</option>
                                <option value="STUDENT">Student</option>
                                <option value="ADMIN">Admin</option>
                                <option value="RECRUITER">Recruiter</option>
                                <option value="SUPER_ADMIN">Super Admin</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Action Type</label>
                            <select
                                name="actionType"
                                value={filters.actionType}
                                onChange={handleFilterChange}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                            >
                                <option value="">All Actions</option>
                                {availableActionTypes.map(type => (
                                    <option key={type} value={type}>{type}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Start Date</label>
                            <input
                                type="date"
                                name="startDate"
                                value={filters.startDate}
                                onChange={handleFilterChange}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">End Date</label>
                            <div className="flex gap-2">
                                <input
                                    type="date"
                                    name="endDate"
                                    value={filters.endDate}
                                    onChange={handleFilterChange}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                                />
                                <button
                                    onClick={clearFilters}
                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Clear Filters"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Logs Table */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Timestamp</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Actor</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Action</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Target</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Details</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan="5" className="px-6 py-4">
                                            <div className="h-4 bg-gray-100 rounded w-full"></div>
                                        </td>
                                    </tr>
                                ))
                            ) : logs.length > 0 ? (
                                logs.map((log) => (
                                    <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">{new Date(log.timestamp).toLocaleDateString()}</div>
                                            <div className="text-xs text-gray-500">{new Date(log.timestamp).toLocaleTimeString()}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-semibold text-gray-900">{log.actorName}</span>
                                                <span className={`inline-flex w-fit px-2 py-0.5 rounded-full text-[10px] font-bold border mt-1 ${ROLE_COLORS[log.actorRole] || 'bg-gray-100 text-gray-600'}`}>
                                                    {log.actorRole}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-sm font-medium text-gray-900">{log.actionType}</span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-700">{log.targetType}</div>
                                            <div className="text-xs text-gray-400 font-mono">{log.targetId}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-sm text-gray-600 max-w-xs truncate" title={log.details}>
                                                {log.details || '-'}
                                            </p>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                                        <div className="flex flex-col items-center gap-2">
                                            <Info className="h-8 w-8 text-gray-300" />
                                            <p>No audit logs found matching your criteria.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                    <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
                        <div className="text-sm text-gray-500">
                            Showing <span className="font-medium">{(pagination.page - 1) * pagination.limit + 1}</span> to{' '}
                            <span className="font-medium text-gray-700">
                                {Math.min(pagination.page * pagination.limit, pagination.total)}
                            </span> of{' '}
                            <span className="font-medium text-gray-700">{pagination.total}</span> logs
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => handlePageChange(pagination.page - 1)}
                                disabled={pagination.page === 1 || loading}
                                className="p-2 border border-gray-200 rounded-lg hover:bg-white disabled:opacity-50 transition-all shadow-sm"
                            >
                                <ChevronLeft className="h-5 w-5" />
                            </button>
                            <div className="flex gap-1">
                                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                                    let pageNum;
                                    if (pagination.totalPages <= 5) pageNum = i + 1;
                                    else if (pagination.page <= 3) pageNum = i + 1;
                                    else if (pagination.page >= pagination.totalPages - 2) pageNum = pagination.totalPages - 4 + i;
                                    else pageNum = pagination.page - 2 + i;

                                    return (
                                        <button
                                            key={pageNum}
                                            onClick={() => handlePageChange(pageNum)}
                                            className={`w-10 h-10 rounded-lg text-sm font-medium transition-all ${pagination.page === pageNum
                                                    ? 'bg-violet-600 text-white shadow-md'
                                                    : 'bg-white border border-gray-200 text-gray-600 hover:border-violet-500 hover:text-violet-600'
                                                }`}
                                        >
                                            {pageNum}
                                        </button>
                                    );
                                })}
                            </div>
                            <button
                                onClick={() => handlePageChange(pagination.page + 1)}
                                disabled={pagination.page === pagination.totalPages || loading}
                                className="p-2 border border-gray-200 rounded-lg hover:bg-white disabled:opacity-50 transition-all shadow-sm"
                            >
                                <ChevronRight className="h-5 w-5" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
