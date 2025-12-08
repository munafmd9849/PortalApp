/**
 * AWS S3 Configuration
 * Replaces Firebase Storage for file uploads
 */

import { S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME;

/**
 * Upload file to S3
 * @param {Buffer} fileBuffer - File content
 * @param {string} key - S3 object key (path)
 * @param {string} contentType - MIME type
 * @returns {Promise<string>} Public URL
 */
export async function uploadToS3(fileBuffer, key, contentType) {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: fileBuffer,
    ContentType: contentType,
  });

  await s3Client.send(command);
  
  // Return public URL (configure bucket for public access or use presigned URLs)
  return `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
}

/**
 * Get presigned URL for file download (valid for 1 hour)
 * @param {string} key - S3 object key
 * @returns {Promise<string>} Presigned URL
 */
export async function getS3PresignedUrl(key) {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  return await getSignedUrl(s3Client, command, { expiresIn: 3600 });
}

/**
 * Delete file from S3
 * @param {string} key - S3 object key
 */
export async function deleteFromS3(key) {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  await s3Client.send(command);
}

export { s3Client, BUCKET_NAME };
