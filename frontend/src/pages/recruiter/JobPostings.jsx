import React, { useState, useRef, useEffect } from 'react';
import { Calendar, Info, Plus, X, Loader, ChevronUp, ChevronDown, CheckCircle, XCircle, Pause } from 'lucide-react';
import CreateJob from '../../components/dashboard/admin/CreateJob.jsx';
import api from '../../services/api';

const ErrorBoundary = ({ children }) => {
  try {
    return children;
  } catch (error) {
    console.error('Error caught by ErrorBoundary:', error);
    return <div>An error occurred. Please try again later.</div>;
  }
};

// Sync function to update admin and student dashboards
const syncJobStatusUpdate = async (jobId, newStatus) => {
  try {
    // TODO: Replace with actual API call
    // await api.syncJobStatusUpdate(jobId, newStatus);
    
    // Dispatch custom event to notify other components
    window.dispatchEvent(new CustomEvent('jobStatusUpdated', {
      detail: { jobId, status: newStatus }
    }));
    
    console.log(`Job status synced: ${jobId} -> ${newStatus}`);
  } catch (error) {
    console.error('Error syncing job status:', error);
    throw error;
  }
};

const JobPostings = () => {
  const [activeView, setActiveView] = useState('active');
  const [updatingStatus, setUpdatingStatus] = useState({});

  // Mock data for job postings with status management
  const [jobs, setJobs] = useState([
    { id: '1', title: 'Frontend Developer', company: 'WebTech', status: 'Active', applications: 24, views: 153, datePosted: '2023-10-26' },
    { id: '2', title: 'Data Scientist', company: 'DataCorp', status: 'Active', applications: 42, views: 287, datePosted: '2023-10-25' },
    { id: '3', title: 'DevOps Engineer', company: 'Cloudify', status: 'On Hold', applications: 0, views: 15, datePosted: '2023-10-27' },
    { id: '4', title: 'Backend Developer', company: 'TechCorp', status: 'Closed', applications: 15, views: 89, datePosted: '2023-09-15' },
  ]);

  // Mock data for drafts
  const [drafts, setDrafts] = useState([
    { id: 'd1', title: 'UX Designer', company: 'DesignHub', lastModified: '2023-10-24' },
    { id: 'd2', title: 'Backend Engineer', company: 'ServerStack', lastModified: '2023-10-23' },
  ]);

  // Handle job status update
  const handleStatusUpdate = async (jobId, newStatus) => {
    try {
      setUpdatingStatus(prev => ({ ...prev, [jobId]: true }));
      
      // Update local state
      setJobs(prev => prev.map(job => 
        job.id === jobId ? { ...job, status: newStatus } : job
      ));
      
      // TODO: Replace with actual API call
      // await api.updateJobStatus(jobId, newStatus);
      
      // Sync with admin and student dashboards
      await syncJobStatusUpdate(jobId, newStatus);
      
      alert(`Job status updated to ${newStatus}. Changes have been synced to admin and student dashboards.`);
    } catch (error) {
      console.error('Error updating job status:', error);
      alert('Failed to update job status. Please try again.');
      // Revert local state on error
      setJobs(prev => prev.map(job => 
        job.id === jobId ? { ...job, status: jobs.find(j => j.id === jobId)?.status } : job
      ));
    } finally {
      setUpdatingStatus(prev => ({ ...prev, [jobId]: false }));
    }
  };

  const handleCloseJob = (jobId) => {
    handleStatusUpdate(jobId, 'Closed');
  };

  const handleCloneJob = (jobId) => {
    console.log('Cloning job:', jobId);
    alert(`Job ${jobId} cloned. You are now editing the new draft.`);
  };

  // Handler for job creation completion
  const handleJobCreated = () => {
    console.log('Job created successfully');
    setActiveView('active'); // Return to active postings view
  };

  // Render the active view based on state
  const renderActiveView = () => {
    switch (activeView) {
      case 'active':
        return (
          <ActivePostingsView 
            jobs={jobs} 
            onCloseJob={handleCloseJob} 
            onCloneJob={handleCloneJob}
            onStatusUpdate={handleStatusUpdate}
            updatingStatus={updatingStatus}
          />
        );
      case 'drafts':
        return <DraftPostingsView drafts={drafts} />;
      case 'new':
        // UPDATED: This now directly renders the CreateJob component with three creation methods inside it
        return <CreateJob onCreated={handleJobCreated} />;
      default:
        return (
          <ActivePostingsView 
            jobs={jobs} 
            onCloseJob={handleCloseJob} 
            onCloneJob={handleCloneJob}
            onStatusUpdate={handleStatusUpdate}
            updatingStatus={updatingStatus}
          />
        );
    }
  };

  return (
    <ErrorBoundary>
      <div className="p-6 bg-gray-50 min-h-screen">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Job Postings</h1>
          <button
            onClick={() => setActiveView('new')}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md"
          >
            + Post a New Job
          </button>
        </div>

        {/* Main Navigation Tabs */}
        <div className="bg-white rounded-lg p-1 shadow-sm border border-gray-200 inline-flex mb-8">
          <button
            onClick={() => setActiveView('active')}
            className={`px-6 py-3 rounded-md font-medium transition-all duration-200 ${
              activeView === 'active' ? 'bg-blue-100 text-blue-800 shadow-sm' : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Active Postings
          </button>
          <button
            onClick={() => setActiveView('drafts')}
            className={`px-6 py-3 rounded-md font-medium transition-all duration-200 ${
              activeView === 'drafts' ? 'bg-blue-100 text-blue-800 shadow-sm' : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Drafts
          </button>
          <button
            onClick={() => setActiveView('new')}
            className={`px-6 py-3 rounded-md font-medium transition-all duration-200 ${
              activeView === 'new' ? 'bg-blue-100 text-blue-800 shadow-sm' : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            + New Job
          </button>
        </div>

        {/* Render the active view */}
        {renderActiveView()}
      </div>
    </ErrorBoundary>
  );
};

// Sub-components with Job Management Panel
const ActivePostingsView = ({ jobs, onCloseJob, onCloneJob, onStatusUpdate, updatingStatus }) => {
  const [statusDropdownOpen, setStatusDropdownOpen] = useState({});

  const toggleStatusDropdown = (jobId) => {
    setStatusDropdownOpen(prev => ({
      ...prev,
      [jobId]: !prev[jobId]
    }));
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Active':
        return 'bg-green-100 text-green-800';
      case 'Closed':
        return 'bg-red-100 text-red-800';
      case 'On Hold':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="p-4 bg-blue-50 border-b border-blue-200">
        <h3 className="text-lg font-semibold text-gray-800">Job Management Panel</h3>
        <p className="text-sm text-gray-600 mt-1">Manage all your job postings and update their status</p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Job Title</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Applications</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Views</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date Posted</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {jobs.map((job) => (
              <tr key={job.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{job.title}</div>
                  <div className="text-sm text-gray-500">{job.company}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="relative">
                    <button
                      onClick={() => toggleStatusDropdown(job.id)}
                      disabled={updatingStatus[job.id]}
                      className={`px-3 py-1 inline-flex items-center text-xs leading-5 font-semibold rounded-full ${getStatusColor(job.status)} ${
                        updatingStatus[job.id] ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-80 cursor-pointer'
                      }`}
                    >
                      {updatingStatus[job.id] ? (
                        <>
                          <Loader className="w-3 h-3 mr-1 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        <>
                          {job.status}
                          <ChevronDown className="w-3 h-3 ml-1" />
                        </>
                      )}
                    </button>
                    {statusDropdownOpen[job.id] && !updatingStatus[job.id] && (
                      <div className="absolute z-10 mt-1 w-32 bg-white rounded-md shadow-lg border border-gray-200">
                        <div className="py-1">
                          {['Active', 'On Hold', 'Closed'].map((status) => (
                            <button
                              key={status}
                              onClick={() => {
                                onStatusUpdate(job.id, status);
                                setStatusDropdownOpen(prev => ({ ...prev, [job.id]: false }));
                              }}
                              className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${
                                job.status === status ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                              }`}
                            >
                              {status}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{job.applications}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{job.views}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{job.datePosted}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex items-center space-x-2">
                    <button title="View Analytics" className="text-gray-400 hover:text-blue-600 p-1 rounded hover:bg-gray-100">
                      <BarChart3Icon />
                    </button>
                    <button title="Edit" className="text-gray-400 hover:text-green-600 p-1 rounded hover:bg-gray-100">
                      <EditIcon />
                    </button>
                    <button title="Clone" onClick={() => onCloneJob(job.id)} className="text-gray-400 hover:text-purple-600 p-1 rounded hover:bg-gray-100">
                      <CopyIcon />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const DraftPostingsView = ({ drafts }) => {
  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Job Title</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Modified</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {drafts.map((draft) => (
              <tr key={draft.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{draft.title}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{draft.company}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{draft.lastModified}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex items-center space-x-2">
                    <button className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-gray-100">Edit</button>
                    <button className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-gray-100">Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Icon components (EXACTLY AS ORIGINAL)
const BarChart3Icon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

const EditIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
);

const CopyIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
);

const ArchiveIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002 2V8m-9 4h4" />
  </svg>
);

export default JobPostings;
