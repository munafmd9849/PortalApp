/**
 * Example: Migrated Student Dashboard Component
 * Shows how to replace Firebase calls with new API service
 * Original: src/pages/dashboard/StudentDashboard.jsx
 */

import React, { useState, useEffect } from 'react';
import api from '../services/api.js';
import { subscribeToUpdates } from '../services/socket.js';
import { useStudentProfile, useTargetedJobs, useStudentApplications, useApplyToJob } from '../hooks/useAPI.js';

export default function StudentDashboard() {
  // Use custom hooks (replaces Firebase service calls)
  const { profile, loading: profileLoading, refetch: refetchProfile } = useStudentProfile();
  const { jobs, loading: jobsLoading, refetch: refetchJobs } = useTargetedJobs();
  const { applications, loading: applicationsLoading } = useStudentApplications();
  const { applyToJob, applying } = useApplyToJob();

  // State management (same as before)
  const [activeTab, setActiveTab] = useState('dashboard');

  // Real-time subscriptions
  useEffect(() => {
    // Subscribe to real-time updates
    const unsubscribe = subscribeToUpdates({
      onApplicationCreated: (application) => {
        // Application created - refresh list
        refetchApplications();
      },
      onApplicationUpdated: (application) => {
        // Application status updated - refresh list
        refetchApplications();
      },
      onJobPosted: (job) => {
        // New job posted - refresh jobs list
        refetchJobs();
      },
      onNotificationNew: (notification) => {
        // New notification received
        console.log('New notification:', notification);
      },
    });

    return unsubscribe;
  }, []);

  // Apply to job handler (replaces handleApplyToJob)
  const handleApplyToJob = async (job) => {
    try {
      await applyToJob(job.id);
      // Success - real-time update will handle UI refresh
    } catch (error) {
      console.error('Failed to apply:', error);
      alert('Failed to apply to job. Please try again.');
    }
  };

  // Save profile handler (replaces handleSaveProfile)
  const handleSaveProfile = async (profileData) => {
    try {
      await api.updateStudentProfile(profileData);
      // Success - refresh profile
      await refetchProfile();
      alert('Profile updated successfully');
    } catch (error) {
      console.error('Failed to save profile:', error);
      alert('Failed to save profile. Please try again.');
    }
  };

  // Upload resume handler (replaces resume upload logic)
  const handleResumeUpload = async (file) => {
    try {
      const result = await api.uploadResume(file, (progress) => {
        console.log(`Upload progress: ${progress}%`);
      });
      
      // Update profile with resume URL
      await refetchProfile();
      return result;
    } catch (error) {
      console.error('Failed to upload resume:', error);
      throw error;
    }
  };

  // Check if applied (replaces hasApplied)
  const hasApplied = (jobId) => {
    return applications.some(app => app.jobId === jobId);
  };

  // Render component (same structure as before)
  return (
    <div className="dashboard">
      {/* Your existing UI components */}
      {/* Only API calls have changed, UI remains identical */}
    </div>
  );
}

/**
 * BEFORE (Firebase):
 * 
 * import { getStudentProfile, updateCompleteStudentProfile } from '../services/students';
 * import { subscribeJobs, applyToJob } from '../services/jobs';
 * import { subscribeStudentApplications } from '../services/applications';
 * 
 * const profile = await getStudentProfile(userId);
 * const unsubscribe = subscribeJobs(onChange);
 * 
 * AFTER (New API):
 * 
 * import api from '../services/api.js';
 * import { subscribeToUpdates } from '../services/socket.js';
 * 
 * const profile = await api.getStudentProfile();
 * subscribeToUpdates({ onJobPosted: (job) => {...} });
 */
