/**
 * Delete ALL assessments and related DB rows; remove proctoring screenshots from Cloudinary.
 * Run: node scripts/deleteAllAssessments.js
 * Add --dry-run to preview counts without deleting.
 */
import prisma from '../src/config/database.js';
import { deleteAllAssessmentsWithAssets } from '../src/utils/assessmentCleanup.js';

const dryRun = process.argv.includes('--dry-run');

async function main() {
  const [assessmentCount, screenshotCount, sessionCount] = await Promise.all([
    prisma.assessment.count(),
    prisma.assessmentScreenshot.count(),
    prisma.assessmentSession.count(),
  ]);

  console.log('\nAssessment purge summary (before):');
  console.log(`  Assessments:   ${assessmentCount}`);
  console.log(`  Sessions:      ${sessionCount}`);
  console.log(`  Screenshots:   ${screenshotCount}`);

  const withPublicId = await prisma.assessmentScreenshot.count({
    where: { publicId: { not: null } },
  });
  console.log(`  Cloudinary IDs: ${withPublicId} screenshot(s) with publicId\n`);

  if (assessmentCount === 0) {
    console.log('Nothing to delete.');
    return;
  }

  if (dryRun) {
    console.log('Dry run — no changes made. Run without --dry-run to delete.\n');
    return;
  }

  const result = await deleteAllAssessmentsWithAssets();

  console.log('Deleted:');
  console.log(`  Assessments (DB):     ${result.assessmentsRemoved}`);
  console.log(`  Cloudinary destroyed: ${result.cloudinary.deleted}`);
  console.log(`  Cloudinary failed:    ${result.cloudinary.failed}`);
  console.log(`  Cloudinary skipped:   ${result.cloudinary.skipped} (no publicId)\n`);

  if (result.assessments.length) {
    console.log('Removed assessments:');
    for (const a of result.assessments) {
      console.log(`  - ${a.title} (${a.id})`);
    }
  }
  console.log('');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
