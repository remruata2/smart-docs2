
import { PrismaClient } from '../src/generated/prisma';

const prisma = new PrismaClient();

async function main() {
    const modelName = 'gemini-2.5-flash-image';
    const provider = 'gemini';

    console.log(`Checking for existing model: ${modelName}...`);

    const existing = await prisma.aiModel.findUnique({
        where: {
            provider_name: {
                provider: provider as any,
                name: modelName
            }
        }
    });

    if (existing) {
        console.log(`Model ${modelName} already exists. Skipping insertion.`);
        return;
    }

    console.log(`Inserting model: ${modelName}...`);

    await prisma.aiModel.create({
        data: {
            provider: provider as any,
            name: modelName,
            label: 'Gemini 2.5 Flash Image',
            active: true,
            priority: 10 // Give it a decent priority so it shows up near the top
        }
    });

    console.log(`Successfully inserted ${modelName}.`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
