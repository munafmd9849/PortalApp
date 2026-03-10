import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function verifyAuditLogs() {
    console.log('🔍 Starting Audit Log Verification...');

    try {
        // 1. Check if we can create a test log manually (using the model directly)
        const testLog = await prisma.auditLog.create({
            data: {
                actorId: 'system-test-id',
                actorName: 'Verification Script',
                actorRole: 'ADMIN',
                actionType: 'SYSTEM_TEST',
                targetType: 'SYSTEM',
                targetId: 'verification-1',
                details: 'Initial verification log'
            }
        });
        console.log('✅ Test log created successfully:', testLog.id);

        // 2. Fetch logs to ensure they exist
        const logs = await prisma.auditLog.findMany({
            take: 5,
            orderBy: { timestamp: 'desc' }
        });
        console.log(`✅ Found ${logs.length} logs in the database.`);

        // 3. Verify fields
        if (logs.length > 0) {
            const log = logs[0];
            const requiredFields = ['id', 'actorName', 'actorRole', 'actionType', 'targetType', 'timestamp'];
            const missing = requiredFields.filter(field => !log[field]);

            if (missing.length === 0) {
                console.log('✅ All required fields are present in the latest log.');
            } else {
                console.error('❌ Missing fields in log:', missing);
            }
        }

        // 4. Cleanup test log
        await prisma.auditLog.delete({
            where: { id: testLog.id }
        });
        console.log('✅ Test log cleaned up.');

    } catch (error) {
        console.error('❌ Verification failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

verifyAuditLogs();
