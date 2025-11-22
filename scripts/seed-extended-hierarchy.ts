import { PrismaClient } from '../src/generated/prisma';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding extended education hierarchy...\n');

    // 1. Seed Countries (if not exists)
    console.log('📍 Creating countries...');
    const india = await prisma.country.upsert({
        where: { id: 'IN' },
        update: {},
        create: {
            id: 'IN',
            name: 'India',
            currency: '₹',
            locale: 'en-IN',
            is_active: true,
        },
    });
    console.log(`✓ Created ${india.name}`);

    // 2. Seed Boards
    console.log('\n🏫 Creating education boards...');

    const cbse = await prisma.board.upsert({
        where: { id: 'CBSE' },
        update: {},
        create: {
            id: 'CBSE',
            name: 'Central Board of Secondary Education',
            country_id: 'IN',
            type: 'academic',
            is_active: true,
        },
    });
    console.log(`✓ Created ${cbse.name}`);

    const mbse = await prisma.board.upsert({
        where: { id: 'MBSE' },
        update: {},
        create: {
            id: 'MBSE',
            name: 'Mizoram Board of School Education',
            country_id: 'IN',
            state: 'Mizoram',
            type: 'academic',
            is_active: true,
        },
    });
    console.log(`✓ Created ${mbse.name}`);

    const upsc = await prisma.board.upsert({
        where: { id: 'UPSC' },
        update: {},
        create: {
            id: 'UPSC',
            name: 'Union Public Service Commission',
            country_id: 'IN',
            type: 'competitive_exam',
            is_active: true,
        },
    });
    console.log(`✓ Created ${upsc.name}`);

    const mumbaiUniv = await prisma.board.upsert({
        where: { id: 'MU' },
        update: {},
        create: {
            id: 'MU',
            name: 'University of Mumbai',
            country_id: 'IN',
            state: 'Maharashtra',
            type: 'academic',
            is_active: true,
        },
    });
    console.log(`✓ Created ${mumbaiUniv.name}`);

    // 3. Seed Institutions
    console.log('\n🏛️  Creating institutions...');

    const dps = await prisma.institution.create({
        data: {
            board_id: 'CBSE',
            name: 'Delhi Public School',
            type: 'school',
            district: 'Central Delhi',
            state: 'Delhi',
            is_active: true,
        },
    });
    console.log(`✓ Created ${dps.name}`);

    const mizoramHighSchool = await prisma.institution.create({
        data: {
            board_id: 'MBSE',
            name: 'Government Mizoram High School',
            type: 'school',
            district: 'Aizawl',
            state: 'Mizoram',
            is_active: true,
        },
    });
    console.log(`✓ Created ${mizoramHighSchool.name}`);

    const spit = await prisma.institution.create({
        data: {
            board_id: 'MU',
            name: 'Sardar Patel Institute of Technology',
            type: 'college',
            district: 'Mumbai',
            state: 'Maharashtra',
            is_active: true,
        },
    });
    console.log(`✓ Created ${spit.name}`);

    // 4. Seed Programs
    console.log('\n📚 Creating programs...');

    const class10CBSE = await prisma.program.create({
        data: {
            board_id: 'CBSE',
            institution_id: dps.id,
            name: 'Class 10',
            code: 'CLS10_CBSE',
            level: 'secondary',
            duration_years: 1,
            is_active: true,
        },
    });
    console.log(`✓ Created ${class10CBSE.name} at ${dps.name}`);

    const class12CBSE = await prisma.program.create({
        data: {
            board_id: 'CBSE',
            institution_id: dps.id,
            name: 'Class 12 - Science',
            code: 'CLS12_SCI_CBSE',
            level: 'secondary',
            duration_years: 1,
            is_active: true,
        },
    });
    console.log(`✓ Created ${class12CBSE.name} at ${dps.name}`);

    const class10MBSE = await prisma.program.create({
        data: {
            board_id: 'MBSE',
            institution_id: mizoramHighSchool.id,
            name: 'Class 10',
            code: 'CLS10_MBSE',
            level: 'secondary',
            duration_years: 1,
            is_active: true,
        },
    });
    console.log(`✓ Created ${class10MBSE.name} at ${mizoramHighSchool.name}`);

    const btechIT = await prisma.program.create({
        data: {
            board_id: 'MU',
            institution_id: spit.id,
            name: 'B.Tech - Information Technology',
            code: 'BTECH_IT',
            level: 'undergraduate',
            duration_years: 4,
            is_active: true,
        },
    });
    console.log(`✓ Created ${btechIT.name} at ${spit.name}`);

    const upscCSE = await prisma.program.create({
        data: {
            board_id: 'UPSC',
            institution_id: null, // Board-level program
            name: 'UPSC Civil Services Examination',
            code: 'UPSC_CSE',
            level: 'competitive',
            duration_years: null,
            is_active: true,
        },
    });
    console.log(`✓ Created ${upscCSE.name} (Board-level)`);

    // 5. Seed Subjects
    console.log('\n📖 Creating subjects...');

    // Class 10 CBSE subjects
    const mathCBSE = await prisma.subject.create({
        data: {
            program_id: class10CBSE.id,
            name: 'Mathematics',
            code: 'MATH',
            is_active: true,
        },
    });
    console.log(`✓ Created ${mathCBSE.name} for ${class10CBSE.name}`);

    const scienceCBSE = await prisma.subject.create({
        data: {
            program_id: class10CBSE.id,
            name: 'Science',
            code: 'SCI',
            is_active: true,
        },
    });
    console.log(`✓ Created ${scienceCBSE.name} for ${class10CBSE.name}`);

    // Class 12 CBSE subjects
    const physicsCBSE = await prisma.subject.create({
        data: {
            program_id: class12CBSE.id,
            name: 'Physics',
            code: 'PHY',
            is_active: true,
        },
    });
    console.log(`✓ Created ${physicsCBSE.name} for ${class12CBSE.name}`);

    const chemistryCBSE = await prisma.subject.create({
        data: {
            program_id: class12CBSE.id,
            name: 'Chemistry',
            code: 'CHEM',
            is_active: true,
        },
    });
    console.log(`✓ Created ${chemistryCBSE.name} for ${class12CBSE.name}`);

    // Class 10 MBSE subjects
    const mathMBSE = await prisma.subject.create({
        data: {
            program_id: class10MBSE.id,
            name: 'Mathematics',
            code: 'MATH',
            is_active: true,
        },
    });
    console.log(`✓ Created ${mathMBSE.name} for ${class10MBSE.name}`);

    // B.Tech IT subjects
    const dataStructures = await prisma.subject.create({
        data: {
            program_id: btechIT.id,
            name: 'Data Structures',
            code: 'DS',
            term: 'Semester 3',
            is_active: true,
        },
    });
    console.log(`✓ Created ${dataStructures.name} for ${btechIT.name}`);

    const algorithms = await prisma.subject.create({
        data: {
            program_id: btechIT.id,
            name: 'Algorithms',
            code: 'ALGO',
            term: 'Semester 4',
            is_active: true,
        },
    });
    console.log(`✓ Created ${algorithms.name} for ${btechIT.name}`);

    const engineeringMath1 = await prisma.subject.create({
        data: {
            program_id: btechIT.id,
            name: 'Engineering Mathematics I',
            code: 'EM1',
            term: 'Semester 1',
            is_active: true,
        },
    });
    console.log(`✓ Created ${engineeringMath1.name} for ${btechIT.name}`);

    // UPSC subjects
    const generalStudies1 = await prisma.subject.create({
        data: {
            program_id: upscCSE.id,
            name: 'General Studies - Paper I (Indian Heritage)',
            code: 'GS1',
            is_active: true,
        },
    });
    console.log(`✓ Created ${generalStudies1.name} for ${upscCSE.name}`);

    const generalStudies2 = await prisma.subject.create({
        data: {
            program_id: upscCSE.id,
            name: 'General Studies - Paper II (Governance)',
            code: 'GS2',
            is_active: true,
        },
    });
    console.log(`✓ Created ${generalStudies2.name} for ${upscCSE.name}`);

    console.log('\n✅ Seeding completed successfully!\n');
    console.log('📊 Summary:');
    console.log(`   - Countries: 1`);
    console.log(`   - Boards: 4 (CBSE, MBSE, UPSC, Mumbai Univ)`);
    console.log(`   - Institutions: 3`);
    console.log(`   - Programs: 5`);
    console.log(`   - Subjects: 10`);
}

main()
    .catch((e) => {
        console.error('❌ Error seeding database:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
