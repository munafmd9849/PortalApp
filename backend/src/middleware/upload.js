/**
 * Multer Upload Middleware for Cloudinary
 * Separate configs for profile images and resumes
 */

import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { uploadToCloudinary } from '../config/cloudinary.js';

// Configure Cloudinary - MUST be done before creating CloudinaryStorage
if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
  console.error('❌ [Cloudinary] Missing credentials! Uploads will fail.');
} else {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
  console.log('✅ [Cloudinary] Configured with cloud_name:', process.env.CLOUDINARY_CLOUD_NAME);
}

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
  // Verify Cloudinary is configured
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    throw new Error('Cloudinary credentials not configured');
  }

  // Use memory storage - we'll manually upload to Cloudinary in the middleware
  // This is more reliable than CloudinaryStorage which was failing
  const storage = multer.memoryStorage();
  
  console.log('✅ [Multer] Using memory storage for profile image upload');

  return multer({
    storage: storage,
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
  // Verify Cloudinary is configured
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    throw new Error('Cloudinary credentials not configured');
  }

  // Use memory storage - we'll manually upload to Cloudinary in the middleware
  // This is more reliable than CloudinaryStorage which was failing
  const storage = multer.memoryStorage();
  
  console.log('✅ [Multer] Using memory storage for resume upload');

  return multer({
    storage: storage,
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

  // Verify Cloudinary configuration
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    console.error('❌ Cloudinary credentials not configured!');
    return res.status(500).json({ 
      error: 'Cloudinary is not configured. Please contact administrator.' 
    });
  }

  console.log('📤 [Upload] Starting profile image upload for user:', userId);
  console.log('📤 [Upload] Cloudinary config:', {
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY ? '***' : 'MISSING',
    api_secret: process.env.CLOUDINARY_API_SECRET ? '***' : 'MISSING',
  });

  const upload = createProfileImageUpload(userId).single('profileImage');
  upload(req, res, async (err) => {
    if (err) {
      console.error('❌ [Upload] Profile image upload error:', err);
      console.error('❌ [Upload] Error details:', {
        name: err.name,
        message: err.message,
        code: err.code,
        stack: err.stack,
      });
      
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: 'File size exceeds 2MB limit' });
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
          return res.status(400).json({ error: 'Only one file is allowed' });
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
          return res.status(400).json({ error: 'Unexpected file field. Use "profileImage" as the field name.' });
        }
        return res.status(400).json({ error: `Upload error: ${err.message}` });
      }
      
      // Handle file filter errors and other errors
      if (err.message && err.message.includes('Only JPG')) {
        return res.status(400).json({ error: err.message });
      }
      
      return res.status(400).json({ 
        error: err.message || 'File upload failed. Please check the file format and size.' 
      });
    }
    
    // Check if file was actually uploaded
    if (!req.file) {
      console.error('❌ [Upload] No file in request');
      console.error('❌ [Upload] Request body:', req.body);
      console.error('❌ [Upload] Request files:', req.files);
      return res.status(400).json({ error: 'No file uploaded. Please select an image file.' });
    }
    
    console.log('✅ [Upload] File received in memory:', {
      fieldname: req.file.fieldname,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      hasBuffer: !!req.file.buffer,
    });
    
    // Manually upload to Cloudinary using memory buffer
    if (!req.file.buffer) {
      console.error('❌ [Upload] No file buffer found');
      return res.status(400).json({ error: 'File buffer not found' });
    }
    
    try {
      console.log('📤 [Upload] Uploading to Cloudinary...');
      const cloudinaryResult = await uploadToCloudinary(req.file.buffer, {
        folder: `students/${userId}/profile`,
        transformation: [
          {
            width: 400,
            height: 400,
            crop: 'fill',
            gravity: 'face',
            quality: 'auto',
            fetch_format: 'auto',
          },
        ],
        resource_type: 'image',
      });
      
      console.log('✅ [Upload] Cloudinary upload successful:', {
        url: cloudinaryResult.url.substring(0, 50) + '...',
        publicId: cloudinaryResult.public_id,
      });
      
      // Attach Cloudinary result to file object for controller
      req.file.secure_url = cloudinaryResult.url;
      req.file.url = cloudinaryResult.url;
      req.file.public_id = cloudinaryResult.public_id;
      
      next();
    } catch (cloudinaryError) {
      console.error('❌ [Upload] Cloudinary upload failed:', cloudinaryError);
      console.error('❌ [Upload] Error details:', {
        message: cloudinaryError.message,
        stack: cloudinaryError.stack,
      });
      return res.status(500).json({ 
        error: `Cloudinary upload failed: ${cloudinaryError.message || 'Unknown error'}` 
      });
    }
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

  // Verify Cloudinary configuration
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    console.error('❌ Cloudinary credentials not configured!');
    return res.status(500).json({ 
      error: 'Cloudinary is not configured. Please contact administrator.' 
    });
  }

  console.log('📤 [Upload] Starting resume upload for user:', userId);
  console.log('📤 [Upload] Cloudinary config:', {
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY ? '***' : 'MISSING',
    api_secret: process.env.CLOUDINARY_API_SECRET ? '***' : 'MISSING',
  });

  const upload = createResumeUpload(userId).single('resume');
  upload(req, res, async (err) => {
    if (err) {
      console.error('❌ [Upload] Resume upload error:', err);
      console.error('❌ [Upload] Error details:', {
        name: err.name,
        message: err.message,
        code: err.code,
        stack: err.stack,
      });
      
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: 'File size exceeds 5MB limit' });
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
          return res.status(400).json({ error: 'Only one file is allowed' });
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
          return res.status(400).json({ error: 'Unexpected file field. Use "resume" as the field name.' });
        }
        return res.status(400).json({ error: `Upload error: ${err.message}` });
      }
      
      // Handle file filter errors and other errors
      if (err.message && err.message.includes('Only PDF')) {
        return res.status(400).json({ error: err.message });
      }
      
      return res.status(400).json({ 
        error: err.message || 'File upload failed. Please check the file format and size.' 
      });
    }
    
    // Check if file was actually uploaded
    if (!req.file) {
      console.error('❌ [Upload] No file in request');
      console.error('❌ [Upload] Request body:', req.body);
      console.error('❌ [Upload] Request files:', req.files);
      return res.status(400).json({ error: 'No file uploaded. Please select a PDF file.' });
    }
    
    console.log('✅ [Upload] File received in memory:', {
      fieldname: req.file.fieldname,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      hasBuffer: !!req.file.buffer,
    });
    
    // Manually upload to Cloudinary using memory buffer
    if (!req.file.buffer) {
      console.error('❌ [Upload] No file buffer found');
      return res.status(400).json({ error: 'File buffer not found' });
    }
    
    try {
      console.log('📤 [Upload] Uploading resume to Cloudinary...');
      const cloudinaryResult = await uploadToCloudinary(req.file.buffer, {
        folder: `students/${userId}/resumes`,
        resource_type: 'raw', // PDFs are raw files
      });
      
      console.log('✅ [Upload] Cloudinary upload successful:', {
        url: cloudinaryResult.url.substring(0, 50) + '...',
        publicId: cloudinaryResult.public_id,
        bytes: cloudinaryResult.bytes,
      });
      
      // Attach Cloudinary result to file object for controller
      req.file.secure_url = cloudinaryResult.url;
      req.file.url = cloudinaryResult.url;
      req.file.public_id = cloudinaryResult.public_id;
      req.file.bytes = cloudinaryResult.bytes;
      req.file.path = cloudinaryResult.url; // For backward compatibility
      
      next();
    } catch (cloudinaryError) {
      console.error('❌ [Upload] Cloudinary upload failed:', cloudinaryError);
      console.error('❌ [Upload] Error details:', {
        message: cloudinaryError.message,
        stack: cloudinaryError.stack,
      });
      return res.status(500).json({ 
        error: `Cloudinary upload failed: ${cloudinaryError.message || 'Unknown error'}` 
      });
    }
  });
};

