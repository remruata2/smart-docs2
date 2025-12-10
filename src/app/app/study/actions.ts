"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { generateStudyMaterials, StudyMaterialsConfig } from "@/lib/ai-service-enhanced";
import { searchYouTubeVideos } from "@/lib/youtube-service";
import { revalidatePath } from "next/cache";

export async function getStudyMaterialsAction(chapterId: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        throw new Error("Unauthorized");
    }

    try {
        const chapterIdBigInt = BigInt(chapterId);

        // Check if study materials already exist
        const materials = await prisma.studyMaterial.findUnique({
            where: { chapter_id: chapterIdBigInt },
        });

        if (materials) {
            return {
                ...materials,
                chapter_id: materials.chapter_id.toString(),
            };
        }

        return null;
    } catch (error) {
        console.error("Error fetching study materials:", error);
        throw new Error("Failed to fetch study materials");
    }
}

export async function generateStudyMaterialsAction(chapterId: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        throw new Error("Unauthorized");
    }

    try {
        const chapterIdBigInt = BigInt(chapterId);

        // Get chapter data
        const chapter = await prisma.chapter.findUnique({
            where: { id: chapterIdBigInt },
            include: { subject: true },
        });

        if (!chapter) {
            throw new Error("Chapter not found");
        }

        // Extract content from content_json
        const content: any = chapter.content_json;
        const chapterContent = content.text || content.markdown || JSON.stringify(content);

        // Generate AI materials
        const config: StudyMaterialsConfig = {
            subject: chapter.subject.name,
            chapterTitle: chapter.title,
            content: chapterContent,
        };

        const aiMaterials = await generateStudyMaterials(config);

        // Search YouTube videos using the AI-generated queries
        const videoSearches = await Promise.all(
            aiMaterials.youtube_search_queries.map(query =>
                searchYouTubeVideos({ query, maxResults: 2 })
            )
        );
        // Deduplicate videos by ID
        const uniqueVideosMap = new Map();
        videoSearches.flat().forEach(video => {
            if (!uniqueVideosMap.has(video.videoId)) {
                uniqueVideosMap.set(video.videoId, video);
            }
        });
        const curatedVideos = Array.from(uniqueVideosMap.values()).slice(0, 6); // Top 6 unique videos

        // Prepare data for database
        const summaryData = {
            brief: aiMaterials.summary_markdown,
            key_points: aiMaterials.key_terms.map(t => t.term),
            important_formulas: aiMaterials.important_formulas || [],
        };

        // Save to database
        const studyMaterial = await prisma.studyMaterial.upsert({
            where: { chapter_id: chapterIdBigInt },
            create: {
                chapter_id: chapterIdBigInt,
                summary: summaryData,
                definitions: aiMaterials.key_terms,
                flashcards: aiMaterials.flashcards,
                mind_map: aiMaterials.mind_map_mermaid,
                video_queries: aiMaterials.youtube_search_queries,
                curated_videos: curatedVideos as any,
            },
            update: {
                summary: summaryData,
                definitions: aiMaterials.key_terms,
                flashcards: aiMaterials.flashcards,
                mind_map: aiMaterials.mind_map_mermaid,
                video_queries: aiMaterials.youtube_search_queries,
                curated_videos: curatedVideos as any,
                updated_at: new Date(),
            },
        });

        revalidatePath(`/app/study/${chapterId}`);

        return {
            ...studyMaterial,
            chapter_id: studyMaterial.chapter_id.toString(),
        };
    } catch (error) {
        console.error("Error generating study materials:", error);
        throw new Error("Failed to generate study materials");
    }
}
