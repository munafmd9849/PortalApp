/**
 * CSV Export Worker
 * Processes background CSV generation and uploads to Cloudinary
 * Prevents server from timing out on large table downloads
 */

import { Worker } from 'bullmq';
import { v2 as cloudinary } from 'cloudinary';
import redis, { isRedisAvailable } from '../config/redis.js';
import prisma from '../config/database.js';

// Setup basic Cloudinary config if available
if (process.env.CLOUDINARY_CLOUD_NAME) {
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
    });
}

// Use a simple naive CSV string builder
function buildCSVString(headers, rows) {
    const escapeCell = (cell) => {
        if (cell === null || cell === undefined) return '';
        const stringCell = String(cell);
        if (stringCell.includes(',') || stringCell.includes('"') || stringCell.includes('\n')) {
            return `"${stringCell.replace(/"/g, '""')}"`;
        }
        return stringCell;
    };

    const headerRow = headers.map(escapeCell).join(',');
    const dataRows = rows.map(row => headers.map(header => escapeCell(row[header])).join(','));
    return [headerRow, ...dataRows].join('\n');
}

let worker = null;

async function createWorker() {
    const available = await isRedisAvailable();
    if (!available) {
        console.warn('⚠️ Redis not available, csv export worker disabled');
        return null;
    }

    return new Worker(
        'csv-exports',
        async (job) => {
            const { filters, entityType } = job.data;
            console.log(`📝 Starting CSV export job ${job.id} for entity: ${entityType}`);

            try {
                if (entityType === 'applications') {
                    // Re-construct basic filtering logic roughly mimicking the controller
                    const { status, jobId, center, school, batch } = filters || {};
                    const where = {};

                    if (status) where.status = status;
                    if (jobId) where.jobId = jobId;

                    if (center || school || batch) {
                        where.student = {};
                        if (center) where.student.center = { in: center.split(',').map(c => c.trim()) };
                        if (school) where.student.school = { in: school.split(',').map(s => s.trim()) };
                        if (batch) where.student.batch = { in: batch.split(',').map(b => b.trim()) };
                    }

                    // Fetch all matching applications
                    const applications = await prisma.application.findMany({
                        where,
                        include: {
                            student: {
                                include: {
                                    user: { select: { email: true, displayName: true } }
                                }
                            },
                            job: {
                                select: { jobTitle: true, company: { select: { name: true } } }
                            }
                        },
                        orderBy: { createdAt: 'desc' } // or whatever standard is
                    });

                    // Flatten data for CSV
                    const flatRows = applications.map(app => ({
                        id: app.id,
                        studentName: app.student?.user?.displayName || app.student?.fullName || '',
                        studentEmail: app.student?.user?.email || '',
                        studentPhone: app.student?.phone || '',
                        school: app.student?.school || '',
                        center: app.student?.center || '',
                        batch: app.student?.batch || '',
                        jobTitle: app.job?.jobTitle || '',
                        companyName: app.job?.company?.name || '',
                        status: app.status,
                        appliedAt: app.createdAt ? new Date(app.createdAt).toISOString() : '',
                        lastRoundReached: app.lastRoundReached || 0,
                        endorsementStatus: app.endorsementStatus || ''
                    }));

                    const headers = [
                        'id', 'studentName', 'studentEmail', 'studentPhone',
                        'school', 'center', 'batch', 'jobTitle', 'companyName',
                        'status', 'appliedAt', 'lastRoundReached', 'endorsementStatus'
                    ];

                    const csvString = buildCSVString(headers, flatRows);

                    // Upload to Cloudinary using raw resource type
                    return new Promise((resolve, reject) => {
                        const uploadStream = cloudinary.uploader.upload_stream(
                            {
                                resource_type: 'raw',
                                public_id: `exports/applications_${job.id}.csv`,
                                format: 'csv'
                            },
                            (error, result) => {
                                if (error) {
                                    console.error('Cloudinary CSV Upload Error:', error);
                                    return reject(error);
                                }
                                const url = result.secure_url;

                                // job.returnvalue becomes url
                                resolve({ success: true, url, rowsCount: flatRows.length });
                            }
                        );
                        uploadStream.end(Buffer.from(csvString));
                    });
                }

                throw new Error(`Entity type ${entityType} is not supported for CSV export yet.`);

            } catch (error) {
                console.error(`❌ Error in CSV export job ${job.id}:`, error);
                throw error;
            }
        },
        {
            connection: redis,
            concurrency: 1, // CPU and memory intensive, so keep concurrency low or 1
        }
    );
}

// Export initialization function that returns the worker promise
export function initCsvWorker() {
    return createWorker().then(w => {
        worker = w;
        if (worker) {
            worker.on('completed', (job) => {
                console.log(`✅ CSV export completed: ${job.id}`);
            });

            worker.on('failed', (job, err) => {
                console.error(`❌ CSV export failed: ${job?.id}`, err);
            });
        }
        return worker;
    });
}

export default worker;
