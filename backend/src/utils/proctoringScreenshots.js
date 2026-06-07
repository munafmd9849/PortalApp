import '../config/cloudinary.js';
import { v2 as cloudinary } from 'cloudinary';

/** Short-lived signed URL for admin review (Cloudinary private delivery). */
export function signedScreenshotUrl(row) {
  if (!row) return null;
  if (!row.publicId || !process.env.CLOUDINARY_CLOUD_NAME) return row.imageUrl;
  const expiresAt = Math.floor(Date.now() / 1000) + 60 * 5;
  return cloudinary.url(row.publicId, {
    secure: true,
    sign_url: true,
    expires_at: expiresAt,
    resource_type: 'image',
  });
}

export function mapScreenshotForAdmin(shot) {
  if (!shot) return null;
  return {
    id: shot.id,
    url: signedScreenshotUrl(shot),
    captureType: shot.captureType,
    event: shot.event,
    riskFlag: Boolean(shot.riskFlag),
    faceCount: shot.faceCount,
    timestamp: shot.timestamp,
  };
}
