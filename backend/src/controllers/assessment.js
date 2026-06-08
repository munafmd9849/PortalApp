import prisma from '../config/database.js';
import { sendBulkAssessmentNotifications } from '../services/emailService.js';
import vm from 'vm';

/**
 * ASSESSMENT ENGINE CONTROLLER
 * Handles Mock Tests, Mock Interviews, and Proctoring Sessions
 */

// --- ADMIN MODULES ---

// Create Assessment
export async function createAssessment(req, res) {
  try {
    const { title, description, type, difficulty, duration, startTime, endTime, instructions, config, questions, targetBatchIds, targetStudentIds, scheduledAtMap } = req.body;

    // Prepare assignments data
    const batchAssignments = (targetBatchIds || []).map(batchId => ({ batchId }));
    
    // Resolve studentIds from studentUserIds (passed from frontend)
    let studentAssignments = [];
    if (targetStudentIds && targetStudentIds.length > 0) {
      const targetStudents = await prisma.student.findMany({
        where: { userId: { in: targetStudentIds } },
        select: { id: true, userId: true }
      });
      
      studentAssignments = targetStudents.map(s => ({ 
        studentId: s.id,
        scheduledAt: scheduledAtMap?.[s.userId] ? new Date(scheduledAtMap[s.userId]) : null
      }));
    }

    const assessment = await prisma.assessment.create({
      data: {
        title,
        description,
        type,
        difficulty: difficulty || 'MEDIUM',
        duration: parseInt(duration),
        startTime: startTime ? new Date(startTime) : null,
        endTime: endTime ? new Date(endTime) : null,
        instructions,
        config: JSON.stringify(config || {}),
        questions: {
          create: (questions || []).map((q, index) => ({
            questionText: q.text,
            description: q.description,
            type: q.type,
            options: JSON.stringify(q.options || []),
            correctAnswer: q.correctAnswer,
            points: parseInt(q.points) || 1,
            difficulty: q.difficulty || 'MEDIUM',
            starterCode: q.starterCode,
            testCases: JSON.stringify(q.testCases || []),
            order: index
          }))
        },
        assignments: {
          create: [...batchAssignments, ...studentAssignments]
        }
      }
    });

    // --- NOTIFICATION LOGIC ---
    try {
      const { getIO } = await import('../config/socket.js');
      const io = getIO();
      
      // Find all targeted students (from batches OR individual selection)
      const students = await prisma.student.findMany({
        where: { 
          OR: [
            { batchId: { in: targetBatchIds || [] } },
            { userId: { in: targetStudentIds || [] } }
          ]
        },
        include: { user: { select: { email: true } } }
      });

      // Create persistent notifications in DB
      await prisma.notification.createMany({
        data: students.map(s => ({
          userId: s.userId,
          title: 'New Assessment Assigned',
          body: `You have been assigned a new ${type.replace('_', ' ').toLowerCase()}: ${title}`,
          type: 'ASSESSMENT',
          link: `/student/dashboard?tab=assessments`
        }))
      });

      // Emit real-time socket events
      students.forEach(s => {
        io.to(`user:${s.userId}`).emit('notification', {
          title: 'New Assessment',
          message: `A new ${type.replace('_', ' ').toLowerCase()} has been assigned to you.`,
          type: 'ASSESSMENT'
        });
      });

      // Dispatch Email Notifications
      const studentEmailData = students.map(s => ({
        ...s,
        email: s.user?.email,
        fullName: s.fullName || 'Student'
      }));
      
      sendBulkAssessmentNotifications(studentEmailData, assessment).catch(err => 
        console.error('Email notification background error:', err)
      );

    } catch (notificationError) {
      console.error('Multi-channel notification failed:', notificationError);
    }

    res.status(201).json(assessment);
  } catch (error) {
    console.error('Create Assessment Error:', error);
    res.status(500).json({ error: 'Failed to create assessment' });
  }
}

// Get All Assessments (Admin)
export async function getAssessments(req, res) {
  try {
    console.log('[DEBUG] Fetching all assessments...');
    const assessments = await prisma.assessment.findMany({
      include: {
        sessions: { select: { id: true, studentId: true, status: true, score: true } },
        assignments: { 
          include: { 
            student: { 
              select: { 
                id: true, 
                fullName: true, 
                profileImageUrl: true,
                user: { select: { displayName: true } }
              } 
            } 
          } 
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    console.log(`[DEBUG] Found ${assessments.length} assessments`);
    res.json(assessments);
  } catch (error) {
    console.error('[ERROR] getAssessments failed:', error);
    res.status(500).json({ error: 'Failed to fetch assessments', details: error.message });
  }
}

// Get Assessment Details
export async function getAssessmentDetails(req, res) {
  try {
    const { id } = req.params;
    const assessment = await prisma.assessment.findUnique({
      where: { id },
      include: { questions: true }
    });
    if (!assessment) return res.status(404).json({ error: 'Assessment not found' });
    res.json(assessment);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch assessment details' });
  }
}

export async function updateAssessment(req, res) {
  try {
    const { id } = req.params;
    const { title, duration, startTime, endTime } = req.body;

    const assessment = await prisma.assessment.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(duration && { duration: parseInt(duration) }),
        ...(startTime !== undefined && { startTime: startTime ? new Date(startTime) : null }),
        ...(endTime !== undefined && { endTime: endTime ? new Date(endTime) : null }),
      }
    });

    res.json({ message: 'Assessment updated successfully', assessment });
  } catch (error) {
    console.error(`[ERROR] Failed to update assessment ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to update assessment' });
  }
}

export async function deleteAssessment(req, res) {
  try {
    const { id } = req.params;

    await prisma.assessment.delete({
      where: { id }
    });

    res.json({ message: 'Assessment deleted successfully' });
  } catch (error) {
    console.error(`[ERROR] Failed to delete assessment ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to delete assessment' });
  }
}

// --- STUDENT MODULES ---

// Get Assigned Assessments for Student
export async function getStudentAssessments(req, res) {
  try {
    const student = await prisma.student.findUnique({
      where: { userId: req.user.id }
    });

    if (!student) return res.status(404).json({ error: 'Student not found' });

    // Find assessments assigned specifically to student or their batch/school
    const assessments = await prisma.assessment.findMany({
      where: {
        assignments: {
          some: {
            OR: [
              { studentId: student.id },
              { batchId: student.batchId },
              { schoolId: student.schoolId }
            ]
          }
        }
      },
      include: {
        sessions: {
          where: { studentId: student.id }
        },
        assignments: {
          where: { studentId: student.id },
          select: { scheduledAt: true }
        }
      },
    });

    res.json(assessments);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch assigned assessments' });
  }
}

// Start Assessment Session
export async function startSession(req, res) {
  try {
    const { assessmentId } = req.params;
    const student = await prisma.student.findUnique({ 
      where: { userId: req.userId || req.user.id } 
    });

    if (!student) {
      console.error(`❌ startSession failed: Student profile not found for userId ${req.userId || req.user.id}`);
      return res.status(404).json({ error: 'Student profile not found. Please complete your onboarding.' });
    }

    let session = await prisma.assessmentSession.findUnique({
      where: { assessmentId_studentId: { assessmentId, studentId: student.id } }
    });

    if (session) {
      if (session.status !== 'IN_PROGRESS') {
        return res.status(403).json({ error: 'Assessment already completed' });
      }
      return res.json(session);
    }

    try {
      session = await prisma.assessmentSession.create({
        data: {
          assessmentId,
          studentId: student.id,
          status: 'IN_PROGRESS'
        }
      });
    } catch (createError) {
      // Handle React 18 Strict Mode double-mounting race condition
      if (createError.code === 'P2002') {
        session = await prisma.assessmentSession.findUnique({
          where: { assessmentId_studentId: { assessmentId, studentId: student.id } }
        });
      } else {
        throw createError;
      }
    }

    res.status(201).json(session);
  } catch (error) {
    res.status(500).json({ error: 'Failed to start session' });
  }
}

// Submit Violation
export async function logViolation(req, res) {
  try {
    const { sessionId } = req.params;
    const { type, details } = req.body;

    await prisma.assessmentViolation.create({
      data: {
        sessionId,
        type,
        details
      }
    });

    // Increment violation count in session
    await prisma.assessmentSession.update({
      where: { id: sessionId },
      data: {
        violationsCount: { increment: 1 }
      }
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to log violation' });
  }
}

// Upload Proctoring Media
export async function uploadMedia(req, res) {
  try {
    const { sessionId } = req.params;
    const { type, url } = req.body;

    const media = await prisma.assessmentMedia.create({
      data: {
        sessionId,
        type,
        url
      }
    });

    res.status(201).json(media);
  } catch (error) {
    res.status(500).json({ error: 'Failed to upload media' });
  }
}

// Complete Assessment & Auto-Grader Engine
export async function completeAssessment(req, res) {
  try {
    const { sessionId } = req.params;
    const { answers: rawAnswers } = req.body;
    const answers = JSON.parse(rawAnswers || '{}');

    // Fetch session and questions for auto-grading
    const session = await prisma.assessmentSession.findUnique({
      where: { id: sessionId },
      include: { assessment: { include: { questions: true } } }
    });

    if (!session) return res.status(404).json({ error: 'Session not found' });

    let calculatedScore = 0;
    let hasDescriptive = false;
    let executionLogs = {}; // Store test case results
    const questions = session.assessment.questions;

    // The Grading Pipeline
    for (const q of questions) {
      const studentAnswer = answers[q.id];
      if (!studentAnswer) continue;

      if (q.type === 'MCQ') {
        if (studentAnswer === q.correctAnswer) {
          calculatedScore += q.points;
        }
      } 
      else if (q.type === 'CODING') {
        try {
          const testCases = typeof q.testCases === 'string' ? JSON.parse(q.testCases) : (q.testCases || []);
          let passedCases = 0;
          let logs = [];

          // Sandbox Execution loop
          for (const tc of testCases) {
            let parsedInput = tc.input;
            try { parsedInput = JSON.parse(tc.input); } catch(e) {} // Handle arrays/objects if valid JSON
            
            try {
              const context = { console: { log: () => {} } }; // Silent console
              vm.createContext(context);
              
              const script = new vm.Script(`
                ${studentAnswer}
                // Try calling 'solution' function with input
                if (typeof solution === 'function') {
                  solution(${JSON.stringify(parsedInput)});
                } else {
                  null;
                }
              `);
              
              // 1 second timeout to prevent infinite loops
              const result = script.runInContext(context, { timeout: 1000 });
              
              const isCorrect = String(result).trim() === String(tc.output).trim();
              if (isCorrect) passedCases++;
              
              logs.push({ input: tc.input, expected: tc.output, actual: result, passed: isCorrect });
            } catch (err) {
              logs.push({ input: tc.input, expected: tc.output, error: err.message, passed: false });
            }
          }

          executionLogs[q.id] = { passed: passedCases, total: testCases.length, logs };
          
          // Calculate partial points based on passed test cases
          if (testCases.length > 0) {
             const pointsEarned = Math.floor((passedCases / testCases.length) * q.points);
             calculatedScore += pointsEarned;
          }

        } catch (e) {
          console.error(`Coding evaluation failed for Q${q.id}:`, e);
          executionLogs[q.id] = { error: 'Evaluation Engine Failure' };
        }
      } 
      else if (q.type === 'DESCRIPTIVE') {
        hasDescriptive = true;
      }
    }

    const updatedSession = await prisma.assessmentSession.update({
      where: { id: sessionId },
      data: {
        status: hasDescriptive ? 'PENDING_REVIEW' : 'COMPLETED',
        endTime: new Date(),
        score: calculatedScore,
        responses: JSON.stringify({ rawAnswers: answers, executionLogs })
      }
    });

    res.json(updatedSession);
  } catch (error) {
    console.error('Complete Assessment Error:', error);
    res.status(500).json({ error: 'Failed to complete assessment' });
  }
}

// --- REVIEW MODULE ---

// Get Session Results (Admin)
export async function getSessionResults(req, res) {
  try {
    const { sessionId } = req.params;
    const session = await prisma.assessmentSession.findUnique({
      where: { id: sessionId },
      include: {
        student: true,
        assessment: { include: { questions: true } },
        violations: true,
        media: true
      }
    });
    res.json(session);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch session results' });
  }
}

// Get All Assessment Results (Leaderboard)
export async function getAssessmentResults(req, res) {
  try {
    const { id } = req.params;
    
    // Fetch the assessment and all its sessions
    const assessment = await prisma.assessment.findUnique({
      where: { id },
      include: {
        questions: true,
        sessions: {
          include: {
            student: {
              select: {
                id: true,
                fullName: true,
                enrollmentId: true,
                batch: true
              }
            },
            violations: true
          },
          orderBy: { score: 'desc' }
        }
      }
    });

    if (!assessment) {
      console.log(`[DEBUG] getAssessmentResults: Assessment not found for id ${id}`);
      return res.status(404).json({ error: 'Assessment not found' });
    }
    console.log(`[DEBUG] getAssessmentResults: Successfully fetched leaderboard for ${id}`);
    res.json(assessment);
  } catch (error) {
    console.error(`[ERROR] Failed to fetch assessment leaderboard for ${req.params.id}:`, error);
    console.error('Failed to fetch assessment leaderboard:', error);
    res.status(500).json({ error: 'Failed to fetch assessment leaderboard' });
  }
}

// Get Live Sessions for Monitor
export async function getLiveAssessmentSessions(req, res) {
  try {
    const { id } = req.params;
    
    const activeSessions = await prisma.assessmentSession.findMany({
      where: { 
        assessmentId: id,
        status: 'IN_PROGRESS'
      },
      include: {
        student: { select: { fullName: true } },
        violations: {
          orderBy: { timestamp: 'desc' },
          take: 1
        }
      }
    });

    const formatted = activeSessions.map(session => {
      // Calculate last ping based on last violation or startTime
      const lastActivity = session.violations.length > 0 
        ? session.violations[0].timestamp 
        : session.startTime;
      
      const secondsAgo = Math.floor((new Date() - new Date(lastActivity)) / 1000);
      let lastPing = 'Just now';
      if (secondsAgo > 60) lastPing = `${Math.floor(secondsAgo / 60)}m ago`;

      return {
        id: session.id,
        studentName: session.student.fullName,
        status: session.riskLevel || (session.violationsCount > 3 ? 'CRITICAL' : session.violationsCount > 0 ? 'WARNING' : 'ACTIVE'),
        violations: session.violationsCount,
        lastPing,
        lastViolation: session.violations.length > 0 ? session.violations[0].type.replace(/_/g, ' ') : null
      };
    });

    res.json(formatted);
  } catch (error) {
    console.error('Failed to fetch live sessions:', error);
    res.status(500).json({ error: 'Failed to fetch live sessions' });
  }
}

// Evaluate Candidate (Admin)
export async function evaluateAssessmentCandidate(req, res) {
  try {
    const { assessmentId, studentId } = req.params;
    const { marks, remarks, status } = req.body;

    // Find or Create session for this student-assessment pair
    let session = await prisma.assessmentSession.findUnique({
      where: { assessmentId_studentId: { assessmentId, studentId } }
    });

    if (!session) {
      session = await prisma.assessmentSession.create({
        data: {
          assessmentId,
          studentId,
          status: status || 'COMPLETED',
          score: marks ? parseFloat(marks) : null,
          endTime: new Date()
        }
      });
    } else {
      session = await prisma.assessmentSession.update({
        where: { id: session.id },
        data: {
          score: marks ? parseFloat(marks) : null,
          status: status || 'COMPLETED',
          endTime: new Date()
        }
      });
    }

    // Save remarks/feedback - we can store this in a new model or as JSON in config
    // For now, let's just update the session score and status.
    
    res.json(session);
  } catch (error) {
    console.error('Evaluation Error:', error);
    res.status(500).json({ error: 'Failed to save evaluation' });
  }
}

// Get All Candidates for an Assessment (Admin)
export async function getAssessmentCandidates(req, res) {
  try {
    const { assessmentId } = req.params;

    // Get all assignments for this assessment
    const assignments = await prisma.assessmentAssignment.findMany({
      where: { assessmentId },
      include: {
        student: {
          include: { user: { select: { email: true, displayName: true } } }
        }
      }
    });

    // Get all sessions to see who has started/completed
    const sessions = await prisma.assessmentSession.findMany({
      where: { assessmentId },
      include: {
        violations: true
      }
    });

    // Merge data
    const candidates = assignments.map(asn => {
      const session = sessions.find(s => s.studentId === asn.studentId);
      return {
        student: {
          id: asn.studentId,
          fullName: asn.student.fullName || asn.student.user?.displayName,
          email: asn.student.email || asn.student.user?.email,
          enrollmentId: asn.student.enrollmentId,
          batch: asn.student.batch,
          profilePhoto: asn.student.profileImageUrl
        },
        evaluation: session ? {
          marks: session.score,
          status: session.status,
          remarks: null // We don't have a remarks field in session yet, could add later
        } : null,
        session: session || null,
        scheduledAt: asn.scheduledAt
      };
    });

    res.json({ candidates });
  } catch (error) {
    console.error('getAssessmentCandidates Error:', error);
    res.status(500).json({ error: 'Failed to fetch candidates' });
  }
}

// Get Student Session Results
export async function getStudentSessionResults(req, res) {
  try {
    const { sessionId } = req.params;
    const student = await prisma.student.findUnique({
      where: { userId: req.user.id }
    });

    if (!student) return res.status(404).json({ error: 'Student profile not found' });

    const session = await prisma.assessmentSession.findUnique({
      where: { id: sessionId },
      include: {
        assessment: { 
          include: { 
            questions: {
              orderBy: { order: 'asc' }
            } 
          } 
        },
        violations: true
      }
    });

    if (!session) return res.status(404).json({ error: 'Session not found' });

    // SECURITY: Ensure the session belongs to the requesting student
    if (session.studentId !== student.id) {
      return res.status(403).json({ error: 'Access denied: This result belongs to another student' });
    }

    // Calculate time spent if completed
    let duration = null;
    if (session.startTime && session.endTime) {
      duration = Math.floor((new Date(session.endTime) - new Date(session.startTime)) / 1000); // seconds
    }

    res.json({
      ...session,
      duration
    });
  } catch (error) {
    console.error('getStudentSessionResults Error:', error);
    res.status(500).json({ error: 'Failed to fetch results' });
  }
}
