import { PrismaClient } from '@prisma/client';
import {
  parseCodingQuestions,
  serializeCodingQuestions,
  hydrateSlot,
  hydrateDrive,
} from '../utils/mockInterviewCoding.js';

const prisma = new PrismaClient();

// --- DRIVE & SLOT MANAGEMENT ---

/**
 * Create a Mock Interview Drive and auto-generate slots
 * If targetStudentIds are provided, it auto-assigns them to slots
 */
export async function createMockInterviewDrive(req, res) {
  try {
    const { 
      title, category, description, instructions, 
      date, startTime, endTime, 
      slotDuration, breakDuration, bufferTime,
      targetBatches, targetBranches, targetStudentIds,
      enableCodeConsole,
      codingQuestions,
    } = req.body;

    const codeConsoleEnabled = enableCodeConsole === true || enableCodeConsole === 'true';
    const questions = parseCodingQuestions(codingQuestions);

    // 1. Create the Drive
    const drive = await prisma.mockInterviewDrive.create({
      data: {
        title,
        category,
        enableCodeConsole: codeConsoleEnabled,
        codingQuestions: codeConsoleEnabled ? serializeCodingQuestions(questions) : null,
        description,
        instructions,
        date: new Date(date),
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        slotDuration: parseInt(slotDuration),
        breakDuration: parseInt(breakDuration),
        bufferTime: parseInt(bufferTime),
        targetBatches: JSON.stringify(targetBatches || []),
        targetBranches: JSON.stringify(targetBranches || []),
        targetStudentIds: JSON.stringify(targetStudentIds || []),
        status: 'PUBLISHED'
      }
    });

    // 2. Auto-generate Slots
    const slots = [];
    let currentStartTime = new Date(startTime);
    const finalEndTime = new Date(endTime);
    const students = targetStudentIds || [];
    let studentIndex = 0;

    while (currentStartTime.getTime() + (slotDuration * 60000) <= finalEndTime.getTime()) {
      const slotEndTime = new Date(currentStartTime.getTime() + (slotDuration * 60000));
      
      const studentId = students[studentIndex] || null;
      
      slots.push({
        driveId: drive.id,
        startTime: new Date(currentStartTime),
        endTime: new Date(slotEndTime),
        status: studentId ? 'SCHEDULED' : 'AVAILABLE',
        studentId: studentId,
        meetingRoomId: studentId ? `Room_${drive.id}_${studentId}_${Date.now()}` : null,
        joinLink: studentId ? `/mock-interview-room/Room_${drive.id}_${studentId}` : null
      });

      studentIndex++;
      // Move to next slot: current slot end + break duration
      currentStartTime = new Date(slotEndTime.getTime() + (breakDuration * 60000));
    }

    if (slots.length > 0) {
      await prisma.mockInterviewSlot.createMany({
        data: slots
      });
    }

    res.status(201).json({ 
      drive: hydrateDrive(drive), 
      slotsGenerated: slots.length,
      studentsAssigned: Math.min(slots.length, students.length)
    });
  } catch (error) {
    console.error('Create Mock Drive Error:', error);
    res.status(500).json({ error: 'Failed to create mock interview drive' });
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
