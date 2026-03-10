/**
 * Diagnose Interview Round Start Issue
 * 
 * Checks why interview rounds are failing to start.
 * 
 * Usage:
 *   node scripts/diagnoseInterviewRound.js
 */

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient({
  log: ['error', 'warn'],
});

const COMPANY_NAME = 'CloudVantage Systems';
const JOB_TITLE = 'DevOps Engineer';

async function diagnoseInterviewRound() {
  console.log('🔍 Diagnosing interview round start issue...\n');

  try {
    // Find the job
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

    console.log(`✅ Found job: ${job.jobTitle}`);
    console.log(`   ID: ${job.id}`);
    console.log(`   Company: ${job.company?.name || job.companyName}`);
    console.log(`   Drive Date: ${job.driveDate ? new Date(job.driveDate).toISOString() : 'NOT SET'}`);
    console.log(`   Application Deadline: ${job.applicationDeadline ? new Date(job.applicationDeadline).toISOString() : 'NOT SET'}\n`);

    // Check drive date
    const now = new Date();
    const driveDate = job.driveDate ? new Date(job.driveDate) : null;
    
    if (!driveDate) {
      console.log('❌ ISSUE: Drive date is not set!');
      console.log('   Rounds cannot start without a drive date.\n');
    } else {
      const nowDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const driveDateOnly = new Date(driveDate.getFullYear(), driveDate.getMonth(), driveDate.getDate());
      
      if (nowDateOnly < driveDateOnly) {
        console.log('❌ ISSUE: Current date is before drive date!');
        console.log(`   Current Date: ${nowDateOnly.toISOString().split('T')[0]}`);
        console.log(`   Drive Date: ${driveDateOnly.toISOString().split('T')[0]}`);
        console.log(`   Rounds can only start on or after the drive date.\n`);
      } else {
        console.log('✅ Drive date check: PASSED');
        console.log(`   Current Date: ${nowDateOnly.toISOString().split('T')[0]}`);
        console.log(`   Drive Date: ${driveDateOnly.toISOString().split('T')[0]}\n`);
      }
    }

    // Check InterviewSession (new system)
    if (job.interviewSession) {
      console.log('📋 InterviewSession (New System):');
      console.log(`   Session ID: ${job.interviewSession.id}`);
      console.log(`   Status: ${job.interviewSession.status}`);
      console.log(`   Created At: ${job.interviewSession.createdAt.toISOString()}`);
      console.log(`   Started At: ${job.interviewSession.startedAt ? job.interviewSession.startedAt.toISOString() : 'Not started'}`);
      console.log(`   Rounds: ${job.interviewSession.rounds.length}`);
      console.log(`   Interviewer Invites: ${job.interviewSession.interviewerInvites.length}\n`);

      if (job.interviewSession.rounds.length === 0) {
        console.log('❌ ISSUE: No rounds configured!');
        console.log('   You need to configure rounds before starting.\n');
      } else {
        console.log('Rounds:');
        job.interviewSession.rounds.forEach((round, idx) => {
          console.log(`  ${idx + 1}. ${round.name} (Round ${round.roundNumber})`);
          console.log(`     Status: ${round.status}`);
          console.log(`     Started At: ${round.startedAt ? round.startedAt.toISOString() : 'Not started'}`);
          console.log(`     Ended At: ${round.endedAt ? round.endedAt.toISOString() : 'Not ended'}\n`);
        });

        // Check first round requirements
        const firstRound = job.interviewSession.rounds[0];
        if (firstRound) {
          console.log('🔍 First Round Requirements Check:');
          
          if (firstRound.status !== 'LOCKED') {
            console.log(`❌ ISSUE: First round status is "${firstRound.status}", must be "LOCKED" to start\n`);
          } else {
            console.log(`✅ Round status: ${firstRound.status} (correct)\n`);
          }

          if (job.interviewSession.interviewerInvites.length === 0) {
            console.log('❌ ISSUE: No interviewers invited!');
            console.log('   At least one interviewer must be invited before starting the first round.\n');
          } else {
            console.log(`✅ Interviewers: ${job.interviewSession.interviewerInvites.length} invited\n`);
          }

          if (job.interviewSession.status !== 'NOT_STARTED') {
            console.log(`❌ ISSUE: Session status is "${job.interviewSession.status}", must be "NOT_STARTED" to begin first round\n`);
          } else {
            console.log(`✅ Session status: ${job.interviewSession.status} (correct)\n`);
          }

          // Check for active rounds
          const activeRound = job.interviewSession.rounds.find(r => r.status === 'ACTIVE');
          if (activeRound) {
            console.log(`❌ ISSUE: Round "${activeRound.name}" is already active!`);
            console.log('   Only one round can be active at a time.\n');
          } else {
            console.log('✅ No active rounds (can start new round)\n');
          }
        }
      }
    } else {
      console.log('⚠️  No InterviewSession found (new system not initialized)\n');
    }

    // Check old Interview system
    if (job.interviews && job.interviews.length > 0) {
      console.log('📋 Interview (Old System):');
      job.interviews.forEach(interview => {
        console.log(`   Interview ID: ${interview.id}`);
        console.log(`   Status: ${interview.status}`);
        console.log(`   Current Round: ${interview.currentRound || 'None'}`);
        try {
          const rounds = JSON.parse(interview.rounds || '[]');
          console.log(`   Rounds: ${rounds.length}`);
          rounds.forEach((r, idx) => {
            console.log(`     ${idx + 1}. ${r.name} - ${r.status || 'pending'}`);
          });
        } catch (e) {
          console.log(`   Rounds: Error parsing - ${e.message}`);
        }
        console.log('');
      });
    }

    // Check applications
    const applications = await prisma.application.findMany({
      where: { jobId: job.id },
      include: {
        student: {
          select: {
            fullName: true,
            email: true,
          },
        },
      },
    });

    console.log(`📋 Applications: ${applications.length}`);
    if (applications.length > 0) {
      const statusCounts = {};
      applications.forEach(app => {
        const status = app.screeningStatus || app.status || 'APPLIED';
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      });
      console.log('Status breakdown:');
      Object.entries(statusCounts).forEach(([status, count]) => {
        console.log(`  ${status}: ${count}`);
      });
      console.log('');
    }

    // Summary
    console.log('='.repeat(80));
    console.log('📊 DIAGNOSIS SUMMARY:');
    console.log('='.repeat(80));
    
    const issues = [];
    const checks = [];

    if (!driveDate) {
      issues.push('❌ Drive date is not set');
    } else {
      const nowDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const driveDateOnly = new Date(driveDate.getFullYear(), driveDate.getMonth(), driveDate.getDate());
      if (nowDateOnly < driveDateOnly) {
        issues.push('❌ Current date is before drive date');
      } else {
        checks.push('✅ Drive date check passed');
      }
    }

    if (job.interviewSession) {
      if (job.interviewSession.rounds.length === 0) {
        issues.push('❌ No rounds configured');
      } else {
        checks.push(`✅ ${job.interviewSession.rounds.length} rounds configured`);
      }

      if (job.interviewSession.interviewerInvites.length === 0) {
        issues.push('❌ No interviewers invited');
      } else {
        checks.push(`✅ ${job.interviewSession.interviewerInvites.length} interviewers invited`);
      }

      const firstRound = job.interviewSession.rounds[0];
      if (firstRound) {
        if (firstRound.status !== 'LOCKED') {
          issues.push(`❌ First round status is "${firstRound.status}" (must be LOCKED)`);
        } else {
          checks.push('✅ First round is LOCKED');
        }
      }

      if (job.interviewSession.status !== 'NOT_STARTED') {
        issues.push(`❌ Session status is "${job.interviewSession.status}" (must be NOT_STARTED)`);
      } else {
        checks.push('✅ Session status is NOT_STARTED');
      }

      const activeRound = job.interviewSession.rounds.find(r => r.status === 'ACTIVE');
      if (activeRound) {
        issues.push(`❌ Round "${activeRound.name}" is already active`);
      } else {
        checks.push('✅ No active rounds');
      }
    } else {
      issues.push('❌ InterviewSession not created (need to schedule interview first)');
    }

    console.log('\n✅ Checks Passed:');
    checks.forEach(check => console.log(`  ${check}`));

    if (issues.length > 0) {
      console.log('\n❌ Issues Found:');
      issues.forEach(issue => console.log(`  ${issue}`));
      console.log('\n💡 Fix these issues to start rounds successfully.\n');
    } else {
      console.log('\n✅ All checks passed! Rounds should be able to start.\n');
    }

  } catch (error) {
    console.error('❌ Error:', error);
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

    await diagnoseInterviewRound();
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
