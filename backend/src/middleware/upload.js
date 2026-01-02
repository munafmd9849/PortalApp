/**
 * Multer Upload Middleware for Cloudinary
 * Separate configs for profile images and resumes
 */

import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary (should already be configured in config/cloudinary.js)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

/**
 * Profile Image Upload Configuration
 * Rules:
 * - Allowed: jpg, png, webp
 * - Max size: 2MB
 * - Folder: students/{studentId}/profile
 * - Auto-crop square (400x400)
 * - Delete old profile image if exists
 */
export const createProfileImageUpload = (studentId) => {
  return multer({
    storage: new CloudinaryStorage({
      cloudinary: cloudinary,
      params: {
        folder: `students/${studentId}/profile`,
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
        transformation: [
          {
            width: 400,
            height: 400,
            crop: 'fill',
            gravity: 'face', // Focus on face if detected
            quality: 'auto',
            fetch_format: 'auto',
          },
        ],
        resource_type: 'image',
      },
    }),
    limits: {
      fileSize: 2 * 1024 * 1024, // 2MB
    },
    fileFilter: (req, file, cb) => {
      // Validate file type
      const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Only JPG, PNG, and WebP images are allowed for profile pictures'), false);
      }
    },
  });
};

/**
 * Resume Upload Configuration
 * Rules:
 * - Allowed: PDF only
 * - Max size: 5MB
 * - Folder: students/{studentId}/resumes
 * - DO NOT overwrite existing resumes
 * - Multiple resumes allowed
 */
export const createResumeUpload = (studentId) => {
  return multer({
    storage: new CloudinaryStorage({
      cloudinary: cloudinary,
      params: {
        folder: `students/${studentId}/resumes`,
        allowed_formats: ['pdf'],
        resource_type: 'raw', // PDFs are raw files
        use_filename: true,
        unique_filename: true, // Prevent overwrites
      },
    }),
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB
    },
    fileFilter: (req, file, cb) => {
      // Validate file type
      if (file.mimetype === 'application/pdf') {
        cb(null, true);
      } else {
        cb(new Error('Only PDF files are allowed for resumes'), false);
      }
    },
  });
};

/**
 * Single file upload middleware (for profile image)
 * Uses userId for folder structure (students/{userId}/profile)
 */
export const uploadProfileImage = async (req, res, next) => {
  const userId = req.userId;
  if (!userId) {
    return res.status(401).json({ error: 'User not authenticated' });
  }

  const upload = createProfileImageUpload(userId).single('profileImage');
  upload(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: 'File size exceeds 2MB limit' });
        }
        return res.status(400).json({ error: `Upload error: ${err.message}` });
      }
      return res.status(400).json({ error: err.message });
    }
    next();
  });
};

/**
 * Single file upload middleware (for resume)
 * Uses userId for folder structure (students/{userId}/resumes)
 */
export const uploadResume = async (req, res, next) => {
  const userId = req.userId;
  if (!userId) {
    return res.status(401).json({ error: 'User not authenticated' });
  }

  const upload = createResumeUpload(userId).single('resume');
  upload(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: 'File size exceeds 5MB limit' });
        }
        return res.status(400).json({ error: `Upload error: ${err.message}` });
      }
      return res.status(400).json({ error: err.message });
    }
    next();
  });
};

