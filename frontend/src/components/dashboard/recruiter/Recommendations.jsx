import React, { useState, useEffect } from 'react';
import { ImEye } from 'react-icons/im';
import { FaSearch, FaFilter, FaUser, FaEnvelope, FaPhone, FaGraduationCap, FaMapMarkerAlt, FaCalendarAlt, FaIdCard, FaTimes, FaCheckCircle } from 'react-icons/fa';
import { Loader } from 'lucide-react';
import { getAllStudents, getEducationalBackground, getStudentSkills } from '../../../services/students';
import api from '../../../services/api';

const StudentDetailsModal = ({ isOpen, onClose, student }) => {
  const [detailedStudent, setDetailedStudent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold text-gray-800">Student Profile</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-md text-gray-400 hover:text-gray-600 transition-colors"
          >
            <FaTimes size={20} />
          </button>
        </div>

        <div className="p-6">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader className="h-6 w-6 animate-spin text-blue-600 mr-2" />
              <span className="text-gray-600">Loading student details...</span>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-red-600">{error}</p>
              <button
                onClick={fetchDetailedStudentData}
                className="mt-2 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
              >
                Retry
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <FaUser className="mr-2 text-blue-600" />
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

            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <FaGraduationCap className="mr-2 text-green-600" />
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

            {studentData.education && studentData.education.length > 0 && (
              <div className="bg-gray-50 p-4 rounded-lg md:col-span-2">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <FaGraduationCap className="mr-2 text-purple-600" />
                  Educational Background
                </h3>
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
                    </div>
                  ))}
                </div>
              </div>
            )}

            {studentData.skills && studentData.skills.length > 0 && (
              <div className="bg-gray-50 p-4 rounded-lg md:col-span-2">
                <h3 className="text-lg font-semibold mb-4">Skills & Expertise</h3>
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
                              className={`text-sm ${star <= (skill.rating || 0) ? 'text-yellow-500' : 'text-gray-300'}`}
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
              </div>
            )}
          </div>
        </div>

        <div className="border-t p-4 bg-gray-50">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const Recommendations = () => {
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all', 'recommended', 'applied'

  useEffect(() => {
    loadStudents();
  }, []);

  useEffect(() => {
    filterStudents();
  }, [searchTerm, filterType, students]);

  const loadStudents = async () => {
    try {
      setLoading(true);
      setError(null);

      // No recommendations endpoint available yet.
      setStudents([]);
      setFilteredStudents([]);
    } catch (err) {
      console.error('Error loading students:', err);
      setError(err.message || 'Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  const filterStudents = () => {
    let filtered = [...students];

    // Filter by type
    if (filterType === 'recommended') {
      filtered = filtered.filter(s => s.source === 'recommended');
    } else if (filterType === 'applied') {
      filtered = filtered.filter(s => s.source === 'applied');
    }

    // Filter by search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(s =>
        s.fullName?.toLowerCase().includes(searchLower) ||
        s.email?.toLowerCase().includes(searchLower) ||
        s.enrollmentId?.toLowerCase().includes(searchLower) ||
        s.school?.toLowerCase().includes(searchLower) ||
        s.center?.toLowerCase().includes(searchLower)
      );
    }

    setFilteredStudents(filtered);
  };

  const handleViewProfile = (student) => {
    setSelectedStudent(student);
    setShowModal(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader className="h-6 w-6 animate-spin text-blue-600 mr-2" />
        <span className="text-gray-600">Loading recommendations...</span>
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

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Student Recommendations</h2>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setFilterType('all')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  filterType === 'all' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilterType('recommended')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  filterType === 'recommended' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600'
                }`}
              >
                Recommended
              </button>
              <button
                onClick={() => setFilterType('applied')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  filterType === 'applied' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600'
                }`}
              >
                Applied
              </button>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, email, enrollment ID, school, or center..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Students Table */}
        {filteredStudents.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No students found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">School</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Center</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">CGPA</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{student.fullName}</div>
                      <div className="text-sm text-gray-500">{student.enrollmentId}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.school}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.center}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                      {student.cgpa 
                        ? (() => {
                            // Ensure CGPA is displayed with exactly 2 decimal places
                            const cgpaStr = String(student.cgpa);
                            if (/^(10\.00|[0-9]\.[0-9]{2})$/.test(cgpaStr)) {
                              return cgpaStr;
                            } else if (/^\d+$/.test(cgpaStr)) {
                              return cgpaStr + '.00';
                            } else if (/^\d+\.\d+$/.test(cgpaStr)) {
                              const parts = cgpaStr.split('.');
                              return parts[0] + '.' + parts[1].padEnd(2, '0').substring(0, 2);
                            }
                            return cgpaStr;
                          })()
                        : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {student.source === 'recommended' ? (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                          Recommended by {student.recommendedBy}
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                          Applied to {student.appliedJob}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleViewProfile(student)}
                        className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                      >
                        <ImEye className="w-4 h-4" />
                        View Profile
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Student Details Modal */}
      {showModal && selectedStudent && (
        <StudentDetailsModal
          isOpen={showModal}
          onClose={() => {
            setShowModal(false);
            setSelectedStudent(null);
          }}
          student={selectedStudent}
        />
      )}
    </div>
  );
};

export default Recommendations;

