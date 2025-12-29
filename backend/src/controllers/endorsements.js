import prisma from '../config/database.js';
import logger from '../config/logger.js';

/**
 * Get endorsement by token (public endpoint)
 */
export async function getEndorsementByToken(req, res) {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    const endorsement = await prisma.endorsement.findUnique({
      where: { token },
      include: {
        student: {
          select: {
            fullName: true,
            enrollmentId: true,
            email: true,
            center: true,
            school: true,
            batch: true,
          },
        },
      },
    });

    if (!endorsement) {
      return res.status(404).json({ error: 'Endorsement request not found' });
    }

    // Check if expired
    if (new Date() > new Date(endorsement.expiresAt)) {
      return res.status(400).json({ 
        error: 'This endorsement link has expired',
        expired: true 
      });
    }

    // Check if already completed
    if (endorsement.status === 'COMPLETED') {
      return res.status(400).json({ 
        error: 'This endorsement has already been completed',
        completed: true 
      });
    }

    // Return endorsement data (without sensitive info)
    res.json({
      id: endorsement.id,
      studentName: endorsement.student.fullName,
      studentEnrollmentId: endorsement.student.enrollmentId,
      studentMessage: endorsement.studentMessage,
      teacherEmail: endorsement.teacherEmail,
      status: endorsement.status,
      requestedAt: endorsement.requestedAt,
      expiresAt: endorsement.expiresAt,
    });
  } catch (error) {
    logger.error('getEndorsementByToken error:', error);
    res.status(500).json({ error: 'Failed to fetch endorsement request' });
  }
}

/**
 * Submit endorsement (teacher-facing, public endpoint)
 */
export async function submitEndorsement(req, res) {
  try {
    const { token } = req.params;
    const { teacherName, teacherMessage, signatureData } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    if (!teacherName || !teacherName.trim()) {
      return res.status(400).json({ error: 'Teacher name is required' });
    }

    if (!signatureData) {
      return res.status(400).json({ error: 'Signature is required' });
    }

    // Find endorsement
    const endorsement = await prisma.endorsement.findUnique({
      where: { token },
    });

    if (!endorsement) {
      return res.status(404).json({ error: 'Endorsement request not found' });
    }

    // Check if expired
    if (new Date() > new Date(endorsement.expiresAt)) {
      return res.status(400).json({ 
        error: 'This endorsement link has expired',
        expired: true 
      });
    }

    // Check if already completed
    if (endorsement.status === 'COMPLETED') {
      return res.status(400).json({ 
        error: 'This endorsement has already been completed',
        completed: true 
      });
    }

    // Update endorsement with teacher response
    const updatedEndorsement = await prisma.endorsement.update({
      where: { token },
      data: {
        teacherName: teacherName.trim(),
        teacherMessage: teacherMessage?.trim() || null,
        signatureData: signatureData, // Base64 encoded image
        status: 'COMPLETED',
        completedAt: new Date(),
      },
      include: {
        student: {
          select: {
            fullName: true,
            email: true,
          },
        },
      },
    });

    logger.info(`Endorsement ${endorsement.id} completed by ${teacherName} (${endorsement.teacherEmail})`);

    res.json({
      success: true,
      message: 'Endorsement submitted successfully',
      endorsement: {
        id: updatedEndorsement.id,
        studentName: updatedEndorsement.student.fullName,
        completedAt: updatedEndorsement.completedAt,
      },
    });
  } catch (error) {
    logger.error('submitEndorsement error:', error);
    res.status(500).json({ error: 'Failed to submit endorsement' });
  }
}

/**
 * Get endorsements for authenticated student
 */
export async function getStudentEndorsements(req, res) {
  try {
    const studentId = req.userId;

    if (!studentId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Find student record
    const student = await prisma.student.findUnique({
      where: { userId: studentId },
      select: { id: true },
    });

    if (!student) {
      return res.status(404).json({ error: 'Student profile not found' });
    }

    // Get all completed endorsements for this student
    const endorsements = await prisma.endorsement.findMany({
      where: {
        studentId: student.id,
        status: 'COMPLETED',
      },
      orderBy: {
        completedAt: 'desc',
      },
      select: {
        id: true,
        teacherName: true,
        teacherEmail: true,
        teacherMessage: true,
        signatureData: true,
        completedAt: true,
        requestedAt: true,
      },
    });

    res.json({ endorsements });
  } catch (error) {
    logger.error('getStudentEndorsements error:', error);
    res.status(500).json({ error: 'Failed to fetch endorsements' });
  }
}

