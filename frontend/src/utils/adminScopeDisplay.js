export function parseAdminScopeField(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter((v) => v && v !== '*');
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.filter((v) => v && v !== '*') : [];
    } catch {
      return value.trim() ? [value] : [];
    }
  }
  return [];
}

export function getAdminDisplayName(user) {
  return (
    user?.displayName?.trim() ||
    user?.admin?.name?.trim() ||
    'Admin'
  );
}

export function getAdminWelcomePrefix(userId) {
  if (!userId) return 'Welcome';
  const key = `admin_dashboard_welcome_${userId}`;
  try {
    if (localStorage.getItem(key)) return 'Welcome back';
    localStorage.setItem(key, String(Date.now()));
    return 'Welcome';
  } catch {
    return 'Welcome back';
  }
}

export function resolveAdminScopeLabels(admin, academicData = {}) {
  const { schools = [], centers = [], batches = [] } = academicData;

  const nameSchools = parseAdminScopeField(admin?.allowedSchools);
  const nameCenters = parseAdminScopeField(admin?.allowedCenters);
  const nameBatches = parseAdminScopeField(admin?.allowedBatches);

  const schoolIds = parseAdminScopeField(admin?.allowedSchoolIds);
  const centerIds = parseAdminScopeField(admin?.allowedCenterIds);
  const batchIds = parseAdminScopeField(admin?.allowedBatchIds);

  const resolvedSchools = nameSchools.length
    ? nameSchools
    : schoolIds
        .map(
          (id) =>
            schools.find((s) => s.id === id)?.name ||
            schools.find((s) => (s.code || s.name) === id)?.name
        )
        .filter(Boolean);

  const resolvedCenters = nameCenters.length
    ? nameCenters
    : centerIds.map((id) => centers.find((c) => c.id === id)?.name).filter(Boolean);

  const resolvedBatches = nameBatches.length
    ? nameBatches
    : batchIds
        .map((id) => {
          const batch = batches.find(
            (b) => b.id === id || b.year === id || b.label === id
          );
          return batch?.year || batch?.label;
        })
        .filter(Boolean);

  return {
    schools: resolvedSchools,
    centers: resolvedCenters,
    batches: resolvedBatches,
  };
}

export function formatAdminScopeSubtitle(admin, academicData = {}) {
  const { schools, centers, batches } = resolveAdminScopeLabels(admin, academicData);

  const parts = [];
  if (schools.length) {
    parts.push(`School${schools.length > 1 ? 's' : ''}: ${schools.join(', ')}`);
  }
  if (centers.length) {
    parts.push(`Centre${centers.length > 1 ? 's' : ''}: ${centers.join(', ')}`);
  }
  if (batches.length) {
    parts.push(`Batch${batches.length > 1 ? 'es' : ''}: ${batches.join(', ')}`);
  }

  if (!parts.length) {
    return 'Your scope has not been configured yet. Contact your Super Admin.';
  }

  return `Assigned by Super Admin — ${parts.join(' · ')}`;
}

export function getDashboardWelcomeSubtitle(user, role, academicData = {}) {
  const userRole = (role || user?.role || '').toUpperCase();

  if (userRole === 'SUPER_ADMIN') {
    return 'You have global access across all schools, centres, and batches.';
  }

  if (userRole === 'ADMIN' && user?.admin) {
    return formatAdminScopeSubtitle(user.admin, academicData);
  }

  if (userRole === 'RECRUITER') {
    const company = user?.recruiter?.companyName || user?.recruiter?.company?.name;
    return company ? `Recruiter at ${company}` : 'Manage your job postings and applicants.';
  }

  return '';
}
