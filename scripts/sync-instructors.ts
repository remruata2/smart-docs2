import { PrismaClient } from "../src/generated/prisma";

const prisma = new PrismaClient();

async function syncInstructors() {
    console.log("Starting instructor synchronization...");

    // Find all users with role 'instructor'
    const instructorUsers = await prisma.user.findMany({
        where: {
            role: 'instructor'
        },
        include: {
            instructor_profile: true
        }
    });

    console.log(`Found ${instructorUsers.length} users with 'instructor' role.`);

    let createdCount = 0;
    for (const user of instructorUsers) {
        if (!user.instructor_profile) {
            console.log(`Creating missing profile for user: ${user.username} (ID: ${user.id})`);
            await prisma.instructor.create({
                data: {
                    user_id: user.id,
                    title: 'Instructor'
                }
            });
            createdCount++;
        }
    }

    console.log(`Synchronization complete. Created ${createdCount} missing profiles.`);
}

syncInstructors()
    .catch(e => {
        console.error("Error during synchronization:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
