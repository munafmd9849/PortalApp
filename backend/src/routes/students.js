/**
 * Student Routes
 * Replaces Firebase Firestore student service calls
 */

import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import * as studentController from '../controllers/students.js';
import * as resumeController from '../controllers/resume.js';
import * as publicProfileController from '../controllers/publicProfile.js';
import { uploadProfileImage, uploadResume } from '../middleware/upload.js';
import prisma from '../config/database.js';

const router = express.Router({ mergeParams: true });

// All routes require authentication
router.use(authenticate);

// Get own profile
router.get('/profile', studentController.getStudentProfile);

// Update own profile
router.put('/profile', studentController.updateStudentProfile);

// Enforce mandatory profile completion for student routes
// Allow access to /profile even when incomplete
// Use same derived logic as auth: complete if DB flag is true OR all required fields are filled
router.use(async (req, res, next) => {
  try {
    const role = req.user?.role;
    if (role !== 'STUDENT') {
      return next();
    }

    // Allow profile GET/PUT and skills endpoint without completion
    if (req.path === '/profile' || req.path === '/skills') {
      return next();
    }

    const student = req.user?.student ?? await prisma.student.findUnique({
      where: { userId: req.userId },
    });

    if (!student) {
      return res.status(403).json({ error: 'PROFILE_INCOMPLETE' });
    }

    const isComplete =
      student.profileCompleted === true ||
      (() => {
        const email = (req.user?.email || '').trim();
        const fullName = (student.fullName || '').trim();
        const phone = (student.phone || '').trim();
        const enrollmentId = (student.enrollmentId || '').trim();
        const school = (student.school || '').trim();
        const center = (student.center || '').trim();
        const batch = (student.batch || '').trim();
        return !!(email && fullName && phone && enrollmentId && school && center && batch);
      })();

    if (!isComplete) {
      return res.status(403).json({ error: 'PROFILE_INCOMPLETE' });
    }

    return next();
  } catch (error) {
    console.error('Profile completion guard error:', error);
    return res.status(500).json({ error: 'Failed to verify profile completion' });
  }
});

// Get skills
router.get('/skills', studentController.getStudentSkills);

// Add/update skill
router.post('/skills', studentController.addOrUpdateSkill);

// Delete skill
router.delete('/skills/:skillId', studentController.deleteSkill);

// Education CRUD
router.post('/education', studentController.addEducation);
router.put('/education/:educationId', studentController.updateEducation);
router.delete('/education/:educationId', studentController.deleteEducation);

// Experience CRUD
router.post('/experience', studentController.addExperience);
router.put('/experience/:experienceId', studentController.updateExperience);
router.delete('/experience/:experienceId', studentController.deleteExperience);

// Projects CRUD
router.post('/projects', studentController.addProject);
router.put('/projects/:projectId', studentController.updateProject);
router.delete('/projects/:projectId', studentController.deleteProject);

// AI Generation
router.post('/generate-project-content', studentController.generateProjectContentEndpoint);

// Resume PDF Export
router.post('/generate-resume-pdf', resumeController.generateResumePDF);

// Achievements CRUD
router.post('/achievements', studentController.addAchievement);
router.put('/achievements/:achievementId', studentController.updateAchievement);
router.delete('/achievements/:achievementId', studentController.deleteAchievement);

// Profile Image Upload (Cloudinary)
// POST /api/students/profile-image
// Auth: Student only
router.post('/profile-image', 
  requireRole(['STUDENT']), // Students only
  uploadProfileImage, // Multer middleware for Cloudinary
  studentController.uploadProfileImage
);

// Profile Image Delete
// DELETE /api/students/profile-image
// Auth: Student only
router.delete('/profile-image', 
  requireRole(['STUDENT']), // Students only
  studentController.deleteProfileImage
);

// Resume management (Cloudinary)
// POST /api/students/resume
// Body: { title } (optional)
// Auth: Student only
router.post('/resume', 
  requireRole(['STUDENT']), // Students only
  uploadResume, // Multer middleware for Cloudinary
  studentController.uploadResumeCloudinary
);

// Get all resumes
// GET /api/students/resumes
// Auth: Student only (can view own resumes)
router.get('/resumes', 
  requireRole(['STUDENT']),
  studentController.getResumes
);

// Get short-lived URL to view resume inline (for new tab)
// GET /api/students/resume/:resumeId/view-url
router.get('/resume/:resumeId/view-url',
  requireRole(['STUDENT']),
  studentController.getStudentResumeViewUrl
);

// Set default resume
// PATCH /api/students/resume/:resumeId/default
// Auth: Student only
router.patch('/resume/:resumeId/default',
  requireRole(['STUDENT']),
  studentController.setDefaultResume
);

// Delete resume
// DELETE /api/students/resume/:resumeId
// Auth: Student only
router.delete('/resume/:resumeId',
  requireRole(['STUDENT']),
  studentController.deleteResume
);

// Extract text from resume PDF (backend proxy to avoid CORS)
// POST /api/students/resume/extract-text
// Body: { resumeUrl, resumeId? }
// Auth: Student only
router.post('/resume/extract-text',
  requireRole(['STUDENT']),
  studentController.extractResumeText
);

// ATS Resume Analysis
// POST /api/students/resume/ats-analysis
// Body: { resumeText, resumeId? }
// Auth: Student only
router.post('/resume/ats-analysis',
  requireRole(['STUDENT']),
  studentController.analyzeATSResume
);

// Public Profile Management (Student only)
router.post('/public-profile/generate', requireRole(['STUDENT']), publicProfileController.generatePublicProfileId);
router.post('/public-profile/regenerate', requireRole(['STUDENT']), publicProfileController.regeneratePublicProfileId);
router.get('/public-profile/settings', requireRole(['STUDENT']), publicProfileController.getPublicProfileSettings);
router.patch('/public-profile/settings', requireRole(['STUDENT']), publicProfileController.updatePublicProfileSettings);

// Admin / Super Admin - Block or unblock student
router.patch('/:studentId/block', requireRole(['ADMIN', 'SUPER_ADMIN']), studentController.blockUnblockStudent);

// Admin / Super Admin - Get all students (must be last to avoid route conflicts)
router.get('/', requireRole(['ADMIN', 'SUPER_ADMIN']), studentController.getAllStudents);

export default router;
