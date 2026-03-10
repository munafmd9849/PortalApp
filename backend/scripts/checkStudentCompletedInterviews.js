/**
 * Check how many companies a student has cleared all interview rounds for
 * Usage: node scripts/checkStudentCompletedInterviews.js <email>
 */

import prisma from '../src/config/database.js';

const email = process.argv[2];

if (!email) {
  console.error('❌ Error: Email is required');
  console.log('Usage: node scripts/checkStudentCompletedInterviews.js <email>');
  process.exit(1);
}

async function checkStudentCompletedInterviews() {
  try {
    console.log(`\n🔍 Checking interview completion status for: ${email}\n`);

    // Find student by email
    const student = await prisma.student.findUnique({
      where: { email },
      select: {
        id: true,
        fullName: true,
        email: true,
        enrollmentId: true,
      },
    });

    if (!student) {
      console.error(`❌ Student not found with email: ${email}`);
      process.exit(1);
    }

    console.log(`✅ Student found: ${student.fullName} (${student.enrollmentId || 'N/A'})\n`);

    // Get all applications with interview sessions
    const applications = await prisma.application.findMany({
      where: { studentId: student.id },
      include: {
        job: {
          include: {
            company: {
              select: {
                name: true,
              },
            },
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
              select: {
                roundNumber: true,
                name: true,
                status: true,
              },
            },
          },
          orderBy: { round: { roundNumber: 'asc' } },
        },
      },
      orderBy: { appliedDate: 'desc' },
    });

    console.log(`📋 Total applications: ${applications.length}\n`);

    // Filter applications with interview sessions
    const applicationsWithInterviews = applications.filter(app => app.job.interviewSession);

    console.log(`📊 Applications with interview sessions: ${applicationsWithInterviews.length}\n`);

    // Check each application
    const completedCompanies = [];
    const ongoingCompanies = [];
    const notStartedCompanies = [];

    for (const app of applicationsWithInterviews) {
      const session = app.job.interviewSession;
      const rounds = session.rounds || [];
      const evaluations = app.roundEvaluations || [];

      const companyName = app.job.company?.name || 'Unknown Company';
      const jobTitle = app.job.jobTitle || 'Unknown Position';

      // Check if all rounds are completed
      const allRoundsEnded = rounds.length > 0 && rounds.every(round => round.status === 'ENDED');
      const sessionCompleted = session.status === 'COMPLETED';
      const hasStarted = evaluations.length > 0 || (app.lastRoundReached || 0) > 0;

      // Check if student was selected
      const isSelected = app.status === 'SELECTED' || app.interviewStatus === 'SELECTED';

      // Check if student was rejected
      const isRejected = app.status === 'REJECTED' || 
                        app.interviewStatus?.startsWith('REJECTED_IN_ROUND_') ||
                        app.screeningStatus === 'RESUME_REJECTED' ||
                        app.screeningStatus === 'TEST_REJECTED';

      // Determine status
      let status;
      if (isSelected) {
        status = 'SELECTED';
      } else if (isRejected) {
        status = 'REJECTED';
      } else if (allRoundsEnded || sessionCompleted) {
        status = 'COMPLETED';
      } else if (hasStarted) {
        status = 'ONGOING';
      } else {
        status = 'NOT_STARTED';
      }

      const roundDetails = rounds.map(round => ({
        number: round.roundNumber,
        name: round.name,
        status: round.status,
        hasEvaluation: evaluations.some(e => e.round.roundNumber === round.roundNumber),
      }));

      const companyInfo = {
        company: companyName,
        jobTitle,
        applicationId: app.id,
        sessionStatus: session.status,
        rounds: roundDetails,
        totalRounds: rounds.length,
        completedRounds: rounds.filter(r => r.status === 'ENDED').length,
        evaluations: evaluations.length,
        lastRoundReached: app.lastRoundReached || 0,
        applicationStatus: app.status,
        interviewStatus: app.interviewStatus,
        screeningStatus: app.screeningStatus,
        status,
      };

      if (status === 'COMPLETED' || status === 'SELECTED') {
        completedCompanies.push(companyInfo);
      } else if (status === 'ONGOING') {
        ongoingCompanies.push(companyInfo);
      } else {
        notStartedCompanies.push(companyInfo);
      }
    }

    // Display results
    console.log('='.repeat(80));
    console.log('📊 INTERVIEW COMPLETION SUMMARY');
    console.log('='.repeat(80));
    console.log(`\n✅ Companies with ALL rounds completed: ${completedCompanies.length}`);
    console.log(`⏳ Companies with ongoing interviews: ${ongoingCompanies.length}`);
    console.log(`🔒 Companies with interviews not started: ${notStartedCompanies.length}`);
    console.log(`\n📈 Total companies cleared all rounds: ${completedCompanies.length}\n`);

    if (completedCompanies.length > 0) {
      console.log('='.repeat(80));
      console.log('✅ COMPLETED INTERVIEWS (All Rounds Cleared)');
      console.log('='.repeat(80));
      completedCompanies.forEach((company, index) => {
        console.log(`\n${index + 1}. ${company.company}`);
        console.log(`   Position: ${company.jobTitle}`);
        console.log(`   Session Status: ${company.sessionStatus}`);
        console.log(`   Total Rounds: ${company.totalRounds}`);
        console.log(`   Completed Rounds: ${company.completedRounds}`);
        console.log(`   Evaluations: ${company.evaluations}`);
        console.log(`   Final Status: ${company.status === 'SELECTED' ? 'SELECTED ✅' : 'Completed'}`);
        console.log(`   Rounds:`);
        company.rounds.forEach(round => {
          const evalIcon = round.hasEvaluation ? '✓' : '✗';
          console.log(`     Round ${round.number}: ${round.name} - ${round.status} ${evalIcon}`);
        });
      });
    }

    if (ongoingCompanies.length > 0) {
      console.log('\n' + '='.repeat(80));
      console.log('⏳ ONGOING INTERVIEWS');
      console.log('='.repeat(80));
      ongoingCompanies.forEach((company, index) => {
        console.log(`\n${index + 1}. ${company.company}`);
        console.log(`   Position: ${company.jobTitle}`);
        console.log(`   Completed Rounds: ${company.completedRounds} / ${company.totalRounds}`);
        console.log(`   Last Round Reached: ${company.lastRoundReached || 0}`);
      });
    }

    if (notStartedCompanies.length > 0) {
      console.log('\n' + '='.repeat(80));
      console.log('🔒 INTERVIEWS NOT STARTED');
      console.log('='.repeat(80));
      notStartedCompanies.forEach((company, index) => {
        console.log(`\n${index + 1}. ${company.company}`);
        console.log(`   Position: ${company.jobTitle}`);
        console.log(`   Total Rounds: ${company.totalRounds}`);
        console.log(`   Session Status: ${company.sessionStatus}`);
      });
    }

    console.log('\n' + '='.repeat(80));
    console.log(`\n✅ Answer: ${completedCompanies.length} company/companies cleared all interview rounds`);
    console.log('='.repeat(80) + '\n');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

checkStudentCompletedInterviews();
