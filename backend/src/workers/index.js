/**
 * Worker Process Entry Point
 * Runs BullMQ workers for background job processing
 * Run separately: npm run worker
 * Note: Requires Redis to be running
 */

import dotenv from 'dotenv';

dotenv.config();

// Import workers (they will check Redis availability)
import { initJobDistributionWorker } from './jobDistribution.js';
import { initEmailWorker } from './emailWorker.js';
import { initCsvWorker } from './csvWorker.js';

async function startWorkers() {
    console.log('👷 Initializing Workers...');

    const [jobWorker, emailWorker, csvWorker] = await Promise.all([
        initJobDistributionWorker(),
        initEmailWorker(),
        initCsvWorker()
    ]);

    console.log('👷 Workers started');
    console.log('📦 Job distribution worker:', jobWorker ? 'Running' : 'Disabled (Redis not available)');
    console.log('📧 Email notification worker:', emailWorker ? 'Running' : 'Disabled (Redis not available)');
    console.log('📝 CSV export worker:', csvWorker ? 'Running' : 'Disabled (Redis not available)');
}

startWorkers().catch(console.error);
