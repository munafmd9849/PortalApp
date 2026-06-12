const BLOCKED_STATUSES = new Set([
  'SELECTED',
  'OFFERED',
  'ACCEPTED',
  'REJECTED',
  'WITHDRAWN',
  'REVOKED_BY_ADMIN',
]);

const BLOCKED_SCREENING = new Set([
  'RESUME_SELECTED',
  'SCREENING_SELECTED',
  'TEST_SELECTED',
  'INTERVIEW_ELIGIBLE',
  'SCREENING_REJECTED',
  'TEST_REJECTED',
  'REJECTED',
]);

function upper(value) {
  return String(value || '').trim().toUpperCase();
}

export function canStudentWithdrawApplication(application) {
  if (!application) {
    return { allowed: false, reason: 'Application not found' };
  }

  const status = upper(application.status);
  if (BLOCKED_STATUSES.has(status)) {
    if (status === 'WITHDRAWN') {
      return { allowed: false, reason: 'Application is already withdrawn' };
    }
    return { allowed: false, reason: 'This application can no longer be withdrawn' };
  }

  const screening = upper(application.screeningStatus);
  if (screening && screening !== 'APPLIED' && BLOCKED_SCREENING.has(screening)) {
    return { allowed: false, reason: 'Cannot withdraw after screening or shortlisting has started' };
  }

  const interviewStatus = upper(application.interviewStatus);
  if (interviewStatus && interviewStatus !== 'APPLIED' && interviewStatus !== 'PENDING') {
    return { allowed: false, reason: 'Cannot withdraw after interview process has started' };
  }

  if (application.interviewDate) {
    return { allowed: false, reason: 'Cannot withdraw after an interview has been scheduled' };
  }

  if ((application.lastRoundReached || 0) > 0) {
    return { allowed: false, reason: 'Cannot withdraw after interview rounds have started' };
  }

  return { allowed: true };
}

export function isActiveApplication(application) {
  const status = upper(application?.status);
  return status !== 'WITHDRAWN' && status !== 'REVOKED_BY_ADMIN';
}
