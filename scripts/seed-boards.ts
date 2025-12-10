import { PrismaClient } from '../src/generated/prisma';

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding Countries and Boards...');

    // Seed Countries
    const countries = [
        { id: 'IN', name: 'India', currency: '₹', locale: 'en-IN' },
        { id: 'NG', name: 'Nigeria', currency: '₦', locale: 'en-NG' },
        { id: 'PK', name: 'Pakistan', currency: 'Rs', locale: 'en-PK' },
        { id: 'PH', name: 'Philippines', currency: '₱', locale: 'en-PH' },
    ];

    for (const c of countries) {
        await prisma.country.upsert({
            where: { id: c.id },
            update: {},
            create: c,
        });
    }

    // Seed Boards
    const boards = [
        { id: 'CBSE', name: 'Central Board of Secondary Education', country_id: 'IN' },
        { id: 'MBSE', name: 'Mizoram Board of School Education', country_id: 'IN', state: 'Mizoram' },
        { id: 'WAEC', name: 'West African Examinations Council', country_id: 'NG' },
    ];

    for (const b of boards) {
        await prisma.board.upsert({
            where: { id: b.id },
            update: {},
            create: b,
        });
    }

    console.log('Seeding completed.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
