/**
 * Check what status the backend API returns for a student's applications
 * Usage: node scripts/checkStudentApplicationStatus.js <email>
 */

import prisma from '../src/config/database.js';

const email = process.argv[2];

if (!email) {
  console.error('❌ Error: Email is required');
  console.log('Usage: node scripts/checkStudentApplicationStatus.js <email>');
  process.exit(1);
}

// Import the status computation function logic
function normalizeScreeningStatus(value) {
  return (value || 'APPLIED').toUpperCase();
}

function normalizeInterviewStatus(value) {
  return value ? String(value).toUpperCase() : null;
}

function getFinalStatus({ status, screeningStatus, interviewStatus }) {
  if (interviewStatus === 'SELECTED') return 'SELECTED';
  if (interviewStatus && interviewStatus.startsWith('REJECTED_IN_ROUND_')) return 'REJECTED';
  if (screeningStatus === 'RESUME_REJECTED' || screeningStatus === 'TEST_REJECTED') return 'REJECTED';
  const normalized = status ? String(status).toUpperCase() : null;
  if (normalized === 'SELECTED') return 'SELECTED';
  if (normalized === 'REJECTED') return 'REJECTED';
  return 'ONGOING';
}

function computeApplicationTrackingFields({
  status,
  screeningStatus,
  interviewStatus,
  lastRoundReached,
  hasInterviewSession,
  hasInterviewStarted,
  sessionStatus,
  sessionRounds,
}) {
  const screening = normalizeScreeningStatus(screeningStatus);
  const interview = normalizeInterviewStatus(interviewStatus);
  const dbLastRoundReached = typeof lastRoundReached === 'number' ? lastRoundReached : parseInt(lastRoundReached || 0, 10) || 0;

  const finalStatus = getFinalStatus({ status, screeningStatus: screening, interviewStatus: interview });
  
  // Check if all rounds are completed
  const allRoundsCompleted = sessionRounds && sessionRounds.length > 0 && 
    sessionRounds.every(round => round.status === 'ENDED');
  const sessionCompleted = sessionStatus === 'COMPLETED';

  // Derive "current stage" text strictly from DB fields
  let currentStage = 'Applied';

  if (finalStatus === 'SELECTED') {
    currentStage = 'Selected (Final)';
  } else if (finalStatus === 'REJECTED') {
    currentStage = 'Rejected';
  } else {
    // ONGOING
    if (screening === 'RESUME_SELECTED') {
      currentStage = 'Screening Qualified';
    } else if (screening === 'TEST_SELECTED' || screening === 'INTERVIEW_ELIGIBLE') {
      if (hasInterviewSession && hasInterviewStarted) {
        // Check if all rounds are completed
        if (allRoundsCompleted || sessionCompleted) {
          currentStage = 'Interview Completed';
        } else {
          const currentRound = Math.max(1, dbLastRoundReached + 1);
          currentStage = `Interview Round ${currentRound}`;
        }
      } else {
        currentStage = 'Qualified for Interview';
      }
    } else if (screening === 'APPLIED') {
      currentStage = 'Applied';
    }
  }

  return {
    currentStage,
    finalStatus,
    allRoundsCompleted,
    sessionCompleted,
    hasInterviewSession,
    hasInterviewStarted,
  };
}

async function checkStudentApplicationStatus() {
  try {
    console.log(`\n🔍 Checking application status for: ${email}\n`);

    // Find student
    const student = await prisma.student.findUnique({
      where: { email },
      select: { id: true, fullName: true, email: true },
    });

    if (!student) {
      console.error(`❌ Student not found: ${email}`);
      process.exit(1);
    }

    // Get applications with all related data (same as getStudentApplications)
    const applications = await prisma.application.findMany({
      where: { studentId: student.id },
      include: {
        job: {
          include: {
            company: true,
            interviewSession: {
              include: {
                rounds: {
                  orderBy: { roundNumber: 'asc' },
                },
              },
            },
          },
        },
        roundEvaluations: {
          include: {
            round: {
              select: { roundNumber: true, name: true },
            },
          },
          orderBy: { round: { roundNumber: 'asc' } },
        },
      },
      orderBy: { appliedDate: 'desc' },
    });

    console.log(`📋 Found ${applications.length} applications\n`);
    console.log('='.repeat(100));

    for (const app of applications) {
      const session = app.job.interviewSession;
      const evaluations = app.roundEvaluations || [];
      const screeningStatus = app.screeningStatus || 'APPLIED';
      
      const hasInterviewSession = !!session;
      const hasInterviewStarted = (app.lastRoundReached || 0) > 0 || evaluations.length > 0;

      const tracking = computeApplicationTrackingFields({
        status: app.status,
        screeningStatus,
        interviewStatus: app.interviewStatus,
        lastRoundReached: app.lastRoundReached || 0,
        hasInterviewSession,
        hasInterviewStarted,
        sessionStatus: session?.status || null,
        sessionRounds: session?.rounds || null,
      });

      console.log(`\n📌 ${app.job.company?.name || 'Unknown'} - ${app.job.jobTitle || 'Unknown'}`);
      console.log(`   Application ID: ${app.id}`);
      console.log(`   Status (DB): ${app.status}`);
      console.log(`   Interview Status (DB): ${app.interviewStatus || 'null'}`);
      console.log(`   Screening Status (DB): ${app.screeningStatus || 'APPLIED'}`);
      console.log(`   Last Round Reached (DB): ${app.lastRoundReached || 0}`);
      console.log(`   Has Interview Session: ${hasInterviewSession}`);
      console.log(`   Has Interview Started: ${hasInterviewStarted}`);
      console.log(`   Session Status: ${session?.status || 'N/A'}`);
      console.log(`   Total Rounds: ${session?.rounds?.length || 0}`);
      console.log(`   Rounds Status:`);
      if (session?.rounds) {
        session.rounds.forEach(round => {
          console.log(`     - Round ${round.roundNumber} (${round.name}): ${round.status}`);
        });
      }
      console.log(`   All Rounds Completed: ${tracking.allRoundsCompleted}`);
      console.log(`   Session Completed: ${tracking.sessionCompleted}`);
      console.log(`   Final Status (computed): ${tracking.finalStatus}`);
      console.log(`   ⭐ CURRENT STAGE (what frontend should show): "${tracking.currentStage}"`);
      console.log(`   Evaluations: ${evaluations.length}`);
      
      if (tracking.currentStage === 'Qualified for Interview' && tracking.allRoundsCompleted) {
        console.log(`   ⚠️  ISSUE: All rounds completed but still showing "Qualified for Interview"!`);
      }
    }

    console.log('\n' + '='.repeat(100) + '\n');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

checkStudentApplicationStatus();
