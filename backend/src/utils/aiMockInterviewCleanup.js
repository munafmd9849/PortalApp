import prisma from '../config/database.js';
import cloudinary from '../config/cloudinary.js';

async function destroyAsset(publicId, resourceType = 'image') {
  if (!publicId) return false;
  await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
  return true;
}

/**
 * Delete Cloudinary assets (answer videos + proctoring screenshots) for given interview IDs.
 */
export async function deleteCloudinaryForAiInterviewIds(interviewIds) {
  if (!interviewIds?.length) {
    return { videos: { deleted: 0, failed: 0, skipped: 0 }, screenshots: { deleted: 0, failed: 0, skipped: 0 } };
  }

  const enrollments = await prisma.aiMockInterviewEnrollment.findMany({
    where: { interviewId: { in: interviewIds } },
    select: { id: true },
  });
  const enrollmentIds = enrollments.map((e) => e.id);
  if (!enrollmentIds.length) {
    return { videos: { deleted: 0, failed: 0, skipped: 0 }, screenshots: { deleted: 0, failed: 0, skipped: 0 } };
  }

  const [answers, screenshots] = await Promise.all([
    prisma.aiMockInterviewAnswer.findMany({
      where: { enrollmentId: { in: enrollmentIds } },
      select: { videoPublicId: true, audioPublicId: true },
    }),
    prisma.aiMockInterviewScreenshot.findMany({
      where: { enrollmentId: { in: enrollmentIds } },
      select: { publicId: true },
    }),
  ]);

  const videoStats = { deleted: 0, failed: 0, skipped: 0 };
  const screenshotStats = { deleted: 0, failed: 0, skipped: 0 };

  for (const row of answers) {
    for (const [publicId, resourceType] of [
      [row.videoPublicId, 'video'],
      [row.audioPublicId, 'raw'],
    ]) {
      if (!publicId) {
        videoStats.skipped += 1;
        continue;
      }
      try {
        await destroyAsset(publicId, resourceType);
        videoStats.deleted += 1;
      } catch (e) {
        console.warn(`[aiMockInterviewCleanup] delete failed for ${publicId}:`, e?.message);
        videoStats.failed += 1;
      }
    }
  }

  for (const row of screenshots) {
    if (!row.publicId) {
      screenshotStats.skipped += 1;
      continue;
    }
    try {
      await destroyAsset(row.publicId, 'image');
      screenshotStats.deleted += 1;
    } catch (e) {
      console.warn(`[aiMockInterviewCleanup] screenshot delete failed for ${row.publicId}:`, e?.message);
      screenshotStats.failed += 1;
    }
  }

  return { videos: videoStats, screenshots: screenshotStats };
}

/**
 * Remove one AI mock interview from DB (cascade) after Cloudinary cleanup.
 */
export async function deleteAiMockInterviewWithAssets(interviewId) {
  const existing = await prisma.aiMockInterview.findUnique({
    where: { id: interviewId },
    select: { id: true, title: true },
  });
  if (!existing) {
    return null;
  }

  const cloudinary = await deleteCloudinaryForAiInterviewIds([interviewId]);
  await prisma.aiMockInterview.delete({ where: { id: interviewId } });

  return { interview: existing, cloudinary };
}
