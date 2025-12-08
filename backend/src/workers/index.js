/**
 * Worker Process Entry Point
 * Runs BullMQ workers for background job processing
 * Run separately: npm run worker
 * Note: Requires Redis to be running
 */

import dotenv from 'dotenv';

dotenv.config();

// Import workers (they will check Redis availability)
import jobDistributionWorker from './jobDistribution.js';
import emailWorker from './emailWorker.js';

console.log('👷 Workers started');
console.log('📦 Job distribution worker:', jobDistributionWorker ? 'Running' : 'Disabled (Redis not available)');
console.log('📧 Email notification worker:', emailWorker ? 'Running' : 'Disabled (Redis not available)');
