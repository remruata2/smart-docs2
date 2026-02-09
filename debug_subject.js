const { PrismaClient } = require('./src/generated/prisma');

const prisma = new PrismaClient();

async function main() {
    const subjectName = "General English";

    const subjects = await prisma.subject.findMany({
        where: { name: { contains: subjectName, mode: 'insensitive' } },
        include: {
            exam: true,
            program: true,
            courses: true
        }
    });

    console.log(`Found ${subjects.length} subjects matching "${subjectName}"`);

    subjects.forEach(s => {
        console.log(`\nID: ${s.id}`);
        console.log(`Name: ${s.name}`);
        console.log(`Exam ID: ${s.exam_id}`);
        console.log(`Exam Name: ${s.exam?.name} (${s.exam?.short_name})`);
        console.log(`Program: ${s.program?.name}`);
        console.log(`Linked Courses: ${s.courses.map(c => c.title).join(', ')}`);
    });

    const exactExam = await prisma.exam.findFirst({
        where: { OR: [{ name: { contains: "CAO", mode: 'insensitive' } }, { short_name: { contains: "CAO", mode: 'insensitive' } }] }
    });

    if (exactExam) {
        console.log(`\nExam "CAO" found: ${exactExam.name} (${exactExam.short_name}) ID: ${exactExam.id}`);
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
