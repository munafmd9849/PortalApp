/**
 * SIMPLE BROWSER CONSOLE SCRIPT
 * 
 * Copy and paste this entire code into your browser console while on the admin dashboard
 * Make sure you're logged in as admin first!
 */

(async () => {
  const token = localStorage.getItem('accessToken');
  if (!token) {
    alert('Please log in as admin first!');
    return;
  }

  const API_BASE_URL = 'http://localhost:3000/api';
  
  // Find job
  const jobsRes = await fetch(`${API_BASE_URL}/jobs`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const jobs = await jobsRes.json();
  const jobList = Array.isArray(jobs?.jobs) ? jobs.jobs : (Array.isArray(jobs) ? jobs : []);
  
  const job = jobList.find(j => 
    j.jobTitle?.toLowerCase().includes('backend engineer') && 
    (j.companyName?.toLowerCase().includes('fvfueidd') || j.company?.name?.toLowerCase().includes('fvfueidd'))
  );
  
  if (!job) {
    console.error('Job not found!');
    return;
  }
  
  console.log('Found job:', job.jobTitle, 'at', job.companyName || job.company?.name);
  
  // Update dates: 20/01/2026 23:59:59 and 21/01/2026 23:59:59
  const updateRes = await fetch(`${API_BASE_URL}/jobs/${job.id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      applicationDeadline: new Date('2026-01-20T23:59:59.000Z').toISOString(),
      driveDate: new Date('2026-01-21T23:59:59.000Z').toISOString()
    })
  });
  
  if (updateRes.ok) {
    console.log('✅ Job dates updated successfully!');
    console.log('Application Deadline: 20/01/2026 23:59:59');
    console.log('Drive Date: 21/01/2026 23:59:59');
    alert('Job dates updated! Refresh the page to see changes.');
    window.location.reload();
  } else {
    const error = await updateRes.text();
    console.error('Failed:', error);
    alert('Failed to update: ' + error);
  }
})();
