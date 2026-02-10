import React, { useState, useEffect } from 'react';
import { FaTimes, FaUser, FaEnvelope, FaPhone, FaGraduationCap, FaMapMarkerAlt, FaCalendarAlt, FaIdCard } from 'react-icons/fa';
import { Loader } from 'lucide-react';
import { getEducationalBackground, getStudentSkills } from '../../services/students';

const StudentDetailsModal = ({ isOpen, onClose, student }) => {
  const [detailedStudent, setDetailedStudent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch detailed student data when modal opens
  useEffect(() => {
    if (isOpen && student?.id) {
      fetchDetailedStudentData();
    }
  }, [isOpen, student?.id]);

  const fetchDetailedStudentData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [educationData, skillsData] = await Promise.all([
        getEducationalBackground(student.id),
        getStudentSkills(student.id)
      ]);

      setDetailedStudent({
        ...student,
        education: educationData.sort((a, b) => new Date(b.endYear || '9999') - new Date(a.endYear || '9999')),
        skills: skillsData.sort((a, b) => (b.rating || 0) - (a.rating || 0))
      });

    } catch (err) {
      console.error('Error fetching detailed student data:', err);
      setError('Failed to load student details');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !student) return null;

  const studentData = detailedStudent || student;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between p-6 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <FaUser className="text-blue-200" />
            Student Details
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/20 transition-all duration-200"
          >
            <FaTimes size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 bg-gray-50">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center">
                <Loader className="h-8 w-8 animate-spin text-blue-600 mb-3" />
                <span className="text-gray-600 font-medium">Loading student details...</span>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-gradient-to-r from-red-50 to-rose-50 border-2 border-red-200 rounded-xl p-6 mb-6 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-red-700 font-semibold mb-2">{error}</p>
                  <button
                    onClick={fetchDetailedStudentData}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors shadow-md"
                  >
                    Retry
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Personal Information */}
            <div className="bg-white p-5 rounded-xl shadow-md border border-gray-100">
              <h3 className="text-lg font-bold mb-4 flex items-center text-gray-800">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mr-3">
                  <FaUser className="text-white" />
                </div>
                Personal Information
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-500">Full Name</label>
                  <p className="text-gray-800">{studentData.fullName || studentData.email || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Email</label>
                  <p className="text-gray-800 flex items-center">
                    <FaEnvelope className="mr-2 text-gray-400" size={14} />
                    {studentData.email || 'N/A'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Phone</label>
                  <p className="text-gray-800 flex items-center">
                    <FaPhone className="mr-2 text-gray-400" size={14} />
                    {studentData.phone || 'N/A'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Enrollment ID</label>
                  <p className="text-gray-800 flex items-center">
                    <FaIdCard className="mr-2 text-gray-400" size={14} />
                    {studentData.enrollmentId || 'N/A'}
                  </p>
                </div>
              </div>
            </div>

            {/* Academic Information */}
            <div className="bg-white p-5 rounded-xl shadow-md border border-gray-100">
              <h3 className="text-lg font-bold mb-4 flex items-center text-gray-800">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center mr-3">
                  <FaGraduationCap className="text-white" />
                </div>
                Academic Information
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-500">School</label>
                  <p className="text-gray-800">{studentData.school || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Center</label>
                  <p className="text-gray-800 flex items-center">
                    <FaMapMarkerAlt className="mr-2 text-gray-400" size={14} />
                    {studentData.center || 'N/A'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">CGPA</label>
                  <p className="text-gray-800">
                    {studentData.cgpa 
                      ? (() => {
                          // Ensure CGPA is displayed with exactly 2 decimal places
                          const cgpaStr = String(studentData.cgpa);
                          if (cgpaStr.includes('.')) {
                            const parts = cgpaStr.split('.');
                            return parts[0] + '.' + (parts[1] || '').padEnd(2, '0').substring(0, 2);
                          }
                          return cgpaStr + '.00';
                        })()
                      : 'N/A'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Batch</label>
                  <p className="text-gray-800 flex items-center">
                    <FaCalendarAlt className="mr-2 text-gray-400" size={14} />
                    {studentData.batch || 'N/A'}
                  </p>
                </div>
              </div>
            </div>

            {/* Additional Information */}
            <div className="bg-white p-5 rounded-xl shadow-md border border-gray-100">
              <h3 className="text-lg font-bold mb-4 text-gray-800">Additional Information</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-500">Status</label>
                  <p className="text-gray-800">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${studentData.status === 'Active' ? 'bg-green-100 text-green-800' :
                        studentData.status === 'Blocked' ? 'bg-red-200 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                      }`}>
                      {studentData.status || 'Active'}
                    </span>
                  </p>
                  {studentData.blockDetails && (
                    <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
                      <p className="text-xs text-red-600">
                        <strong>Blocked:</strong> {studentData.blockDetails.reason}
                      </p>
                      {studentData.blockDetails.notes && (
                        <p className="text-xs text-red-600 mt-1">{studentData.blockDetails.notes}</p>
                      )}
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Bio</label>
                  <p className="text-gray-800">{studentData.bio || 'No bio available'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Tagline</label>
                  <p className="text-gray-800">{studentData.tagline || 'No tagline available'}</p>
                </div>
              </div>
            </div>

            {/* Statistics */}
            <div className="bg-white p-5 rounded-xl shadow-md border border-gray-100">
              <h3 className="text-lg font-bold mb-4 text-gray-800">Application Statistics</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200">
                  <div className="text-3xl font-bold text-blue-600 mb-1">{student.stats?.applied || 0}</div>
                  <div className="text-sm font-medium text-blue-700">Applied</div>
                </div>
                <div className="text-center p-4 bg-gradient-to-br from-yellow-50 to-amber-100 rounded-lg border border-yellow-200">
                  <div className="text-3xl font-bold text-yellow-600 mb-1">{student.stats?.shortlisted || 0}</div>
                  <div className="text-sm font-medium text-yellow-700">Shortlisted</div>
                </div>
                <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg border border-purple-200">
                  <div className="text-3xl font-bold text-purple-600 mb-1">{student.stats?.interviewed || 0}</div>
                  <div className="text-sm font-medium text-purple-700">Interviewed</div>
                </div>
                <div className="text-center p-4 bg-gradient-to-br from-green-50 to-emerald-100 rounded-lg border border-green-200">
                  <div className="text-3xl font-bold text-green-600 mb-1">{studentData.stats?.offers || 0}</div>
                  <div className="text-sm font-medium text-green-700">Offers</div>
                </div>
              </div>
            </div>

            {/* Educational Background */}
            <div className="bg-white p-5 rounded-xl shadow-md border border-gray-100 md:col-span-2">
              <h3 className="text-lg font-bold mb-4 flex items-center text-gray-800">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center mr-3">
                  <FaGraduationCap className="text-white" />
                </div>
                Educational Background
              </h3>
              {studentData.education && studentData.education.length > 0 ? (
                <div className="space-y-3">
                  {studentData.education.map((edu, index) => (
                    <div key={index} className="border-l-4 border-purple-500 pl-4 py-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold text-gray-800">{edu.degree || 'N/A'}</p>
                          <p className="text-gray-600">{edu.institution || 'N/A'}</p>
                          <p className="text-sm text-gray-500">
                            {edu.fieldOfStudy && `${edu.fieldOfStudy} • `}
                            {edu.startYear || 'N/A'} - {edu.endYear || 'Present'}
                          </p>
                        </div>
                        {edu.gpa && (
                          <div className="text-right">
                            <p className="text-sm font-semibold text-gray-700">GPA: {edu.gpa}</p>
                          </div>
                        )}
                      </div>
                      {edu.description && (
                        <p className="text-sm text-gray-600 mt-2">{edu.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">No educational background information available</p>
              )}
            </div>

            {/* Skills */}
            <div className="bg-white p-5 rounded-xl shadow-md border border-gray-100 md:col-span-2">
              <h3 className="text-lg font-bold mb-4 text-gray-800">Skills & Expertise</h3>
              {studentData.skills && studentData.skills.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {studentData.skills.map((skill, index) => (
                    <div key={index} className="flex items-center justify-between bg-white p-3 rounded border">
                      <span className="font-medium text-gray-800">{skill.skillName}</span>
                      <div className="flex items-center">
                        <span className="text-sm text-gray-600 mr-2">Rating:</span>
                        <div className="flex items-center">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <span
                              key={star}
                              className={`text-sm ${star <= (skill.rating || 0) ? 'text-yellow-500' : 'text-gray-300'
                                }`}
                            >
                              ★
                            </span>
                          ))}
                          <span className="ml-1 text-xs text-gray-600">({skill.rating || 0}/5)</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">No skills information available</p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-6 bg-gray-50">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-lg hover:from-gray-700 hover:to-gray-800 transition-all duration-200 font-semibold shadow-md hover:shadow-lg"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDetailsModal;








