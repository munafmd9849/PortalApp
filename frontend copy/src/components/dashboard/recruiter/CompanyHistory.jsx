import React, { useState, useEffect } from 'react';
import { 
  FaHistory, FaCalendarAlt, FaChartLine, FaStar, FaUsers, 
  FaHandshake, FaThumbsUp, FaThumbsDown, FaCommentAlt
} from 'react-icons/fa';
import api from '../../../services/api';

const CompanyHistory = () => {
  const [historyData, setHistoryData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadCompanyHistory();
  }, []);

  const loadCompanyHistory = async () => {
    try {
      setLoading(true);
      setHistoryData(null);
    } catch (err) {
      console.error('Error loading company history:', err);
      setError(err.message || 'Failed to load company history');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">Loading company history...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-700">{error}</p>
      </div>
    );
  }

  // Don't show component if company has no past drives
  if (!historyData || !historyData.hasPastDrives) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="text-center py-8">
          <FaHistory className="mx-auto text-4xl text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">No Company History</h3>
          <p className="text-gray-500">Company history will appear here once you conduct your first drive.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-6">
          <FaHistory className="text-blue-600 text-2xl" />
          <h2 className="text-2xl font-bold text-gray-900">Company History</h2>
        </div>

        {/* Past Placements */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <FaHandshake className="text-green-600" />
            Past Placements
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Job Title</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Placement Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Package</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">School</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Center</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {historyData.pastPlacements.map((placement) => (
                  <tr key={placement.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {placement.studentName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {placement.jobTitle}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(placement.placementDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                      {placement.package}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {placement.school}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {placement.center}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Visit Dates */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <FaCalendarAlt className="text-blue-600" />
            Visit Dates
          </h3>
          <div className="space-y-3">
            {historyData.visitDates.map((visit, index) => (
              <div key={index} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{visit.type}</p>
                    <p className="text-sm text-gray-600">{visit.location}</p>
                  </div>
                  <p className="text-sm text-gray-500">
                    {new Date(visit.date).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Conversion Rates */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <FaChartLine className="text-purple-600" />
            Conversion Rates
          </h3>
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-6 border border-purple-200">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-800">{historyData.conversionRates.applications}</p>
                <p className="text-sm text-gray-600 mt-1">Applications</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{historyData.conversionRates.shortlisted}</p>
                <p className="text-sm text-gray-600 mt-1">Shortlisted</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-indigo-600">{historyData.conversionRates.interviewed}</p>
                <p className="text-sm text-gray-600 mt-1">Interviewed</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{historyData.conversionRates.offers}</p>
                <p className="text-sm text-gray-600 mt-1">Offers</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-purple-600">{historyData.conversionRates.conversionRate}%</p>
                <p className="text-sm text-gray-600 mt-1">Conversion Rate</p>
              </div>
            </div>
          </div>
        </div>

        {/* Feedback */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <FaCommentAlt className="text-orange-600" />
            Feedback
          </h3>
          <div className="space-y-4">
            {historyData.feedback.map((item) => (
              <div key={item.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium text-gray-900">{item.studentName}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(item.date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <FaStar className="text-yellow-400" />
                    <span className="font-semibold text-gray-800">{item.rating}</span>
                  </div>
                </div>
                <p className="text-sm text-gray-700 mt-2">{item.comment}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Engagement Level */}
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <FaUsers className="text-green-600" />
            Engagement Level
          </h3>
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-6 border border-green-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-3xl font-bold text-green-600">{historyData.engagementLevel.score}%</p>
                <p className="text-lg font-semibold text-gray-800 mt-1">
                  {historyData.engagementLevel.level} Engagement
                </p>
              </div>
              <div className={`w-20 h-20 rounded-full flex items-center justify-center ${
                historyData.engagementLevel.score >= 80 ? 'bg-green-500' :
                historyData.engagementLevel.score >= 60 ? 'bg-yellow-500' : 'bg-red-500'
              }`}>
                <span className="text-white text-2xl font-bold">{historyData.engagementLevel.score}</span>
              </div>
            </div>
            <p className="text-sm text-gray-600">{historyData.engagementLevel.description}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompanyHistory;

