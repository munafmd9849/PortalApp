/**
 * List/delete Cloudinary files under proctoring/assessments/ (orphans from old deletes).
 * Run: node scripts/cleanupOrphanAssessmentCloudinary.js --dry-run
 *      node scripts/cleanupOrphanAssessmentCloudinary.js
 */
import 'dotenv/config';
import prisma from '../src/config/database.js';
import cloudinary, { deleteFromCloudinary } from '../src/config/cloudinary.js';

const PREFIX = 'proctoring/assessments';
const dryRun = process.argv.includes('--dry-run');

async function listAllUnderPrefix(prefix) {
  const all = [];
  let nextCursor;

  do {
    const res = await cloudinary.api.resources({
      type: 'upload',
      prefix,
      max_results: 500,
      next_cursor: nextCursor,
    });
    all.push(...(res.resources || []));
    nextCursor = res.next_cursor;
  } while (nextCursor);

  return all;
}

async function main() {
  const dbPublicIds = new Set(
    (
      await prisma.assessmentScreenshot.findMany({
        where: { publicId: { not: null } },
        select: { publicId: true },
      })
    ).map((r) => r.publicId)
  );

  const assessmentCount = await prisma.assessment.count();
  console.log(`\nDB assessments remaining: ${assessmentCount}`);
  console.log(`DB screenshot publicIds:    ${dbPublicIds.size}`);

  let resources;
  try {
    resources = await listAllUnderPrefix(PREFIX);
  } catch (e) {
    console.error('Failed to list Cloudinary resources:', e.message);
    process.exit(1);
  }

  const orphans = resources.filter((r) => !dbPublicIds.has(r.public_id));

  console.log(`\nCloudinary under "${PREFIX}/": ${resources.length} file(s)`);
  console.log(`Orphaned (not in DB):       ${orphans.length} file(s)\n`);

  if (orphans.length === 0) {
    console.log('No orphan assessment screenshots in Cloudinary.\n');
    return;
  }

  if (dryRun) {
    console.log('Sample orphans (up to 10):');
    orphans.slice(0, 10).forEach((r) => console.log(`  - ${r.public_id}`));
    console.log('\nDry run — run without --dry-run to delete orphans.\n');
    return;
  }

  let deleted = 0;
  let failed = 0;
  for (const r of orphans) {
    try {
      await deleteFromCloudinary(r.public_id);
      deleted += 1;
    } catch {
      failed += 1;
    }
  }

  console.log(`Deleted orphans: ${deleted}, failed: ${failed}\n`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
