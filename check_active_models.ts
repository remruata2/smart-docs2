
import { prisma } from "./src/lib/prisma";

async function main() {
    try {
        const models = await prisma.aiModel.findMany({
            where: { provider: "gemini", active: true },
            orderBy: [
                { priority: "desc" },
                { id: "asc" },
            ],
            select: { name: true, priority: true },
        });

        console.log("Active Gemini Models in DB:", models);

        if (models.length === 0) {
            console.log("No active models in DB. Falling back to env or default.");
            console.log("Env GEMINI_DEFAULT_MODEL:", process.env.GEMINI_DEFAULT_MODEL);
        }
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
