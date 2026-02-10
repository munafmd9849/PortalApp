import React, { useState } from 'react';
import { Doughnut, Bar, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { 
  FaFileAlt, FaCheckCircle, FaBullseye, FaPauseCircle, FaTimesCircle,
  FaEye, FaBookmark, FaRegBookmark, FaCalendar, FaHourglassHalf, FaCheck,
  FaGraduationCap, FaBriefcase, FaProjectDiagram, FaEnvelope, FaPhone, FaMapMarkerAlt,
  FaUser, FaChartLine, FaBell, FaSearch, FaFilter, FaCog, FaQuestionCircle
} from 'react-icons/fa';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const RecruiterDashboard = () => {
  const [timeFilter, setTimeFilter] = useState('Y-23');
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [bookmarkedCandidates, setBookmarkedCandidates] = useState(new Set());
  
  // Stats data with icons
  const statsData = [
    { label: 'Applications', value: 245, trend: 12, color: 'from-violet-300 to-violet-400', icon: <FaFileAlt className="text-white" /> },
    { label: 'Shortlisted', value: 98, trend: 8, color: 'from-cyan-300 to-cyan-400', icon: <FaCheckCircle className="text-white" /> },
    { label: 'Offers Rolled', value: 42, trend: 5, color: 'from-amber-300 to-amber-400', icon: <FaBullseye className="text-white" /> },
    { label: 'On-hold', value: 35, trend: -2, color: 'from-orange-300 to-orange-400', icon: <FaPauseCircle className="text-white" /> },
    { label: 'Rejected', value: 70, trend: -5, color: 'from-rose-300 to-rose-400', icon: <FaTimesCircle className="text-white" /> },
  ];

  // Pipeline data
  const pipelineData = {
    labels: ['Applications', 'Shortlisted', 'On-hold', 'Rejected'],
    data: [245, 98, 35, 70],
    percentages: [100, 40, 14.3, 28.6],
    colors: [
      'bg-gradient-to-r from-violet-300 to-violet-400',
      'bg-gradient-to-r from-cyan-300 to-cyan-400',
      'bg-gradient-to-r from-orange-300 to-orange-400',
      'bg-gradient-to-r from-rose-300 to-rose-400'
    ],
  };

  // Candidate data
  const candidates = [
    {
      id: 1,
      name: 'Iffa Naaz',
      school: 'SOM',
      skills: ['Business Analytics', 'Python', 'Canva'],
      experience: '2 years',
      status: 'Available',
      profile: {
        email: 'iffanaaz@pwioi.com',
        phone: '+91 9876543210',
        location: 'Mumbai, India',
        education: 'BBA Manipal - PW IOI (2024)',
        experience: [
          { role: 'XYZ', company: 'pqy', duration: '2022-Present' }
        ],
        projects: [
          { name: 'E-commerce Platform', description: 'Built a full-stack e-commerce application' }
        ]
      }
    },
    {
      id: 2,
      name: 'Harshika Malhotra',
      school: 'SOT',
      skills: ['Python', 'ML', 'Data Analysis','JAVA', 'Problem Solving'],
      experience: '1.5 years',
      status: 'Available',
      profile: {
        email: 'harshika@example.com',
        phone: '+91 9876543211',
        location: 'Bangalore, India',
        education: 'IIT Madras - PW IOI (2023)',
        experience: [
          { role: 'Data Analyst', company: 'Data Insights Inc', duration: '2021-Present' }
        ],
        projects: [
          { name: 'Predictive Analysis Model', description: 'Developed ML model for sales forecasting' }
        ]
      }
    },
    {
      id: 3,
      name: 'Someone',
      school: 'SOH',
      skills: ['BP Check', 'Anesthesia specialist', 'Excel'],
      experience: '3 years',
      status: 'Interviewing',
      profile: {
        email: 'someone@example.com',
        phone: '+91 9876543212',
        location: 'Delhi, India',
        education: 'Health University - PW IOI (2022)',
        experience: [
          { role: 'Finance Associate', company: 'Global Finance Corp', duration: '2019-Present' }
        ],
        projects: [
          { name: 'Financial Reporting System', description: 'Automated financial reports generation' }
        ]
      }
    },
  ];

  // Application status notifications
  const notifications = [
    {
      id: 1,
      type: 'application_update',
      title: 'Application Status Update',
      text: 'Your application for Software Developer position has been floated to the hiring team.',
      time: '2 hours ago',
      status: 'floated'
    },
    {
      id: 2,
      type: 'application_update',
      title: 'Application Status Update',
      text: 'Your application for Data Analyst position is currently under review.',
      time: '1 day ago',
      status: 'under_review'
    },
    {
      id: 3,
      type: 'application_update',
      title: 'Application Status Update',
      text: 'Your application for Finance Manager position has been rejected.',
      time: '3 days ago',
      status: 'rejected'
    }
  ];

  // Different chart data based on time filter
  const getChartData = (filter) => {
    if (filter === 'Y-23') {
      return {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        datasets: [
          {
            label: 'Applications',
            data: [45, 52, 38, 60, 55, 30, 15],
            borderColor: 'rgb(167, 139, 250)',
            backgroundColor: 'rgba(167, 139, 250, 0.1)',
            tension: 0.3,
            fill: true,
          },
          {
            label: 'Shortlists',
            data: [18, 25, 20, 28, 22, 15, 8],
            borderColor: 'rgb(103, 232, 249)',
            backgroundColor: 'rgba(103, 232, 249, 0.1)',
            tension: 0.3,
            fill: true,
          },
          {
            label: 'Offers',
            data: [8, 12, 10, 15, 13, 7, 3],
            borderColor: 'rgb(253, 230, 138)',
            backgroundColor: 'rgba(253, 230, 138, 0.1)',
            tension: 0.3,
            fill: true,
          },
        ],
      };
    } else if (filter === 'Y-24') {
      return {
        labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
        datasets: [
          {
            label: 'Applications',
            data: [165, 159, 180, 181],
            borderColor: 'rgb(167, 139, 250)',
            backgroundColor: 'rgba(167, 139, 250, 0.1)',
            tension: 0.3,
            fill: true,
          },
          {
            label: 'Shortlists',
            data: [68, 78, 85, 90],
            borderColor: 'rgb(103, 232, 249)',
            backgroundColor: 'rgba(103, 232, 249, 0.1)',
            tension: 0.3,
            fill: true,
          },
          {
            label: 'Offers',
            data: [28, 32, 38, 42],
            borderColor: 'rgb(253, 230, 138)',
            backgroundColor: 'rgba(253, 230, 138, 0.1)',
            tension: 0.3,
            fill: true,
          },
        ],
      };
    } else { // 6m
      return {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        datasets: [
          {
            label: 'Applications',
            data: [265, 259, 280, 281, 256, 272],
            borderColor: 'rgb(167, 139, 250)',
            backgroundColor: 'rgba(167, 139, 250, 0.1)',
            tension: 0.3,
            fill: true,
          },
          {
            label: 'Shortlists',
            data: [108, 118, 125, 130, 115, 120],
            borderColor: 'rgb(103, 232, 249)',
            backgroundColor: 'rgba(103, 232, 249, 0.1)',
            tension: 0.3,
            fill: true,
          },
          {
            label: 'Offers',
            data: [42, 48, 52, 55, 50, 58],
            borderColor: 'rgb(253, 230, 138)',
            backgroundColor: 'rgba(253, 230, 138, 0.1)',
            tension: 0.3,
            fill: true,
          },
        ],
      };
    }
  };

  const pipelineChartData = getChartData(timeFilter);

  // Doughnut chart data
  const doughnutData = {
    labels: ['SOM', 'SOT', 'SOH'],
    datasets: [
      {
        data: [45, 30, 25],
        backgroundColor: [
          'rgba(167, 139, 250, 0.8)',
          'rgba(103, 232, 249, 0.8)',
          'rgba(253, 230, 138, 0.8)',
        ],
        borderWidth: 0,
      },
    ],
  };

  // Function to view candidate profile
  const viewProfile = (candidate) => {
    setSelectedCandidate(candidate);
    setShowProfileModal(true);
  };

  // Function to toggle bookmark
  const toggleBookmark = (candidateId) => {
    const newBookmarks = new Set(bookmarkedCandidates);
    if (newBookmarks.has(candidateId)) {
      newBookmarks.delete(candidateId);
    } else {
      newBookmarks.add(candidateId);
    }
    setBookmarkedCandidates(newBookmarks);
  };

  // Function to get status badge color
  const getStatusBadgeColor = (status) => {
    switch(status) {
      case 'floated': return 'bg-blue-50 text-blue-600';
      case 'under_review': return 'bg-amber-50 text-amber-600';
      case 'rejected': return 'bg-rose-50 text-rose-600';
      default: return 'bg-gray-50 text-gray-600';
    }
  };

  // Function to get status text
  const getStatusText = (status) => {
    switch(status) {
      case 'floated': return 'Application Floated';
      case 'under_review': return 'Under Review';
      case 'rejected': return 'Application Rejected';
      default: return status;
    }
  };

  return (
    <div>
 
      {/* Masonry Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        
        {/* Stats Cards with Icons */}
        <div className="col-span-1 md:col-span-2 lg:col-span-3 xl:col-span-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {statsData.map((stat, index) => (
              <div key={index} className="bg-white p-5 rounded-lg shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-gray-600 font-medium text-sm">{stat.label}</h3>
                  <span className={`text-xs font-semibold ${stat.trend > 0 ? 'text-green-500' : 'text-rose-500'}`}>
                    {stat.trend > 0 ? '+' : ''}{stat.trend}%
                  </span>
                </div>
                <div className="flex items-end justify-between">
                  <span className="text-2xl font-bold text-gray-800">{stat.value}</span>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center bg-gradient-to-br ${stat.color}`}>
                    {stat.icon}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pipeline Graph - Made larger */}
        <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-100 md:col-span-2 lg:col-span-3">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-gray-800 flex items-center">
              <FaChartLine className="mr-2 text-violet-500" />
              Applications Pipeline
            </h2>
            <div className="flex space-x-2">
              {['Y-23', 'Y-24', 'Y-25'].map((period) => (
                <button
                  key={period}
                  className={`px-3 py-1 rounded-lg text-sm ${
                    timeFilter === period
                      ? 'bg-violet-100 text-violet-600'
                      : 'text-gray-500 hover:bg-gray-100'
                  }`}
                  onClick={() => setTimeFilter(period)}
                >
                  {period}
                </button>
              ))}
            </div>
          </div>
          <div className="h-80">
            <Line
              data={pipelineChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'top',
                  },
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    grid: {
                      drawBorder: false,
                    },
                  },
                  x: {
                    grid: {
                      display: false,
                    },
                  },
                },
              }}
            />
          </div>
        </div>

        {/* Acquisition Breakdown */}
        <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold text-gray-800 mb-6">Acquisition Breakdown</h2>
          <div className="space-y-5">
            {pipelineData.labels.map((label, index) => (
              <div key={index}>
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>{label}</span>
                  <span>{pipelineData.data[index]} ({pipelineData.percentages[index]}%)</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${pipelineData.colors[index]}`}
                    style={{ width: `${pipelineData.percentages[index]}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6">
            <h3 className="text-sm font-medium text-gray-600 mb-2">By School</h3>
            <div className="h-40">
              <Doughnut
                data={doughnutData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'bottom',
                    },
                  },
                  cutout: '60%',
                }}
              />
            </div>
          </div>
        </div>

        {/* Track Applications Section - Now on its own line */}
        <div className="bg-white bg-gradient-to-r from-cyan-400 via-green-100 to-green-500  p-3 rounded-lg shadow-sm border border-gray-100 md:col-span-2 lg:col-span-3 xl:col-span-4">
          <h2 className="text-lg font-bold text-gray-800 mb-6 ">Track Applications</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: 'New Applications', value: 24, color: 'from-blue-300 to-blue-400', icon: <FaFileAlt className="text-white" /> },
              { label: 'Pending Review', value: 18, color: 'from-amber-300 to-amber-400', icon: <FaHourglassHalf className="text-white" /> },
              { label: 'Interviews Scheduled', value: 9, color: 'from-emerald-300 to-emerald-400', icon: <FaCalendar className="text-white" /> },
            ].map((item, index) => (
              <div key={index} className="bg-gradient-to-br from-gray-50 to-white p-4 rounded-lg border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">{item.label}</p>
                    <p className="text-2xl font-bold text-gray-800">{item.value}</p>
                  </div>
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center bg-gradient-to-br ${item.color}`}>
                    {item.icon}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recommended Candidates Section - Made larger */}
        <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-100 md:col-span-2 lg:col-span-3">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-gray-800">Recommended Candidates</h2>
            <button className="flex items-center text-sm text-gray-500">
              <FaFilter className="mr-1" /> Filter
            </button>
          </div>
          <div className="space-y-4">
            {candidates.map((candidate) => (
              <div key={candidate.id} className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-gray-800">{candidate.name}</h3>
                    <div className="flex items-center text-sm text-gray-600 mt-1">
                      <span className="bg-violet-100 text-violet-600 px-2 py-0.5 rounded-lg mr-2">
                        {candidate.school}
                      </span>
                      <span>{candidate.experience}</span>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <span className="bg-emerald-100 text-emerald-600 text-xs px-2 py-1 rounded-lg mr-2">
                      {candidate.status}
                    </span>
                    <button 
                      className="text-gray-500 hover:text-violet-600 ml-2"
                      onClick={() => viewProfile(candidate)}
                    >
                      <FaEye className="h-5 w-5" />
                    </button>
                    <button 
                      className="text-gray-500 hover:text-amber-500 ml-2"
                      onClick={() => toggleBookmark(candidate.id)}
                    >
                      {bookmarkedCandidates.has(candidate.id) ? (
                        <FaBookmark className="h-5 w-5 text-amber-500" />
                      ) : (
                        <FaRegBookmark className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  {candidate.skills.map((skill, i) => (
                    <span
                      key={i}
                      className="bg-blue-100 text-blue-600 text-xs px-2 py-1 rounded-lg"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
                <div className="flex gap-2 mt-4">
                  <button className="text-xs bg-gradient-to-r from-violet-500 to-violet-600 text-white px-3 py-1.5 rounded-lg">
                    Shortlist
                  </button>
                  <button className="text-xs border border-gray-300 text-gray-600 px-3 py-1.5 rounded-lg">
                    Schedule Interview
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Notifications & Updates */}
        <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-gray-800 flex items-center">
              <FaBell className="mr-2 text-violet-500" />
              Application Updates
            </h2>
            <FaQuestionCircle className="text-gray-400" />
          </div>
          <div className="space-y-4">
            {notifications.map((notification) => (
              <div key={notification.id} className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                <div className="flex justify-between items-start">
                  <h3 className="font-medium text-gray-800 text-sm">{notification.title}</h3>
                  <span className="text-xs text-gray-500">{notification.time}</span>
                </div>
                <p className="text-sm text-gray-600 mt-2">{notification.text}</p>
                {notification.status && (
                  <span className={`text-xs px-2 py-1 rounded-lg mt-2 inline-block ${getStatusBadgeColor(notification.status)}`}>
                    {getStatusText(notification.status)}
                  </span>
                )}
              </div>
            ))}
          </div>
          <button className="w-full mt-4 text-center text-violet-600 text-sm font-medium py-2">
            View All Notifications
          </button>
        </div>

        {/* Interview Tracking */}
        <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold text-gray-800 mb-6">Interview Tracking</h2>
          <div className="space-y-4">
            {[
              { label: 'Upcoming Interviews', value: 5, color: 'from-amber-300 to-amber-400', icon: <FaCalendar className="text-white" /> },
              { label: 'Pending Feedback', value: 3, color: 'from-orange-300 to-orange-400', icon: <FaHourglassHalf className="text-white" /> },
              { label: 'Completed', value: 12, color: 'from-emerald-300 to-emerald-400', icon: <FaCheck className="text-white" /> },
            ].map((item, index) => (
              <div key={index} className="flex items-center">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center bg-gradient-to-br ${item.color} mr-3`}>
                  {item.icon}
                </div>
                <div>
                  <p className="text-sm text-gray-600">{item.label}</p>
                  <p className="font-bold text-gray-800">{item.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recruiter Insights */}
        <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold text-gray-800 mb-6">Your Company Insights</h2>
          <div className="p-4 bg-gradient-to-r from-cyan-50 to-cyan-100 rounded-lg mb-4">
            <p className="text-sm text-gray-600">Retention rate of PW IOI alumni</p>
            <p className="text-2xl font-bold text-cyan-600">92%</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-2">Top skills your company prefers:</p>
            <div className="flex flex-wrap gap-2">
              {['Data Science', 'Java', 'Finance'].map((skill, index) => (
                <span
                  key={index}
                  className="bg-violet-100 text-violet-600 text-xs px-2 py-1 rounded-lg"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Candidate Profile Modal */}
      {showProfileModal && selectedCandidate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-screen overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-800">{selectedCandidate.name}'s Profile</h2>
              <button 
                className="text-gray-500 hover:text-gray-700"
                onClick={() => setShowProfileModal(false)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Contact Information</h3>
                <div className="space-y-2">
                  <p className="text-gray-600 flex items-center">
                    <FaEnvelope className="mr-2 text-violet-500" />
                    {selectedCandidate.profile.email}
                  </p>
                  <p className="text-gray-600 flex items-center">
                    <FaPhone className="mr-2 text-violet-500" />
                    {selectedCandidate.profile.phone}
                  </p>
                  <p className="text-gray-600 flex items-center">
                    <FaMapMarkerAlt className="mr-2 text-violet-500" />
                    {selectedCandidate.profile.location}
                  </p>
                </div>
              </div>
              
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-2 flex items-center">
                  <FaGraduationCap className="mr-2 text-violet-500" />
                  Education
                </h3>
                <p className="text-gray-600">{selectedCandidate.profile.education}</p>
              </div>
              
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-2 flex items-center">
                  <FaBriefcase className="mr-2 text-violet-500" />
                  Experience
                </h3>
                {selectedCandidate.profile.experience.map((exp, index) => (
                  <div key={index} className="mb-2">
                    <p className="font-medium">{exp.role}</p>
                    <p className="text-gray-600">{exp.company}, {exp.duration}</p>
                  </div>
                ))}
              </div>
              
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-2 flex items-center">
                  <FaProjectDiagram className="mr-2 text-violet-500" />
                  Projects
                </h3>
                {selectedCandidate.profile.projects.map((project, index) => (
                  <div key={index} className="mb-2">
                    <p className="font-medium">{project.name}</p>
                    <p className="text-gray-600">{project.description}</p>
                  </div>
                ))}
              </div>
              
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedCandidate.skills.map((skill, index) => (
                    <span key={index} className="bg-blue-100 text-blue-600 px-3 py-1 rounded-lg text-sm">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
              <button className="px-4 py-2 border border-gray-300 text-gray-600 rounded-lg">
                Download CV
              </button>
              <button 
                className="px-4 py-2 bg-gradient-to-r from-violet-500 to-violet-600 text-white rounded-lg"
                onClick={() => setShowProfileModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecruiterDashboard;