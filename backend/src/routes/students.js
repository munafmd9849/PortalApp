/**
 * Student Routes
 * Replaces Firebase Firestore student service calls
 */

import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import * as studentController from '../controllers/students.js';
import * as resumeController from '../controllers/resume.js';
import multer from 'multer';

const router = express.Router({ mergeParams: true });

// Configure multer for memory storage (for S3 upload)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  },
});

// All routes require authentication
router.use(authenticate);

// Get own profile
router.get('/profile', studentController.getStudentProfile);

// Update own profile
router.put('/profile', studentController.updateStudentProfile);

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

// Resume management
router.post('/resume', upload.single('resume'), studentController.uploadResume);
router.get('/resumes', studentController.getResumes);
router.delete('/resumes/:resumeId', studentController.deleteResume);

// Admin route - Get all students (must be last to avoid route conflicts)
router.get('/', requireRole(['ADMIN']), studentController.getAllStudents);

export default router;
