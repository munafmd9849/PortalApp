/**
 * Resume view controller
 * Streams resume PDF with Content-Disposition: inline so it opens in browser instead of downloading.
 * Used by: interview panel, admin (via short-lived JWT in URL so new tab works without Bearer).
 */

import prisma from '../config/database.js';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

/**
 * GET /api/resume/view?t=<jwt>
 * JWT payload: { type: 'application', applicationId, exp } OR { type: 'student_resume', resumeId, userId, exp }
 * No auth header - token in query allows opening in new tab.
 */
export async function streamByToken(req, res) {
  try {
    const token = req.query.t;
    if (!token) {
      return res.status(401).json({ error: 'Token required' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    let resumeUrl;
    let fileName = 'resume.pdf';

    if (decoded.type === 'student_resume' && decoded.resumeId && decoded.userId) {
      const resumeFile = await prisma.studentResumeFile.findFirst({
        where: {
          id: decoded.resumeId,
          userId: decoded.userId
        },
        select: { fileUrl: true, fileName: true }
      });
      if (!resumeFile) {
        return res.status(404).json({ error: 'Resume not found' });
      }
      resumeUrl = resumeFile.fileUrl;
      fileName = resumeFile.fileName || fileName;
    } else if (decoded.type === 'application' && decoded.applicationId) {
      const application = await prisma.application.findUnique({
        where: { id: decoded.applicationId },
        include: {
          student: {
            select: {
              resumeUrl: true,
              resumeFileName: true,
              resumeFiles: {
                where: { isDefault: true },
                select: { fileUrl: true, fileName: true },
                take: 1
              }
            }
          }
        }
      });

      if (!application) {
        return res.status(404).json({ error: 'Application not found' });
      }

      const defaultResume = application.student?.resumeFiles?.[0];
      resumeUrl = defaultResume?.fileUrl || application.student?.resumeUrl;
      fileName = defaultResume?.fileName || application.student?.resumeFileName || fileName;
    } else {
      return res.status(400).json({ error: 'Invalid token' });
    }

    if (!resumeUrl || resumeUrl.trim() === '') {
      return res.status(404).json({ error: 'Resume not found' });
    }

    const fetchResponse = await fetch(resumeUrl, { method: 'GET' });
    if (!fetchResponse.ok) {
      return res.status(502).json({ error: 'Failed to load resume from storage' });
    }

    const buffer = await fetchResponse.arrayBuffer();
    const pdfBuffer = Buffer.from(buffer);

    // Force inline display (not download): set headers and send raw bytes with res.end
    const safeName = (fileName || 'resume.pdf').replace(/[^\x20-\x7E]/g, '_').replace(/"/g, "'") || 'resume.pdf';
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${safeName}"`);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, max-age=60');
    res.status(200);
    res.end(pdfBuffer);
  } catch (error) {
    console.error('Resume view stream error:', error);
    res.status(500).json({ error: 'Failed to stream resume' });
  }
}
