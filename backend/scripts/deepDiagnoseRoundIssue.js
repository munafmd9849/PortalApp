/**
 * Deep Diagnosis of Interview Round Start Issue
 * 
 * Comprehensive check of all possible issues preventing round start.
 * 
 * Usage:
 *   node scripts/deepDiagnoseRoundIssue.js
 */

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient({
  log: ['error', 'warn'],
});

const COMPANY_NAME = 'CloudVantage Systems';
const JOB_TITLE = 'DevOps Engineer';

async function deepDiagnose() {
  console.log('🔍 DEEP DIAGNOSIS: Interview Round Start Issue\n');
  console.log('='.repeat(80));

  try {
    // 1. Find the job
    const job = await prisma.job.findFirst({
      where: {
        jobTitle: { contains: JOB_TITLE, mode: 'insensitive' },
        OR: [
          { companyName: { contains: COMPANY_NAME, mode: 'insensitive' } },
          { company: { name: { contains: COMPANY_NAME, mode: 'insensitive' } } },
        ],
      },
      include: {
        company: true,
        interviewSession: {
          include: {
            rounds: {
              orderBy: { roundNumber: 'asc' },
            },
            interviewerInvites: true,
          },
        },
        interviews: true, // Old system
      },
    });

    if (!job) {
      console.error(`❌ Job not found: ${JOB_TITLE} at ${COMPANY_NAME}`);
      return;
    }

    console.log(`\n1️⃣ JOB INFORMATION:`);
    console.log(`   ID: ${job.id}`);
    console.log(`   Title: ${job.jobTitle}`);
    console.log(`   Company: ${job.company?.name || job.companyName}`);
    console.log(`   Status: ${job.status}`);
    console.log(`   Is Posted: ${job.isPosted}`);

    // 2. Check drive date in detail
    console.log(`\n2️⃣ DRIVE DATE VALIDATION:`);
    const now = new Date();
    const driveDate = job.driveDate ? new Date(job.driveDate) : null;
    
    if (!driveDate) {
      console.log('   ❌ CRITICAL: Drive date is NOT SET!');
      console.log('   This will block all round starts.\n');
    } else {
      console.log(`   Drive Date (Raw): ${job.driveDate.toISOString()}`);
      console.log(`   Drive Date (Parsed): ${driveDate.toISOString()}`);
      console.log(`   Current Time: ${now.toISOString()}`);
      
      // Date-only comparison
      const nowDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const driveDateOnly = new Date(driveDate.getFullYear(), driveDate.getMonth(), driveDate.getDate());
      
      console.log(`   Current Date (Date Only): ${nowDateOnly.toISOString().split('T')[0]}`);
      console.log(`   Drive Date (Date Only): ${driveDateOnly.toISOString().split('T')[0]}`);
      
      const daysDiff = Math.floor((driveDateOnly - nowDateOnly) / (1000 * 60 * 60 * 24));
      console.log(`   Days Difference: ${daysDiff} days`);
      
      if (nowDateOnly < driveDateOnly) {
        console.log(`   ❌ BLOCKING: Current date is BEFORE drive date`);
        console.log(`   Rounds cannot start until: ${driveDateOnly.toISOString().split('T')[0]}\n`);
      } else if (nowDateOnly.getTime() === driveDateOnly.getTime()) {
        console.log(`   ✅ TODAY IS DRIVE DATE - Rounds can start\n`);
      } else {
        console.log(`   ✅ Drive date has passed - Rounds can start\n`);
      }
    }

    // 3. Check InterviewSession (new system)
    console.log(`3️⃣ INTERVIEW SESSION (New System):`);
    if (!job.interviewSession) {
      console.log('   ❌ CRITICAL: InterviewSession does NOT exist!');
      console.log('   You need to schedule the interview first.\n');
    } else {
      const session = job.interviewSession;
      console.log(`   Session ID: ${session.id}`);
      console.log(`   Status: ${session.status}`);
      console.log(`   Created At: ${session.createdAt.toISOString()}`);
      console.log(`   Started At: ${session.startedAt ? session.startedAt.toISOString() : 'NULL'}`);
      console.log(`   Created By: ${session.createdBy}`);
      console.log(`   Rounds Count: ${session.rounds.length}`);
      console.log(`   Interviewer Invites: ${session.interviewerInvites.length}\n`);

      if (session.rounds.length === 0) {
        console.log('   ❌ ISSUE: No rounds configured in InterviewSession\n');
      } else {
        console.log('   Rounds:');
        session.rounds.forEach((round, idx) => {
          console.log(`     ${idx + 1}. ${round.name} (Round ${round.roundNumber})`);
          console.log(`        Status: ${round.status}`);
          console.log(`        Started At: ${round.startedAt ? round.startedAt.toISOString() : 'NULL'}`);
          console.log(`        Ended At: ${round.endedAt ? round.endedAt.toISOString() : 'NULL'}`);
          
          // Check if this round can be started
          const canStart = round.status === 'LOCKED' && 
                          !session.rounds.some(r => r.status === 'ACTIVE' && r.id !== round.id) &&
                          (round.roundNumber === 1 || session.rounds.find(r => r.roundNumber === round.roundNumber - 1)?.status === 'ENDED');
          console.log(`        Can Start: ${canStart ? '✅ YES' : '❌ NO'}`);
          if (!canStart) {
            if (round.status !== 'LOCKED') {
              console.log(`          Reason: Status is "${round.status}", must be "LOCKED"`);
            }
            const activeRound = session.rounds.find(r => r.status === 'ACTIVE' && r.id !== round.id);
            if (activeRound) {
              console.log(`          Reason: Round "${activeRound.name}" is already ACTIVE`);
            }
            if (round.roundNumber > 1) {
              const prevRound = session.rounds.find(r => r.roundNumber === round.roundNumber - 1);
              if (!prevRound || prevRound.status !== 'ENDED') {
                console.log(`          Reason: Previous round "${prevRound?.name || 'N/A'}" is not ENDED`);
              }
            }
          }
          console.log('');
        });
      }

      // Check first round requirements
      if (session.rounds.length > 0) {
        const firstRound = session.rounds[0];
        console.log('   First Round Requirements:');
        console.log(`     Status = LOCKED: ${firstRound.status === 'LOCKED' ? '✅' : '❌'} (${firstRound.status})`);
        console.log(`     Session Status = NOT_STARTED: ${session.status === 'NOT_STARTED' ? '✅' : '❌'} (${session.status})`);
        console.log(`     Interviewers Invited: ${session.interviewerInvites.length > 0 ? '✅' : '❌'} (${session.interviewerInvites.length})`);
        console.log(`     No Active Rounds: ${!session.rounds.some(r => r.status === 'ACTIVE') ? '✅' : '❌'}`);
        const checkNowDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const checkDriveDateOnly = driveDate ? new Date(driveDate.getFullYear(), driveDate.getMonth(), driveDate.getDate()) : null;
        console.log(`     Drive Date Check: ${driveDate && checkNowDateOnly >= checkDriveDateOnly ? '✅' : '❌'}\n`);
      }
    }

    // 4. Check Interview (old system - what frontend uses)
    console.log(`4️⃣ INTERVIEW (Old System - Frontend Uses This):`);
    const interview = job.interviews?.[0];
    
    if (!interview) {
      console.log('   ❌ CRITICAL: Interview record does NOT exist!');
      console.log('   Frontend cannot find the interview session.\n');
      console.log('   💡 SOLUTION: Run "npm run db:fix-interview" to create it.\n');
    } else {
      console.log(`   Interview ID: ${interview.id}`);
      console.log(`   Status: ${interview.status}`);
      console.log(`   Current Round: ${interview.currentRound || 'NULL'}`);
      console.log(`   Started At: ${interview.startedAt ? interview.startedAt.toISOString() : 'NULL'}`);
      console.log(`   Created By: ${interview.createdBy || 'NULL'}\n`);

      // Parse rounds
      let rounds = [];
      try {
        rounds = JSON.parse(interview.rounds || '[]');
        console.log(`   Rounds Count: ${rounds.length}\n`);
        
        if (rounds.length === 0) {
          console.log('   ❌ ISSUE: No rounds in Interview record!\n');
        } else {
          console.log('   Rounds:');
          rounds.forEach((round, idx) => {
            console.log(`     ${idx + 1}. ${round.name || 'Unnamed'}`);
            console.log(`        Status: ${round.status || 'pending'}`);
            console.log(`        Order: ${round.order || idx + 1}`);
            console.log(`        Criteria: ${round.criteria ? 'Set' : 'Not set'}`);
            
            // Check if this round can be started
            const canStart = (round.status === 'pending' || !round.status) &&
                            !rounds.some(r => r.status === 'ongoing' && r.name !== round.name) &&
                            (idx === 0 || rounds[idx - 1]?.status === 'completed');
            console.log(`        Can Start: ${canStart ? '✅ YES' : '❌ NO'}`);
            if (!canStart) {
              if (round.status === 'completed') {
                console.log(`          Reason: Round is already completed`);
              }
              const ongoingRound = rounds.find(r => r.status === 'ongoing' && r.name !== round.name);
              if (ongoingRound) {
                console.log(`          Reason: Round "${ongoingRound.name}" is ongoing`);
              }
              if (idx > 0 && rounds[idx - 1]?.status !== 'completed') {
                console.log(`          Reason: Previous round "${rounds[idx - 1]?.name}" is not completed`);
              }
            }
            console.log('');
          });
        }
      } catch (e) {
        console.log(`   ❌ ERROR parsing rounds: ${e.message}`);
        console.log(`   Raw rounds data: ${interview.rounds}\n`);
      }

      // Check interview status
      const normalizedStatus = interview.status?.toUpperCase();
      if (normalizedStatus === 'COMPLETED' || normalizedStatus === 'CANCELLED') {
        console.log(`   ❌ BLOCKING: Interview status is "${interview.status}"`);
        console.log('   Completed/Cancelled interviews cannot start new rounds.\n');
      } else {
        console.log(`   ✅ Interview status allows round start: ${interview.status}\n`);
      }
    }

    // 5. Check API endpoint routing
    console.log(`5️⃣ API ENDPOINT CHECK:`);
    console.log(`   Frontend calls: POST /api/admin/interview/:interviewId/round/:roundName/start`);
    console.log(`   Backend route: /api/admin/interview/:interviewId/round/:roundName/start`);
    console.log(`   Controller: startAssessment in interviews.js\n`);

    if (interview) {
      console.log(`   Test URL would be: /api/admin/interview/${interview.id}/round/HR/start`);
      console.log(`   (Replace "HR" with actual round name)\n`);
    }

    // 6. Check applications/candidates
    const applications = await prisma.application.findMany({
      where: { 
        jobId: job.id,
        OR: [
          { screeningStatus: 'TEST_SELECTED' },
          { screeningStatus: 'RESUME_SELECTED' },
          { screeningStatus: 'INTERVIEW_ELIGIBLE' },
        ],
      },
      select: {
        id: true,
        screeningStatus: true,
        status: true,
      },
    });

    console.log(`6️⃣ QUALIFIED CANDIDATES:`);
    console.log(`   Count: ${applications.length}`);
    if (applications.length === 0) {
      console.log('   ⚠️  WARNING: No qualified candidates found!');
      console.log('   Rounds can start, but there may be no candidates to evaluate.\n');
    } else {
      console.log('   ✅ Qualified candidates exist\n');
    }

    // 7. Summary and recommendations
    console.log('='.repeat(80));
    console.log('📊 DIAGNOSIS SUMMARY:');
    console.log('='.repeat(80));

    const issues = [];
    const warnings = [];
    const checks = [];

    // Drive date (reuse variables from section 2)
    const summaryNow = new Date();
    const summaryDriveDate = job.driveDate ? new Date(job.driveDate) : null;
    const summaryNowDateOnly = new Date(summaryNow.getFullYear(), summaryNow.getMonth(), summaryNow.getDate());
    const summaryDriveDateOnly = summaryDriveDate ? new Date(summaryDriveDate.getFullYear(), summaryDriveDate.getMonth(), summaryDriveDate.getDate()) : null;
    
    if (!summaryDriveDate) {
      issues.push('❌ Drive date is not set');
    } else {
      if (summaryNowDateOnly < summaryDriveDateOnly) {
        issues.push(`❌ Current date (${summaryNowDateOnly.toISOString().split('T')[0]}) is before drive date (${summaryDriveDateOnly.toISOString().split('T')[0]})`);
      } else {
        checks.push('✅ Drive date validation passed');
      }
    }

    // Interview record
    if (!interview) {
      issues.push('❌ Interview record (old system) does not exist - frontend cannot find session');
    } else {
      checks.push('✅ Interview record exists');
      
      try {
        const rounds = JSON.parse(interview.rounds || '[]');
        if (rounds.length === 0) {
          issues.push('❌ No rounds in Interview record');
        } else {
          checks.push(`✅ ${rounds.length} rounds in Interview record`);
          
          const firstRound = rounds[0];
          if (firstRound.status === 'completed') {
            issues.push('❌ First round is already completed');
          } else if (firstRound.status === 'ongoing') {
            warnings.push('⚠️  First round is already ongoing');
          } else {
            checks.push('✅ First round is in startable state');
          }
        }
      } catch (e) {
        issues.push(`❌ Error parsing rounds: ${e.message}`);
      }

      const normalizedStatus = interview.status?.toUpperCase();
      if (normalizedStatus === 'COMPLETED' || normalizedStatus === 'CANCELLED') {
        issues.push(`❌ Interview status is "${interview.status}" - cannot start rounds`);
      } else {
        checks.push(`✅ Interview status is "${interview.status}"`);
      }
    }

    // InterviewSession
    if (!job.interviewSession) {
      warnings.push('⚠️  InterviewSession (new system) does not exist');
    } else {
      checks.push('✅ InterviewSession exists');
      
      if (job.interviewSession.rounds.length === 0) {
        warnings.push('⚠️  No rounds in InterviewSession');
      } else {
        checks.push(`✅ ${job.interviewSession.rounds.length} rounds in InterviewSession`);
      }
    }

    // Recalculate nowDateOnly and driveDateOnly for summary (use existing variables from above)
    // now, driveDate, nowDateOnly, driveDateOnly are already defined in section 2

    console.log('\n✅ Checks Passed:');
    checks.forEach(check => console.log(`  ${check}`));

    if (warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      warnings.forEach(warning => console.log(`  ${warning}`));
    }

    if (issues.length > 0) {
      console.log('\n❌ BLOCKING ISSUES:');
      issues.forEach(issue => console.log(`  ${issue}`));
      console.log('\n💡 RECOMMENDED FIXES:');
      
      if (issues.some(i => i.includes('Interview record'))) {
        console.log('  1. Run: npm run db:fix-interview');
      }
      if (issues.some(i => i.includes('drive date'))) {
        console.log('  2. Update job drive date to today or earlier');
        console.log('     Or wait until drive date arrives');
      }
      if (issues.some(i => i.includes('rounds'))) {
        console.log('  3. Ensure rounds are properly configured');
      }
      console.log('');
    } else {
      console.log('\n✅ NO BLOCKING ISSUES FOUND!');
      console.log('   Rounds should be able to start.');
      console.log('   If they still fail, check:');
      console.log('   - Browser console for frontend errors');
      console.log('   - Backend logs for API errors');
      console.log('   - Network tab for HTTP response details\n');
    }

  } catch (error) {
    console.error('❌ Error during diagnosis:', error);
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

    await deepDiagnose();
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
