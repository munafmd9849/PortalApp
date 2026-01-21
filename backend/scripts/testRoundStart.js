/**
 * Test Round Start API Call
 * 
 * Simulates the actual API call to start a round and shows the exact error.
 * 
 * Usage:
 *   node scripts/testRoundStart.js
 */

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient({
  log: ['error', 'warn'],
});

const COMPANY_NAME = 'CloudVantage Systems';
const JOB_TITLE = 'DevOps Engineer';

async function testRoundStart() {
  console.log('🧪 Testing Round Start API Call...\n');

  try {
    // Find the job and interview
    const job = await prisma.job.findFirst({
      where: {
        jobTitle: { contains: JOB_TITLE, mode: 'insensitive' },
        OR: [
          { companyName: { contains: COMPANY_NAME, mode: 'insensitive' } },
          { company: { name: { contains: COMPANY_NAME, mode: 'insensitive' } } },
        ],
      },
      include: {
        interviews: true,
      },
    });

    if (!job) {
      console.error('❌ Job not found');
      return;
    }

    const interview = job.interviews?.[0];
    if (!interview) {
      console.error('❌ Interview record not found');
      return;
    }

    console.log(`✅ Found Interview: ${interview.id}\n`);

    // Simulate the startAssessment function logic
    console.log('🔍 Simulating startAssessment function...\n');

    // 1. Check interview exists
    const interviewWithJob = await prisma.interview.findUnique({
      where: { id: interview.id },
      include: {
        job: {
          select: {
            driveDate: true,
            applicationDeadline: true,
          },
        },
      },
    });

    if (!interviewWithJob) {
      console.log('❌ STEP 1: Interview not found');
      return;
    }
    console.log('✅ STEP 1: Interview found');

    // 2. Check drive date
    console.log('\n📅 STEP 2: Drive Date Validation');
    if (interviewWithJob.job?.driveDate) {
      const now = new Date();
      const driveDate = new Date(interviewWithJob.job.driveDate);
      
      console.log(`   Current Time: ${now.toISOString()}`);
      console.log(`   Drive Date: ${driveDate.toISOString()}`);
      
      // Compare dates only (ignore time) - allow if today is drive date or later
      const nowDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const driveDateOnly = new Date(driveDate.getFullYear(), driveDate.getMonth(), driveDate.getDate());
      
      console.log(`   Current Date (Date Only): ${nowDateOnly.toISOString().split('T')[0]}`);
      console.log(`   Drive Date (Date Only): ${driveDateOnly.toISOString().split('T')[0]}`);
      
      if (nowDateOnly < driveDateOnly) {
        console.log('   ❌ BLOCKING: Current date is BEFORE drive date');
        console.log(`   Error would be: "Interview drive has not started yet"`);
        return;
      } else {
        console.log('   ✅ Drive date check passed');
      }
    } else {
      console.log('   ⚠️  No drive date set (validation skipped)');
    }

    // 3. Check interview status
    console.log('\n📊 STEP 3: Interview Status Check');
    const normalizedStatus = interviewWithJob.status?.toUpperCase();
    console.log(`   Status: ${interviewWithJob.status} (normalized: ${normalizedStatus})`);
    
    if (normalizedStatus === 'COMPLETED' || normalizedStatus === 'CANCELLED') {
      console.log('   ❌ BLOCKING: Interview is completed/cancelled');
      return;
    }
    console.log('   ✅ Status allows round start');

    // 4. Parse rounds
    console.log('\n📋 STEP 4: Rounds Check');
    let rounds = [];
    try {
      rounds = JSON.parse(interviewWithJob.rounds || '[]');
      console.log(`   Rounds parsed: ${rounds.length} rounds`);
    } catch (e) {
      console.log(`   ❌ ERROR parsing rounds: ${e.message}`);
      return;
    }

    if (rounds.length === 0) {
      console.log('   ❌ BLOCKING: No rounds found');
      return;
    }

    // Test with first round
    const roundName = rounds[0].name;
    console.log(`   Testing with round: "${roundName}"`);

    const roundIndex = rounds.findIndex((r) => r.name === roundName);
    if (roundIndex === -1) {
      console.log(`   ❌ BLOCKING: Round "${roundName}" not found in rounds array`);
      return;
    }
    console.log(`   ✅ Round found at index ${roundIndex}`);

    // 5. Check for ongoing rounds
    console.log('\n🔄 STEP 5: Ongoing Round Check');
    const ongoingRound = rounds.find((r) => r.status === 'ongoing');
    if (ongoingRound && ongoingRound.name !== roundName) {
      console.log(`   ❌ BLOCKING: Round "${ongoingRound.name}" is already ongoing`);
      return;
    }
    console.log('   ✅ No conflicting ongoing rounds');

    // 6. Check round status
    console.log('\n📝 STEP 6: Round Status Check');
    console.log(`   Round Status: "${rounds[roundIndex].status}"`);
    if (rounds[roundIndex].status === 'completed') {
      console.log('   ❌ BLOCKING: Round is already completed');
      return;
    }
    console.log('   ✅ Round can be started');

    // 7. Check previous round (if not first)
    console.log('\n⬅️  STEP 7: Previous Round Check');
    if (roundIndex > 0) {
      const previousRound = rounds[roundIndex - 1];
      console.log(`   Previous Round: "${previousRound.name}" (Status: ${previousRound.status})`);
      if (previousRound && previousRound.status !== 'completed' && previousRound.status !== 'ongoing') {
        console.log('   ❌ BLOCKING: Previous round must be completed');
        return;
      }
      console.log('   ✅ Previous round check passed');
    } else {
      console.log('   ✅ First round (no previous round to check)');
    }

    // 8. Simulate update
    console.log('\n💾 STEP 8: Database Update Simulation');
    console.log('   Would update:');
    console.log(`     - currentRound: "${roundName}"`);
    console.log(`     - rounds[${roundIndex}].status: "ongoing"`);
    console.log(`     - Other ongoing rounds → "pending"`);
    
    const updatedRounds = rounds.map((r, idx) => ({
      ...r,
      status: idx === roundIndex ? 'ongoing' : (r.status === 'ongoing' ? 'pending' : r.status),
    }));

    console.log('   Updated rounds:');
    updatedRounds.forEach((r, idx) => {
      console.log(`     ${idx + 1}. ${r.name} - ${r.status}`);
    });

    console.log('\n' + '='.repeat(80));
    console.log('✅ ALL VALIDATION CHECKS PASSED!');
    console.log('='.repeat(80));
    console.log('\n💡 The round SHOULD start successfully.');
    console.log('   If it still fails, the issue might be:');
    console.log('   1. Network/API connection issue');
    console.log('   2. Authentication/authorization issue');
    console.log('   3. Frontend error handling');
    console.log('   4. Backend error not being caught properly\n');

    // Show the exact API call that would be made
    console.log('📡 API Call Details:');
    console.log(`   Method: POST`);
    console.log(`   URL: /api/admin/interview/${interview.id}/round/${encodeURIComponent(roundName)}/start`);
    console.log(`   Headers: Authorization: Bearer <admin_token>`);
    console.log('');

  } catch (error) {
    console.error('❌ Error during test:', error);
    console.error('Stack:', error.stack);
    throw error;
  }
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL is not set!');
    process.exit(1);
  }

  try {
    await prisma.$connect();
    console.log('✅ Database connected\n');

    await testRoundStart();
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
