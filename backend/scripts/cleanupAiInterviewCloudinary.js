/**
 * Remove all AI mock interview media from Cloudinary (videos + proctoring screenshots).
 * Clears video/screenshot URLs in DB; keeps interview/enrollment records.
 *
 * Run: node scripts/cleanupAiInterviewCloudinary.js --dry-run
 *      node scripts/cleanupAiInterviewCloudinary.js
 */
import 'dotenv/config';
import prisma from '../src/config/database.js';
import cloudinary, { deleteFromCloudinary } from '../src/config/cloudinary.js';

const PREFIX = 'ai-mock-interviews';
const dryRun = process.argv.includes('--dry-run');

async function listResources(resourceType) {
  const all = [];
  let nextCursor;

  do {
    const res = await cloudinary.api.resources({
      type: 'upload',
      resource_type: resourceType,
      prefix: PREFIX,
      max_results: 500,
      next_cursor: nextCursor,
    });
    all.push(...(res.resources || []));
    nextCursor = res.next_cursor;
  } while (nextCursor);

  return all;
}

async function destroyAsset(publicId, resourceType) {
  return cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
}

async function main() {
  const [videos, images] = await Promise.all([
    listResources('video'),
    listResources('image'),
  ]);

  const all = [
    ...videos.map((r) => ({ ...r, resourceType: 'video' })),
    ...images.map((r) => ({ ...r, resourceType: 'image' })),
  ];

  const answerCount = await prisma.aiMockInterviewAnswer.count({
    where: { videoUrl: { not: null } },
  });
  const screenshotCount = await prisma.aiMockInterviewScreenshot.count();

  console.log('\nAI interview Cloudinary cleanup');
  console.log(`  Videos in Cloudinary:      ${videos.length}`);
  console.log(`  Images in Cloudinary:      ${images.length}`);
  console.log(`  DB answers with video:     ${answerCount}`);
  console.log(`  DB proctoring screenshots: ${screenshotCount}\n`);

  if (all.length === 0) {
    console.log('No AI interview files in Cloudinary.\n');
    return;
  }

  if (dryRun) {
    all.slice(0, 8).forEach((r) => console.log(`  - [${r.resourceType}] ${r.public_id}`));
    if (all.length > 8) console.log(`  ... and ${all.length - 8} more`);
    console.log('\nDry run — run without --dry-run to delete.\n');
    return;
  }

  let deleted = 0;
  let failed = 0;
  for (const r of all) {
    try {
      await destroyAsset(r.public_id, r.resourceType);
      deleted += 1;
    } catch (e) {
      console.warn(`Failed ${r.public_id}:`, e?.message);
      failed += 1;
    }
  }

  await prisma.aiMockInterviewAnswer.updateMany({
    where: { videoUrl: { not: null } },
    data: {
      videoUrl: null,
      videoPublicId: null,
      audioUrl: null,
      audioPublicId: null,
    },
  });

  const removedScreenshots = await prisma.aiMockInterviewScreenshot.deleteMany({});

  console.log(`Cloudinary deleted: ${deleted}, failed: ${failed}`);
  console.log(`DB answer videos cleared, screenshots removed: ${removedScreenshots.count}\n`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
