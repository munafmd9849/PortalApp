import prisma from '../config/database.js';
import { deleteFromCloudinary } from '../config/cloudinary.js';

/**
 * Delete Cloudinary assets linked to assessment proctoring screenshots.
 */
export async function deleteCloudinaryForAssessmentIds(assessmentIds) {
  if (!assessmentIds?.length) {
    return { deleted: 0, failed: 0, skipped: 0 };
  }

  const screenshots = await prisma.assessmentScreenshot.findMany({
    where: { session: { assessmentId: { in: assessmentIds } } },
    select: { publicId: true },
  });

  let deleted = 0;
  let failed = 0;
  let skipped = 0;

  for (const row of screenshots) {
    if (!row.publicId) {
      skipped += 1;
      continue;
    }
    try {
      await deleteFromCloudinary(row.publicId);
      deleted += 1;
    } catch (e) {
      console.warn(`[assessmentCleanup] Cloudinary delete failed for ${row.publicId}:`, e?.message);
      failed += 1;
    }
  }

  return { deleted, failed, skipped };
}

/**
 * Remove one assessment from DB (cascade) after Cloudinary cleanup.
 */
export async function deleteAssessmentWithAssets(assessmentId) {
  await deleteCloudinaryForAssessmentIds([assessmentId]);
  await prisma.assessment.delete({ where: { id: assessmentId } });
}

/**
 * Remove all assessments and their proctoring screenshots from Cloudinary + DB.
 */
export async function deleteAllAssessmentsWithAssets() {
  const assessments = await prisma.assessment.findMany({
    select: { id: true, title: true },
  });

  const ids = assessments.map((a) => a.id);
  const cloudinary = await deleteCloudinaryForAssessmentIds(ids);

  const result = await prisma.assessment.deleteMany({});

  return {
    assessmentsRemoved: result.count,
    assessments: assessments.map((a) => ({ id: a.id, title: a.title })),
    cloudinary,
  };
}
