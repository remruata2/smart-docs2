"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FlashcardViewer } from "./FlashcardViewer";
import { VideoGallery } from "./VideoGallery";
import { BookOpen, Video, FileText, Sparkles, Brain } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { GenerateStudyMaterialsButton } from "./GenerateStudyMaterialsButton";

interface StudyMaterialsClientProps {
    materials: any;
    chapterId: string;
}

export function StudyMaterialsClient({ materials, chapterId }: StudyMaterialsClientProps) {

    const [activeTab, setActiveTab] = useState("summary");


    const renderSummary = () => {
        if (!materials?.summary) return null;
        return (
            <div className="prose prose-indigo max-w-none dark:prose-invert">
                <ReactMarkdown
                    remarkPlugins={[remarkMath]}
                    rehypePlugins={[rehypeKatex]}
                    components={{
                        h1: ({ node, ...props }) => <h1 className="text-2xl font-bold mt-6 mb-4" {...props} />,
                        h2: ({ node, ...props }) => <h2 className="text-xl font-bold mt-5 mb-3" {...props} />,
                        h3: ({ node, ...props }) => <h3 className="text-lg font-bold mt-4 mb-2" {...props} />,
                        p: ({ node, ...props }) => <p className="mb-4 leading-relaxed text-muted-foreground" {...props} />,
                        ul: ({ node, ...props }) => <ul className="list-disc pl-6 mb-4 space-y-2" {...props} />,
                        li: ({ node, ...props }) => <li className="text-muted-foreground" {...props} />,
                    }}
                >
                    {materials.summary.brief}
                </ReactMarkdown>
            </div>
        );
    };

    return (
        <Tabs defaultValue="summary" className="w-full" onValueChange={setActiveTab}>
            <div className="flex flex-col items-center mb-10">
                <TabsList className="bg-muted/30 p-1.5 h-auto rounded-xl border border-muted/50 shadow-sm inline-flex">
                    {materials && (
                        <>
                            <TabsTrigger
                                value="summary"
                                className="px-6 py-3 rounded-lg data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-200 gap-2 text-base font-medium cursor-pointer"
                            >
                                <BookOpen className="w-5 h-5" />
                                Summary
                            </TabsTrigger>
                            <TabsTrigger
                                value="terms"
                                className="px-6 py-3 rounded-lg data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-200 gap-2 text-base font-medium cursor-pointer"
                            >
                                <Sparkles className="w-5 h-5" />
                                Key Terms
                            </TabsTrigger>
                            <TabsTrigger
                                value="flashcards"
                                className="px-6 py-3 rounded-lg data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-200 gap-2 text-base font-medium cursor-pointer"
                            >
                                <Brain className="w-5 h-5" />
                                Flashcards
                            </TabsTrigger>
                            <TabsTrigger
                                value="videos"
                                className="px-6 py-3 rounded-lg data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-200 gap-2 text-base font-medium cursor-pointer"
                            >
                                <Video className="w-5 h-5" />
                                Videos
                            </TabsTrigger>
                        </>
                    )}
                </TabsList>

            </div>



            <TabsContent value="summary" className="mt-0 outline-none">
                <Card className="border-none shadow-xl bg-card">
                    <CardHeader className="border-b bg-muted/30 pb-4">
                        <CardTitle className="text-xl flex items-center gap-2">
                            <BookOpen className="w-5 h-5 text-primary" />
                            Chapter Summary
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                        {materials?.summary ? renderSummary() : <GenerateCTA chapterId={chapterId} />}
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="terms" className="mt-0 outline-none">
                <Card className="border-none shadow-xl bg-card">
                    <CardHeader className="border-b bg-muted/30 pb-4">
                        <CardTitle className="text-xl flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-primary" />
                            Key Terms & Definitions
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                        {materials?.definitions ? (
                            <div className="grid gap-4 sm:grid-cols-2">
                                {Array.isArray(materials.definitions) && materials.definitions.map((item: any, i: number) => (
                                    <div key={i} className="p-4 rounded-lg bg-muted/50 border hover:border-primary/30 transition-colors">
                                        <h4 className="font-bold text-indigo-600 mb-1">
                                            <ReactMarkdown
                                                remarkPlugins={[remarkMath]}
                                                rehypePlugins={[rehypeKatex]}
                                                components={{
                                                    p: ({ node, ...props }) => <span {...props} />,
                                                }}
                                            >
                                                {item.term}
                                            </ReactMarkdown>
                                        </h4>
                                        <div className="text-sm text-muted-foreground">
                                            <ReactMarkdown
                                                remarkPlugins={[remarkMath]}
                                                rehypePlugins={[rehypeKatex]}
                                                components={{
                                                    p: ({ node, ...props }) => <p className="mb-1" {...props} />,
                                                }}
                                            >
                                                {item.definition}
                                            </ReactMarkdown>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <GenerateCTA chapterId={chapterId} />
                        )}
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="flashcards" className="mt-0 outline-none">
                {materials?.flashcards ? (
                    <FlashcardViewer flashcards={materials.flashcards || []} />
                ) : (
                    <Card className="border-none shadow-xl bg-card">
                        <CardContent className="pt-6">
                            <GenerateCTA chapterId={chapterId} />
                        </CardContent>
                    </Card>
                )}
            </TabsContent>

            <TabsContent value="videos" className="mt-0 outline-none">
                {materials?.curated_videos ? (
                    <VideoGallery videos={materials.curated_videos || []} />
                ) : (
                    <Card className="border-none shadow-xl bg-card">
                        <CardContent className="pt-6">
                            <GenerateCTA chapterId={chapterId} />
                        </CardContent>
                    </Card>
                )}
            </TabsContent>
        </Tabs>
    );
}

function GenerateCTA({ chapterId }: { chapterId: string }) {
    return (
        <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100">
            <Sparkles className="w-16 h-16 mx-auto mb-4 text-purple-500 opacity-50" />
            <h2 className="text-2xl font-bold mb-2">Study Materials Not Available</h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Study materials for this chapter are not yet available. Please check back later or contact your instructor.
            </p>
        </div>
    );
}
