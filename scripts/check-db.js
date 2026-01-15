
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    try {
        const users = await prisma.user.findMany({
            take: 5,
            orderBy: { created_at: 'desc' }
        });
        console.log('Recent Users:', users.map(u => ({ id: u.id, email: u.email, username: u.username })));

        if (users.length > 0) {
            const user = users[0];
            console.log(`Checking enrollments for user ${user.id} (${user.email})...`);

            const enrollments = await prisma.userEnrollment.findMany({
                where: { user_id: user.id },
                include: { course: true, program: true }
            });
            console.log(`Found ${enrollments.length} enrollments`);

            for (const enc of enrollments) {
                console.log(`- Enrollment: Course: ${enc.course?.title}, Program: ${enc.program?.name}`);

                const subjects = await prisma.subject.findMany({
                    where: {
                        OR: [
                            { courses: { some: { id: enc.course_id } } },
                            { program_id: enc.program_id }
                        ]
                    }
                });
                console.log(`  -> Accessible Subjects: ${subjects.length}`);
                subjects.forEach(s => console.log(`     * ${s.name} (is_active: ${s.is_active})`));
            }
        }
    } catch (err) {
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}

check();
