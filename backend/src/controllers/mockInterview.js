import { PrismaClient } from '@prisma/client';
import {
  parseCodingQuestions,
  serializeCodingQuestions,
  hydrateSlot,
  hydrateDrive,
} from '../utils/mockInterviewCoding.js';
import { buildMockSlotResult, feedbackScorePercent } from '../utils/mockInterviewFeedback.js';

const prisma = new PrismaClient();

function defaultDraftSchedule() {
  const start = new Date();
  start.setDate(start.getDate() + 7);
  start.setHours(9, 0, 0, 0);
  const end = new Date(start);
  end.setHours(17, 0, 0, 0);
  return { date: start, startTime: start, endTime: end };
}

function resolveDriveSchedule(body) {
  const { date, startTime, endTime } = body;
  if (date && startTime && endTime) {
    return {
      date: new Date(date),
      startTime: new Date(startTime),
      endTime: new Date(endTime),
    };
  }
  return defaultDraftSchedule();
}

function buildSlotsForDrive(drive, targetStudentIds = []) {
  const slotDuration = parseInt(drive.slotDuration, 10) || 30;
  const breakDuration = parseInt(drive.breakDuration, 10) || 0;
  const slots = [];
  let currentStartTime = new Date(drive.startTime);
  const finalEndTime = new Date(drive.endTime);
  const students = targetStudentIds;
  let studentIndex = 0;

  while (currentStartTime.getTime() + slotDuration * 60000 <= finalEndTime.getTime()) {
    const slotEndTime = new Date(currentStartTime.getTime() + slotDuration * 60000);
    const studentId = students[studentIndex] || null;

    slots.push({
      driveId: drive.id,
      startTime: new Date(currentStartTime),
      endTime: new Date(slotEndTime),
      status: studentId ? 'SCHEDULED' : 'AVAILABLE',
      studentId,
      meetingRoomId: studentId ? `Room_${drive.id}_${studentId}_${Date.now()}` : null,
      joinLink: studentId ? `/mock-interview-room/Room_${drive.id}_${studentId}` : null,
    });

    studentIndex++;
    currentStartTime = new Date(slotEndTime.getTime() + breakDuration * 60000);
  }

  return slots;
}

// --- DRIVE & SLOT MANAGEMENT ---

/**
 * Create a Mock Interview Drive and auto-generate slots when published.
 * If publish === false, saves as DRAFT without slots.
 */
export async function createMockInterviewDrive(req, res) {
  try {
    const {
      title,
      category,
      description,
      instructions,
      date,
      startTime,
      endTime,
      slotDuration,
      breakDuration,
      bufferTime,
      targetBatches,
      targetBranches,
      targetStudentIds,
      enableCodeConsole,
      codingQuestions,
      publish,
    } = req.body;

    if (!title?.trim()) {
      return res.status(400).json({ error: 'Interview title is required' });
    }

    const isDraft = publish === false;
    const schedule = resolveDriveSchedule({ date, startTime, endTime });

    if (!isDraft) {
      if (!date || !startTime || !endTime) {
        return res.status(400).json({ error: 'Date and time window are required to publish' });
      }
      if (schedule.endTime <= schedule.startTime) {
        return res.status(400).json({ error: 'End time must be after start time' });
      }
      const mins =
        (schedule.endTime.getTime() - schedule.startTime.getTime()) / 60000;
      const block = parseInt(slotDuration, 10) || 30;
      if (block <= 0 || mins < block) {
        return res.status(400).json({ error: 'Time window is too short for at least one slot' });
      }
    }

    const codeConsoleEnabled = enableCodeConsole === true || enableCodeConsole === 'true';
    const questions = parseCodingQuestions(codingQuestions);
    const students = targetStudentIds || [];

    const drive = await prisma.mockInterviewDrive.create({
      data: {
        title: title.trim(),
        category: category || 'TECHNICAL',
        enableCodeConsole: codeConsoleEnabled,
        codingQuestions: codeConsoleEnabled ? serializeCodingQuestions(questions) : null,
        description,
        instructions,
        date: schedule.date,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        slotDuration: parseInt(slotDuration, 10) || 30,
        breakDuration: parseInt(breakDuration, 10) || 0,
        bufferTime: parseInt(bufferTime, 10) || 0,
        targetBatches: JSON.stringify(targetBatches || []),
        targetBranches: JSON.stringify(targetBranches || []),
        targetStudentIds: JSON.stringify(students),
        status: isDraft ? 'DRAFT' : 'PUBLISHED',
      },
    });

    let slots = [];
    if (!isDraft) {
      slots = buildSlotsForDrive(drive, students);
      if (slots.length > 0) {
        await prisma.mockInterviewSlot.createMany({ data: slots });
      }
    }

    res.status(201).json({
      drive: hydrateDrive(drive),
      slotsGenerated: slots.length,
      studentsAssigned: Math.min(slots.length, students.length),
      status: drive.status,
    });
  } catch (error) {
    console.error('Create Mock Drive Error:', error);
    res.status(500).json({ error: 'Failed to create mock interview drive' });
  }
}

/**
 * Publish a draft drive: generate slots and set status PUBLISHED.
 */
export async function publishMockInterviewDrive(req, res) {
  try {
    const { id } = req.params;
    const drive = await prisma.mockInterviewDrive.findUnique({ where: { id } });
    if (!drive) return res.status(404).json({ error: 'Drive not found' });

    if (drive.status === 'PUBLISHED') {
      const existingCount = await prisma.mockInterviewSlot.count({ where: { driveId: id } });
      return res.json({
        drive: hydrateDrive(drive),
        slotsGenerated: existingCount,
        message: 'Drive is already published',
      });
    }

    if (drive.endTime <= drive.startTime) {
      return res.status(400).json({ error: 'Set a valid schedule before publishing' });
    }

    const slotDuration = parseInt(drive.slotDuration, 10) || 30;
    const mins = (new Date(drive.endTime).getTime() - new Date(drive.startTime).getTime()) / 60000;
    if (mins < slotDuration) {
      return res.status(400).json({ error: 'Time window is too short for at least one slot' });
    }

    let targetStudentIds = [];
    try {
      targetStudentIds = JSON.parse(drive.targetStudentIds || '[]');
    } catch {
      targetStudentIds = [];
    }

    const slots = buildSlotsForDrive(drive, targetStudentIds);
    if (slots.length > 0) {
      await prisma.mockInterviewSlot.createMany({ data: slots });
    }

    const updated = await prisma.mockInterviewDrive.update({
      where: { id },
      data: { status: 'PUBLISHED' },
    });

    res.json({
      drive: hydrateDrive(updated),
      slotsGenerated: slots.length,
      studentsAssigned: Math.min(slots.length, targetStudentIds.length),
    });
  } catch (error) {
    console.error('Publish Mock Drive Error:', error);
    res.status(500).json({ error: 'Failed to publish mock interview drive' });
  }
}

/**
 * Get all mock interview drives for admin dashboard
 */
export async function getMockInterviewDrives(req, res) {
  try {
    const drives = await prisma.mockInterviewDrive.findMany({
      include: {
        _count: {
          select: { slots: true }
        },
        slots: {
          orderBy: { startTime: 'asc' },
          include: {
            student: {
              select: { id: true, fullName: true, email: true, batch: true }
            }
          }
        }
      },
      orderBy: { date: 'desc' }
    });
    res.json(drives);
  } catch (error) {
    console.error('Fetch Drives Error:', error);
    res.status(500).json({ error: 'Failed to fetch mock interview drives' });
  }
}

/**
 * Assign a specific student to an available slot
 */
export async function assignStudentToSlot(req, res) {
  try {
    const { slotId, studentId } = req.body;
    const interviewerId = req.user.id;

    const slot = await prisma.mockInterviewSlot.findUnique({
      where: { id: slotId }
    });

    if (!slot || slot.status !== 'AVAILABLE') {
      return res.status(400).json({ error: 'Slot is not available' });
    }

    const updatedSlot = await prisma.mockInterviewSlot.update({
      where: { id: slotId },
      data: {
        status: 'SCHEDULED',
        studentId,
        interviewerId,
        meetingRoomId: `Room_${slot.driveId}_${studentId}_${Date.now()}`,
        joinLink: `/mock-interview-room/Room_${slot.driveId}_${studentId}`
      }
    });

    res.json(updatedSlot);
  } catch (error) {
    console.error('Assign Student Error:', error);
    res.status(500).json({ error: 'Failed to assign student' });
  }
}

/**
 * Update slot status (WAITING, LIVE, MISSED, etc.)
 */
export async function updateSlotStatus(req, res) {
  try {
    const { slotId, status } = req.body;
    
    const updatedSlot = await prisma.mockInterviewSlot.update({
      where: { id: slotId },
      data: { status }
    });

    res.json(updatedSlot);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update slot status' });
  }
}

// --- STUDENT DASHBOARD ---

/**
 * Get student's assigned mock interview slots
 */
export async function getStudentMockInterviews(req, res) {
  try {
    const student = await prisma.student.findUnique({
      where: { userId: req.user.id }
    });

    if (!student) return res.status(404).json({ error: 'Student profile not found' });

    const slots = await prisma.mockInterviewSlot.findMany({
      where: { studentId: student.id },
      include: {
        drive: true,
        feedback: true
      },
      orderBy: { startTime: 'asc' }
    });

    res.json(slots);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch your mock interviews' });
  }
}

/**
 * Aggregated stats for the student mock interview dashboard.
 */
export async function getStudentMockInterviewStats(req, res) {
  try {
    const student = await prisma.student.findUnique({
      where: { userId: req.user.id },
    });

    if (!student) return res.status(404).json({ error: 'Student profile not found' });

    const [slots, enrollments] = await Promise.all([
      prisma.mockInterviewSlot.findMany({
        where: { studentId: student.id },
        include: { feedback: true },
      }),
      prisma.aiMockInterviewEnrollment.findMany({
        where: { studentId: student.id },
        include: {
          review: true,
          aiInsight: true,
          interview: { select: { endDate: true } },
        },
      }),
    ]);

    const now = new Date();
    const upcomingSlotStatuses = ['SCHEDULED', 'WAITING', 'LIVE'];

    const liveCompleted = slots.filter((s) => s.status === 'COMPLETED').length;
    const liveUpcoming = slots.filter((s) => upcomingSlotStatuses.includes(s.status)).length;

    const aiCompleted = enrollments.filter((e) => e.status === 'COMPLETED').length;
    const aiUpcoming = enrollments.filter((e) => {
      if (e.status === 'COMPLETED') return false;
      if (e.status === 'IN_PROGRESS') return true;
      const endDate = e.interview?.endDate;
      return !endDate || now <= endDate;
    }).length;

    const scoreValues = [];
    for (const slot of slots) {
      const score = feedbackScorePercent(slot.feedback);
      if (score != null) scoreValues.push(score);
    }
    for (const enrollment of enrollments) {
      const reviewRating = enrollment.review?.overallRating;
      if (typeof reviewRating === 'number' && reviewRating > 0) {
        scoreValues.push(Math.round((reviewRating / 10) * 100));
        continue;
      }
      const aiOverall = enrollment.aiInsight?.overallPerformance;
      if (typeof aiOverall === 'number' && aiOverall > 0) {
        scoreValues.push(Math.round((aiOverall / 5) * 100));
      }
    }

    const avgScore = scoreValues.length
      ? Math.round(scoreValues.reduce((sum, value) => sum + value, 0) / scoreValues.length)
      : null;

    res.json({
      completed: liveCompleted + aiCompleted,
      upcoming: liveUpcoming + aiUpcoming,
      avgScore,
      assigned: slots.length + enrollments.length,
      liveCompleted,
      aiCompleted,
      liveUpcoming,
      aiUpcoming,
      scoredSessions: scoreValues.length,
    });
  } catch (error) {
    console.error('getStudentMockInterviewStats Error:', error);
    res.status(500).json({ error: 'Failed to fetch mock interview stats' });
  }
}

// --- FEEDBACK & RECORDING ---

/**
 * Submit feedback for a mock interview slot
 */
export async function submitMockFeedback(req, res) {
  try {
    const { 
      slotId, communication, confidence, technicalSkills, 
      problemSolving, bodyLanguage, resumeKnowledge, 
      overallPerformance, result, detailedRemarks 
    } = req.body;

    const feedback = await prisma.mockInterviewFeedback.create({
      data: {
        slotId,
        communication,
        confidence,
        technicalSkills,
        problemSolving,
        bodyLanguage,
        resumeKnowledge,
        overallPerformance,
        result,
        detailedRemarks
      }
    });

    // Mark slot as completed
    await prisma.mockInterviewSlot.update({
      where: { id: slotId },
      data: { status: 'COMPLETED' }
    });

    res.json(feedback);
  } catch (error) {
    console.error('Submit Feedback Error:', error);
    res.status(500).json({ error: 'Failed to submit feedback' });
  }
}

/**
 * Get a specific mock interview slot by ID
 */
export async function getMockInterviewSlot(req, res) {
  try {
    const { slotId } = req.params;
    const slot = await prisma.mockInterviewSlot.findUnique({
      where: { id: slotId },
      include: {
        drive: true,
        student: {
          select: { id: true, fullName: true, email: true, batch: true }
        }
      }
    });

    if (!slot) return res.status(404).json({ error: 'Slot not found' });

    res.json(hydrateSlot(slot));
  } catch (error) {
    console.error('Fetch Slot Error:', error);
    res.status(500).json({ error: 'Failed to fetch slot details' });
  }
}

/**
 * Mock interview results for one slot (student own session or admin).
 */
export async function getMockInterviewSlotResults(req, res) {
  try {
    const { slotId } = req.params;
    const slot = await prisma.mockInterviewSlot.findUnique({
      where: { id: slotId },
      include: {
        drive: true,
        feedback: true,
        student: {
          select: {
            id: true,
            fullName: true,
            email: true,
            enrollmentId: true,
            batch: true,
            userId: true,
          },
        },
      },
    });

    if (!slot) return res.status(404).json({ error: 'Session not found' });

    const role = (req.user?.role || '').toUpperCase();
    if (role === 'STUDENT') {
      const student = await prisma.student.findUnique({
        where: { userId: req.user.id },
      });
      if (!student || slot.studentId !== student.id) {
        return res.status(403).json({ error: 'Access denied' });
      }
    } else if (!['ADMIN', 'SUPER_ADMIN'].includes(role)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (slot.status !== 'COMPLETED' || !slot.feedback) {
      return res.status(404).json({
        error: 'Results not available yet. Interviewer feedback has not been submitted.',
      });
    }

    res.json(buildMockSlotResult(slot));
  } catch (error) {
    console.error('getMockInterviewSlotResults Error:', error);
    res.status(500).json({ error: 'Failed to fetch mock interview results' });
  }
}

/**
 * Drive-level results leaderboard (completed slots with feedback).
 */
export async function getMockInterviewDriveResults(req, res) {
  try {
    const { driveId } = req.params;
    const drive = await prisma.mockInterviewDrive.findUnique({
      where: { id: driveId },
      include: {
        slots: {
          where: {
            status: 'COMPLETED',
            feedback: { isNot: null },
          },
          include: {
            feedback: true,
            student: {
              select: {
                id: true,
                fullName: true,
                email: true,
                enrollmentId: true,
                batch: true,
              },
            },
          },
          orderBy: { startTime: 'asc' },
        },
      },
    });

    if (!drive) return res.status(404).json({ error: 'Drive not found' });

    const sessions = drive.slots
      .map(buildMockSlotResult)
      .sort((a, b) => (b.scorePercent || 0) - (a.scorePercent || 0));

    const avgScore =
      sessions.length > 0
        ? Math.round(
            sessions.reduce((acc, s) => acc + (s.scorePercent || 0), 0) / sessions.length,
          )
        : 0;

    res.json({
      drive: hydrateDrive(drive),
      sessions,
      stats: {
        totalAttempts: sessions.length,
        avgScore,
      },
    });
  } catch (error) {
    console.error('getMockInterviewDriveResults Error:', error);
    res.status(500).json({ error: 'Failed to fetch drive results' });
  }
}

/**
 * Update a specific mock interview slot (e.g., change timings)
 */
export async function updateMockInterviewSlot(req, res) {
  try {
    const { slotId } = req.params;
    const { startTime, endTime } = req.body;

    if (!startTime || !endTime) {
      return res.status(400).json({ error: 'startTime and endTime are required' });
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return res.status(400).json({ error: 'Invalid date or time' });
    }

    if (end <= start) {
      return res.status(400).json({ error: 'End time must be after start time' });
    }

    const updatedSlot = await prisma.mockInterviewSlot.update({
      where: { id: slotId },
      data: { startTime: start, endTime: end },
      include: {
        student: {
          select: { id: true, fullName: true, email: true, batch: true },
        },
      },
    });

    res.json(updatedSlot);
  } catch (error) {
    console.error('Update Slot Error:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Slot not found' });
    }
    res.status(500).json({ error: 'Failed to update slot timing' });
  }
}
/**
 * Update drive metadata (title, category, instructions, coding config).
 * Does not change schedule or regenerate slots.
 */
export async function updateMockInterviewDrive(req, res) {
  try {
    const { id } = req.params;
    const {
      title,
      category,
      description,
      instructions,
      enableCodeConsole,
      codingQuestions,
    } = req.body;

    if (!title?.trim()) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const codeConsoleEnabled =
      enableCodeConsole === true || enableCodeConsole === 'true';
    const questions = parseCodingQuestions(codingQuestions);

    const updated = await prisma.mockInterviewDrive.update({
      where: { id },
      data: {
        title: title.trim(),
        category: category || 'TECHNICAL',
        description: description ?? null,
        instructions: instructions ?? null,
        enableCodeConsole: codeConsoleEnabled,
        codingQuestions: codeConsoleEnabled ? serializeCodingQuestions(questions) : null,
      },
    });

    res.json(hydrateDrive(updated));
  } catch (error) {
    console.error('Update Drive Error:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Drive not found' });
    }
    res.status(500).json({ error: 'Failed to update mock interview drive' });
  }
}

/**
 * Delete a mock interview drive and all associated slots
 */
export async function deleteMockInterviewDrive(req, res) {
  try {
    const { id } = req.params;

    // Use transaction to ensure both drive and slots are deleted
    await prisma.$transaction([
      prisma.mockInterviewSlot.deleteMany({
        where: { driveId: id }
      }),
      prisma.mockInterviewDrive.delete({
        where: { id }
      })
    ]);

    res.json({ message: 'Drive and associated slots deleted successfully' });
  } catch (error) {
    console.error('Delete Drive Error:', error);
    res.status(500).json({ error: 'Failed to delete mock interview drive' });
  }
}
