import api from './api';

/**
 * Fetch audit logs with filters and pagination
 * @param {Object} params - Filter and pagination parameters
 */
export const getAuditLogs = async (params) => {
    try {
        const response = await api.get('/admin/audit-logs', { params });
        return response.data;
    } catch (error) {
        console.error('Error fetching audit logs:', error);
        throw error;
    }
};
