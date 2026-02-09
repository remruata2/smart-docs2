const { PrismaClient } = require('./src/generated/prisma');

const prisma = new PrismaClient();

async function main() {
    const subjectName = "General Intelligence / Aptitude";

    const subjects = await prisma.subject.findMany({
        where: { name: { contains: subjectName } },
        include: {
            exam: true,
            courses: true
        }
    });

    console.log(`Found ${subjects.length} subjects matching "${subjectName}"`);

    subjects.forEach(s => {
        console.log(`\nID: ${s.id}`);
        console.log(`Name: ${s.name}`);
        console.log(`Exam ID: ${s.exam_id}`);
        console.log(`Linked Courses: ${s.courses.map(c => c.title).join(', ')}`);
    });
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
