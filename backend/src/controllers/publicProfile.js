/**
 * Public Profile Controller
 * Handles public, read-only student profile access via shareable link
 * NO authentication required - public access
 */

import prisma from '../config/database.js';
import { randomUUID } from 'crypto';
import logger from '../config/logger.js';
import { sendError, sendNotFound } from '../utils/response.js';

/**
 * Get public profile by publicProfileId
 * GET /api/public/profile/:publicProfileId
 * NO AUTH REQUIRED
 */
export async function getPublicProfile(req, res) {
  try {
    const { publicProfileId } = req.params;

    if (!publicProfileId) {
      return sendError(res, 'Public profile ID is required', 'Invalid profile link.', 400);
    }

    // Find student by publicProfileId
    const student = await prisma.student.findUnique({
      where: { publicProfileId },
      include: {
        user: {
          select: {
            profilePhoto: true,
          }
        },
        skills: {
          orderBy: { skillName: 'asc' },
        },
        education: {
          orderBy: { endYear: 'desc' },
        },
        projects: {
          orderBy: { createdAt: 'desc' },
        },
        achievements: {
          orderBy: { createdAt: 'desc' },
        },
        certifications: {
          orderBy: { issuedDate: 'desc' },
        },
        endorsements: {
          where: {
            consent: true, // Only show consented endorsements
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!student) {
      return sendNotFound(res, 'Profile');
    }

    // Parse endorsementsData if exists (legacy format)
    let endorsementsData = [];
    if (student.endorsementsData) {
      try {
        endorsementsData = typeof student.endorsementsData === 'string'
          ? JSON.parse(student.endorsementsData)
          : student.endorsementsData;
      } catch (e) {
        logger.warn(`Failed to parse endorsementsData for student ${student.id}:`, e);
      }
    }

    // Combine legacy and new endorsements
    const allEndorsements = [
      ...(endorsementsData || []),
      ...(student.endorsements || []).map(e => ({
        endorserName: e.endorserName,
        endorserEmail: e.endorserEmail,
        endorserRole: e.endorserRole,
        organization: e.organization,
        message: e.message,
        relatedSkills: e.skills ? (typeof e.skills === 'string' ? JSON.parse(e.skills) : e.skills) : [],
        verified: e.verified,
        submittedAt: e.submittedAt || e.createdAt,
      }))
    ];

    // Build public profile response (STRICT FILTERING - NO SENSITIVE DATA)
    const publicProfile = {
      // Basic Info (safe)
      fullName: student.fullName,
      headline: student.headline || null,
      bio: student.bio || null,
      location: student.city && student.stateRegion
        ? `${student.city}, ${student.stateRegion}`
        : student.city || student.stateRegion || null,
      
      // Contact Info (conditional based on toggles)
      email: student.publicProfileShowEmail ? student.email : null,
      phone: student.publicProfileShowPhone ? student.phone : null,
      
      // Profile Image
      profilePhoto: student.profileImageUrl || student.user?.profilePhoto || null,
      
      // Social Profiles (safe)
      linkedin: student.linkedin || null,
      githubUrl: student.githubUrl || null,
      youtubeUrl: student.youtubeUrl || null,
      leetcode: student.leetcode || null,
      codeforces: student.codeforces || null,
      gfg: student.gfg || null,
      hackerrank: student.hackerrank || null,
      
      // Education (safe)
      education: student.education.map(edu => ({
        degree: edu.degree,
        institution: edu.institution,
        startYear: edu.startYear,
        endYear: edu.endYear,
        cgpa: edu.cgpa ? String(edu.cgpa) : null,
        description: edu.description || null,
      })),
      
      // Skills (safe)
      skills: student.skills.map(skill => ({
        skillName: skill.skillName,
        rating: skill.rating,
      })),
      
      // Projects (safe)
      projects: student.projects.map(project => ({
        title: project.title,
        description: project.description || null,
        technologies: project.technologies ? (typeof project.technologies === 'string' ? JSON.parse(project.technologies) : project.technologies) : [],
        githubUrl: project.githubUrl || null,
        liveUrl: project.liveUrl || null,
      })),
      
      // Certifications (safe)
      certifications: student.certifications.map(cert => ({
        title: cert.title,
        description: cert.description || null,
        issuedDate: cert.issuedDate,
        expiryDate: cert.expiryDate || null,
        certificateUrl: cert.certificateUrl || null,
        issuer: cert.issuer || null,
      })),
      
      // Achievements (safe)
      achievements: student.achievements.map(achievement => ({
        title: achievement.title,
        description: achievement.description || null,
        date: achievement.date,
        hasCertificate: achievement.hasCertificate,
        certificateUrl: achievement.certificateUrl || null,
      })),
      
      // Endorsements (safe - no filtering, show all if exist)
      endorsements: allEndorsements.map(end => ({
        endorserName: end.endorserName,
        endorserRole: end.endorserRole,
        organization: end.organization,
        message: end.message,
        relatedSkills: end.relatedSkills || [],
      })),
    };

    // Set cache headers (5 minutes)
    res.set('Cache-Control', 'public, max-age=300');
    
    res.json(publicProfile);
  } catch (error) {
    logger.error('Get public profile error:', error);
    sendError(res, 'Failed to load profile', 'An error occurred while loading the profile.', 500);
  }
}

/**
 * Generate or get public profile ID for student
 * POST /api/students/public-profile/generate
 * AUTH REQUIRED (Student only)
 */
export async function generatePublicProfileId(req, res) {
  try {
    const userId = req.userId;

    if (!userId) {
      return sendError(res, 'User ID is required', 'Authentication required.', 401);
    }

    const student = await prisma.student.findUnique({
      where: { userId },
      select: { id: true, publicProfileId: true },
    });

    if (!student) {
      logger.warn(`Student profile not found for userId: ${userId}`);
      return sendNotFound(res, 'Student profile');
    }

    // Generate new UUID if doesn't exist
    let publicProfileId = student.publicProfileId;
    if (!publicProfileId) {
      publicProfileId = randomUUID();
      try {
        await prisma.student.update({
          where: { id: student.id },
          data: { publicProfileId },
        });
        logger.info(`Generated public profile ID for student ${student.id}: ${publicProfileId}`);
      } catch (updateError) {
        logger.error('Failed to update student with publicProfileId:', updateError);
        throw updateError;
      }
    }

    res.json({ publicProfileId });
  } catch (error) {
    logger.error('Generate public profile ID error:', error);
    logger.error('Error details:', {
      message: error.message,
      code: error.code,
      meta: error.meta,
    });
    sendError(res, 'Failed to generate profile link', 'An error occurred while generating the profile link.', 500);
  }
}

/**
 * Regenerate public profile ID (creates new link, invalidates old one)
 * POST /api/students/public-profile/regenerate
 * AUTH REQUIRED (Student only)
 */
export async function regeneratePublicProfileId(req, res) {
  try {
    const userId = req.userId;

    const student = await prisma.student.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!student) {
      return sendNotFound(res, 'Student profile');
    }

    // Generate new UUID
    const newPublicProfileId = randomUUID();
    await prisma.student.update({
      where: { id: student.id },
      data: { publicProfileId: newPublicProfileId },
    });

    res.json({ publicProfileId: newPublicProfileId });
  } catch (error) {
    logger.error('Regenerate public profile ID error:', error);
    sendError(res, 'Failed to regenerate profile link', 'An error occurred while regenerating the profile link.', 500);
  }
}

/**
 * Update public profile visibility settings
 * PATCH /api/students/public-profile/settings
 * AUTH REQUIRED (Student only)
 */
export async function updatePublicProfileSettings(req, res) {
  try {
    const userId = req.userId;
    const { showEmail, showPhone } = req.body;

    if (!userId) {
      return sendError(res, 'User ID is required', 'Authentication required.', 401);
    }

    logger.info('Update public profile settings request:', { userId, showEmail, showPhone });

    const student = await prisma.student.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!student) {
      logger.warn(`Student profile not found for userId: ${userId}`);
      return sendNotFound(res, 'Student profile');
    }

    const updateData = {};
    if (typeof showEmail === 'boolean') {
      updateData.publicProfileShowEmail = showEmail;
    }
    if (typeof showPhone === 'boolean') {
      updateData.publicProfileShowPhone = showPhone;
    }

    // Check if there's anything to update
    if (Object.keys(updateData).length === 0) {
      return sendError(res, 'No valid settings provided', 'Please provide showEmail or showPhone as boolean values.', 400);
    }

    try {
      await prisma.student.update({
        where: { id: student.id },
        data: updateData,
      });
      logger.info(`Updated public profile settings for student ${student.id}:`, updateData);
    } catch (updateError) {
      logger.error('Database update error:', updateError);
      logger.error('Error details:', {
        message: updateError.message,
        code: updateError.code,
        meta: updateError.meta,
      });
      throw updateError;
    }

    // Return updated values
    const updatedStudent = await prisma.student.findUnique({
      where: { id: student.id },
      select: { 
        publicProfileShowEmail: true,
        publicProfileShowPhone: true,
      },
    });

    res.json({ 
      showEmail: updatedStudent?.publicProfileShowEmail ?? true,
      showPhone: updatedStudent?.publicProfileShowPhone ?? false,
    });
  } catch (error) {
    logger.error('Update public profile settings error:', error);
    logger.error('Error details:', {
      message: error.message,
      code: error.code,
      meta: error.meta,
      stack: error.stack,
    });
    sendError(res, 'Failed to update settings', 'An error occurred while updating profile settings.', 500);
  }
}

/**
 * Get public profile settings (for student's own profile)
 * GET /api/students/public-profile/settings
 * AUTH REQUIRED (Student only)
 */
export async function getPublicProfileSettings(req, res) {
  try {
    const userId = req.userId;

    const student = await prisma.student.findUnique({
      where: { userId },
      select: { 
        publicProfileId: true,
        publicProfileShowEmail: true,
        publicProfileShowPhone: true,
      },
    });

    if (!student) {
      return sendNotFound(res, 'Student profile');
    }

    res.json({
      publicProfileId: student.publicProfileId,
      showEmail: student.publicProfileShowEmail ?? true,
      showPhone: student.publicProfileShowPhone ?? false,
    });
  } catch (error) {
    logger.error('Get public profile settings error:', error);
    sendError(res, 'Failed to get settings', 'An error occurred while loading profile settings.', 500);
  }
}
