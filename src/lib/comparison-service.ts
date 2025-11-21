import { prisma } from "@/lib/prisma";
import { getProviderApiKey } from "@/lib/ai-key-store";
import { generateObject } from "ai";
import { z } from "zod";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

// Define the structure of a "Difference"
export const ComparisonSchema = z.object({
    summary: z.string().describe("Executive summary of major changes"),
    differences: z.array(z.object({
        category: z.enum(["Critical", "Major", "Minor", "Formatting"]),
        clause: z.string().describe("Name of the clause or section affected"),
        docA_content: z.string().describe("What Document A says (quote)"),
        docB_content: z.string().describe("What Document B says (quote)"),
        implication: z.string().describe("Why this change matters (risk analysis)"),
        page_A: z.number().optional().describe("Page number in Doc A"),
        page_B: z.number().optional().describe("Page number in Doc B"),
    }))
});

export type ComparisonResult = z.infer<typeof ComparisonSchema>;

export async function compareDocuments(fileIdA: number, fileIdB: number) {
    // 1. Fetch Documents
    const [docA, docB] = await Promise.all([
        prisma.fileList.findUnique({ where: { id: fileIdA } }),
        prisma.fileList.findUnique({ where: { id: fileIdB } })
    ]);

    if (!docA || !docB) {
        throw new Error("One or both documents not found.");
    }

    if (!docA.note || !docB.note) {
        throw new Error("One or both documents haven't been parsed yet (missing content in 'note' field).");
    }

    // 2. Prepare Prompt
    const prompt = `
    Compare these two documents. Identify substantive differences, risks, and changes in obligations.
    Ignore minor formatting changes (spacing, fonts) unless they change meaning.

    DOCUMENT A (${docA.title}):
    ${docA.note}

    DOCUMENT B (${docB.title}):
    ${docB.note}
  `;

    // 3. Call AI (Gemini 1.5 Pro)
    // We use getProviderApiKey to get the raw key, then create the provider instance
    const { apiKey } = await getProviderApiKey({ provider: "gemini" });

    if (!apiKey) {
        throw new Error("Gemini API key not found. Please configure it in settings.");
    }

    const google = createGoogleGenerativeAI({ apiKey });

    const { object } = await generateObject({
        model: google("gemini-1.5-pro"), // Pro is required for heavy reasoning
        schema: ComparisonSchema,
        prompt: prompt,
    });

    return {
        ...object,
        docA: { id: docA.id, title: docA.title },
        docB: { id: docB.id, title: docB.title }
    };
}
