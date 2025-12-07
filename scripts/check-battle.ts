import { PrismaClient } from '../src/generated/prisma';
import * as dotenv from 'dotenv';

console.log('Pre-dotenv DATABASE_URL:', process.env.DATABASE_URL ? process.env.DATABASE_URL.replace(/:[^:@]+@/, ':****@') : 'undefined');
dotenv.config();
console.log('Post-dotenv DATABASE_URL:', process.env.DATABASE_URL ? process.env.DATABASE_URL.replace(/:[^:@]+@/, ':****@') : 'undefined');

const prisma = new PrismaClient();

async function main() {
    console.log('Checking for battle with code "720713"...');
    const battleByCode = await prisma.battle.findUnique({
        where: { code: '720713' }
    });
    console.log('Battle by code:', battleByCode);

    console.log('Checking for battle with ID "cmirokb4y000j1fyxpecvs1yv"...');
    const battleById = await prisma.battle.findUnique({
        where: { id: 'cmirokb4y000j1fyxpecvs1yv' }
    });
    console.log('Battle by ID:', battleById);

    // List all recent battles
    console.log('Listing last 5 battles...');
    const recentBattles = await prisma.battle.findMany({
        take: 5,
        orderBy: { created_at: 'desc' }
    });
    console.log('Recent battles:', recentBattles);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
