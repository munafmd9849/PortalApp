export const DIRECTORY_EXPORT_HEADERS = [
  'Sr No',
  'Name',
  'Email',
  'Program',
  'Cohort',
  'Current Location',
  'Contact',
  'CS Status',
  'Activation',
  'Placement Status',
  'Activity Score',
  'Mock Interviews',
  'Jobs Assigned',
  'Eligible Jobs',
  'Jobs Applied',
  'Applied Closed',
  'No Shows',
  'Unapplied',
  'Readiness %',
  'Probability %',
  'Risk Flags',
  'Account Status',
];

export function mapStudentToExportRow(student) {
  return [
    student.srNo ?? '',
    student.fullName || '',
    student.email || '',
    student.program || '',
    student.cohort || student.batch || '',
    student.currentLocation || '',
    student.contactNumber || student.phone || '',
    student.csStatus?.label || '',
    student.activation?.label || '',
    student.placementStatus?.label || '',
    student.activityScore ?? '',
    student.mockInterviews ?? '',
    student.jobsAssigned ?? '',
    student.eligibleJobs ?? '',
    student.jobsApplied ?? '',
    student.appliedClosed ?? '',
    student.noShows ?? '',
    student.unapplied ?? '',
    student.placementReadiness?.score ?? '',
    student.placementProbability?.score ?? '',
    (student.riskFlags || []).map((f) => f.label).join('; '),
    student.status || '',
  ];
}

export function buildExportTabName(filters = {}) {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, '');
  const time = now.toISOString().slice(11, 16).replace(':', '');
  const parts = [`Students_${date}_${time}`];

  if (filters.status) parts.push(String(filters.status).replace(/\s+/g, ''));
  if (filters.batch) parts.push(`B${String(filters.batch).replace(/\s+/g, '')}`);
  if (filters.school) parts.push(String(filters.school).replace(/\s+/g, '').slice(0, 20));
  if (filters.center) parts.push(String(filters.center).replace(/\s+/g, '').slice(0, 15));

  return parts.join('_').slice(0, 100);
}
