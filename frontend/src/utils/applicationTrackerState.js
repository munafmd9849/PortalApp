/**
 * Client helpers for application tracker display (data comes from API `tracker` field).
 */

export function getApplicationPrimaryStatus(application) {
  const finalStatus = (
    application?.finalStatus
    || application?.tracker?.details?.finalStatus
    || ''
  ).toString().toUpperCase();

  if (finalStatus === 'SELECTED') {
    return { label: 'Selected', code: 'SELECTED', variant: 'success', final: true };
  }
  if (finalStatus === 'REJECTED') {
    return { label: 'Rejected', code: 'REJECTED', variant: 'danger', final: true };
  }
  if (finalStatus === 'WITHDRAWN') {
    return { label: 'Withdrawn', code: 'WITHDRAWN', variant: 'neutral', final: true };
  }
  if (finalStatus === 'REVOKED' || finalStatus === 'REVOKED_BY_ADMIN') {
    return { label: 'Revoked by Admin', code: 'REVOKED_BY_ADMIN', variant: 'neutral', final: true };
  }

  const status = String(application?.status || '').toUpperCase();
  if (status === 'WITHDRAWN') {
    return { label: 'Withdrawn', code: 'WITHDRAWN', variant: 'neutral', final: true };
  }
  if (status === 'REVOKED_BY_ADMIN') {
    return { label: 'Revoked by Admin', code: 'REVOKED_BY_ADMIN', variant: 'neutral', final: true };
  }

  const fromApi = application?.primaryStatus || application?.tracker?.primaryStatus;
  if (fromApi) return fromApi;

  if (application?.currentStage) {
    return { label: application.currentStage, code: 'LEGACY', variant: 'neutral', final: false };
  }

  return { label: 'Applied', code: 'APPLIED', variant: 'neutral', final: false };
}

export function getApplicationPrimaryLabel(application) {
  return getApplicationPrimaryStatus(application).label;
}

export function isTerminalApplication(application) {
  const primary = getApplicationPrimaryStatus(application);
  if (primary.final) return true;
  const finalStatus = (application?.finalStatus || application?.tracker?.details?.finalStatus || '').toString().toUpperCase();
  return ['SELECTED', 'REJECTED', 'WITHDRAWN', 'REVOKED', 'REVOKED_BY_ADMIN'].includes(finalStatus)
    || ['WITHDRAWN', 'REVOKED_BY_ADMIN'].includes(String(application?.status || '').toUpperCase());
}

export function getApplicationTimeline(application) {
  const timeline = application?.tracker?.timeline || [];
  if (!isTerminalApplication(application)) return timeline;
  return timeline.filter((step) => step.status !== 'pending' && step.status !== 'current');
}

export function getApplicationTrackerDetails(application) {
  return application?.tracker?.details || {};
}

export function getPrimaryStatusColorClass(variant) {
  switch (variant) {
    case 'success':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    case 'danger':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'warning':
      return 'bg-amber-100 text-amber-800 border-amber-200';
    case 'info':
      return 'bg-indigo-100 text-indigo-800 border-indigo-200';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200';
  }
}

/** Compact badge classes used in list rows (StudentDashboard, ApplicationTrackerSection). */
export function getPrimaryStatusBadgeClass(variant) {
  switch (variant) {
    case 'success':
      return 'bg-green-100 text-green-800';
    case 'danger':
      return 'bg-red-100 text-red-800';
    case 'warning':
      return 'bg-yellow-100 text-yellow-800';
    case 'info':
      return 'bg-purple-100 text-purple-800';
    default:
      return 'bg-[#3c80a7]/20 text-[#3c80a7]';
  }
}

export function getPrimaryStatusGradient(variant) {
  switch (variant) {
    case 'success':
      return 'from-green-500 to-emerald-500';
    case 'danger':
      return 'from-red-500 to-rose-500';
    case 'warning':
      return 'from-yellow-500 to-amber-500';
    case 'info':
      return 'from-purple-500 to-pink-500';
    default:
      return 'from-blue-500 to-cyan-500';
  }
}

export function getPrimaryStatusRowGradient(variant) {
  switch (variant) {
    case 'success':
      return 'from-green-50 to-green-100';
    case 'danger':
      return 'from-red-50 to-red-100';
    case 'warning':
      return 'from-yellow-50 to-yellow-100';
    case 'info':
      return 'from-purple-50 to-purple-100';
    default:
      return 'from-[#f0f8fa] to-[#d6eaf5]';
  }
}

export function getTimelineStepIcon(status) {
  switch (status) {
    case 'completed':
      return 'completed';
    case 'current':
      return 'current';
    case 'rejected':
      return 'rejected';
    default:
      return 'pending';
  }
}
