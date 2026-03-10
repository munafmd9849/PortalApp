/**
 * Script to update job application deadline and drive date
 * Usage: node scripts/updateJobDates.js
 * 
 * This script finds a job by title and company, then updates its dates.
 * Make sure to set VITE_API_BASE_URL environment variable or update the URL below.
 */

import fetch from 'node-fetch';

// Backend URL - update this if needed
const API_BASE_URL = process.env.VITE_API_BASE_URL || process.env.API_BASE_URL || 'http://localhost:3000/api';

// Job search criteria
const JOB_TITLE = 'Backend Engineer';
const COMPANY_NAME = 'fvfueidd'; // Partial match

// New dates (in ISO format)
// Application deadline: 20/01/2026 23:59:59
const APPLICATION_DEADLINE = new Date('2026-01-20T23:59:59.000Z').toISOString();
// Drive date: 21/01/2026 23:59:59 (end of day)
const DRIVE_DATE = new Date('2026-01-21T23:59:59.000Z').toISOString();

// Get auth token from environment or prompt
const AUTH_TOKEN = process.env.AUTH_TOKEN || process.env.ACCESS_TOKEN;

async function findAndUpdateJob() {
  try {
    console.log('🔍 Searching for job...');
    console.log(`   Title: "${JOB_TITLE}"`);
    console.log(`   Company: "${COMPANY_NAME}"`);
    console.log(`   API URL: ${API_BASE_URL}\n`);

    if (!AUTH_TOKEN) {
      console.error('❌ Error: AUTH_TOKEN or ACCESS_TOKEN environment variable is required');
      console.error('   Set it with: export AUTH_TOKEN=your_token_here');
      process.exit(1);
    }

    // Fetch all jobs
    const jobsResponse = await fetch(`${API_BASE_URL}/jobs`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AUTH_TOKEN}`,
      },
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
      process.exit(1);
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

    // Update the job
    const updateResponse = await fetch(`${API_BASE_URL}/jobs/${matchingJob.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AUTH_TOKEN}`,
      },
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

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Run the script
findAndUpdateJob();
