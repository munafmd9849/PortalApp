import prisma from '../config/database.js';
import { findStudentsForBatchIds } from './studentAssignmentScope.js';

function parseJsonArray(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  try {
    const parsed = JSON.parse(val);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Resolve student IDs for AI mock interview targeting.
 */
export async function resolveAiInterviewStudentIds({
  targetBatches = [],
  targetBranches = [],
  targetCenters = [],
  targetSchoolIds = [],
  targetStudentIds = [],
}) {
  const ids = new Set();

  for (const sid of targetStudentIds) {
    if (sid) ids.add(String(sid));
  }

  if (targetBatches.length) {
    const fromBatches = await findStudentsForBatchIds(targetBatches);
    fromBatches.forEach((s) => ids.add(s.id));
  }

  const branchList = targetBranches.filter(Boolean);
  const centerList = targetCenters.filter(Boolean);
  const schoolList = targetSchoolIds.filter(Boolean);

  if (branchList.length || centerList.length || schoolList.length) {
    const or = [];
    if (branchList.length) {
      or.push({ branch: { in: branchList, mode: 'insensitive' } });
    }
    if (centerList.length) {
      or.push({ center: { in: centerList, mode: 'insensitive' } });
    }
    if (schoolList.length) {
      or.push({ schoolId: { in: schoolList } });
    }
    const rows = await prisma.student.findMany({
      where: { OR: or },
      select: { id: true },
    });
    rows.forEach((s) => ids.add(s.id));
  }

  return [...ids];
}

export async function createEnrollmentsForInterview(interviewId, studentIds) {
  if (!studentIds.length) return 0;
  const existing = await prisma.aiMockInterviewEnrollment.findMany({
    where: { interviewId, studentId: { in: studentIds } },
    select: { studentId: true },
  });
  const existingSet = new Set(existing.map((e) => e.studentId));
  const toCreate = studentIds
    .filter((id) => !existingSet.has(id))
    .map((studentId) => ({
      interviewId,
      studentId,
      status: 'ASSIGNED',
    }));
  if (toCreate.length) {
    await prisma.aiMockInterviewEnrollment.createMany({ data: toCreate });
  }
  return toCreate.length;
}

export function parseInterviewTargets(interview) {
  return {
    targetBatches: parseJsonArray(interview.targetBatches),
    targetBranches: parseJsonArray(interview.targetBranches),
    targetCenters: parseJsonArray(interview.targetCenters),
    targetSchoolIds: parseJsonArray(interview.targetSchoolIds),
    targetStudentIds: parseJsonArray(interview.targetStudentIds),
  };
}

export function computeRiskLevel(violationsCount) {
  if (violationsCount >= 8) return 'HIGH';
  if (violationsCount >= 3) return 'MEDIUM';
  return 'LOW';
}
