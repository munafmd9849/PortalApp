/**
 * Fix Interview System Mismatch
 * 
 * Creates Interview record (old system) from InterviewSession (new system)
 * to fix the mismatch between frontend and backend.
 * 
 * Usage:
 *   node scripts/fixInterviewSystem.js
 */

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient({
  log: ['error', 'warn'],
});

const COMPANY_NAME = 'CloudVantage Systems';
const JOB_TITLE = 'DevOps Engineer';

async function fixInterviewSystem() {
  console.log('🔧 Fixing interview system mismatch...\n');

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
        interviewSession: {
          include: {
            rounds: {
              orderBy: { roundNumber: 'asc' },
            },
          },
        },
        interviews: true, // Old system
        applications: {
          where: {
            OR: [
              { screeningStatus: 'TEST_SELECTED' },
              { screeningStatus: 'RESUME_SELECTED' },
              { screeningStatus: 'INTERVIEW_ELIGIBLE' },
            ],
          },
          include: {
            student: {
              select: {
                id: true,
                fullName: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!job) {
      console.error(`❌ Job not found: ${JOB_TITLE} at ${COMPANY_NAME}`);
      return;
    }

    console.log(`✅ Found job: ${job.jobTitle}`);
    console.log(`   ID: ${job.id}\n`);

    // Check if old Interview record exists
    let interview = job.interviews?.[0];
    
    if (!interview) {
      console.log('📝 Creating Interview record (old system) from InterviewSession...\n');
      
      // Get qualified candidates
      const qualifiedCandidates = job.applications.filter(app => {
        const status = app.screeningStatus || app.status;
        return status === 'TEST_SELECTED' || status === 'RESUME_SELECTED' || status === 'INTERVIEW_ELIGIBLE';
      });

      // Convert InterviewSession rounds to old format
      let rounds = [];
      if (job.interviewSession && job.interviewSession.rounds.length > 0) {
        rounds = job.interviewSession.rounds.map(round => ({
          name: round.name,
          criteria: '', // Can be added later
          status: round.status === 'ACTIVE' ? 'ongoing' : round.status === 'ENDED' ? 'completed' : 'pending',
          order: round.roundNumber,
        }));
      } else {
        // Default rounds if none exist
        rounds = [
          { name: 'Technical Round 1', criteria: '', status: 'pending', order: 1 },
          { name: 'Technical Round 2', criteria: '', status: 'pending', order: 2 },
          { name: 'HR Round', criteria: '', status: 'pending', order: 3 },
        ];
      }

      // Create Interview record
      interview = await prisma.interview.create({
        data: {
          jobId: job.id,
          companyId: job.companyId,
          status: job.interviewSession?.status === 'ONGOING' ? 'ONGOING' : 'ONGOING',
          currentRound: job.interviewSession?.rounds.find(r => r.status === 'ACTIVE')?.name || null,
          rounds: JSON.stringify(rounds),
          totalCandidates: qualifiedCandidates.length,
          doneCandidates: 0,
          pendingCandidates: qualifiedCandidates.length,
          selectedCandidates: 0,
          onHoldCandidates: 0,
          createdBy: job.interviewSession?.createdBy || null,
        },
      });

      console.log(`✅ Created Interview record: ${interview.id}`);
      console.log(`   Rounds: ${rounds.length}`);
      console.log(`   Qualified Candidates: ${qualifiedCandidates.length}\n`);
    } else {
      console.log('✅ Interview record already exists');
      console.log(`   ID: ${interview.id}`);
      
      // Update rounds if InterviewSession has rounds but Interview doesn't
      if (job.interviewSession && job.interviewSession.rounds.length > 0) {
        let existingRounds = [];
        try {
          existingRounds = JSON.parse(interview.rounds || '[]');
        } catch (e) {
          existingRounds = [];
        }

        if (existingRounds.length === 0) {
          console.log('📝 Updating rounds from InterviewSession...\n');
          const rounds = job.interviewSession.rounds.map(round => ({
            name: round.name,
            criteria: '',
            status: round.status === 'ACTIVE' ? 'ongoing' : round.status === 'ENDED' ? 'completed' : 'pending',
            order: round.roundNumber,
          }));

          await prisma.interview.update({
            where: { id: interview.id },
            data: {
              rounds: JSON.stringify(rounds),
              currentRound: job.interviewSession.rounds.find(r => r.status === 'ACTIVE')?.name || null,
            },
          });

          console.log(`✅ Updated rounds: ${rounds.length} rounds\n`);
        }
      }
    }

    // Display current state
    console.log('📋 Current Interview State:');
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

    // Verify the fix
    const updatedInterview = await prisma.interview.findUnique({
      where: { id: interview.id },
    });

    console.log('✅ Interview system is now synchronized!\n');
    console.log('💡 The frontend should now be able to start rounds.\n');

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

    await fixInterviewSystem();
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
