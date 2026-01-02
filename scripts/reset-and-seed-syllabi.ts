import { spawn } from 'child_process';
import { PrismaClient } from '../src/generated/prisma';

const prisma = new PrismaClient();

async function main() {
    console.log('⚠ DELETING ALL SYLLABI...');
    try {
        const result = await prisma.syllabus.deleteMany({});
        console.log(`✅ Deleted ${result.count} syllabi.`);
    } catch (error) {
        console.error('Error deleting syllabi:', error);
        process.exit(1);
    }

    console.log('\n🌱 Starting Seed Script...');
    console.log('─'.repeat(40));

    const seedScript = spawn('npx', ['tsx', 'scripts/seed-mbse-syllabi.ts'], {
        stdio: 'inherit',
        cwd: process.cwd()
    });

    seedScript.on('close', (code) => {
        console.log('─'.repeat(40));
        console.log(`Seed script exited with code ${code}`);
        process.exit(code || 0);
    });
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    });
