/**
 * Seed script for quiz timer default settings
 * Run with: npx tsx scripts/seed-quiz-timers.ts
 */

import { PrismaClient } from '../src/generated/prisma';

const prisma = new PrismaClient();

async function seedQuizTimers() {
    console.log('🌱 Seeding quiz timer settings...');

    const defaultTimers = [
        { key: 'quiz_timer_mcq', value: '15', type: 'number' },
        { key: 'quiz_timer_true_false', value: '15', type: 'number' },
        { key: 'quiz_timer_fill_blank', value: '15', type: 'number' },
        { key: 'quiz_timer_short_answer', value: '30', type: 'number' },
        { key: 'quiz_timer_long_answer', value: '60', type: 'number' },
    ];

    for (const timer of defaultTimers) {
        await prisma.systemSetting.upsert({
            where: { key: timer.key },
            create: timer,
            update: { value: timer.value } // Update only value, keep existing type
        });
        console.log(`  ✓ Set ${timer.key} = ${timer.value}s`);
    }

    console.log('✅ Quiz timer settings seeded successfully!');
}

seedQuizTimers()
    .catch(e => {
        console.error('❌ Error seeding quiz timers:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
