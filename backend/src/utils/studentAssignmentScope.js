import prisma from '../config/database.js';

/**
 * Resolve batch/school IDs for a student so batch- and school-level
 * AssessmentAssignment rows match even when only string fields are set.
 */
export async function resolveStudentAssignmentScope(student) {
  const batchIds = new Set();
  const schoolIds = new Set();

  if (student.batchId) batchIds.add(student.batchId);
  if (student.schoolId) schoolIds.add(student.schoolId);

  const batchLabel = (student.batch || '').trim();
  if (batchLabel) {
    const batches = await prisma.batch.findMany({
      where: {
        OR: [
          { year: { equals: batchLabel, mode: 'insensitive' } },
          { label: { equals: batchLabel, mode: 'insensitive' } },
        ],
      },
      select: { id: true },
    });
    batches.forEach((b) => batchIds.add(b.id));
  }

  const schoolLabel = (student.school || '').trim();
  if (schoolLabel) {
    const schools = await prisma.school.findMany({
      where: {
        OR: [
          { name: { equals: schoolLabel, mode: 'insensitive' } },
          { code: { equals: schoolLabel, mode: 'insensitive' } },
          { name: { contains: schoolLabel, mode: 'insensitive' } },
        ],
      },
      select: { id: true },
    });
    schools.forEach((s) => schoolIds.add(s.id));
  }

  const assignmentMatch = [{ studentId: student.id }];
  if (batchIds.size) {
    assignmentMatch.push({ batchId: { in: [...batchIds] } });
  }
  if (schoolIds.size) {
    assignmentMatch.push({ schoolId: { in: [...schoolIds] } });
  }

  return { assignmentMatch, batchIds: [...batchIds], schoolIds: [...schoolIds] };
}

/**
 * Students targeted by batch IDs (UUID and/or batch year/label strings).
 */
export async function findStudentsForBatchIds(targetBatchIds = []) {
  if (!targetBatchIds.length) return [];

  const batches = await prisma.batch.findMany({
    where: { id: { in: targetBatchIds } },
    select: { id: true, year: true, label: true },
  });

  const batchLabels = [
    ...new Set(
      batches.flatMap((b) => [b.year, b.label].filter(Boolean))
    ),
  ];

  return prisma.student.findMany({
    where: {
      OR: [
        { batchId: { in: targetBatchIds } },
        ...(batchLabels.length
          ? [{ batch: { in: batchLabels, mode: 'insensitive' } }]
          : []),
      ],
    },
    include: { user: { select: { email: true } } },
  });
}
