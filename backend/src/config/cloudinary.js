/**
 * Cloudinary Configuration
 * Secure file storage for profile images and resumes
 * 
 * Required environment variables:
 * - CLOUDINARY_CLOUD_NAME
 * - CLOUDINARY_API_KEY
 * - CLOUDINARY_API_SECRET
 */

import { v2 as cloudinary } from 'cloudinary';

// Validate required environment variables
if (!process.env.CLOUDINARY_CLOUD_NAME) {
  console.warn('⚠️  CLOUDINARY_CLOUD_NAME not configured. Cloudinary uploads will fail.');
}

if (!process.env.CLOUDINARY_API_KEY) {
  console.warn('⚠️  CLOUDINARY_API_KEY not configured. Cloudinary uploads will fail.');
}

if (!process.env.CLOUDINARY_API_SECRET) {
  console.warn('⚠️  CLOUDINARY_API_SECRET not configured. Cloudinary uploads will fail.');
}

// Initialize Cloudinary SDK
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true, // Use HTTPS
});

/**
 * Delete file from Cloudinary using public_id
 * @param {string} publicId - Cloudinary public_id
 * @returns {Promise<Object>} Deletion result
 */
export async function deleteFromCloudinary(publicId) {
  try {
    if (!publicId) {
      throw new Error('Public ID is required for deletion');
    }

    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error('Cloudinary deletion error:', error);
    throw new Error(`Failed to delete file from Cloudinary: ${error.message}`);
  }
}

/**
 * Upload file to Cloudinary
 * @param {Buffer|string} file - File buffer or file path
 * @param {Object} options - Upload options
 * @param {string} options.folder - Folder path in Cloudinary
 * @param {string} options.public_id - Optional public_id (if not provided, auto-generated)
 * @param {Object} options.transformation - Image transformation options
 * @param {string} options.resource_type - 'image' or 'raw' (for PDFs)
 * @returns {Promise<Object>} Upload result with url and public_id
 */
export async function uploadToCloudinary(file, options = {}) {
  try {
    const {
      folder,
      public_id,
      transformation,
      resource_type = 'auto', // 'auto' detects automatically
    } = options;

    // Validate configuration
    if (!process.env.CLOUDINARY_CLOUD_NAME || 
        !process.env.CLOUDINARY_API_KEY || 
        !process.env.CLOUDINARY_API_SECRET) {
      throw new Error('Cloudinary credentials are not configured');
    }

    const uploadOptions = {
      folder: folder || undefined,
      public_id: public_id || undefined,
      resource_type: resource_type,
      overwrite: false, // Never overwrite existing files
    };

    // Add transformations for images
    if (transformation && resource_type === 'image') {
      uploadOptions.transformation = transformation;
    }

    // Upload file
    let result;
    if (Buffer.isBuffer(file)) {
      // Upload from buffer
      result = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          uploadOptions,
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        uploadStream.end(file);
      });
    } else {
      // Upload from file path
      result = await cloudinary.uploader.upload(file, uploadOptions);
    }

    return {
      url: result.secure_url,
      public_id: result.public_id,
      format: result.format,
      width: result.width,
      height: result.height,
      bytes: result.bytes,
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw new Error(`Failed to upload to Cloudinary: ${error.message}`);
  }
}

export default cloudinary;

