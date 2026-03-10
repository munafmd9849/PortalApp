/**
 * Browser Console Script to Update Job Dates
 * 
 * INSTRUCTIONS:
 * 1. Open the admin dashboard in your browser
 * 2. Open browser console (F12 or Cmd+Option+I)
 * 3. Copy and paste this entire script
 * 4. Press Enter to run
 * 
 * This will:
 * - Find the "Backend Engineer" job at "fvfueidd" company
 * - Update application deadline to 20/01/2026 23:59:59
 * - Update drive date to 21/01/2026 23:59:59
 */

(async function() {
  try {
    // Configuration
    const JOB_TITLE = 'Backend Engineer';
    const COMPANY_NAME = 'fvfueidd';
    const APPLICATION_DEADLINE = new Date('2026-01-20T23:59:59.000Z').toISOString();
    const DRIVE_DATE = new Date('2026-01-21T23:59:59.000Z').toISOString();

    console.log('🔍 Searching for job...');
    console.log(`   Title: "${JOB_TITLE}"`);
    console.log(`   Company: "${COMPANY_NAME}"\n`);

    // Get auth token
    const token = localStorage.getItem('accessToken');
    if (!token) {
      console.error('❌ Error: Not logged in. Please log in as admin first.');
      return;
    }

    // Get API base URL from config (if available) or use default
    let API_BASE_URL;
    try {
      // Try to import from config (if in dev mode)
      const config = await import('/src/config/api.js');
      API_BASE_URL = config.API_BASE_URL;
    } catch (e) {
      // Fallback to environment variable or default
      API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || 'http://localhost:3000/api';
    }

    console.log(`📡 API URL: ${API_BASE_URL}\n`);

    // Fetch all jobs
    const jobsResponse = await fetch(`${API_BASE_URL}/jobs`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      credentials: 'include',
    });

    if (!jobsResponse.ok) {
      const errorText = await jobsResponse.text();
      throw new Error(`Failed to fetch jobs: ${jobsResponse.status} ${jobsResponse.statusText}\n${errorText}`);
    }

    const jobsData = await jobsResponse.json();
    const jobs = Array.isArray(jobsData?.jobs) ? jobsData.jobs : (Array.isArray(jobsData) ? jobsData : []);

    console.log(`📋 Found ${jobs.length} total jobs\n`);

    // Find matching job
    const matchingJob = jobs.find(job => {
      const titleMatch = job.jobTitle?.toLowerCase().includes(JOB_TITLE.toLowerCase());
      const companyMatch = job.companyName?.toLowerCase().includes(COMPANY_NAME.toLowerCase()) ||
                          job.company?.name?.toLowerCase().includes(COMPANY_NAME.toLowerCase());
      return titleMatch && companyMatch;
    });

    if (!matchingJob) {
      console.error('❌ Job not found!');
      console.log('\nAvailable jobs:');
      jobs.slice(0, 10).forEach(job => {
        console.log(`   - ${job.jobTitle} at ${job.companyName || job.company?.name || 'Unknown'}`);
      });
      return;
    }

    console.log('✅ Found matching job:');
    console.log(`   ID: ${matchingJob.id}`);
    console.log(`   Title: ${matchingJob.jobTitle}`);
    console.log(`   Company: ${matchingJob.companyName || matchingJob.company?.name}`);
    console.log(`   Current Application Deadline: ${matchingJob.applicationDeadline || 'Not set'}`);
    console.log(`   Current Drive Date: ${matchingJob.driveDate || 'Not set'}\n`);

    console.log('📅 Updating dates:');
    console.log(`   New Application Deadline: ${APPLICATION_DEADLINE} (20/01/2026 23:59:59)`);
    console.log(`   New Drive Date: ${DRIVE_DATE} (21/01/2026 23:59:59)\n`);

    // Confirm update
    const confirmed = confirm(
      `Update job "${matchingJob.jobTitle}" at "${matchingJob.companyName || matchingJob.company?.name}"?\n\n` +
      `Application Deadline: 20/01/2026 23:59:59\n` +
      `Drive Date: 21/01/2026 23:59:59\n\n` +
      `Click OK to proceed.`
    );

    if (!confirmed) {
      console.log('❌ Update cancelled by user');
      return;
    }

    // Update the job
    const updateResponse = await fetch(`${API_BASE_URL}/jobs/${matchingJob.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      credentials: 'include',
      body: JSON.stringify({
        applicationDeadline: APPLICATION_DEADLINE,
        driveDate: DRIVE_DATE,
      }),
    });

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      throw new Error(`Failed to update job: ${updateResponse.status} ${updateResponse.statusText}\n${errorText}`);
    }

    const updatedJob = await updateResponse.json();
    const job = updatedJob?.data || updatedJob;

    console.log('✅ Job updated successfully!');
    console.log(`   Updated Application Deadline: ${job.applicationDeadline}`);
    console.log(`   Updated Drive Date: ${job.driveDate}\n`);

    console.log('🎉 Done! The job dates have been updated.');
    console.log('   You can now start the interview session on 21/01/2026.');
    console.log('   Refresh the page to see the updated dates.');

    // Trigger page refresh event
    window.dispatchEvent(new CustomEvent('jobsRefresh', {
      detail: {
        action: 'update',
        jobId: matchingJob.id,
        jobTitle: matchingJob.jobTitle
      }
    }));

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
  }
})();
