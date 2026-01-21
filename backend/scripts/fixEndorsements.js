/**
 * Fix Endorsements Script
 * 
 * Updates endorsementsData JSON to include consent: true and relationship fields,
 * and creates Endorsement records in the database for proper display.
 * 
 * Usage:
 *   node scripts/fixEndorsements.js
 */

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient({
  log: ['error', 'warn'],
});

const STUDENT_EMAILS = [
  'munafmd9849@gmail.com',
  'munafmd7407@gmail.com',
  'ssdqwert13@gmail.com',
  'temp87981@gmail.com',
  'temp20086@gmail.com',
  'temp83437@gmail.com',
  'charansai82140@gmail.com',
];

async function fixEndorsements() {
  console.log('🔧 Fixing endorsements for all students...\n');

  const results = {
    updated: [],
    errors: [],
  };

  for (const email of STUDENT_EMAILS) {
    try {
      const student = await prisma.student.findUnique({
        where: { email },
      });

      if (!student) {
        console.log(`⚠️  Student ${email} not found, skipping...`);
        results.errors.push({ email, error: 'Student not found' });
        continue;
      }

      // Parse existing endorsementsData
      let endorsements = [];
      if (student.endorsementsData) {
        try {
          endorsements = typeof student.endorsementsData === 'string'
            ? JSON.parse(student.endorsementsData)
            : student.endorsementsData;
        } catch (e) {
          console.log(`⚠️  Failed to parse endorsementsData for ${email}, creating new...`);
          endorsements = [];
        }
      }

      if (!Array.isArray(endorsements) || endorsements.length === 0) {
        console.log(`⚠️  No endorsements found for ${email}, skipping...`);
        continue;
      }

      // Update endorsements to include required fields
      const updatedEndorsements = endorsements.map((endorsement, index) => {
        // Ensure consent is true (required for display)
        const consent = endorsement.consent !== undefined ? endorsement.consent : true;
        
        // Add relationship field (required by frontend)
        const relationship = endorsement.relationship || endorsement.endorserRole || 'Professor';
        
        // Add context if not present
        const context = endorsement.context || null;
        
        // Ensure verified is true
        const verified = endorsement.verified !== undefined ? endorsement.verified : true;

        return {
          ...endorsement,
          consent,
          relationship,
          context,
          verified,
        };
      });

      // Update endorsementsData JSON
      await prisma.student.update({
        where: { id: student.id },
        data: {
          endorsementsData: JSON.stringify(updatedEndorsements),
        },
      });

      // Delete existing Endorsement records for this student (to avoid duplicates)
      await prisma.endorsement.deleteMany({
        where: { studentId: student.id },
      });

      // Create Endorsement records in database (for API access)
      for (const endorsement of updatedEndorsements) {
        // Only create if consent is true
        if (endorsement.consent === true) {
          await prisma.endorsement.create({
            data: {
              studentId: student.id,
              endorserName: endorsement.endorserName || 'Unknown',
              endorserEmail: endorsement.endorserEmail || 'unknown@example.com',
              endorserRole: endorsement.endorserRole || 'Professor',
              organization: endorsement.organization || 'Unknown Organization',
              relationship: endorsement.relationship || 'Professor',
              context: endorsement.context || null,
              message: endorsement.message || 'No message provided.',
              skills: JSON.stringify(endorsement.relatedSkills || []),
              skillRatings: endorsement.skillRatings ? JSON.stringify(endorsement.skillRatings) : null,
              overallRating: endorsement.overallRating || endorsement.strengthRating || null,
              consent: true,
              verified: endorsement.verified !== false,
              submittedAt: endorsement.submittedAt ? new Date(endorsement.submittedAt) : new Date(),
            },
          });
        }
      }

      console.log(`✅ Fixed endorsements for: ${email} (${updatedEndorsements.length} endorsements)`);
      results.updated.push({ email, count: updatedEndorsements.length });
    } catch (error) {
      console.error(`❌ Error fixing endorsements for ${email}:`, error.message);
      results.errors.push({ email, error: error.message });
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 Summary:');
  console.log(`✅ Updated: ${results.updated.length} students`);
  console.log(`❌ Errors: ${results.errors.length}`);
  console.log('='.repeat(60) + '\n');

  if (results.updated.length > 0) {
    console.log('Updated students:');
    results.updated.forEach(({ email, count }) => {
      console.log(`  - ${email}: ${count} endorsements`);
    });
    console.log('');
  }

  return results;
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL is not set!');
    process.exit(1);
  }

  try {
    await prisma.$connect();
    console.log('✅ Database connected\n');

    await fixEndorsements();
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
