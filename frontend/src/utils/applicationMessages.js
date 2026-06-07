/**
 * Consistent student-facing copy for job application success notifications.
 */
export function formatApplicationSuccessMessage(job) {
  const title =
    job?.jobTitle ||
    job?.title ||
    job?.job?.jobTitle ||
    null;
  const company =
    job?.company?.name ||
    job?.companyName ||
    job?.job?.company?.name ||
    null;

  if (title && company) {
    return `Application submitted for ${title} at ${company}.`;
  }
  if (title) {
    return `Application submitted for ${title}.`;
  }
  if (company) {
    return `Application submitted to ${company}.`;
  }
  return 'Your application was submitted successfully.';
}
