import { db } from "../src/lib/db";

async function seedAIModels() {
    console.log("🌱 Correcting and seeding AI models...");

    const models = [
        // Gemini 3.0 series
        { name: "gemini-3-pro-preview", label: "Gemini 3 Pro", priority: 100 },
        { name: "gemini-3-flash-preview", label: "Gemini 3 Flash", priority: 90 },
        { name: "gemini-3-pro-image-preview", label: "Gemini 3 Pro Image", priority: 85 },

        // Gemini 2.5 series
        { name: "gemini-2.5-pro", label: "Gemini 2.5 Pro", priority: 80 },
        { name: "gemini-2.5-flash", label: "Gemini 2.5 Flash", priority: 70 },
        { name: "gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite", priority: 60 },

        // Gemini 2.0 series
        { name: "gemini-2.0-flash", label: "Gemini 2.0 Flash", priority: 50 },
        { name: "gemini-2.0-flash-exp", label: "Gemini 2.0 Flash (Experimental)", priority: 45 },
    ];

    try {
        // First, deactivate the incorrectly named ones if they exist
        await db.aiModel.updateMany({
            where: {
                name: { in: ["gemini-3-flash", "gemini-3-deep-think", "imagen-3.0-generate-002"] }
            },
            data: { active: false }
        });

        for (const model of models) {
            await db.aiModel.upsert({
                where: {
                    provider_name: {
                        provider: "gemini",
                        name: model.name,
                    },
                },
                update: {
                    label: model.label,
                    priority: model.priority,
                    active: true,
                },
                create: {
                    provider: "gemini",
                    name: model.name,
                    label: model.label,
                    priority: model.priority,
                    active: true,
                },
            });
            console.log(`✅ Model ${model.label} (${model.name}) updated/created`);
        }

        console.log("\n🎉 AI models corrected and seeded successfully!");
    } catch (error) {
        console.error("❌ Error seeding AI models:", error);
        throw error;
    } finally {
        await db.$disconnect();
    }
}

seedAIModels()
    .then(() => {
        console.log("\n✨ Done!");
        process.exit(0);
    })
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
