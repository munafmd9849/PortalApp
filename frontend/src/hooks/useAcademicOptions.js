import { useCallback, useEffect, useState } from 'react';
import {
  buildDropdownAcademicOptions,
  buildManageJobsFilterOptions,
  buildStandardFilterOptions,
  fetchAcademicOptions,
} from '../utils/academicOptions';

/**
 * Loads schools (branches), centers, and batches from Super Admin academic structure.
 */
export default function useAcademicOptions({ enabled = true } = {}) {
  const [raw, setRaw] = useState({ schools: [], centers: [], batches: [] });
  const [loading, setLoading] = useState(Boolean(enabled));
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAcademicOptions();
      setRaw(data);
    } catch (err) {
      console.error('Failed to load academic options:', err);
      setError(err);
      setRaw({ schools: [], centers: [], batches: [] });
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    reload();
  }, [reload]);

  const standard = buildStandardFilterOptions(raw);
  const manageJobs = buildManageJobsFilterOptions(raw);
  const dropdown = buildDropdownAcademicOptions(raw);

  return {
    schools: raw.schools,
    centers: raw.centers,
    batches: raw.batches,
    loading,
    error,
    reload,
    filterOptions: {
      campuses: standard.centers,
      centers: standard.centers,
      schools: standard.schools,
      batches: standard.batches,
    },
    standard,
    manageJobs,
    dropdown,
  };
}
