import api from '../services/api';

/** Only ACTIVE records appear in dropdowns/filters (Super Admin manages status). */
export function filterActiveAcademicRecords(items = []) {
  return (items || []).filter((item) => (item?.status || 'ACTIVE') === 'ACTIVE');
}

/** Value stored on Student / Job targeting for school. */
export function schoolStorageValue(school) {
  if (!school) return '';
  return (school.code || school.name || '').trim();
}

/** Value stored on Student / Job targeting for center. */
export function centerStorageValue(center) {
  if (!center) return '';
  return (center.name || '').trim();
}

/** Value stored on Student / Job targeting for batch. */
export function batchStorageValue(batch) {
  if (!batch) return '';
  return (batch.label || batch.year || '').trim();
}

/**
 * Standard filter shape: { id, name } for AdminHome, AdminPanel, analytics, etc.
 */
export function buildStandardFilterOptions({ schools = [], centers = [], batches = [] } = {}) {
  const activeSchools = filterActiveAcademicRecords(schools);
  const activeCenters = filterActiveAcademicRecords(centers);
  const activeBatches = filterActiveAcademicRecords(batches);

  return {
    schools: activeSchools.map((s) => ({
      id: schoolStorageValue(s),
      name: s.name,
      code: s.code,
    })),
    centers: activeCenters.map((c) => ({
      id: centerStorageValue(c),
      name: c.name,
    })),
    batches: activeBatches.map((b) => ({
      id: batchStorageValue(b),
      name: b.year || b.label,
      label: b.label,
      year: b.year,
    })),
  };
}

/** ManageJobs checkbox format: { id, display, storage } */
export function buildManageJobsFilterOptions({ schools = [], centers = [], batches = [] } = {}) {
  const { schools: schoolOpts, centers: centerOpts, batches: batchOpts } =
    buildStandardFilterOptions({ schools, centers, batches });

  return {
    schoolOptions: [
      { id: 'ALL', display: 'All', storage: 'ALL' },
      ...schoolOpts.map((s) => ({
        id: s.id,
        display: s.code || s.name,
        storage: s.id,
      })),
    ],
    centerOptions: [
      { id: 'ALL', display: 'All Centers', storage: 'ALL' },
      ...centerOpts.map((c) => ({
        id: c.id,
        display: c.name,
        storage: c.id,
      })),
    ],
    batchOptions: [
      { id: 'ALL', display: 'All', storage: 'ALL' },
      ...batchOpts.map((b) => ({
        id: b.id,
        display: b.label || b.id,
        storage: b.id,
      })),
    ],
  };
}

/** Dropdown options for CustomDropdown / onboarding: { value, label, id? } */
export function buildDropdownAcademicOptions({ schools = [], centers = [], batches = [] } = {}) {
  const activeSchools = filterActiveAcademicRecords(schools);
  const activeCenters = filterActiveAcademicRecords(centers);
  const activeBatches = filterActiveAcademicRecords(batches);

  return {
    schools: activeSchools.map((s) => ({
      value: s.name,
      label: s.name,
      id: s.id,
      code: s.code,
    })),
    centers: activeCenters.map((c) => ({
      value: c.name,
      label: c.name,
      id: c.id,
    })),
    batches: activeBatches.map((b) => ({
      value: b.year,
      label: b.year,
      id: b.id,
      storage: batchStorageValue(b),
    })),
  };
}

export async function fetchAcademicOptions() {
  const [schools, centers, batches] = await Promise.all([
    api.getSchools(),
    api.getCenters(),
    api.getBatches(),
  ]);
  return {
    schools: schools || [],
    centers: centers || [],
    batches: batches || [],
  };
}
